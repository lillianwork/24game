/* levels.js — title / 难度分级 / 积分规则 */
(function (global) {
  'use strict';

  var GRADES = [
    { id: 'K',  emoji: '🎈', name: '幼儿园' },
    { id: 'G1', emoji: '📚', name: '一年级' },
    { id: 'G2', emoji: '✏️', name: '二年级' },
    { id: 'G3', emoji: '🧮', name: '三年级及以上' },
  ];

  var TITLES = [
    { emoji: '🌱', name: '新芽小学徒' },
    { emoji: '🐣', name: '数字小勇士' },
    { emoji: '🌟', name: '算术小达人' },
    { emoji: '🛡️', name: '24点小骑士' },
    { emoji: '🏆', name: '数学小英雄' },
    { emoji: '⚔️', name: '算术大将军' },
    { emoji: '👑', name: '24点大师' },
  ];

  var MONSTERS = [
    { emoji: '🐛', color: '#8bc34a' },
    { emoji: '🐢', color: '#4caf50' },
    { emoji: '🦊', color: '#ff9800' },
    { emoji: '🐲', color: '#f44336' },
    { emoji: '👾', color: '#9c27b0' },
    { emoji: '🤖', color: '#2196f3' },
    { emoji: '🐉', color: '#e91e63' },
  ];

  var QUESTIONS_PER_LEVEL = 10;
  var LEVELS_PER_TITLE = 10;
  var TARGET = 24;
  var LEVEL_BONUS = 50;
  var TITLE_BONUS = 200;

  function titleIndex(level) { return Math.floor((level - 1) / LEVELS_PER_TITLE); }
  function posInTitle(level) { return (level - 1) % LEVELS_PER_TITLE; }

  function getTitle(level) {
    var idx = titleIndex(level);
    if (idx < TITLES.length) return TITLES[idx];
    var star = idx - TITLES.length + 2;
    return { emoji: '👑', name: '传奇大师 ★' + star };
  }

  function getMonster(level) {
    var idx = titleIndex(level);
    if (idx < MONSTERS.length) return MONSTERS[idx];
    return MONSTERS[MONSTERS.length - 1];
  }

  // 难度分级：数字个数 + 运算符
  function getStage(level) {
    var t = titleIndex(level);
    if (t === 0) return { count: 2, ops: ['+', '-'] };
    if (t === 1) return { count: 3, ops: ['+', '-'] };
    if (t === 2) return { count: 4, ops: ['+', '-'] };
    return { count: 4, ops: ['+', '-', '*', '/'] };
  }

  // 数字范围：随 level 递增
  function getNumberRange(level) {
    var t = titleIndex(level);
    var p = posInTitle(level);
    var f = p / (LEVELS_PER_TITLE - 1);
    var max;
    if (t === 0)      max = 18 + Math.round(22 * f);      // 18..40（2个数加减）
    else if (t === 1) max = 14 + Math.round(16 * f);      // 14..30（3个数加减）
    else if (t === 2) max = 10 + Math.round(20 * f);      // 10..30（4个数加减）
    else if (t === 3) max = 9 + Math.round(12 * f);       // 9..21（混合入门）
    else              max = Math.min(60, 20 + (t - 3) * 4 + Math.round(10 * f)); // 无限递增
    return { min: 1, max: max };
  }

  function getPointsPerCorrect(level) {
    var t = titleIndex(level);
    var mult = t === 0 ? 1 : t === 1 ? 2 : t === 2 ? 3 : 4;
    return 10 * mult;
  }

  function isExprAllowed(grade) {
    return grade === 'G3';
  }

  global.Levels = {
    GRADES: GRADES,
    TITLES: TITLES,
    MONSTERS: MONSTERS,
    QUESTIONS_PER_LEVEL: QUESTIONS_PER_LEVEL,
    LEVELS_PER_TITLE: LEVELS_PER_TITLE,
    TARGET: TARGET,
    LEVEL_BONUS: LEVEL_BONUS,
    TITLE_BONUS: TITLE_BONUS,
    titleIndex: titleIndex,
    posInTitle: posInTitle,
    getTitle: getTitle,
    getMonster: getMonster,
    getStage: getStage,
    getNumberRange: getNumberRange,
    getPointsPerCorrect: getPointsPerCorrect,
    isExprAllowed: isExprAllowed,
  };
})(window);
