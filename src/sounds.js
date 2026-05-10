// 三层声音：TTS 鼓励语 + Web Audio 合成 + 可选 MP3
window.App = window.App || {};

(function (App) {
  let ctx = null;
  let enabled = true;

  // 缓存：MP3 对象（HTMLAudio）；没找到的标记为 null 不再重试
  const mp3Cache = {}; // name → HTMLAudioElement | null | 'pending'

  const PRAISE_PHRASES = [
    '真棒!', '太厉害啦!', '继续加油!', '完美!', '你好棒!',
    '哇，对啦!', '宝贝真聪明!', '这个也会，太厉害啦!',
    '答对啦!', '继续保持哦!'
  ];
  const FANFARE_PHRASES = [
    '哇！连对好多题啦！', '太棒了，你是小天才！', '继续保持，超级厉害！'
  ];
  const SET_DONE_PERFECT = ['你太厉害啦，全部答对！', '满分！宝贝是天才！'];
  const SET_DONE_GOOD    = ['做得真棒！', '今天表现很好哦！'];
  const SET_DONE_OK      = ['继续加油哦！', '不错哦，再接再厉！'];
  const SET_DONE_TRY     = ['没关系，下次一定会更好哦！', '我们再练一组就更熟啦！'];

  function init() {
    if (ctx) return ctx;
    try {
      const Ctor = window.AudioContext || window.webkitAudioContext;
      if (Ctor) ctx = new Ctor();
    } catch (e) { ctx = null; }
    return ctx;
  }

  function ensureRunning() {
    if (!ctx) init();
    if (ctx && ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function setEnabled(v) { enabled = !!v; }
  function isEnabled() { return enabled; }

  // ---- Web Audio 合成 ----

  function tone(freq, dur, when, type, gain) {
    if (!ctx) return;
    const t = (when || 0) + ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain || 0.25, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  // 短"啵"声，单题对了
  function playPop() {
    if (!enabled) return;
    if (!ensureRunning()) return;
    tone(880, 0.12, 0, 'sine', 0.18);
    tone(1320, 0.10, 0.04, 'triangle', 0.12);
  }

  // 三音上行（C5-E5-G5）
  function playChime() {
    if (!enabled) return;
    if (!ensureRunning()) return;
    [523.25, 659.25, 783.99].forEach((f, i) => {
      tone(f, 0.35, i * 0.10, 'triangle', 0.22);
    });
  }

  // 成功号角：三音和弦 + 一记上扬
  function playFanfare() {
    if (!enabled) return;
    if (!ensureRunning()) return;
    [392, 523.25, 659.25, 783.99].forEach((f, i) => {
      tone(f, 0.45, i * 0.08, 'triangle', 0.18);
    });
    tone(1046.5, 0.55, 0.40, 'sine', 0.20);
  }

  // 白噪声脉冲模拟掌声
  function synthApplause(durSec) {
    if (!ctx) return;
    const dur = durSec || 1.6;
    const buffer = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      // 多个随机峰叠加
      const t = i / ctx.sampleRate;
      const env = Math.exp(-t * 1.2);
      data[i] = (Math.random() * 2 - 1) * env * (0.5 + 0.5 * Math.sin(t * 30));
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 2500;
    filter.Q.value = 0.6;
    const g = ctx.createGain();
    g.gain.value = 0.35;
    src.connect(filter).connect(g).connect(ctx.destination);
    src.start();
  }

  // ---- 真实 MP3 优雅降级 ----

  function tryMp3(name) {
    // name: 'cheer' | 'applause' | 'ding'
    if (mp3Cache[name] === null) return null;          // 已知不存在
    if (mp3Cache[name] && mp3Cache[name] !== 'pending') return mp3Cache[name];
    if (mp3Cache[name] === 'pending') return null;

    mp3Cache[name] = 'pending';
    const audio = new Audio('assets/sounds/' + name + '.mp3');
    audio.preload = 'auto';
    audio.addEventListener('canplaythrough', () => { mp3Cache[name] = audio; }, { once: true });
    audio.addEventListener('error', () => { mp3Cache[name] = null; }, { once: true });
    audio.load();
    return null; // 首次还在加载，先用合成
  }

  function playApplause() {
    if (!enabled) return;
    ensureRunning();
    const a = tryMp3('applause');
    if (a) {
      try { a.currentTime = 0; a.volume = 0.6; a.play().catch(()=>{}); return; } catch (e) {}
    }
    synthApplause(1.4);
  }

  function playCheer() {
    if (!enabled) return;
    ensureRunning();
    const a = tryMp3('cheer');
    if (a) {
      try { a.currentTime = 0; a.volume = 0.6; a.play().catch(()=>{}); return; } catch (e) {}
    }
    playFanfare();
  }

  function playDing() {
    if (!enabled) return;
    ensureRunning();
    const a = tryMp3('ding');
    if (a) {
      try { a.currentTime = 0; a.volume = 0.5; a.play().catch(()=>{}); return; } catch (e) {}
    }
    playPop();
  }

  // ---- TTS 鼓励语 ----

  function pickFrom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  function speak(text) {
    if (!enabled) return;
    if (!('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'zh-CN';
      u.rate = 1.0;
      u.pitch = 1.2;
      u.volume = 0.9;
      window.speechSynthesis.speak(u);
    } catch (e) {}
  }

  function speakPraise() { speak(pickFrom(PRAISE_PHRASES)); }
  function speakFanfare() { speak(pickFrom(FANFARE_PHRASES)); }
  function speakSetResult(score) {
    if (score >= 1) speak(pickFrom(SET_DONE_PERFECT));
    else if (score >= 0.8) speak(pickFrom(SET_DONE_GOOD));
    else if (score >= 0.6) speak(pickFrom(SET_DONE_OK));
    else speak(pickFrom(SET_DONE_TRY));
  }

  App.Sounds = {
    init, ensureRunning,
    setEnabled, isEnabled,
    playPop, playChime, playFanfare,
    playApplause, playCheer, playDing,
    speak, speakPraise, speakFanfare, speakSetResult
  };
})(window.App);
