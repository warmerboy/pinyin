// 小熊猫 mascot：SVG + 状态机
window.App = window.App || {};

(function (App) {
  // 内嵌 SVG。viewBox 200x220，颜色用 currentColor 让 CSS 可调。
  const SVG = `
<svg class="mascot-svg" viewBox="0 0 200 220" xmlns="http://www.w3.org/2000/svg">
  <!-- 头顶星星（cheer 状态显示） -->
  <g class="m-stars">
    <text x="40"  y="22" class="m-star">✨</text>
    <text x="100" y="14" class="m-star">⭐</text>
    <text x="160" y="22" class="m-star">✨</text>
  </g>
  <!-- 身体 -->
  <g class="m-body">
    <!-- 耳朵 -->
    <ellipse cx="55"  cy="48" rx="20" ry="22" fill="#3a2e26"/>
    <ellipse cx="145" cy="48" rx="20" ry="22" fill="#3a2e26"/>
    <ellipse cx="55"  cy="50" rx="10" ry="12" fill="#7a5b48"/>
    <ellipse cx="145" cy="50" rx="10" ry="12" fill="#7a5b48"/>
    <!-- 头 -->
    <ellipse cx="100" cy="95" rx="62" ry="55" fill="#fff5e6"/>
    <!-- 眼罩 -->
    <ellipse class="m-eye-patch" cx="72"  cy="92" rx="14" ry="18" fill="#3a2e26"/>
    <ellipse class="m-eye-patch" cx="128" cy="92" rx="14" ry="18" fill="#3a2e26"/>
    <!-- 眼睛（idle/encourage 圆睁；happy/cheer 笑眯眯） -->
    <g class="m-eyes-open">
      <circle cx="72"  cy="92" r="5" fill="#fff"/>
      <circle cx="128" cy="92" r="5" fill="#fff"/>
      <circle cx="73"  cy="93" r="2.5" fill="#1a1a1a"/>
      <circle cx="129" cy="93" r="2.5" fill="#1a1a1a"/>
    </g>
    <g class="m-eyes-happy">
      <path d="M 64 92 Q 72 84 80 92" stroke="#1a1a1a" stroke-width="3" fill="none" stroke-linecap="round"/>
      <path d="M 120 92 Q 128 84 136 92" stroke="#1a1a1a" stroke-width="3" fill="none" stroke-linecap="round"/>
    </g>
    <!-- 鼻子 -->
    <ellipse cx="100" cy="108" rx="6" ry="4" fill="#1a1a1a"/>
    <!-- 嘴巴 -->
    <path class="m-mouth-idle" d="M 92 122 Q 100 128 108 122" stroke="#1a1a1a" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    <path class="m-mouth-smile" d="M 86 120 Q 100 138 114 120" stroke="#1a1a1a" stroke-width="3" fill="#ff8aa6" stroke-linecap="round"/>
    <!-- 腮红 -->
    <ellipse cx="55"  cy="118" rx="9" ry="5" fill="#ffb3a0" opacity="0.7"/>
    <ellipse cx="145" cy="118" rx="9" ry="5" fill="#ffb3a0" opacity="0.7"/>
    <!-- 身体 -->
    <ellipse cx="100" cy="180" rx="50" ry="32" fill="#fff5e6"/>
    <!-- 手臂（默认垂下，cheer 时举起） -->
    <g class="m-arm-left">
      <ellipse cx="55" cy="170" rx="14" ry="20" fill="#3a2e26"/>
    </g>
    <g class="m-arm-right">
      <ellipse cx="145" cy="170" rx="14" ry="20" fill="#3a2e26"/>
    </g>
    <!-- encourage 状态：举一个"没关系"小牌子 -->
    <g class="m-sign">
      <rect x="60" y="138" width="80" height="36" rx="8" fill="#fff" stroke="#ff8a3d" stroke-width="2"/>
      <text x="100" y="162" text-anchor="middle" font-size="14" fill="#4a3b2a">没关系~</text>
    </g>
  </g>
</svg>`;

  let host = null;
  let mood = 'idle';
  let blinkTimer = null;

  function mount(container, initialMood) {
    if (!container) return;
    host = container;
    host.classList.add('mascot');
    host.innerHTML = SVG;
    setMood(initialMood || 'idle');
    startBlink();
  }

  function setMood(m) {
    if (!host) return;
    mood = m;
    host.classList.remove('mood-idle', 'mood-happy', 'mood-cheer', 'mood-encourage');
    host.classList.add('mood-' + m);
  }

  function pulse() {
    if (!host) return;
    host.classList.remove('mascot-bounce');
    // 强制 reflow 让动画重启
    void host.offsetWidth;
    host.classList.add('mascot-bounce');
  }

  function cheer() {
    setMood('cheer');
    pulse();
    if (host && host.dataset.cheerTimer) clearTimeout(+host.dataset.cheerTimer);
    if (host) {
      const tid = setTimeout(() => setMood('idle'), 1800);
      host.dataset.cheerTimer = tid;
    }
  }

  function happy() {
    setMood('happy');
    pulse();
    if (host && host.dataset.happyTimer) clearTimeout(+host.dataset.happyTimer);
    if (host) {
      const tid = setTimeout(() => setMood('idle'), 900);
      host.dataset.happyTimer = tid;
    }
  }

  function encourage() {
    setMood('encourage');
    if (host && host.dataset.encTimer) clearTimeout(+host.dataset.encTimer);
    if (host) {
      const tid = setTimeout(() => setMood('idle'), 1600);
      host.dataset.encTimer = tid;
    }
  }

  function startBlink() {
    if (blinkTimer) clearInterval(blinkTimer);
    blinkTimer = setInterval(() => {
      if (!host || mood !== 'idle') return;
      host.classList.add('blinking');
      setTimeout(() => host && host.classList.remove('blinking'), 180);
    }, 3500);
  }

  App.Mascot = { mount, setMood, pulse, cheer, happy, encourage };
})(window.App);
