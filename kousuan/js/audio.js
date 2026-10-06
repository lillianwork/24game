/* audio.js — Web Audio 音效引擎（实时合成，无外部文件） */
(function (global) {
  'use strict';

  var ctx = null;
  var master = null;
  var muted = false;

  function init() {
    if (ctx) return;
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      // iOS 17+ 默认 audioSession 为 ambient，静音键会静音 Web Audio；设为 playback 保证出声
      if (navigator.audioSession && navigator.audioSession.type) {
        try { navigator.audioSession.type = 'playback'; } catch (e) {}
      }
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 0.7;
      master.connect(ctx.destination);
    } catch (e) { /* 无音频支持时静默 */ }
  }

  function resume() {
    if (ctx && ctx.state === 'suspended') {
      var p = ctx.resume();
      if (p && p.then) p.catch(function () {});
    }
  }

  function setMuted(m) {
    muted = !!m;
    if (master) master.gain.value = muted ? 0 : 0.7;
    if (muted) stopSpeak();
  }
  function isMuted() { return muted; }

  function tone(freq, start, dur, type, peak, endFreq) {
    if (!ctx || !master) return;
    var osc = ctx.createOscillator();
    var g = ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, start);
    if (endFreq) osc.frequency.exponentialRampToValueAtTime(endFreq, start + dur);
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(peak || 0.3, start + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    osc.connect(g);
    g.connect(master);
    osc.start(start);
    osc.stop(start + dur + 0.02);
  }

  function noiseBurst(start, dur, peak) {
    if (!ctx || !master) return;
    var bufferSize = Math.floor(ctx.sampleRate * dur);
    var buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    var data = buffer.getChannelData(0);
    for (var i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    var src = ctx.createBufferSource();
    src.buffer = buffer;
    var g = ctx.createGain();
    g.gain.value = peak || 0.3;
    var filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 900;
    src.connect(filter);
    filter.connect(g);
    g.connect(master);
    src.start(start);
  }

  function play(name) {
    init();
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      var p = ctx.resume();
      if (p && p.then) { p.then(function () { schedule(name); }); return; }
    }
    schedule(name);
  }

  function schedule(name) {
    var t = ctx.currentTime;
    switch (name) {
      case 'tap':
        tone(700, t, 0.06, 'triangle', 0.15);
        break;
      case 'correct':
        tone(523.25, t, 0.15, 'triangle', 0.3);
        tone(659.25, t + 0.1, 0.15, 'triangle', 0.3);
        tone(783.99, t + 0.2, 0.15, 'triangle', 0.3);
        tone(1046.5, t + 0.3, 0.3, 'triangle', 0.35);
        break;
      case 'wrong':
        tone(329.63, t, 0.18, 'sawtooth', 0.16, 250);
        tone(261.63, t + 0.18, 0.3, 'sawtooth', 0.16, 200);
        break;
      case 'point':
        tone(1400, t, 0.12, 'sine', 0.2);
        break;
      case 'levelUp':
        tone(523.25, t, 0.12, 'square', 0.22);
        tone(659.25, t + 0.12, 0.12, 'square', 0.22);
        tone(783.99, t + 0.24, 0.12, 'square', 0.22);
        tone(1046.5, t + 0.36, 0.4, 'square', 0.3);
        break;
      case 'titleUp':
        tone(523.25, t, 0.1, 'square', 0.25);
        tone(659.25, t + 0.1, 0.1, 'square', 0.25);
        tone(783.99, t + 0.2, 0.1, 'square', 0.25);
        tone(1046.5, t + 0.3, 0.12, 'square', 0.3);
        tone(1318.5, t + 0.42, 0.4, 'square', 0.32);
        noiseBurst(t + 0.42, 0.3, 0.3);
        break;
      case 'hint':
        tone(880, t, 0.1, 'sine', 0.2);
        tone(1100, t + 0.1, 0.1, 'sine', 0.2);
        break;
    }
  }

  // 语音朗读：Web Speech API 合成中文，把算式符号转成口语（尊重静音）
  function speak(text) {
    if (muted) return;
    if (!('speechSynthesis' in window)) return;
    try {
      stopSpeak();
      var clean = String(text)
        .replace(/\s*\+\s*/g, ' 加 ')
        .replace(/\s*-\s*/g, ' 减 ')
        .replace(/\s*=\s*/g, ' 等于 ')
        .replace(/\s*\?\s*/g, ' 几 ')
        .replace(/（/g, '，').replace(/）/g, '');
      var u = new SpeechSynthesisUtterance(clean);
      u.lang = 'zh-CN';
      u.rate = 0.9;
      window.speechSynthesis.speak(u);
    } catch (e) {}
  }

  function stopSpeak() {
    if ('speechSynthesis' in window) {
      try { window.speechSynthesis.cancel(); } catch (e) {}
    }
  }

  global.AudioFX = {
    init: init, play: play, setMuted: setMuted, isMuted: isMuted, resume: resume,
    speak: speak, stopSpeak: stopSpeak,
  };
})(window);
