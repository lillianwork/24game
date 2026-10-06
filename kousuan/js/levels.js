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
  var LEVELS_PER_TITLE = 10;
  var LEVEL_BONUS = 50;
  var TITLE_BONUS = 200;

  function titleIndex(level) { return Math.floor((level - 1) / LEVELS_PER_TITLE); }
  function posInTitle(level) { return (level - 1) % LEVELS_PER_TITLE; }

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

  // 难度：max + 进位/退位概率（带内线性爬坡）
  function getDifficulty(level) {
    var band = getBand(level);
    var p = posInTitle(level) / (LEVELS_PER_TITLE - 1);
    var max = TITLES[band].max;
    var carryPct = band <= 1 ? 0 : Math.min(0.7, 0.15 + 0.55 * p);
    return { band: band, max: max, carryPct: carryPct };
  }

  function getPointsPerCorrect(level) {
    return 10 * (getBand(level) + 1);
  }

  global.Levels = {
    TITLES: TITLES,
    MONSTERS: MONSTERS,
    QUESTIONS_PER_LEVEL: QUESTIONS_PER_LEVEL,
    LEVELS_PER_TITLE: LEVELS_PER_TITLE,
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
