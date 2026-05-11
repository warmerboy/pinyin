// 视图切换、事件绑定、TTS 调用、庆祝接入
(function () {
  const App = window.App;

  // 当前练习会话
  // mode: 'parent'（看拼音读·家长判定）| 'complex'（综合练习·软件判分）
  let session = null;

  // 综合练习的题内状态：当前选项是否已锁定、当前步骤（仅 breakdown 用）
  let attempt = null;
  // attempt 结构：
  // - 选择题：{ wrongOnce: bool, locked: bool }
  // - breakdown：{ stepIndex: 0..2, wrongPerStep: [bool,bool,bool], stepLocked: false }

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $all(sel, root) { return Array.from((root || document).querySelectorAll(sel)); }

  function mount(viewName) {
    const tpl = document.getElementById('view-' + viewName);
    if (!tpl) return;
    const main = document.getElementById('app');
    main.innerHTML = '';
    main.appendChild(tpl.content.cloneNode(true));

    if (viewName === 'home')              renderHome();
    if (viewName === 'settings')          renderSettings();
    if (viewName === 'practice')          renderPractice();
    if (viewName === 'practice-complex')  renderPracticeComplex();
    if (viewName === 'report')            renderReport();
    if (viewName === 'history')           renderHistory();
  }

  function navigate(viewName) { location.hash = '#/' + viewName; }
  function currentView() {
    const m = (location.hash || '').match(/^#\/([\w-]+)/);
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

  // ============================================================
  // 模式一：家长判定模式（v1.0 保留）
  // ============================================================
  function startParentPractice() {
    const s = App.getSettings();
    const history = App.getHistory();
    const questions = App.generate(s.selectedShengmu, s.selectedYunmu, s.selectedZhengti, s.questionsPerSet, history);
    if (questions.length === 0) {
      alert('当前勾选的元素拼不出任何合法音节。请到"设置"里多勾一些声母 / 韵母 / 整体认读音节。');
      navigate('settings');
      return;
    }
    session = { mode: 'parent', questions, index: 0, answers: [] };
    if (App.Streak) App.Streak.reset();
    if (App.Sounds) { App.Sounds.init(); App.Sounds.setEnabled(!!App.getSettings().soundEnabled); }
    navigate('practice');
  }

  function renderPractice() {
    if (!session || session.mode !== 'parent') { navigate('home'); return; }
    const q = session.questions[session.index];
    $('#pinyin-display').textContent = q.pinyin;
    renderProgressAndStreak();
    mountPracticeMascot();
  }

  function judge(result) {
    if (!session || session.mode !== 'parent') return;
    const q = session.questions[session.index];
    App.recordAnswer(q, result, 'parent');
    session.answers.push({ question: q, result });

    if (App.Streak) App.Streak.onAnswer(result);
    if (App.Celebrate) {
      if (result === '会') {
        App.Celebrate.smallCorrect();
        if (App.Streak && App.Streak.isMilestone()) {
          App.Celebrate.streakLevelUp(App.Streak.level(), App.Streak.get().current);
        }
      } else {
        App.Celebrate.gentle(result);
      }
    }
    advance();
  }

  // ============================================================
  // 模式二：综合练习（v2 软件判分）
  // ============================================================
  function startComplexPractice() {
    const s = App.getSettings();
    const history = App.getHistory();
    const types = s.enabledComplexTypes || ['char2pinyin','pinyin2char','breakdown'];
    const questions = App.generateComplex(
      s.selectedShengmu, s.selectedYunmu, s.selectedZhengti,
      s.questionsPerSet, types, history
    );
    if (questions.length === 0) {
      alert('当前勾选的拼音元素能涵盖的汉字太少（不足 4 个），无法出综合练习题。请到"设置"里多勾一些声母 / 韵母。');
      navigate('settings');
      return;
    }
    session = { mode: 'complex', questions, index: 0, answers: [] };
    attempt = null;
    if (App.Streak) App.Streak.reset();
    if (App.Sounds) { App.Sounds.init(); App.Sounds.setEnabled(!!App.getSettings().soundEnabled); }
    navigate('practice-complex');
  }

  function renderPracticeComplex() {
    if (!session || session.mode !== 'complex') { navigate('home'); return; }
    const q = session.questions[session.index];
    renderProgressAndStreak();
    mountPracticeMascot();

    if (q.type === 'breakdown') {
      attempt = {
        kind: 'breakdown-parallel',
        picks: { shengmu: null, yunmu: null, tone: null },
        attemptCount: 0,
        locked: { shengmu: false, yunmu: false, tone: false },
        results: { shengmu: null, yunmu: null, tone: null }, // 'correct' | 'wrong' | null
        finalized: false
      };
      renderBreakdownParallel(q);
    } else {
      attempt = { wrongOnce: false, locked: false };
      renderChoiceQuestion(q);
    }
  }

  // 通用工具：进度星 + 连对
  function renderProgressAndStreak() {
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
    const sb = $('#streak-badge');
    if (sb && App.Streak) {
      const cur = App.Streak.get().current;
      sb.textContent = cur >= 2 ? ('🔥 连对 ' + cur) : '';
      if (cur >= 2) { sb.classList.remove('show'); void sb.offsetWidth; sb.classList.add('show'); }
    }
  }
  function mountPracticeMascot() {
    const mascotHost = $('.practice-mascot');
    if (mascotHost && App.Mascot && !mascotHost.querySelector('svg')) {
      App.Mascot.mount(mascotHost, 'idle');
    }
  }

  // 渲染题型 ① / ②（选择题）
  function renderChoiceQuestion(q) {
    const prompt = $('#prompt-area');
    const stepHint = $('#step-hint');
    const choicesEl = $('#choices');

    stepHint.textContent = q.type === 'char2pinyin' ? '这个字读什么？' : '这个拼音是哪个字？';

    if (q.prompt === 'char') {
      const emojiHtml = q.target.emoji ? `<span class="prompt-emoji">${q.target.emoji}</span>` : '';
      prompt.innerHTML = `<span class="prompt-char">${q.target.char}</span>${emojiHtml}`;
    } else {
      prompt.innerHTML = `<span class="prompt-pinyin">${q.target.pinyin}</span>`;
    }

    choicesEl.innerHTML = '';
    q.options.forEach((opt, i) => {
      const btn = document.createElement('button');
      btn.className = 'choice';
      btn.dataset.choiceIndex = String(i);
      if (q.prompt === 'char') {
        // 选项是拼音
        btn.innerHTML = `<span class="opt-pinyin">${opt}</span>`;
        btn.dataset.value = opt;
      } else {
        // 选项是 char 对象
        const e = opt.emoji ? `<span class="opt-emoji">${opt.emoji}</span>` : '';
        btn.innerHTML = `${e}<span class="opt-text">${opt.char}</span>`;
        btn.dataset.value = opt.char;
      }
      btn.addEventListener('click', () => handleChoiceClick(q, opt, btn));
      choicesEl.appendChild(btn);
    });
  }

  function handleChoiceClick(q, opt, btn) {
    if (!attempt || attempt.locked) return;

    // 看字选拼音：直接比拼音字符串
    // 看拼音选字：只要选中的字与正确字读音相同就算对（兜底处理同音字如 地/弟、他/她）
    let isCorrect;
    if (q.prompt === 'char') {
      isCorrect = opt === q.correct;
    } else {
      isCorrect = opt.pinyin === q.correct.pinyin;
    }

    if (isCorrect) {
      btn.classList.add('correct');
      attempt.locked = true;
      const result = attempt.wrongOnce ? '不熟' : '会';
      finalizeChoice(q, result);
    } else {
      btn.classList.add('wrong', 'disabled');
      if (attempt.wrongOnce) {
        // 已经错过一次了，再错直接判"不会"，把正确答案高亮，等 1.2s 进下一题
        attempt.locked = true;
        highlightCorrect(q);
        finalizeChoice(q, '不会');
      } else {
        // 第一次错：标红，允许再选一次
        attempt.wrongOnce = true;
      }
    }
  }

  function highlightCorrect(q) {
    // 看字选拼音：只有唯一正确拼音
    // 看拼音选字：任何与正确字同读音的选项都算正确
    $all('#choices .choice').forEach((btn, i) => {
      const opt = q.options[i];
      let optIsCorrect;
      if (q.prompt === 'char') {
        optIsCorrect = opt === q.correct;
      } else {
        optIsCorrect = opt && opt.pinyin === q.correct.pinyin;
      }
      if (optIsCorrect) btn.classList.add('correct');
      else btn.classList.add('disabled');
    });
  }

  function finalizeChoice(q, result) {
    App.recordAnswer(q, result, 'complex');
    session.answers.push({ question: q, result });

    if (App.Streak) App.Streak.onAnswer(result);
    if (App.Celebrate) {
      if (result === '会') {
        App.Celebrate.smallCorrect();
        if (App.Streak && App.Streak.isMilestone()) {
          App.Celebrate.streakLevelUp(App.Streak.level(), App.Streak.get().current);
        }
      } else {
        App.Celebrate.gentle(result);
      }
    }
    // 答案显示一会儿再切下一题
    setTimeout(advance, result === '会' ? 700 : 1200);
  }

  // ============================================================
  // 题型 ③ 拆分拼读：并行版（在同一界面同时选声母 / 韵母 / 声调）
  // ============================================================
  function renderBreakdownParallel(q) {
    const prompt = $('#prompt-area');
    const stepHint = $('#step-hint');
    const choicesEl = $('#choices');

    // 顶部 prompt：始终显示字 + emoji
    const emojiHtml = q.target.emoji ? `<span class="prompt-emoji">${q.target.emoji}</span>` : '';
    prompt.innerHTML = `<span class="prompt-char">${q.target.char}</span>${emojiHtml}`;

    const bd = q.breakdown;
    const isZhengti = bd.special === 'zhengti-only-tone';

    // 选好后的提示文案
    if (attempt.attemptCount === 0) {
      stepHint.textContent = isZhengti ? '选出这个字的声调，然后提交' : '选出声母、韵母、声调，全部选完后提交';
    } else if (attempt.attemptCount === 1) {
      stepHint.textContent = '标红的需要重新选哦～';
    }

    const slotsHtml = isZhengti
      ? buildSlotHtml('tone', '声调', bd.toneStep.options, q)
      : (
          buildSlotHtml('shengmu', '声母', bd.shengmuStep.options, q) +
          buildSlotHtml('yunmu',   '韵母', bd.yunmuStep.options,   q) +
          buildSlotHtml('tone',    '声调', bd.toneStep.options,    q)
        );

    const submitDisabled = !allSlotsPicked(bd, isZhengti);

    // 实时拼读回显
    const assembly = previewAssembly(attempt.picks, q);
    const assemblyText  = assembly || '_ _ _';
    const assemblyClass = assembly ? 'bd-assembly-result' : 'bd-assembly-result empty';

    choicesEl.innerHTML = `
      <div class="bd-slots">${slotsHtml}</div>
      <div class="bd-assembly">
        <span class="bd-assembly-label">你的拼读：</span>
        <span class="${assemblyClass}">${assemblyText}</span>
      </div>
      <button class="big-btn primary submit-btn"
              data-action="submit-breakdown"
              ${submitDisabled ? 'disabled' : ''}>
        提交答案
      </button>
    `;

    // 给每个 tile 挂点击
    $all('.bd-tile').forEach(tile => {
      tile.addEventListener('click', () => handleBreakdownTileClick(q, tile));
    });
  }

  function buildSlotHtml(slotName, label, options, q) {
    const picked = attempt.picks[slotName];
    const locked = attempt.locked[slotName];
    const slotResult = attempt.results[slotName]; // 'correct' | 'wrong' | null
    const slotCls = ['bd-slot'];
    if (locked) slotCls.push('locked');
    if (slotResult === 'correct') slotCls.push('result-correct');
    if (slotResult === 'wrong') slotCls.push('result-wrong');

    const tiles = options.map(opt => {
      const val = String(opt);
      const sel = String(picked) === val;
      const tileCls = ['bd-tile'];
      if (sel) tileCls.push('selected');
      // 第二次重试时，已 locked-correct 的格子不允许再点
      if (locked) tileCls.push('frozen');

      let inner;
      if (slotName === 'tone') {
        // 只显示四个声调符号本身，不带任何元音字母（避免暴露答案 + 避免孩子以为四声只能配某个字）
        const TONE_GLYPHS = { 1: 'ˉ', 2: 'ˊ', 3: 'ˇ', 4: 'ˋ' };
        const sample = TONE_GLYPHS[parseInt(val, 10)] || '';
        inner = `<span class="opt-tone-mark">${sample}</span><span class="opt-tone-num">${val} 声</span>`;
      } else {
        inner = `<span class="opt-text">${val}</span>`;
      }
      return `<button class="${tileCls.join(' ')}" data-slot="${slotName}" data-value="${val}">${inner}</button>`;
    }).join('');

    return `
      <div class="${slotCls.join(' ')}" data-slot-row="${slotName}">
        <div class="bd-slot-label">${label}</div>
        <div class="bd-slot-choices">${tiles}</div>
      </div>
    `;
  }

  function allSlotsPicked(bd, isZhengti) {
    if (isZhengti) return attempt.picks.tone != null;
    return attempt.picks.shengmu != null && attempt.picks.yunmu != null && attempt.picks.tone != null;
  }

  // 把孩子当前的选择实时拼起来显示。规则详见 v2.2 计划。
  function previewAssembly(picks, q) {
    // 整体认读音节：直接对 base 应用声调
    if (q && q.breakdown && q.breakdown.special === 'zhengti-only-tone') {
      if (!picks.tone) return null;
      return App.addTone(q.target.base, picks.tone);
    }

    // 将"（无）"占位转空串
    let sm = (picks.shengmu === '（无）' || !picks.shengmu) ? '' : picks.shengmu;
    let ym = (picks.yunmu   === '（无）' || !picks.yunmu)   ? '' : picks.yunmu;
    const tone = picks.tone;

    if (!sm && !ym) return null;

    // jqxy + ü → u 规则（仅在两者都有时才应用）
    let effectiveYm = ym;
    if (sm && ym) effectiveYm = App.applyUmlautRule(sm, ym);

    const base = sm + effectiveYm;
    if (tone && /[aeiouü]/.test(base)) {
      return App.addTone(base, tone);
    }
    return base;
  }

  function handleBreakdownTileClick(q, tile) {
    if (attempt.finalized) return;
    const slot = tile.dataset.slot;
    const value = tile.dataset.value;
    // 锁定的 slot 不能再改
    if (attempt.locked[slot]) return;

    attempt.picks[slot] = (slot === 'tone') ? parseInt(value, 10) : value;
    // 重置该 slot 的红色结果（用户已经在改正）
    if (attempt.results[slot] === 'wrong') attempt.results[slot] = null;

    renderBreakdownParallel(q);
  }

  function handleBreakdownSubmit(q) {
    if (attempt.finalized) return;
    const bd = q.breakdown;
    const isZhengti = bd.special === 'zhengti-only-tone';
    if (!allSlotsPicked(bd, isZhengti)) return;

    attempt.attemptCount += 1;

    // 比对每个 slot
    const shengmuOK = isZhengti ? true : attempt.picks.shengmu === bd.shengmuStep.correct;
    const yunmuOK   = isZhengti ? true : attempt.picks.yunmu   === bd.yunmuStep.correct;
    const toneOK    = String(attempt.picks.tone) === String(bd.toneStep.correct);

    if (!isZhengti) {
      attempt.results.shengmu = shengmuOK ? 'correct' : 'wrong';
      attempt.results.yunmu   = yunmuOK   ? 'correct' : 'wrong';
    }
    attempt.results.tone = toneOK ? 'correct' : 'wrong';

    // 答对的 slot 锁定，下次重试不让改
    if (shengmuOK) attempt.locked.shengmu = true;
    if (yunmuOK)   attempt.locked.yunmu   = true;
    if (toneOK)    attempt.locked.tone    = true;

    const allCorrect = shengmuOK && yunmuOK && toneOK;

    if (allCorrect && attempt.attemptCount === 1) {
      finalizeBreakdown(q, '会');
    } else if (allCorrect && attempt.attemptCount >= 2) {
      finalizeBreakdown(q, '不熟');
    } else if (attempt.attemptCount === 1) {
      // 第一次有错：允许重试，重新渲染显示哪些对哪些错
      renderBreakdownParallel(q);
    } else {
      // 第二次还有错：高亮所有正确答案，记 不会
      revealAllCorrect(q);
      finalizeBreakdown(q, '不会');
    }
  }

  function revealAllCorrect(q) {
    const bd = q.breakdown;
    const isZhengti = bd.special === 'zhengti-only-tone';
    if (!isZhengti) {
      attempt.picks.shengmu = bd.shengmuStep.correct;
      attempt.picks.yunmu   = bd.yunmuStep.correct;
    }
    attempt.picks.tone = bd.toneStep.correct;
    attempt.results.shengmu = 'correct';
    attempt.results.yunmu = 'correct';
    attempt.results.tone = 'correct';
    attempt.locked.shengmu = true;
    attempt.locked.yunmu = true;
    attempt.locked.tone = true;
    renderBreakdownParallel(q);
  }

  function finalizeBreakdown(q, result) {
    attempt.finalized = true;
    App.recordAnswer(q, result, 'complex');
    session.answers.push({ question: q, result });

    if (App.Streak) App.Streak.onAnswer(result);
    if (App.Celebrate) {
      if (result === '会') {
        App.Celebrate.smallCorrect();
        if (App.Streak && App.Streak.isMilestone()) {
          App.Celebrate.streakLevelUp(App.Streak.level(), App.Streak.get().current);
        }
      } else {
        App.Celebrate.gentle(result);
      }
    }
    setTimeout(advance, result === '不会' ? 1500 : 800);
  }

  // 推进到下一题或结束本组
  function advance() {
    session.index++;
    if (session.index >= session.questions.length) {
      const sum = App.summarizeSession(session.answers);
      const total = session.answers.length;
      const score = total > 0 ? sum.ok.length / total : 0;
      const goReport = () => navigate('report');
      if (App.Celebrate) App.Celebrate.setComplete(score, goReport);
      else goReport();
    } else {
      if (session.mode === 'parent') renderPractice();
      else                            renderPracticeComplex();
    }
  }

  // ---- 报告页 ----
  function renderReport() {
    if (!session) { navigate('home'); return; }
    const sum = App.summarizeSession(session.answers);
    $('#cnt-ok').textContent    = sum.ok.length;
    $('#cnt-fuzzy').textContent = sum.fuzzy.length;
    $('#cnt-no').textContent    = sum.no.length;

    const chip = (q, cls) => '<span class="chip ' + cls + '">' +
      (q.target ? (q.target.char + ' ' + q.pinyin) : q.pinyin) +
      '</span>';

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

  // ---- TTS（拼音朗读） ----
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
    App.saveSettings({ soundEnabled: !App.getSettings().soundEnabled });
    refreshSoundIcon();
  }

  // ---- 全局事件代理 ----
  document.addEventListener('click', (e) => {
    const cell = e.target.closest('[data-cell]');
    if (cell) { cell.classList.toggle('checked'); return; }

    const t = e.target.closest('[data-nav], [data-action], [data-bulk], [data-judge]');
    if (!t) return;

    if (t.dataset.nav)   { navigate(t.dataset.nav); return; }
    if (t.dataset.judge) { judge(t.dataset.judge); return; }

    const action = t.dataset.action;
    if (action === 'start')         startParentPractice();          // 兼容旧入口（如有）
    else if (action === 'start-parent')  startParentPractice();
    else if (action === 'start-complex') startComplexPractice();
    else if (action === 'save-settings') saveSettingsFromUI();
    else if (action === 'speak') {
      const txt = $('#pinyin-display');
      if (txt) speakPinyin(txt.textContent);
    }
    else if (action === 'submit-breakdown') {
      if (session && session.mode === 'complex') {
        const q = session.questions[session.index];
        if (q && q.type === 'breakdown') handleBreakdownSubmit(q);
      }
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
      $all('#grid-' + target + ' .cell').forEach(c => c.classList.toggle('checked', all));
    }
  });

  // "再来一组"按钮根据上一次的模式重启
  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-action="start"]');
    if (!t) return;
    if (session && session.mode === 'complex') {
      e.stopImmediatePropagation();
      startComplexPractice();
    }
  }, true);

  window.addEventListener('hashchange', () => mount(currentView()));
  window.addEventListener('DOMContentLoaded', () => {
    if (!location.hash) location.hash = '#/home';
    mount(currentView());
    refreshSoundIcon();
  });
})();
