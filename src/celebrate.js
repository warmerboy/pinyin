// 庆祝编排：撒花 / 横幅 / 整组结束动画
window.App = window.App || {};

(function (App) {
  // ---- 粒子撒花系统（用矢量图形而非 emoji 文字，性能高 5~10 倍） ----
  let canvas = null, ctx2d = null, particles = [], rafId = null;
  const MAX_PARTICLES = 160;
  const COLORS = ['#ff8a3d', '#ff8aa6', '#ffce5e', '#7ed8b8', '#9ec5ff', '#c79bff', '#ffb3a0', '#fff075'];
  // 形状种类：0 圆 / 1 五角星 / 2 心 / 3 方片
  const SHAPE_KINDS = 4;

  // 预生成五角星路径点（半径 1，顶点向上）
  const STAR_PTS = (() => {
    const arr = [];
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const r = i % 2 === 0 ? 1 : 0.45;
      arr.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
    return arr;
  })();

  function ensureCanvas() {
    if (canvas) return canvas;
    canvas = document.getElementById('celebrate-canvas');
    if (!canvas) return null;
    ctx2d = canvas.getContext('2d', { alpha: true, desynchronized: true });
    resize();
    window.addEventListener('resize', resize);
    return canvas;
  }

  // DPR 固定为 1：撒花视觉模糊一点点完全察觉不到，但像素数减少 4 倍
  function resize() {
    if (!canvas) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';
  }

  function rand(a, b) { return a + Math.random() * (b - a); }

  function emit(count, options) {
    if (!ensureCanvas()) return;
    options = options || {};
    const cx = options.x != null ? options.x : window.innerWidth / 2;
    const cy = options.y != null ? options.y : window.innerHeight * 0.35;
    const upward = options.upward !== false;

    // 留 20% 余量给后续 emit 也能加进来
    const room = MAX_PARTICLES - particles.length;
    const real = Math.min(count, room);

    for (let i = 0; i < real; i++) {
      const angle = upward
        ? rand(-Math.PI * 0.85, -Math.PI * 0.15)
        : rand(0, Math.PI * 2);
      const speed = rand(4, 11);
      particles.push({
        x: cx + rand(-30, 30),
        y: cy + rand(-10, 10),
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - rand(2, 4),
        rot: rand(0, Math.PI * 2),
        vr: rand(-0.2, 0.2),
        life: rand(50, 100),
        size: rand(8, 16),
        kind: Math.floor(Math.random() * SHAPE_KINDS),
        color: COLORS[Math.floor(Math.random() * COLORS.length)]
      });
    }
    if (!rafId) loop();
  }

  function drawShape(kind, size) {
    // 已经 translate + rotate；以原点为中心绘制
    if (kind === 0) {
      // 圆（最快）
      ctx2d.beginPath();
      ctx2d.arc(0, 0, size * 0.5, 0, Math.PI * 2);
      ctx2d.fill();
    } else if (kind === 1) {
      // 五角星
      ctx2d.beginPath();
      for (let i = 0; i < STAR_PTS.length; i++) {
        const x = STAR_PTS[i][0] * size;
        const y = STAR_PTS[i][1] * size;
        if (i === 0) ctx2d.moveTo(x, y); else ctx2d.lineTo(x, y);
      }
      ctx2d.closePath();
      ctx2d.fill();
    } else if (kind === 2) {
      // 简化的心形（两段贝塞尔）
      const s = size * 0.5;
      ctx2d.beginPath();
      ctx2d.moveTo(0, s * 0.6);
      ctx2d.bezierCurveTo(s * 1.2, -s * 0.5, s * 0.5, -s * 1.2, 0, -s * 0.4);
      ctx2d.bezierCurveTo(-s * 0.5, -s * 1.2, -s * 1.2, -s * 0.5, 0, s * 0.6);
      ctx2d.fill();
    } else {
      // 长方形彩纸片
      const w = size * 0.7, h = size * 1.1;
      ctx2d.fillRect(-w / 2, -h / 2, w, h);
    }
  }

  function loop() {
    if (!ctx2d) return;
    const W = window.innerWidth, H = window.innerHeight;
    ctx2d.clearRect(0, 0, W, H);

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.vy += 0.20;     // gravity
      p.vx *= 0.995;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;
      p.life -= 1;

      const alpha = p.life > 50 ? 1 : Math.max(0, p.life / 50);
      ctx2d.globalAlpha = alpha;
      ctx2d.fillStyle = p.color;
      ctx2d.setTransform(1, 0, 0, 1, p.x, p.y);
      ctx2d.rotate(p.rot);
      drawShape(p.kind, p.size);

      if (p.life <= 0 || p.y > H + 40) {
        particles.splice(i, 1);
      }
    }
    // 还原 transform
    ctx2d.setTransform(1, 0, 0, 1, 0, 0);
    ctx2d.globalAlpha = 1;

    if (particles.length > 0) {
      rafId = requestAnimationFrame(loop);
    } else {
      ctx2d.clearRect(0, 0, W, H);
      rafId = null;
    }
  }

  // ---- 屏中横幅（连对 X！） ----
  let bannerEl = null, bannerTimer = null;
  function showBanner(text, sub) {
    if (!bannerEl) {
      bannerEl = document.createElement('div');
      bannerEl.className = 'banner';
      document.body.appendChild(bannerEl);
    }
    bannerEl.innerHTML = '<div class="banner-main">' + text + '</div>'
                       + (sub ? '<div class="banner-sub">' + sub + '</div>' : '');
    bannerEl.classList.remove('show');
    void bannerEl.offsetWidth;
    bannerEl.classList.add('show');
    if (bannerTimer) clearTimeout(bannerTimer);
    bannerTimer = setTimeout(() => bannerEl && bannerEl.classList.remove('show'), 1500);
  }

  // ---- 卡片闪烁（单题对） ----
  function flashCard() {
    const card = document.querySelector('.card');
    if (!card) return;
    card.classList.remove('flash');
    void card.offsetWidth;
    card.classList.add('flash');
    setTimeout(() => card && card.classList.remove('flash'), 500);
  }

  // ---- 高层 API ----

  // 单题对：小庆祝
  function smallCorrect() {
    flashCard();
    App.Sounds && App.Sounds.playPop();
    App.Mascot && App.Mascot.happy();
    // 在卡片中心射出 8 颗小星
    const card = document.querySelector('.card');
    if (card) {
      const r = card.getBoundingClientRect();
      emit(10, { x: r.left + r.width / 2, y: r.top + r.height / 2, upward: true });
    } else {
      emit(8);
    }
  }

  // 连对 3 / 5 / 7 升级
  function streakLevelUp(level, current) {
    const cnt = current || (3 + (level - 1) * 2);
    if (level === 1) {
      showBanner('连对 ' + cnt + '!', '继续保持！');
      App.Sounds && App.Sounds.playChime();
      App.Sounds && App.Sounds.speakPraise();
      App.Mascot && App.Mascot.happy();
      emit(40);
    } else if (level === 2) {
      showBanner('连对 ' + cnt + '!', '太棒啦！');
      App.Sounds && App.Sounds.playFanfare();
      App.Sounds && App.Sounds.speakFanfare();
      App.Mascot && App.Mascot.cheer();
      emit(80);
      setTimeout(() => emit(40), 300);
    } else if (level >= 3) {
      showBanner('连对 ' + cnt + '!', '你是小天才！');
      App.Sounds && App.Sounds.playCheer();
      App.Sounds && App.Sounds.speakFanfare();
      App.Mascot && App.Mascot.cheer();
      emit(120);
      setTimeout(() => emit(80), 250);
      setTimeout(() => emit(60), 600);
    }
  }

  // 不熟 / 不会：温和反馈
  function gentle(result) {
    App.Mascot && App.Mascot.encourage();
    if (result === '不熟') {
      const card = document.querySelector('.card');
      if (card) {
        const r = card.getBoundingClientRect();
        emit(5, { x: r.left + r.width / 2, y: r.top + r.height / 2, upward: true });
      }
    }
  }

  // 整组结束：根据 score 0..1 做不同强度
  // cb：动画播放完后调用（让 app 跳转 report）
  function setComplete(score, cb) {
    let delay = 1200;
    if (score >= 1) {
      showBanner('全部答对！', '太厉害啦！');
      App.Sounds && App.Sounds.playApplause();
      App.Sounds && App.Sounds.playCheer();
      App.Sounds && App.Sounds.speakSetResult(score);
      App.Mascot && App.Mascot.cheer();
      // 满屏雨：分波次发射
      const wave = () => {
        emit(60, { y: -20, upward: false });
        emit(40, { x: 100, y: -20, upward: false });
        emit(40, { x: window.innerWidth - 100, y: -20, upward: false });
      };
      wave();
      setTimeout(wave, 400);
      setTimeout(wave, 800);
      setTimeout(wave, 1200);
      delay = 2400;
    } else if (score >= 0.8) {
      showBanner('做得真棒！', '继续保持哦！');
      App.Sounds && App.Sounds.playApplause();
      App.Sounds && App.Sounds.speakSetResult(score);
      App.Mascot && App.Mascot.cheer();
      emit(80, { y: 80, upward: true });
      setTimeout(() => emit(60), 350);
      delay = 1800;
    } else if (score >= 0.6) {
      showBanner('继续加油！', '');
      App.Sounds && App.Sounds.playChime();
      App.Sounds && App.Sounds.speakSetResult(score);
      App.Mascot && App.Mascot.happy();
      emit(40);
      delay = 1400;
    } else {
      showBanner('没关系~', '我们再练一组吧！');
      App.Sounds && App.Sounds.speakSetResult(score);
      App.Mascot && App.Mascot.encourage();
      delay = 1400;
    }
    if (cb) setTimeout(cb, delay);
  }

  App.Celebrate = { smallCorrect, streakLevelUp, gentle, setComplete, emit, showBanner };
})(window.App);
