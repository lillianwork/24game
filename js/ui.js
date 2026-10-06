/* ui.js — DOM 渲染与视图 */
(function (global) {
  'use strict';

  var el = {};

  function cache() {
    var ids = [
      'screen-start', 'screen-home', 'screen-game', 'screen-levelup', 'overlay-title',
      'home-title-emoji', 'home-title-name', 'home-level', 'home-points', 'home-monster',
      'btn-play', 'btn-mute-home', 'btn-reset',
      'game-level', 'game-qcounter', 'game-points', 'game-monster', 'hp-fill', 'hp-text',
      'step-area', 'step-history', 'step-cards', 'step-ops',
      'expr-area', 'expr-display', 'expr-cards', 'expr-ops',
      'btn-hint', 'btn-reset-q', 'btn-submit', 'btn-back', 'btn-mute-game',
      'mode-toggle', 'mode-step', 'mode-expr',
      'result-correct-points', 'result-level-bonus', 'btn-next-level',
      'title-badge', 'title-bonus', 'btn-title-ok', 'toast'
    ];
    ids.forEach(function (id) { el[id] = document.getElementById(id); });
  }

  var SCREENS = { start: 'screen-start', home: 'screen-home', game: 'screen-game', levelup: 'screen-levelup' };

  function showScreen(name) {
    for (var k in SCREENS) {
      el[SCREENS[k]].classList.toggle('active', k === name);
    }
  }

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

  function renderGameChrome(state, questionIndex, grade, mode) {
    var mon = Levels.getMonster(state.level);
    el['game-level'].textContent = '第 ' + state.level + ' 关';
    el['game-points'].textContent = '⭐ ' + state.points;
    el['game-monster'].textContent = mon.emoji;
    el['mode-toggle'].classList.toggle('hidden', !Levels.isExprAllowed(grade));
    setHp(questionIndex);
    setModeUI(mode);
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

  function setModeUI(mode) {
    el['step-area'].classList.toggle('hidden', mode !== 'step');
    el['expr-area'].classList.toggle('hidden', mode !== 'expr');
    el['mode-step'].classList.toggle('active', mode === 'step');
    el['mode-expr'].classList.toggle('active', mode === 'expr');
    el['btn-submit'].classList.toggle('hidden', mode !== 'expr');
  }

  function renderStepCards(cards, selected, onTap) {
    el['step-cards'].innerHTML = '';
    cards.forEach(function (val, i) {
      var b = document.createElement('button');
      var selPos = selected.indexOf(i);
      b.className = 'card' + (selPos >= 0 ? ' selected' : '');
      b.textContent = Solver.formatNumber(val);
      if (selPos >= 0) {
        var badge = document.createElement('span');
        badge.className = 'badge';
        badge.textContent = String(selPos + 1);
        b.appendChild(badge);
      }
      (function (idx) { b.addEventListener('click', function () { onTap(idx); }); })(i);
      el['step-cards'].appendChild(b);
    });
  }

  function renderStepOps(ops, onTap) {
    el['step-ops'].innerHTML = '';
    ops.forEach(function (op) {
      var b = document.createElement('button');
      b.className = 'op-btn';
      b.textContent = Solver.opLabel(op);
      b.addEventListener('click', function () { onTap(op); });
      el['step-ops'].appendChild(b);
    });
  }

  function clearHistory() { el['step-history'].innerHTML = ''; }

  function addHistoryLine(text) {
    var d = document.createElement('div');
    d.className = 'history-line';
    d.textContent = text;
    el['step-history'].appendChild(d);
    el['step-history'].scrollTop = el['step-history'].scrollHeight;
  }

  function renderExprCards(numbers, onTap) {
    el['expr-cards'].innerHTML = '';
    numbers.forEach(function (val) {
      var b = document.createElement('button');
      b.className = 'card';
      b.textContent = Solver.formatNumber(val);
      b.addEventListener('click', function () { onTap(val); });
      el['expr-cards'].appendChild(b);
    });
  }

  function renderExprOps(onOp, onBackspace, onClear) {
    el['expr-ops'].innerHTML = '';
    ['+', '-', '*', '/', '(', ')'].forEach(function (op) {
      var b = document.createElement('button');
      b.className = 'op-btn';
      b.textContent = Solver.opLabel(op);
      b.addEventListener('click', function () { onOp(op); });
      el['expr-ops'].appendChild(b);
    });
    var bs = document.createElement('button');
    bs.className = 'op-btn';
    bs.textContent = '⌫';
    bs.addEventListener('click', onBackspace);
    el['expr-ops'].appendChild(bs);
    var cl = document.createElement('button');
    cl.className = 'op-btn clear';
    cl.textContent = '清空';
    cl.addEventListener('click', onClear);
    el['expr-ops'].appendChild(cl);
  }

  function updateExprDisplay(tokens) {
    el['expr-display'].textContent = tokens.length === 0
      ? '（点击下方数字和符号）'
      : Solver.tokenToString(tokens) + ' = ?';
  }

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

  function updatePoints(points) { el['game-points'].textContent = '⭐ ' + points; }

  function animateMonsterHit() {
    el['game-monster'].classList.add('hit');
    setTimeout(function () { el['game-monster'].classList.remove('hit'); }, 400);
  }

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

  global.UI = {
    cache: cache,
    showScreen: showScreen,
    renderHome: renderHome,
    renderGameChrome: renderGameChrome,
    setHp: setHp,
    setQCounter: setQCounter,
    setModeUI: setModeUI,
    renderStepCards: renderStepCards,
    renderStepOps: renderStepOps,
    clearHistory: clearHistory,
    addHistoryLine: addHistoryLine,
    renderExprCards: renderExprCards,
    renderExprOps: renderExprOps,
    updateExprDisplay: updateExprDisplay,
    toast: toast,
    setMuteIcons: setMuteIcons,
    updatePoints: updatePoints,
    animateMonsterHit: animateMonsterHit,
    renderLevelUp: renderLevelUp,
    showTitleOverlay: showTitleOverlay,
    hideTitleOverlay: hideTitleOverlay,
  };
})(window);
