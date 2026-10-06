/* app.js — 启动、屏幕路由、游戏状态机 */
(function (global) {
  'use strict';

  var state = null;
  var question = null;
  var questionIndex = 0;
  var mode = 'step';
  var stepCards = [];
  var stepSel = [];
  var stepPendingOp = null;
  var stepCurrent = null;
  var exprTokens = [];
  var pendingTitleUp = false;

  function init() {
    UI.cache();
    state = Storage.load();
    AudioFX.setMuted(state.muted);
    bindEvents();
    registerServiceWorker();
    if (state.grade) showHome(); else UI.showScreen('start');
  }

  function registerServiceWorker() {
    if ('serviceWorker' in navigator && location.protocol !== 'file:') {
      window.addEventListener('load', function () {
        navigator.serviceWorker.register('sw.js').catch(function () {});
      });
    }
  }

  function showHome() {
    UI.renderHome(state);
    UI.renderGradeSwitch(state.grade);
    UI.setMuteIcons(state.muted);
  }

  function onGradePick(grade) {
    AudioFX.play('tap');
    state.grade = grade;
    state.level = 1;
    state.points = 0;
    Storage.save(state);
    showHome();
  }

  function onGradeSwitch(grade) {
    if (grade === state.grade) return;
    AudioFX.play('tap');
    state.grade = grade;
    Storage.save(state);
    UI.renderGradeSwitch(state.grade);
    var g = null;
    for (var i = 0; i < Levels.GRADES.length; i++) if (Levels.GRADES[i].id === grade) g = Levels.GRADES[i];
    UI.toast('已切换为' + (g ? g.name : ''));
  }

  function onReset() {
    if (!confirm('确定要重新开始吗？进度和积分会清空哦。')) return;
    state.level = 1;
    state.points = 0;
    Storage.save(state);
    showHome();
  }

  function startGame() {
    mode = 'step';
    pendingTitleUp = false;
    questionIndex = 0;
    UI.renderGameChrome(state, questionIndex, state.grade, mode);
    startQuestion();
  }

  function startQuestion() {
    var stage = Levels.getStage(state.level);
    var range = Levels.getNumberRange(state.level);
    var numbers = null;
    for (var i = 0; i < 30 && !numbers; i++) {
      var cand = Solver.generate(stage.count, stage.ops, range.min, range.max, Levels.TARGET);
      if (!cand) continue;
      if (isAccumulatorStage(stage) && !Solver.solveLeftToRight(cand, stage.ops, Levels.TARGET)) continue;
      numbers = cand;
    }
    if (!numbers) numbers = fallbackQuestion(stage);
    question = { numbers: numbers, stage: stage };
    UI.setQCounter(questionIndex);
    resetStepUI();
    resetExprUI();
    UI.setModeUI(mode);
  }

  function fallbackQuestion(stage) {
    if (stage.count === 2) return [8, 16];
    if (stage.count === 3) return [8, 8, 8];
    return [6, 6, 6, 6];
  }

  function resetStepUI() {
    stepCards = question.numbers.slice();
    stepSel = [];
    stepPendingOp = null;
    stepCurrent = null;
    UI.clearHistory();
    UI.setCurrentResult(null);
    UI.renderStepCards(stepCards, stepSel, onStepCardTap);
    UI.renderStepOps(question.stage.ops, onStepOpTap);
  }

  function resetExprUI() {
    exprTokens = [];
    UI.renderExprCards(question.numbers, onExprNumber);
    UI.renderExprOps(onExprOp, onExprBackspace, onExprClear);
    UI.updateExprDisplay(exprTokens);
  }

  // ---- 分步模式 ----
  function isAccumulatorStage(stage) {
    var hasMulDiv = stage.ops.indexOf('*') !== -1 || stage.ops.indexOf('/') !== -1;
    if (!hasMulDiv) return true;
    return stage.count === 3;
  }
  function isAccumulator() {
    return isAccumulatorStage(question.stage);
  }

  function onStepCardTap(i) {
    AudioFX.play('tap');
    if (!isAccumulator()) {
      var p = stepSel.indexOf(i);
      if (p >= 0) { stepSel.splice(p, 1); stepPendingOp = null; }
      else { if (stepSel.length >= 2) stepSel.shift(); stepSel.push(i); }
      UI.renderStepCards(stepCards, stepSel, onStepCardTap);
      if (stepPendingOp && stepSel.length === 2) { var o0 = stepPendingOp; stepPendingOp = null; applyStep(o0); }
      return;
    }

    if (stepCurrent === null) {
      var pos = stepSel.indexOf(i);
      if (pos >= 0) { stepSel.splice(pos, 1); stepPendingOp = null; }
      else { if (stepSel.length >= 2) stepSel.shift(); stepSel.push(i); }
      UI.renderStepCards(stepCards, stepSel, onStepCardTap);
      if (stepPendingOp && stepSel.length === 2) { var o1 = stepPendingOp; stepPendingOp = null; applyFirst(o1); }
    } else {
      if (stepPendingOp) { var o2 = stepPendingOp; stepPendingOp = null; applyNext(o2, i); }
      else { stepSel = [i]; UI.renderStepCards(stepCards, stepSel, onStepCardTap); }
    }
  }

  function onStepOpTap(op) {
    if (!isAccumulator()) {
      if (stepSel.length === 0) { UI.toast('先选一张数字卡片哦～'); AudioFX.play('tap'); return; }
      if (stepSel.length === 1) { stepPendingOp = op; UI.toast('再选一张数字卡片～'); AudioFX.play('tap'); return; }
      applyStep(op);
      return;
    }

    if (stepCurrent === null) {
      if (stepSel.length === 0) { UI.toast('先选数字卡片哦～'); AudioFX.play('tap'); return; }
      if (stepSel.length === 1) { stepPendingOp = op; UI.toast('再选一张数字卡片～'); AudioFX.play('tap'); return; }
      applyFirst(op);
    } else {
      if (stepSel.length === 1) { applyNext(op, stepSel[0]); }
      else { stepPendingOp = op; UI.toast('再选一张数字卡片～'); AudioFX.play('tap'); }
    }
  }

  // 连击模型：第一步，两张卡合并成当前结果
  function applyFirst(op) {
    var i = stepSel[0], j = stepSel[1];
    var a = stepCards[i], b = stepCards[j];
    if (op === '/' && Solver.close(b, 0)) { UI.toast('不能除以0哦'); AudioFX.play('wrong'); stepPendingOp = null; return; }
    var result = Solver.apply(a, b, op);
    UI.addHistoryLine(Solver.formatNumber(a) + ' ' + Solver.opLabel(op) + ' ' +
                      Solver.formatNumber(b) + ' = ' + Solver.formatNumber(result));
    var keep = [];
    for (var k = 0; k < stepCards.length; k++) if (k !== i && k !== j) keep.push(stepCards[k]);
    stepCards = keep;
    stepCurrent = result;
    stepSel = [];
    stepPendingOp = null;
    UI.renderStepCards(stepCards, stepSel, onStepCardTap);
    UI.setCurrentResult(stepCurrent);
    maybeFinishStep();
  }

  // 连击模型：当前结果 与 一张卡 合并
  function applyNext(op, i) {
    var a = stepCurrent;
    var b = stepCards[i];
    if (op === '/' && Solver.close(b, 0)) { UI.toast('不能除以0哦'); AudioFX.play('wrong'); stepPendingOp = null; return; }
    var result = Solver.apply(a, b, op);
    UI.addHistoryLine(Solver.formatNumber(a) + ' ' + Solver.opLabel(op) + ' ' +
                      Solver.formatNumber(b) + ' = ' + Solver.formatNumber(result));
    var keep = [];
    for (var k = 0; k < stepCards.length; k++) if (k !== i) keep.push(stepCards[k]);
    stepCards = keep;
    stepCurrent = result;
    stepSel = [];
    stepPendingOp = null;
    UI.renderStepCards(stepCards, stepSel, onStepCardTap);
    UI.setCurrentResult(stepCurrent);
    maybeFinishStep();
  }

  function maybeFinishStep() {
    if (stepCards.length === 0) {
      if (Solver.close(stepCurrent, Levels.TARGET)) {
        UI.toast('🎉 太棒了！');
        onCorrect();
      } else {
        AudioFX.play('wrong');
        UI.toast('结果是 ' + Solver.formatNumber(stepCurrent) + '，还不是24，再试试！');
        setTimeout(resetStepUI, 900);
      }
    }
  }

  // 混合乘除：任选两张卡合并（结果作为新卡放回，支持括号式子）
  function applyStep(op) {
    var i = stepSel[0], j = stepSel[1];
    var a = stepCards[i], b = stepCards[j];
    if (op === '/' && Solver.close(b, 0)) {
      UI.toast('不能除以0哦');
      AudioFX.play('wrong');
      stepPendingOp = null;
      return;
    }
    var result = Solver.apply(a, b, op);
    var line = Solver.formatNumber(a) + ' ' + Solver.opLabel(op) + ' ' +
               Solver.formatNumber(b) + ' = ' + Solver.formatNumber(result);
    UI.addHistoryLine(line);

    var keep = [];
    for (var k = 0; k < stepCards.length; k++) if (k !== i && k !== j) keep.push(stepCards[k]);
    keep.push(result);
    stepCards = keep;
    stepSel = [];
    stepPendingOp = null;
    UI.renderStepCards(stepCards, stepSel, onStepCardTap);

    if (stepCards.length === 1) {
      if (Solver.close(stepCards[0], Levels.TARGET)) {
        UI.toast('🎉 太棒了！');
        onCorrect();
      } else {
        AudioFX.play('wrong');
        UI.toast('结果是 ' + Solver.formatNumber(stepCards[0]) + '，还不是24，再试试！');
        setTimeout(resetStepUI, 900);
      }
    }
  }

  // ---- 完整式子模式 ----
  function onExprNumber(n) { AudioFX.play('tap'); exprTokens.push(n); UI.updateExprDisplay(exprTokens); }
  function onExprOp(op) { AudioFX.play('tap'); exprTokens.push(op); UI.updateExprDisplay(exprTokens); }
  function onExprBackspace() { AudioFX.play('tap'); exprTokens.pop(); UI.updateExprDisplay(exprTokens); }
  function onExprClear() { AudioFX.play('tap'); exprTokens = []; UI.updateExprDisplay(exprTokens); }

  function onSubmit() {
    if (exprTokens.length === 0) { UI.toast('先拼出算式哦～'); return; }
    var val;
    try {
      val = Solver.evalTokens(exprTokens);
    } catch (e) {
      AudioFX.play('wrong');
      UI.toast(e.message || '算式不完整，再试试');
      return;
    }
    var used = Solver.extractNumbers(exprTokens);
    if (!Solver.sameMultiset(used, question.numbers)) {
      AudioFX.play('wrong');
      UI.toast('要把给出的数字都用上，各用一次哦～');
      return;
    }
    if (Solver.close(val, Levels.TARGET)) {
      UI.toast('🎉 太棒了！');
      onCorrect();
    } else {
      AudioFX.play('wrong');
      UI.toast('等于 ' + Solver.formatNumber(val) + '，不是24，再试试！');
    }
  }

  function onCorrect() {
    AudioFX.play('correct');
    state.points += Levels.getPointsPerCorrect(state.level);
    UI.updatePoints(state.points);
    UI.animateMonsterHit();
    questionIndex++;
    UI.setHp(questionIndex);
    if (questionIndex >= Levels.QUESTIONS_PER_LEVEL) {
      completeLevel();
    } else {
      setTimeout(startQuestion, 650);
    }
  }

  function completeLevel() {
    var perCorrect = Levels.getPointsPerCorrect(state.level);
    var correctTotal = perCorrect * Levels.QUESTIONS_PER_LEVEL;
    state.points += Levels.LEVEL_BONUS;
    var oldTitle = Levels.titleIndex(state.level);
    state.level = state.level + 1;
    pendingTitleUp = Levels.titleIndex(state.level) > oldTitle;
    if (pendingTitleUp) state.points += Levels.TITLE_BONUS;
    Storage.save(state);
    AudioFX.play('levelUp');
    UI.renderLevelUp(correctTotal, Levels.LEVEL_BONUS);
  }

  function onNextLevel() {
    AudioFX.play('tap');
    if (pendingTitleUp) {
      UI.showTitleOverlay(Levels.getTitle(state.level), Levels.TITLE_BONUS);
      AudioFX.play('titleUp');
    } else {
      showHome();
    }
  }

  function onTitleOk() {
    AudioFX.play('tap');
    UI.hideTitleOverlay();
    pendingTitleUp = false;
    showHome();
  }

  function onHint() {
    var path = isAccumulator()
      ? Solver.solveLeftToRight(question.numbers, question.stage.ops, Levels.TARGET)
      : Solver.solvePath(question.numbers, question.stage.ops, Levels.TARGET);
    if (!path || path.length === 0) {
      UI.toast('这题有点难，可以点“重来”换一题');
      return;
    }
    var first = path[0];
    UI.toast('💡 先算 ' + Solver.formatNumber(first.a) + ' ' + Solver.opLabel(first.op) + ' ' +
             Solver.formatNumber(first.b) + ' = ' + Solver.formatNumber(first.result));
    AudioFX.play('hint');
  }

  function onResetQuestion() {
    AudioFX.play('tap');
    startQuestion();
  }

  function setMode(m) {
    if (m === mode) return;
    mode = m;
    AudioFX.play('tap');
    UI.setModeUI(mode);
    resetStepUI();
    resetExprUI();
  }

  function toggleMute() {
    state.muted = !state.muted;
    AudioFX.setMuted(state.muted);
    Storage.save(state);
    UI.setMuteIcons(state.muted);
    if (!state.muted) AudioFX.play('tap');
  }

  function bindEvents() {
    var gradeBtns = document.querySelectorAll('.grade-btn');
    for (var i = 0; i < gradeBtns.length; i++) {
      (function (b) {
        b.addEventListener('click', function () { onGradePick(b.getAttribute('data-grade')); });
      })(gradeBtns[i]);
    }
    document.getElementById('btn-play').addEventListener('click', function () { AudioFX.play('tap'); startGame(); });
    document.getElementById('grade-switch-btns').addEventListener('click', function (e) {
      var chip = e.target.closest ? e.target.closest('.grade-chip') : null;
      if (chip) onGradeSwitch(chip.getAttribute('data-grade'));
    });
    document.getElementById('btn-back').addEventListener('click', function () { AudioFX.play('tap'); showHome(); });
    document.getElementById('btn-reset').addEventListener('click', onReset);
    document.getElementById('btn-mute-home').addEventListener('click', toggleMute);
    document.getElementById('btn-mute-game').addEventListener('click', toggleMute);
    document.getElementById('btn-hint').addEventListener('click', onHint);
    document.getElementById('btn-reset-q').addEventListener('click', onResetQuestion);
    document.getElementById('btn-submit').addEventListener('click', onSubmit);
    document.getElementById('btn-next-level').addEventListener('click', onNextLevel);
    document.getElementById('btn-title-ok').addEventListener('click', onTitleOk);
    document.getElementById('mode-step').addEventListener('click', function () { setMode('step'); });
    document.getElementById('mode-expr').addEventListener('click', function () { setMode('expr'); });
    function unlockAudio() {
      AudioFX.init();
      AudioFX.resume();
    }
    document.addEventListener('pointerdown', unlockAudio, { passive: true });
    document.addEventListener('touchstart', unlockAudio, { passive: true });
    document.addEventListener('touchend', unlockAudio, { passive: true });
    document.addEventListener('click', unlockAudio, { passive: true });
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) unlockAudio();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(window);
