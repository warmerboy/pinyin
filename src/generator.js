// 出题：根据已选元素生成一组带声调音节题目
window.App = window.App || {};

(function (App) {
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function buildCandidates(selectedShengmu, selectedYunmu, selectedZhengti) {
    const candidates = [];
    const seen = new Set();

    for (const sm of selectedShengmu) {
      for (const ym of selectedYunmu) {
        const base = App.combine(sm, ym);
        if (base && !seen.has(base)) {
          seen.add(base);
          candidates.push({ base, kind: 'syllable', shengmu: sm, yunmu: ym });
        }
      }
    }

    for (const z of selectedZhengti) {
      if (!App.ZHENGTI.includes(z)) continue;
      if (seen.has(z)) continue;
      seen.add(z);
      candidates.push({ base: z, kind: 'zhengti', shengmu: '', yunmu: '' });
    }

    return candidates;
  }

  function weightFor(base, history) {
    let merged = [];
    for (const k in history) {
      if (history[k].base === base) merged = merged.concat(history[k].results);
    }
    const level = App.classify(merged);
    const recent = merged.slice(-5);
    const no = recent.filter(r => r === '不会').length;
    const fuzzy = recent.filter(r => r === '不熟').length;

    if (level === App.LEVEL.PENDING) return 4;
    if (level === App.LEVEL.UNKNOWN) return 5 + no;
    if (level === App.LEVEL.FUZZY)   return 3 + fuzzy;
    return 1;
  }

  function weightedPick(candidates, weights) {
    const total = weights.reduce((s, w) => s + w, 0);
    let r = Math.random() * total;
    for (let i = 0; i < candidates.length; i++) {
      r -= weights[i];
      if (r <= 0) return candidates[i];
    }
    return candidates[candidates.length - 1];
  }

  function generate(selectedShengmu, selectedYunmu, selectedZhengti, n, history) {
    history = history || {};
    const candidates = buildCandidates(selectedShengmu, selectedYunmu, selectedZhengti);
    if (candidates.length === 0) return [];

    let pool = [];
    if (n >= candidates.length) {
      pool = shuffle(candidates);
    }
    const remaining = n - pool.length;

    const weights = candidates.map(c => weightFor(c.base, history));
    for (let i = 0; i < remaining; i++) {
      pool.push(weightedPick(candidates, weights));
    }

    pool = shuffle(pool);

    return pool.map(c => {
      const tone = 1 + Math.floor(Math.random() * 4);
      const pinyin = App.addTone(c.base, tone);
      return {
        pinyin,
        base: c.base,
        tone,
        shengmu: c.shengmu,
        yunmu: c.yunmu,
        kind: c.kind
      };
    });
  }

  // ====================================================================
  // 综合练习题目生成（v2 升级版）
  // 题型代码：
  //   'char2pinyin'   看字/图选拼音
  //   'pinyin2char'   看拼音选字/图
  //   'breakdown'     拆分拼读：声母 → 韵母 → 声调
  // ====================================================================

  function pickRandom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  // 主入口：根据已选拼音元素 + 题型组合 + 题数生成综合练习题目
  function generateComplex(selectedShengmu, selectedYunmu, selectedZhengti, n, enabledTypes, history) {
    history = history || {};
    enabledTypes = (enabledTypes && enabledTypes.length > 0)
      ? enabledTypes
      : ['char2pinyin', 'pinyin2char', 'breakdown'];

    const charPool = App.charsForSelected(selectedShengmu, selectedYunmu, selectedZhengti);
    if (charPool.length < 4) {
      // 池子太小（< 4 个字），可选项凑不齐 4 个，提示家长扩大范围
      return [];
    }

    const out = [];
    for (let i = 0; i < n; i++) {
      const type = pickRandom(enabledTypes);
      const target = pickRandom(charPool);
      const q = buildOne(type, target, charPool, selectedShengmu, selectedYunmu);
      if (q) out.push(q);
    }
    return out;
  }

  function buildOne(type, targetChar, charPool, selectedShengmu, selectedYunmu) {
    const base = {
      type,
      target: targetChar,                // 完整字对象
      pinyin: targetChar.pinyin,
      base:   targetChar.base,
      tone:   targetChar.tone,
      shengmu: targetChar.shengmu,
      yunmu:   targetChar.yunmu,
      kind:    'complex'                 // 区别于 v1 的 'syllable' / 'zhengti'
    };

    if (type === 'char2pinyin') {
      const { options, correct } = App.pinyinChoicesFor(targetChar, charPool);
      return { ...base, prompt: 'char', options, correct };
    }
    if (type === 'pinyin2char') {
      const { options, correct } = App.charChoicesFor(targetChar, charPool);
      return { ...base, prompt: 'pinyin', options, correct };
    }
    if (type === 'breakdown') {
      const bd = App.breakdownChoices(targetChar, selectedShengmu, selectedYunmu);
      return { ...base, prompt: 'breakdown', breakdown: bd };
    }
    return null;
  }

  App.buildCandidates = buildCandidates;
  App.generate = generate;
  App.generateComplex = generateComplex;
})(window.App);
