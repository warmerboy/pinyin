// 视图切换、事件绑定、TTS 调用、庆祝接入
(function () {
  const App = window.App;

  // 当前练习会话
  let session = null; // { questions, index, answers, prevStreakLevel }

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $all(sel, root) { return Array.from((root || document).querySelectorAll(sel)); }

  function mount(viewName) {
    const tpl = document.getElementById('view-' + viewName);
    if (!tpl) return;
    const main = document.getElementById('app');
    main.innerHTML = '';
    main.appendChild(tpl.content.cloneNode(true));

    if (viewName === 'home')     renderHome();
    if (viewName === 'settings') renderSettings();
    if (viewName === 'practice') renderPractice();
    if (viewName === 'report')   renderReport();
    if (viewName === 'history')  renderHistory();
  }

  function navigate(viewName) {
    location.hash = '#/' + viewName;
  }

  function currentView() {
    const m = (location.hash || '').match(/^#\/(\w+)/);
    return m ? m[1] : 'home';
  }

  // ---- 主页 ----
  function renderHome() {
    const settings = App.getSettings();
    const total = settings.selectedShengmu.length
                + settings.selectedYunmu.length
                + settings.selectedZhengti.length;
    const status = $('#home-status');
    if (total === 0) {
      status.textContent = '提示：还没有勾选任何拼音元素，先去"设置"里勾一下。';
    } else {
      status.textContent = '已勾选 ' + total + ' 个元素，每组 ' + settings.questionsPerSet + ' 题。';
    }

    const mascotHost = $('.home-mascot');
    if (mascotHost && App.Mascot) App.Mascot.mount(mascotHost, 'idle');

    refreshSoundIcon();
  }

  // ---- 设置页 ----
  function renderSettings() {
    const settings = App.getSettings();
    fillGrid('#grid-shengmu', App.SHENGMU,  settings.selectedShengmu);
    fillGrid('#grid-yunmu',   App.YUNMU,    settings.selectedYunmu);
    fillGrid('#grid-zhengti', App.ZHENGTI,  settings.selectedZhengti);
    $('#qps').value = settings.questionsPerSet;
    refreshSoundIcon();
  }

  function fillGrid(sel, items, selected) {
    const grid = $(sel);
    grid.innerHTML = '';
    const set = new Set(selected);
    items.forEach(item => {
      const cell = document.createElement('div');
      cell.className = 'cell' + (set.has(item) ? ' checked' : '');
      cell.dataset.cell = item;
      cell.dataset.value = item;
      cell.textContent = item;
      grid.appendChild(cell);
    });
  }

  function readGrid(sel) {
    return $all(sel + ' .cell.checked').map(c => c.dataset.value);
  }

  function saveSettingsFromUI() {
    const qps = parseInt($('#qps').value, 10);
    App.saveSettings({
      selectedShengmu: readGrid('#grid-shengmu'),
      selectedYunmu:   readGrid('#grid-yunmu'),
      selectedZhengti: readGrid('#grid-zhengti'),
      questionsPerSet: (qps > 0 && qps <= 50) ? qps : 10
    });
    navigate('home');
  }

  // ---- 开始练习 ----
  function startPractice() {
    const settings = App.getSettings();
    const history = App.getHistory();
    const questions = App.generate(
      settings.selectedShengmu,
      settings.selectedYunmu,
      settings.selectedZhengti,
      settings.questionsPerSet,
      history
    );
    if (questions.length === 0) {
      alert('当前勾选的元素拼不出任何合法音节。请到"设置"里多勾一些声母 / 韵母 / 整体认读音节。');
      navigate('settings');
      return;
    }
    session = { questions, index: 0, answers: [], prevStreakLevel: 0 };
    if (App.Streak) App.Streak.reset();
    if (App.Sounds) { App.Sounds.init(); App.Sounds.setEnabled(!!App.getSettings().soundEnabled); }
    navigate('practice');
  }

  // ---- 练习页 ----
  function renderPractice() {
    if (!session) {
      navigate('home');
      return;
    }
    const q = session.questions[session.index];
    $('#pinyin-display').textContent = q.pinyin;

    // 进度星星
    const total = session.questions.length;
    const done = session.index;
    const stars = $('#star-progress');
    if (stars) {
      stars.innerHTML = '';
      for (let i = 0; i < total; i++) {
        const span = document.createElement('span');
        span.className = i < done ? 'lit' : 'dim';
        span.textContent = '⭐';
        stars.appendChild(span);
      }
    }

    // 连对显示
    const sb = $('#streak-badge');
    if (sb && App.Streak) {
      const cur = App.Streak.get().current;
      sb.textContent = cur >= 2 ? ('🔥 连对 ' + cur) : '';
      if (cur >= 2) {
        sb.classList.remove('show');
        void sb.offsetWidth;
        sb.classList.add('show');
      }
    }

    const mascotHost = $('.practice-mascot');
    if (mascotHost && App.Mascot && !mascotHost.querySelector('svg')) {
      App.Mascot.mount(mascotHost, 'idle');
    }
  }

  function judge(result) {
    if (!session) return;
    const q = session.questions[session.index];
    App.recordAnswer(q, result);
    session.answers.push({ question: q, result });

    if (App.Streak) App.Streak.onAnswer(result);

    // 即时庆祝
    if (App.Celebrate) {
      if (result === '会') {
        App.Celebrate.smallCorrect();
        if (App.Streak && App.Streak.isMilestone()) {
          const lvl = App.Streak.level();
          App.Celebrate.streakLevelUp(lvl, App.Streak.get().current);
        }
      } else {
        App.Celebrate.gentle(result);
      }
    }

    session.index++;
    if (session.index >= session.questions.length) {
      // 整组结束：先播庆祝再跳报告
      const sum = App.summarizeSession(session.answers);
      const total = session.answers.length;
      const score = total > 0 ? sum.ok.length / total : 0;
      const goReport = () => navigate('report');
      if (App.Celebrate) {
        App.Celebrate.setComplete(score, goReport);
      } else {
        goReport();
      }
    } else {
      renderPractice();
    }
  }

  // ---- 报告页 ----
  function renderReport() {
    if (!session) {
      navigate('home');
      return;
    }
    const sum = App.summarizeSession(session.answers);
    $('#cnt-ok').textContent    = sum.ok.length;
    $('#cnt-fuzzy').textContent = sum.fuzzy.length;
    $('#cnt-no').textContent    = sum.no.length;

    const chip = (q, cls) => '<span class="chip ' + cls + '">' + q.pinyin + '</span>';

    const weakHtml = [...sum.no.map(q => chip(q, 'no')), ...sum.fuzzy.map(q => chip(q, 'fuzzy'))].join('');
    $('#weak-list').innerHTML = weakHtml || '<span class="empty">无</span>';

    const okHtml = sum.ok.map(q => chip(q, 'ok')).join('');
    $('#ok-list').innerHTML = okHtml || '<span class="empty">无</span>';

    const agg = App.aggregate(App.getHistory());
    const fmtWeak = (list) => {
      const top = App.weakTop(list, 3);
      if (top.length === 0) return '暂无明显薄弱项';
      return top.map(x => x.key + '（' + x.level + '）').join(' · ');
    };
    $('#weak-shengmu').textContent = fmtWeak(agg.byShengmu);
    $('#weak-yunmu').textContent   = fmtWeak(agg.byYunmu);
    $('#weak-tone').textContent    = fmtWeak(agg.byTone);
  }

  // ---- 历史页 ----
  function renderHistory() {
    const agg = App.aggregate(App.getHistory());

    const levelCls = (level) => {
      if (level === App.LEVEL.REMEMBERED) return 'ok';
      if (level === App.LEVEL.FUZZY)      return 'fuzzy';
      if (level === App.LEVEL.UNKNOWN)    return 'no';
      return 'pending';
    };

    const renderList = (sel, list, labelFmt) => {
      const el = $(sel);
      if (!list || list.length === 0) {
        el.innerHTML = '<span class="empty">还没有数据，先做一组练习吧。</span>';
        return;
      }
      const order = { '不会':0, '不熟':1, '待练习':2, '已记住':3 };
      const sorted = list.slice().sort((a,b) => (order[a.level]||9) - (order[b.level]||9));
      el.innerHTML = sorted.map(x =>
        '<span class="chip ' + levelCls(x.level) + '">' +
          (labelFmt ? labelFmt(x) : x.key) +
          ' <span class="meta">' + x.level + '</span>' +
        '</span>'
      ).join('');
    };

    renderList('#hist-syllables', agg.bySyllable.map(s => ({ key: s.pinyin, level: s.level })));
    renderList('#hist-shengmu',   agg.byShengmu);
    renderList('#hist-yunmu',     agg.byYunmu);
    renderList('#hist-tone',      agg.byTone, (x) => x.key + ' 声');
  }

  // ---- TTS（拼音朗读，区别于鼓励语 TTS） ----
  function speakPinyin(text) {
    if (!('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'zh-CN';
      u.rate = 0.7;
      window.speechSynthesis.speak(u);
    } catch (e) {}
  }

  // ---- 静音切换 ----
  function refreshSoundIcon() {
    const btn = document.querySelector('.sound-toggle');
    if (!btn) return;
    const on = !!App.getSettings().soundEnabled;
    btn.textContent = on ? '🔊' : '🔇';
    btn.title = on ? '点击静音' : '点击开启声音';
    if (App.Sounds) App.Sounds.setEnabled(on);
  }

  function toggleSound() {
    const on = !App.getSettings().soundEnabled;
    App.saveSettings({ soundEnabled: on });
    refreshSoundIcon();
  }

  // ---- 全局事件代理 ----
  document.addEventListener('click', (e) => {
    // 设置页可勾选格子
    const cell = e.target.closest('[data-cell]');
    if (cell) {
      cell.classList.toggle('checked');
      return;
    }

    const t = e.target.closest('[data-nav], [data-action], [data-bulk], [data-judge]');
    if (!t) return;

    if (t.dataset.nav) { navigate(t.dataset.nav); return; }
    if (t.dataset.judge) { judge(t.dataset.judge); return; }

    const action = t.dataset.action;
    if (action === 'start') startPractice();
    else if (action === 'save-settings') saveSettingsFromUI();
    else if (action === 'speak') {
      const txt = $('#pinyin-display');
      if (txt) speakPinyin(txt.textContent);
    }
    else if (action === 'toggle-sound') toggleSound();
    else if (action === 'clear-history') {
      if (confirm('确定要清空所有历史记录吗？此操作不可恢复。')) {
        App.clearHistory();
        renderHistory();
      }
    }

    if (t.dataset.bulk) {
      const target = t.dataset.target;
      const all = t.dataset.bulk === 'all';
      $all('#grid-' + target + ' .cell').forEach(c => {
        c.classList.toggle('checked', all);
      });
    }
  });

  window.addEventListener('hashchange', () => mount(currentView()));
  window.addEventListener('DOMContentLoaded', () => {
    if (!location.hash) location.hash = '#/home';
    mount(currentView());
    refreshSoundIcon();
  });
})();
