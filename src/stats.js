// 掌握度判定与聚合统计
window.App = window.App || {};

(function (App) {
  const RECENT_WINDOW = 5;

  const LEVEL = {
    REMEMBERED: '已记住',
    FUZZY: '不熟',
    UNKNOWN: '不会',
    PENDING: '待练习'
  };

  // 看最近最多 5 次结果，给单个音节定级
  function classify(results) {
    const recent = (results || []).slice(-RECENT_WINDOW);
    const n = recent.length;
    if (n < 2) return LEVEL.PENDING;

    const ok = recent.filter(r => r === '会').length;
    const no = recent.filter(r => r === '不会').length;

    if (n >= 3 && ok / n >= 0.8) return LEVEL.REMEMBERED;
    if (no / n >= 0.6) return LEVEL.UNKNOWN;
    return LEVEL.FUZZY;
  }

  function aggregate(history) {
    const bySyllable = [];
    const buckets = { shengmu: {}, yunmu: {}, tone: {} };

    for (const key in history) {
      const e = history[key];
      bySyllable.push({
        pinyin: e.pinyin,
        base: e.base,
        tone: e.tone,
        shengmu: e.shengmu,
        yunmu: e.yunmu,
        results: e.results,
        level: classify(e.results)
      });

      const pushTo = (bucket, k) => {
        if (k == null || k === '') return;
        if (!bucket[k]) bucket[k] = [];
        bucket[k].push(...e.results.slice(-RECENT_WINDOW));
      };
      pushTo(buckets.shengmu, e.shengmu);
      pushTo(buckets.yunmu, e.yunmu);
      pushTo(buckets.tone, e.tone);
    }

    const summarize = (bucket) => {
      const list = [];
      for (const k in bucket) {
        const r = bucket[k];
        const ok = r.filter(x => x === '会').length;
        const no = r.filter(x => x === '不会').length;
        const fuzzy = r.filter(x => x === '不熟').length;
        list.push({
          key: k,
          total: r.length,
          ok, no, fuzzy,
          level: classify(r)
        });
      }
      return list;
    };

    return {
      bySyllable,
      byShengmu: summarize(buckets.shengmu),
      byYunmu: summarize(buckets.yunmu),
      byTone: summarize(buckets.tone)
    };
  }

  function summarizeSession(answers) {
    const summary = { ok: [], fuzzy: [], no: [] };
    for (const a of answers) {
      const slot = a.result === '会' ? 'ok'
                 : a.result === '不熟' ? 'fuzzy'
                 : 'no';
      summary[slot].push(a.question);
    }
    return summary;
  }

  // 从聚合结果中找薄弱 Top N
  function weakTop(aggList, n) {
    n = n || 3;
    const score = (item) => {
      if (item.level === LEVEL.UNKNOWN) return 1000 + item.no * 10 + item.fuzzy;
      if (item.level === LEVEL.FUZZY)   return 500  + item.fuzzy * 10 + item.no;
      if (item.level === LEVEL.PENDING) return 100;
      return 0;
    };
    return aggList
      .filter(x => x.level !== LEVEL.REMEMBERED)
      .sort((a, b) => score(b) - score(a))
      .slice(0, n);
  }

  App.LEVEL = LEVEL;
  App.classify = classify;
  App.aggregate = aggregate;
  App.summarizeSession = summarizeSession;
  App.weakTop = weakTop;
})(window.App);
