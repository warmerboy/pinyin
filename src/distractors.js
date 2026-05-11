// 干扰项（错误选项）生成
// 选择题的 3 个错误选项要有"区分度但接近"，才有训练价值
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

  function uniqueBy(arr, keyFn) {
    const seen = new Set();
    const out = [];
    for (const x of arr) {
      const k = keyFn(x);
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(x);
    }
    return out;
  }

  // 给一个 char 题目，返回 4 个拼音选项（含正确答案，已 shuffle）
  // 干扰策略：优先"同基底不同声调"、其次"同声母不同韵母"或反之、再次"随机其他字的拼音"
  function pinyinChoicesFor(targetChar, charPool) {
    const correct = targetChar.pinyin;
    const distractors = [];

    // 1. 同 base 不同声调（最强干扰）
    const tonesAvail = [1, 2, 3, 4].filter(t => t !== targetChar.tone);
    for (const t of shuffle(tonesAvail)) {
      if (distractors.length >= 2) break;
      const p = App.addTone(targetChar.base, t);
      if (p && p !== correct) distractors.push(p);
    }

    // 2. 同声母不同 base 或同韵母不同 base 的字的拼音
    const similar = charPool.filter(c =>
      c.char !== targetChar.char &&
      (c.shengmu === targetChar.shengmu || c.yunmu === targetChar.yunmu)
    );
    for (const c of shuffle(similar)) {
      if (distractors.length >= 3) break;
      if (!distractors.includes(c.pinyin) && c.pinyin !== correct) {
        distractors.push(c.pinyin);
      }
    }

    // 3. 池子不够再从全池补
    for (const c of shuffle(charPool)) {
      if (distractors.length >= 3) break;
      if (c.pinyin !== correct && !distractors.includes(c.pinyin)) {
        distractors.push(c.pinyin);
      }
    }

    const options = shuffle([correct, ...distractors.slice(0, 3)]);
    return { options, correct };
  }

  // 给一个 pinyin 题目（拼音 + 对应字），返回 4 个汉字选项
  // 关键：同音字（如 地/弟 都读 dì，他/她 都读 tā）不能作为干扰项，否则会出现"两个都对"的歧义
  function charChoicesFor(targetChar, charPool) {
    const correct = targetChar;
    const distractors = [];

    // 1. 同声母 / 同韵母的其他字（但读音必须不一样）
    const similar = charPool.filter(c =>
      c.char !== targetChar.char &&
      c.pinyin !== targetChar.pinyin &&
      (c.shengmu === targetChar.shengmu || c.yunmu === targetChar.yunmu)
    );
    for (const c of shuffle(similar)) {
      if (distractors.length >= 2) break;
      distractors.push(c);
    }

    // 2. 随机其他字补足（读音同样要不一样）
    const remaining = charPool.filter(c =>
      c.char !== targetChar.char &&
      c.pinyin !== targetChar.pinyin &&
      !distractors.find(d => d.char === c.char)
    );
    for (const c of shuffle(remaining)) {
      if (distractors.length >= 3) break;
      distractors.push(c);
    }

    const all = uniqueBy([correct, ...distractors.slice(0, 3)], x => x.char);
    return { options: shuffle(all), correct };
  }

  // 拆分拼读：给一个字，分别返回 3 个步骤的选项
  // selectedShengmu / Yunmu：家长在设置里勾选的范围（用于决定干扰项池子）
  function breakdownChoices(targetChar, selectedShengmu, selectedYunmu) {
    // 整体认读音节没有声母/韵母可拆，特殊处理
    const isZhengti = App.ZHENGTI && App.ZHENGTI.includes(targetChar.base);
    if (isZhengti) {
      // 仅提供声调拆分
      return {
        special: 'zhengti-only-tone',
        toneStep: toneStepChoices(targetChar)
      };
    }

    // 声母选项
    const smCorrect = targetChar.shengmu || '（无）';
    const smPool = (selectedShengmu && selectedShengmu.length >= 4)
      ? selectedShengmu.slice()
      : App.SHENGMU.slice();
    const smDistractors = shuffle(smPool.filter(s => s !== targetChar.shengmu)).slice(0, 3);
    const smOptions = shuffle([smCorrect, ...smDistractors]);

    // 韵母选项
    const ymCorrect = targetChar.yunmu || '（无）';
    const ymPool = (selectedYunmu && selectedYunmu.length >= 4)
      ? selectedYunmu.slice()
      : App.YUNMU.slice();
    const ymDistractors = shuffle(ymPool.filter(y => y !== targetChar.yunmu)).slice(0, 3);
    const ymOptions = shuffle([ymCorrect, ...ymDistractors]);

    return {
      shengmuStep: { options: smOptions, correct: smCorrect },
      yunmuStep:   { options: ymOptions, correct: ymCorrect },
      toneStep:    toneStepChoices(targetChar)
    };
  }

  function toneStepChoices(targetChar) {
    // 声调一定是 1/2/3/4
    return {
      options: [1, 2, 3, 4],
      correct: targetChar.tone
    };
  }

  App.pinyinChoicesFor = pinyinChoicesFor;
  App.charChoicesFor   = charChoicesFor;
  App.breakdownChoices = breakdownChoices;
})(window.App);
