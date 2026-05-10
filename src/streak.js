// 连对计数与等级判定
window.App = window.App || {};

(function (App) {
  const state = { current: 0, best: 0 };

  function reset() { state.current = 0; state.best = 0; }

  function onAnswer(result) {
    if (result === '会') {
      state.current += 1;
      if (state.current > state.best) state.best = state.current;
    } else {
      state.current = 0;
    }
    return state.current;
  }

  // 0：无；1：连对 3+；2：连对 5+；3：连对 7+
  function level(current) {
    const c = (current == null) ? state.current : current;
    if (c >= 7) return 3;
    if (c >= 5) return 2;
    if (c >= 3) return 1;
    return 0;
  }

  // 当前等级是否在本次跨入下一个里程碑（仅在 3 / 5 / 7 时返回 true）
  function isMilestone() {
    return state.current === 3 || state.current === 5 || state.current === 7;
  }

  function get() { return { ...state }; }

  App.Streak = { reset, onAnswer, level, isMilestone, get };
})(window.App);
