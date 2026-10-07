/* app.js — 启动、屏幕路由、游戏状态机 */
(function (global) {
  'use strict';

  var state = null;
  var question = null;
  var questionIndex = 0;
  var answerStr = '';
  var inputLocked = false;
  var pendingTitleUp = false;
  var inlineAnimHandle = null;
  var lastQuestionSig = null;

  function init() {
    UI.cache();
    state = Storage.load();
    AudioFX.setMuted(state.muted);
    bindEvents();
    UI.buildKeypad(onDigit, onBackspace, onConfirm);
    registerServiceWorker();
    showHome();
  }

  function registerServiceWorker() {
    if ('serviceWorker' in navigator && location.protocol !== 'file:') {
      window.addEventListener('load', function () {
        navigator.serviceWorker.register('sw.js').catch(function () {});
      });
    }
  }

  function showHome() {
    AudioFX.stopSpeak();
    UI.renderHome(state);
    UI.setMuteIcons(state.muted);
  }

  function openMethodClass() {
    AudioFX.stopSpeak();
    AudioFX.play('tap');
    UI.renderMethodList(openMethodDetail);
    UI.showScreen('method');
  }

  function openMethodDetail(key) {
    AudioFX.play('tap');
    UI.renderMethodDetail(key);
  }

  function openSelect() {
    AudioFX.stopSpeak();
    AudioFX.play('tap');
    UI.renderSelectList(onSelectTitle);
    UI.showScreen('select');
  }

  function onSelectTitle(band) {
    AudioFX.play('tap');
    state.level = Levels.firstLevelOfBand(band);
    Storage.save(state);
    startGame();
  }

  function onReset() {
    if (!confirm('确定要重新开始吗？进度和积分会清空哦。')) return;
    state.level = 1;
    state.points = 0;
    Storage.save(state);
    showHome();
  }

  function startGame() {
    AudioFX.stopSpeak();
    pendingTitleUp = false;
    questionIndex = 0;
    answerStr = '';
    inputLocked = false;
    lastQuestionSig = null;
    UI.renderGameChrome(state, questionIndex);
    startQuestion();
  }

  function startQuestion() {
    if (inlineAnimHandle) { inlineAnimHandle.stop(); inlineAnimHandle = null; }
    UI.hideMethodOverlay();
    question = nextQuestion();
    answerStr = '';
    UI.renderQuestion(question);
    UI.renderAnswer('');
    UI.setQCounter(questionIndex);
    inputLocked = false;
  }

  function questionSig(q) { return q.a + '|' + q.op + '|' + q.b; }

  function nextQuestion() {
    var q = Solver.generate(state.level);
    for (var t = 0; t < 10 && lastQuestionSig && questionSig(q) === lastQuestionSig; t++) {
      q = Solver.generate(state.level);
    }
    lastQuestionSig = questionSig(q);
    return q;
  }

  function playInlineMethod(q) {
    inputLocked = true;
    if (inlineAnimHandle) inlineAnimHandle.stop();
    AudioFX.stopSpeak();
    UI.showMethodOverlay();
    UI.setOverlayStepLabel('下一步 ➡️');
    var steps = Methods.decompose(q).steps;
    inlineAnimHandle = UI.Animator.play(UI.animContainer('overlay'), steps, {
      manual: true,
      onStep: function (step, idx) {
        if (idx === steps.length - 1) UI.setOverlayStepLabel('🔁 再看一遍');
      },
    });
  }

  function onOverlayStep() {
    if (inlineAnimHandle && inlineAnimHandle.finished()) {
      playInlineMethod(question);
    } else if (inlineAnimHandle) {
      inlineAnimHandle.next();
    }
  }

  function closeMethodOverlay() {
    if (inlineAnimHandle) { inlineAnimHandle.stop(); inlineAnimHandle = null; }
    AudioFX.stopSpeak();
    UI.hideMethodOverlay();
    inputLocked = false;
    AudioFX.play('tap');
  }

  function onDigit(d) {
    if (inputLocked) return;
    AudioFX.play('tap');
    if (answerStr.length >= 3) return;
    answerStr += d;
    UI.renderAnswer(answerStr);
  }

  function onBackspace() {
    if (inputLocked) return;
    AudioFX.play('tap');
    answerStr = answerStr.slice(0, -1);
    UI.renderAnswer(answerStr);
  }

  function onConfirm() {
    if (inputLocked) return;
    if (answerStr === '') { UI.toast('先输入答案哦～'); AudioFX.play('tap'); return; }
    var val = parseInt(answerStr, 10);
    if (val === question.answer) onCorrect();
    else onWrong();
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

  function onWrong() {
    AudioFX.play('wrong');
    answerStr = '';
    UI.renderAnswer('');
    UI.toast('再想想哦～');
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
    if (inputLocked) return;
    if (question.method) {
      playInlineMethod(question);
    } else {
      UI.toast(Methods.explain(question));
      AudioFX.play('hint');
    }
  }

  function onResetQuestion() {
    if (inputLocked) return;
    AudioFX.play('tap');
    startQuestion();
  }

  function toggleMute() {
    state.muted = !state.muted;
    AudioFX.setMuted(state.muted);
    Storage.save(state);
    UI.setMuteIcons(state.muted);
    if (!state.muted) AudioFX.play('tap');
  }

  function bindEvents() {
    document.getElementById('btn-play').addEventListener('click', function () { AudioFX.play('tap'); startGame(); });
    document.getElementById('btn-method').addEventListener('click', openMethodClass);
    document.getElementById('btn-select').addEventListener('click', openSelect);
    document.getElementById('btn-select-back').addEventListener('click', function () { AudioFX.play('tap'); showHome(); });
    document.getElementById('btn-method-back').addEventListener('click', function () { AudioFX.play('tap'); showHome(); });
    document.getElementById('btn-method-detail-back').addEventListener('click', function () { AudioFX.play('tap'); openMethodClass(); });
    document.getElementById('btn-method-play').addEventListener('click', function () { AudioFX.play('tap'); UI.replayMethodExample(); });
    document.getElementById('btn-method-step').addEventListener('click', function () { UI.methodStepNext(); });
    document.getElementById('btn-method-next').addEventListener('click', function () { AudioFX.play('tap'); UI.nextMethodExample(); });
    document.getElementById('btn-method-practice').addEventListener('click', function () { AudioFX.play('tap'); startGame(); });
    document.getElementById('btn-back').addEventListener('click', function () { AudioFX.play('tap'); showHome(); });
    document.getElementById('btn-reset').addEventListener('click', onReset);
    document.getElementById('btn-mute-home').addEventListener('click', toggleMute);
    document.getElementById('btn-mute-game').addEventListener('click', toggleMute);
    document.getElementById('btn-hint').addEventListener('click', onHint);
    document.getElementById('btn-reset-q').addEventListener('click', onResetQuestion);
    document.getElementById('btn-overlay-step').addEventListener('click', onOverlayStep);
    document.getElementById('btn-overlay-close').addEventListener('click', closeMethodOverlay);
    document.getElementById('btn-next-level').addEventListener('click', onNextLevel);
    document.getElementById('btn-title-ok').addEventListener('click', onTitleOk);

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
