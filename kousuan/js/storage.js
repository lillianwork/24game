/* storage.js — localStorage 读写 */
(function (global) {
  'use strict';

  var KEY = 'kousuan_progress_v1';

  function defaultState() {
    return {
      level: 1,
      points: 0,
      muted: false,
    };
  }

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return defaultState();
      var data = JSON.parse(raw);
      var d = defaultState();
      for (var k in d) if (data[k] != null) d[k] = data[k];
      return d;
    } catch (e) {
      return defaultState();
    }
  }

  function save(state) {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (e) { /* 存储不可用时忽略 */ }
  }

  global.Storage = { load: load, save: save, defaultState: defaultState };
})(window);
