/* levels.js — 难度分级（6 个 band）/ title / 积分规则 */
(function (global) {
  'use strict';

  var TITLES = [
    { emoji: '🌱', name: '5以内',   max: 5   },
    { emoji: '🐣', name: '10以内',  max: 10  },
    { emoji: '🌟', name: '20以内',  max: 20  },
    { emoji: '🛡️', name: '30以内',  max: 30  },
    { emoji: '🏆', name: '50以内',  max: 50  },
    { emoji: '👑', name: '100以内', max: 100 },
  ];

  var MONSTERS = [
    { emoji: '🐛', color: '#8bc34a' },
    { emoji: '🐢', color: '#4caf50' },
    { emoji: '🦊', color: '#ff9800' },
    { emoji: '🐲', color: '#f44336' },
    { emoji: '👾', color: '#9c27b0' },
    { emoji: '🐉', color: '#e91e63' },
  ];

  var QUESTIONS_PER_LEVEL = 10;
  // 前 6 个 title 的关卡数：5以内 3 关，其余各 5 关；第 7 个（口算大师）起无限
  var TITLE_LEVELS = [3, 5, 5, 5, 5, 5];
  var LEVEL_BONUS = 50;
  var TITLE_BONUS = 200;

  function locate(level) {
    var l = level - 1;
    var idx = 0;
    while (idx < TITLE_LEVELS.length && l >= TITLE_LEVELS[idx]) {
      l -= TITLE_LEVELS[idx];
      idx++;
    }
    return { idx: idx, pos: l };
  }

  function titleIndex(level) { return locate(level).idx; }
  function posInTitle(level) { return locate(level).pos; }

  function getTitle(level) {
    var idx = titleIndex(level);
    if (idx < TITLES.length) return TITLES[idx];
    var star = idx - TITLES.length + 2;
    return { emoji: '👑', name: '口算大师 ★' + star, max: 100 };
  }

  function getMonster(level) {
    var idx = titleIndex(level);
    if (idx < MONSTERS.length) return MONSTERS[idx];
    return MONSTERS[MONSTERS.length - 1];
  }

  // band：0-based 难度索引，溢出时钳到 5
  function getBand(level) { return Math.min(titleIndex(level), TITLES.length - 1); }

  // 20/30/50以内带内线性爬坡；100以内（含口算大师）各题型随机出现
  function getDifficulty(level) {
    var band = getBand(level);
    var max = TITLES[band].max;
    var carryPct = 0;
    if (band >= 2 && band <= 4) {
      var p = posInTitle(level) / (TITLE_LEVELS[band] - 1);
      carryPct = Math.min(0.7, 0.15 + 0.55 * p);
    } else if (band >= 5) {
      carryPct = 0.5;
    }
    return { band: band, max: max, carryPct: carryPct };
  }

  function getPointsPerCorrect(level) {
    return 10 * (getBand(level) + 1);
  }

  global.Levels = {
    TITLES: TITLES,
    MONSTERS: MONSTERS,
    QUESTIONS_PER_LEVEL: QUESTIONS_PER_LEVEL,
    TITLE_LEVELS: TITLE_LEVELS,
    LEVEL_BONUS: LEVEL_BONUS,
    TITLE_BONUS: TITLE_BONUS,
    titleIndex: titleIndex,
    posInTitle: posInTitle,
    getTitle: getTitle,
    getMonster: getMonster,
    getBand: getBand,
    getDifficulty: getDifficulty,
    getPointsPerCorrect: getPointsPerCorrect,
  };
})(window);
