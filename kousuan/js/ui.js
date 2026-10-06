/* ui.js — DOM 渲染、屏幕路由、数字键盘、方法动画 */
(function (global) {
  'use strict';

  var el = {};

  function cache() {
    var ids = [
      'screen-home', 'screen-game', 'screen-levelup', 'screen-method', 'screen-method-detail', 'screen-select',
      'overlay-title', 'overlay-method',
      'home-title-emoji', 'home-title-name', 'home-level', 'home-points', 'home-monster',
      'btn-play', 'btn-mute-home', 'btn-reset', 'btn-method', 'btn-select', 'btn-select-back',
      'select-list',
      'btn-back', 'game-level', 'game-qcounter', 'game-points', 'btn-mute-game',
      'game-monster', 'hp-fill', 'hp-text', 'question-text', 'answer-display', 'keypad',
      'btn-hint', 'btn-reset-q',
      'result-correct-points', 'result-level-bonus', 'btn-next-level',
      'method-list', 'btn-method-back',
      'method-detail-emoji', 'method-detail-name', 'method-detail-slogan', 'method-detail-desc',
      'method-detail-anim', 'btn-method-step', 'btn-method-play', 'btn-method-next', 'btn-method-practice', 'btn-method-detail-back',
      'title-badge', 'title-bonus', 'btn-title-ok',
      'method-overlay-anim', 'toast',
    ];
    ids.forEach(function (id) { el[id] = document.getElementById(id); });
  }

  var SCREENS = {
    home: 'screen-home', game: 'screen-game', levelup: 'screen-levelup',
    method: 'screen-method', methodDetail: 'screen-method-detail', select: 'screen-select',
  };

  function showScreen(name) {
    for (var k in SCREENS) {
      el[SCREENS[k]].classList.toggle('active', k === name);
    }
  }

  // ---- 主页 ----
  function renderHome(state) {
    var title = Levels.getTitle(state.level);
    var mon = Levels.getMonster(state.level);
    el['home-title-emoji'].textContent = title.emoji;
    el['home-title-name'].textContent = title.name;
    el['home-level'].textContent = '第 ' + state.level + ' 关';
    el['home-points'].textContent = '⭐ ' + state.points;
    el['home-monster'].textContent = mon.emoji;
    el['btn-play'].textContent = '开始第 ' + state.level + ' 关';
    showScreen('home');
  }

  // ---- 游戏屏幕 ----
  function renderGameChrome(state, questionIndex) {
    var mon = Levels.getMonster(state.level);
    el['game-level'].textContent = '第 ' + state.level + ' 关';
    el['game-points'].textContent = '⭐ ' + state.points;
    el['game-monster'].textContent = mon.emoji;
    setHp(questionIndex);
    setQCounter(questionIndex);
    showScreen('game');
  }

  function setHp(questionIndex) {
    var hp = Levels.QUESTIONS_PER_LEVEL - questionIndex;
    el['hp-fill'].style.width = (hp * 100 / Levels.QUESTIONS_PER_LEVEL) + '%';
    el['hp-text'].textContent = 'HP ' + hp + '/' + Levels.QUESTIONS_PER_LEVEL;
  }

  function setQCounter(i) {
    el['game-qcounter'].textContent = '第 ' + (i + 1) + '/' + Levels.QUESTIONS_PER_LEVEL + ' 题';
  }

  function renderQuestion(q) {
    el['question-text'].textContent = q.a + ' ' + Solver.opLabel(q.op) + ' ' + q.b + ' =';
  }

  function renderAnswer(str) {
    el['answer-display'].textContent = str;
    el['answer-display'].classList.toggle('empty', str === '');
  }

  function buildKeypad(onDigit, onBackspace, onConfirm) {
    var box = el['keypad'];
    box.innerHTML = '';
    ['1', '2', '3', '4', '5', '6', '7', '8', '9'].forEach(function (d) {
      var b = document.createElement('button');
      b.className = 'key';
      b.textContent = d;
      b.addEventListener('click', function () { onDigit(d); });
      box.appendChild(b);
    });
    var bs = document.createElement('button');
    bs.className = 'key key-fn';
    bs.textContent = '⌫';
    bs.addEventListener('click', onBackspace);
    box.appendChild(bs);
    var zero = document.createElement('button');
    zero.className = 'key';
    zero.textContent = '0';
    zero.addEventListener('click', function () { onDigit('0'); });
    box.appendChild(zero);
    var ok = document.createElement('button');
    ok.className = 'key key-ok';
    ok.textContent = '✓';
    ok.addEventListener('click', onConfirm);
    box.appendChild(ok);
  }

  function updatePoints(points) { el['game-points'].textContent = '⭐ ' + points; }

  function animateMonsterHit() {
    el['game-monster'].classList.add('hit');
    setTimeout(function () { el['game-monster'].classList.remove('hit'); }, 400);
  }

  // ---- 结算 / 覆盖层 ----
  function renderLevelUp(correctTotal, levelBonus) {
    el['result-correct-points'].textContent = String(correctTotal);
    el['result-level-bonus'].textContent = String(levelBonus);
    showScreen('levelup');
  }

  function showTitleOverlay(title, bonus) {
    el['title-badge'].textContent = title.emoji + ' ' + title.name;
    el['title-bonus'].textContent = String(bonus);
    el['overlay-title'].classList.remove('hidden');
  }
  function hideTitleOverlay() { el['overlay-title'].classList.add('hidden'); }

  function showMethodOverlay() { el['overlay-method'].classList.remove('hidden'); }
  function hideMethodOverlay() { el['overlay-method'].classList.add('hidden'); }

  // ---- 方法课堂 ----
  function renderMethodList(onTap) {
    el['method-list'].innerHTML = '';
    Methods.list().forEach(function (m) {
      var b = document.createElement('button');
      b.className = 'method-card';
      var em = document.createElement('span'); em.className = 'method-emoji'; em.textContent = m.emoji;
      var nm = document.createElement('span'); nm.className = 'method-name'; nm.textContent = m.name;
      var sl = document.createElement('span'); sl.className = 'method-slogan'; sl.textContent = m.slogan;
      b.appendChild(em); b.appendChild(nm); b.appendChild(sl);
      b.addEventListener('click', function () { onTap(m.key); });
      el['method-list'].appendChild(b);
    });
  }

  // ---- 选关 ----
  function renderSelectList(onTap) {
    el['select-list'].innerHTML = '';
    Levels.TITLES.forEach(function (t, i) {
      var b = document.createElement('button');
      b.className = 'method-card';
      var em = document.createElement('span'); em.className = 'method-emoji'; em.textContent = t.emoji;
      var box = document.createElement('span'); box.className = 'card-text';
      var nm = document.createElement('span'); nm.className = 'method-name'; nm.textContent = t.name;
      var sl = document.createElement('span'); sl.className = 'method-slogan'; sl.textContent = t.desc;
      box.appendChild(nm); box.appendChild(sl);
      b.appendChild(em); b.appendChild(box);
      b.addEventListener('click', function () { onTap(i); });
      el['select-list'].appendChild(b);
    });
  }

  var methodKey = null;
  var methodIdx = 0;
  var methodAnimHandle = null;

  function renderMethodDetail(key) {
    methodKey = key;
    methodIdx = 0;
    var meta = Methods.META[key];
    el['method-detail-emoji'].textContent = meta.emoji;
    el['method-detail-name'].textContent = meta.name;
    el['method-detail-slogan'].textContent = meta.slogan;
    el['method-detail-desc'].textContent = meta.description;
    playExample();
    showScreen('methodDetail');
  }

  function playExample() {
    var meta = Methods.META[methodKey];
    var ex = meta.examples[methodIdx];
    var q = { a: ex.a, op: ex.op, b: ex.b, method: methodKey };
    if (methodAnimHandle) methodAnimHandle.stop();
    AudioFX.stopSpeak();
    setStepLabel('下一步 ➡️');
    var steps = Methods.decompose(q).steps;
    methodAnimHandle = Animator.play(el['method-detail-anim'], steps, {
      manual: true,
      voice: true,
      onStep: function (step, idx) {
        if (idx === steps.length - 1) setStepLabel('🔁 再看一遍');
      },
    });
  }

  function nextMethodExample() {
    var meta = Methods.META[methodKey];
    methodIdx = (methodIdx + 1) % meta.examples.length;
    playExample();
  }

  function setStepLabel(text) { el['btn-method-step'].textContent = text; }

  function methodStepNext() {
    if (methodAnimHandle && methodAnimHandle.finished()) {
      playExample();
    } else if (methodAnimHandle) {
      methodAnimHandle.next();
    }
  }

  // ---- toast / 静音 ----
  var toastTimer = null;
  function toast(text) {
    el['toast'].textContent = text;
    el['toast'].classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el['toast'].classList.remove('show'); }, 2000);
  }

  function setMuteIcons(muted) {
    var icon = muted ? '🔇' : '🔊';
    el['btn-mute-home'].textContent = icon;
    el['btn-mute-game'].textContent = icon;
  }

  // ---- 动画组件 ----
  function chipEl(v, t) {
    var c = document.createElement('div');
    c.className = 'anim-chip' + (t === 'op' ? ' anim-op' : '');
    c.textContent = v;
    return c;
  }

  var Animator = {
    play: function (container, steps, opts) {
      opts = opts || {};
      var stepMs = opts.stepMs || 1100;
      var manual = opts.manual === true;
      var i = 0;
      var stopped = false;
      var timer = null;

      function render(step) {
        container.innerHTML = '';
        var cap = document.createElement('div');
        cap.className = 'anim-caption';
        cap.textContent = step.caption;
        container.appendChild(cap);

        if (step.kind === 'split') {
          var top = document.createElement('div');
          top.className = 'anim-split-top';
          top.appendChild(chipEl(step.source, 'num'));
          container.appendChild(top);
          var arrow = document.createElement('div');
          arrow.className = 'anim-split-arrow';
          arrow.textContent = '⬇';
          container.appendChild(arrow);
          var row = document.createElement('div');
          row.className = 'anim-row';
          step.parts.forEach(function (p) { row.appendChild(chipEl(p, 'num')); });
          container.appendChild(row);
        } else if (step.kind === 'answer') {
          var ans = document.createElement('div');
          ans.className = 'anim-answer';
          ans.textContent = step.answer;
          container.appendChild(ans);
        } else {
          var row2 = document.createElement('div');
          row2.className = 'anim-row';
          step.cards.forEach(function (c) { row2.appendChild(chipEl(c.v, c.t)); });
          container.appendChild(row2);
        }
      }

      function advance() {
        if (stopped) return;
        if (i >= steps.length) {
          if (opts.onDone) opts.onDone();
          return;
        }
        var step = steps[i];
        render(step);
        if (opts.onStep) opts.onStep(step, i);
        if (opts.sfx !== false) {
          if (step.kind === 'answer') AudioFX.play('correct');
          else AudioFX.play('point');
        }
        if (opts.voice) AudioFX.speak(step.caption);
        i++;
        if (!manual) timer = setTimeout(advance, stepMs);
      }

      advance();
      return {
        stop: function () { stopped = true; clearTimeout(timer); },
        next: function () { if (manual) { clearTimeout(timer); advance(); } },
        finished: function () { return i >= steps.length; },
      };
    },
  };

  global.UI = {
    cache: cache,
    showScreen: showScreen,
    renderHome: renderHome,
    renderGameChrome: renderGameChrome,
    setHp: setHp,
    setQCounter: setQCounter,
    renderQuestion: renderQuestion,
    renderAnswer: renderAnswer,
    buildKeypad: buildKeypad,
    updatePoints: updatePoints,
    animateMonsterHit: animateMonsterHit,
    renderLevelUp: renderLevelUp,
    showTitleOverlay: showTitleOverlay,
    hideTitleOverlay: hideTitleOverlay,
    showMethodOverlay: showMethodOverlay,
    hideMethodOverlay: hideMethodOverlay,
    renderMethodList: renderMethodList,
    renderSelectList: renderSelectList,
    renderMethodDetail: renderMethodDetail,
    nextMethodExample: nextMethodExample,
    methodStepNext: methodStepNext,
    replayMethodExample: playExample,
    toast: toast,
    setMuteIcons: setMuteIcons,
    Animator: Animator,
    animContainer: function (kind) { return kind === 'overlay' ? el['method-overlay-anim'] : el['method-detail-anim']; },
  };
})(window);
