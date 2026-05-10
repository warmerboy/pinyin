// localStorage 封装：设置 + 历史记录
window.App = window.App || {};

(function (App) {
  const KEY = 'pinyin-app-v1';
  const MAX_HISTORY_PER_SYLLABLE = 10;

  function defaultData() {
    return {
      settings: {
        selectedShengmu: [],
        selectedYunmu: [],
        selectedZhengti: [],
        questionsPerSet: 10,
        soundEnabled: true
      },
      history: {}
    };
  }

  function readAll() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return defaultData();
      const data = JSON.parse(raw);
      const def = defaultData();
      return {
        ...def,
        ...data,
        settings: { ...def.settings, ...(data.settings || {}) },
        history: data.history || {}
      };
    } catch (e) {
      return defaultData();
    }
  }

  function writeAll(data) {
    localStorage.setItem(KEY, JSON.stringify(data));
  }

  function getSettings() { return readAll().settings; }

  function saveSettings(settings) {
    const data = readAll();
    data.settings = { ...data.settings, ...settings };
    writeAll(data);
  }

  function getHistory() { return readAll().history; }

  // question: { pinyin, base, tone, shengmu, yunmu, kind }
  // result: '会' | '不熟' | '不会'
  function recordAnswer(question, result) {
    const data = readAll();
    const key = question.pinyin;
    const entry = data.history[key] || {
      pinyin: question.pinyin,
      base: question.base,
      tone: question.tone,
      shengmu: question.shengmu,
      yunmu: question.yunmu,
      kind: question.kind,
      results: [],
      updatedAt: 0
    };
    entry.results.push(result);
    if (entry.results.length > MAX_HISTORY_PER_SYLLABLE) {
      entry.results = entry.results.slice(-MAX_HISTORY_PER_SYLLABLE);
    }
    entry.updatedAt = Date.now();
    data.history[key] = entry;
    writeAll(data);
  }

  function clearHistory() {
    const data = readAll();
    data.history = {};
    writeAll(data);
  }

  App.getSettings = getSettings;
  App.saveSettings = saveSettings;
  App.getHistory = getHistory;
  App.recordAnswer = recordAnswer;
  App.clearHistory = clearHistory;
})(window.App);
