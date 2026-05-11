// 6 岁孩子常见简单汉字数据库（约 80 个，覆盖一年级上册识字范围）
// 每个字：char / pinyin（带声调）/ base / shengmu / yunmu / tone / emoji（可选辅助卡通图）
window.App = window.App || {};

(function (App) {
  const CHARS = [
    // 数字
    { char: '一', pinyin: 'yī',   base: 'yi',   shengmu: 'y', yunmu: 'i',  tone: 1, emoji: '' },
    { char: '二', pinyin: 'èr',   base: 'er',   shengmu: '',  yunmu: 'er', tone: 4, emoji: '' },
    { char: '三', pinyin: 'sān',  base: 'san',  shengmu: 's', yunmu: 'an', tone: 1, emoji: '' },
    { char: '四', pinyin: 'sì',   base: 'si',   shengmu: 's', yunmu: 'i',  tone: 4, emoji: '' },
    { char: '五', pinyin: 'wǔ',   base: 'wu',   shengmu: 'w', yunmu: 'u',  tone: 3, emoji: '' },
    { char: '六', pinyin: 'liù',  base: 'liu',  shengmu: 'l', yunmu: 'iu', tone: 4, emoji: '' },
    { char: '七', pinyin: 'qī',   base: 'qi',   shengmu: 'q', yunmu: 'i',  tone: 1, emoji: '' },
    { char: '八', pinyin: 'bā',   base: 'ba',   shengmu: 'b', yunmu: 'a',  tone: 1, emoji: '' },
    { char: '九', pinyin: 'jiǔ',  base: 'jiu',  shengmu: 'j', yunmu: 'iu', tone: 3, emoji: '' },
    { char: '十', pinyin: 'shí',  base: 'shi',  shengmu: 'sh',yunmu: '',   tone: 2, emoji: '' },

    // 方位
    { char: '上', pinyin: 'shàng',base: 'shang',shengmu: 'sh',yunmu: 'ang',tone: 4, emoji: '⬆️' },
    { char: '下', pinyin: 'xià',  base: 'xia',  shengmu: 'x', yunmu: 'ia', tone: 4, emoji: '⬇️' },
    { char: '左', pinyin: 'zuǒ',  base: 'zuo',  shengmu: 'z', yunmu: 'uo', tone: 3, emoji: '⬅️' },
    { char: '右', pinyin: 'yòu',  base: 'you',  shengmu: 'y', yunmu: 'ou', tone: 4, emoji: '➡️' },
    { char: '中', pinyin: 'zhōng',base: 'zhong',shengmu: 'zh',yunmu: 'ong',tone: 1, emoji: '' },

    // 人物
    { char: '人', pinyin: 'rén',  base: 'ren',  shengmu: 'r', yunmu: 'en', tone: 2, emoji: '🧍' },
    { char: '你', pinyin: 'nǐ',   base: 'ni',   shengmu: 'n', yunmu: 'i',  tone: 3, emoji: '' },
    { char: '我', pinyin: 'wǒ',   base: 'wo',   shengmu: 'w', yunmu: 'o',  tone: 3, emoji: '' },
    { char: '他', pinyin: 'tā',   base: 'ta',   shengmu: 't', yunmu: 'a',  tone: 1, emoji: '👦' },
    { char: '她', pinyin: 'tā',   base: 'ta',   shengmu: 't', yunmu: 'a',  tone: 1, emoji: '👧' },
    { char: '爸', pinyin: 'bà',   base: 'ba',   shengmu: 'b', yunmu: 'a',  tone: 4, emoji: '👨' },
    { char: '妈', pinyin: 'mā',   base: 'ma',   shengmu: 'm', yunmu: 'a',  tone: 1, emoji: '👩' },
    { char: '哥', pinyin: 'gē',   base: 'ge',   shengmu: 'g', yunmu: 'e',  tone: 1, emoji: '' },
    { char: '姐', pinyin: 'jiě',  base: 'jie',  shengmu: 'j', yunmu: 'ie', tone: 3, emoji: '' },
    { char: '弟', pinyin: 'dì',   base: 'di',   shengmu: 'd', yunmu: 'i',  tone: 4, emoji: '' },
    { char: '妹', pinyin: 'mèi',  base: 'mei',  shengmu: 'm', yunmu: 'ei', tone: 4, emoji: '' },

    // 身体
    { char: '手', pinyin: 'shǒu', base: 'shou', shengmu: 'sh',yunmu: 'ou', tone: 3, emoji: '✋' },
    { char: '口', pinyin: 'kǒu',  base: 'kou',  shengmu: 'k', yunmu: 'ou', tone: 3, emoji: '👄' },
    { char: '耳', pinyin: 'ěr',   base: 'er',   shengmu: '',  yunmu: 'er', tone: 3, emoji: '👂' },
    { char: '目', pinyin: 'mù',   base: 'mu',   shengmu: 'm', yunmu: 'u',  tone: 4, emoji: '👁️' },
    { char: '心', pinyin: 'xīn',  base: 'xin',  shengmu: 'x', yunmu: 'in', tone: 1, emoji: '❤️' },
    { char: '头', pinyin: 'tóu',  base: 'tou',  shengmu: 't', yunmu: 'ou', tone: 2, emoji: '' },

    // 自然
    { char: '山', pinyin: 'shān', base: 'shan', shengmu: 'sh',yunmu: 'an', tone: 1, emoji: '⛰️' },
    { char: '石', pinyin: 'shí',  base: 'shi',  shengmu: 'sh',yunmu: '',   tone: 2, emoji: '🪨' },
    { char: '水', pinyin: 'shuǐ', base: 'shui', shengmu: 'sh',yunmu: 'ui', tone: 3, emoji: '💧' },
    { char: '火', pinyin: 'huǒ',  base: 'huo',  shengmu: 'h', yunmu: 'uo', tone: 3, emoji: '🔥' },
    { char: '木', pinyin: 'mù',   base: 'mu',   shengmu: 'm', yunmu: 'u',  tone: 4, emoji: '🪵' },
    { char: '田', pinyin: 'tián', base: 'tian', shengmu: 't', yunmu: 'ian',tone: 2, emoji: '' },
    { char: '米', pinyin: 'mǐ',   base: 'mi',   shengmu: 'm', yunmu: 'i',  tone: 3, emoji: '🌾' },
    { char: '日', pinyin: 'rì',   base: 'ri',   shengmu: 'r', yunmu: '',   tone: 4, emoji: '☀️' },
    { char: '月', pinyin: 'yuè',  base: 'yue',  shengmu: 'y', yunmu: 'ue', tone: 4, emoji: '🌙' },
    { char: '天', pinyin: 'tiān', base: 'tian', shengmu: 't', yunmu: 'ian',tone: 1, emoji: '🌞' },
    { char: '地', pinyin: 'dì',   base: 'di',   shengmu: 'd', yunmu: 'i',  tone: 4, emoji: '🌍' },
    { char: '风', pinyin: 'fēng', base: 'feng', shengmu: 'f', yunmu: 'eng',tone: 1, emoji: '🌬️' },
    { char: '雨', pinyin: 'yǔ',   base: 'yu',   shengmu: 'y', yunmu: 'u',  tone: 3, emoji: '🌧️' },
    { char: '雪', pinyin: 'xuě',  base: 'xue',  shengmu: 'x', yunmu: 'ue', tone: 3, emoji: '❄️' },
    { char: '云', pinyin: 'yún',  base: 'yun',  shengmu: 'y', yunmu: 'un', tone: 2, emoji: '☁️' },
    { char: '花', pinyin: 'huā',  base: 'hua',  shengmu: 'h', yunmu: 'ua', tone: 1, emoji: '🌸' },
    { char: '草', pinyin: 'cǎo',  base: 'cao',  shengmu: 'c', yunmu: 'ao', tone: 3, emoji: '🌱' },
    { char: '树', pinyin: 'shù',  base: 'shu',  shengmu: 'sh',yunmu: 'u',  tone: 4, emoji: '🌳' },
    { char: '叶', pinyin: 'yè',   base: 'ye',   shengmu: 'y', yunmu: 'e',  tone: 4, emoji: '🍃' },

    // 动物
    { char: '猫', pinyin: 'māo',  base: 'mao',  shengmu: 'm', yunmu: 'ao', tone: 1, emoji: '🐱' },
    { char: '狗', pinyin: 'gǒu',  base: 'gou',  shengmu: 'g', yunmu: 'ou', tone: 3, emoji: '🐶' },
    { char: '鱼', pinyin: 'yú',   base: 'yu',   shengmu: 'y', yunmu: 'u',  tone: 2, emoji: '🐟' },
    { char: '鸟', pinyin: 'niǎo', base: 'niao', shengmu: 'n', yunmu: 'iao',tone: 3, emoji: '🐦' },
    { char: '兔', pinyin: 'tù',   base: 'tu',   shengmu: 't', yunmu: 'u',  tone: 4, emoji: '🐰' },
    { char: '马', pinyin: 'mǎ',   base: 'ma',   shengmu: 'm', yunmu: 'a',  tone: 3, emoji: '🐴' },
    { char: '牛', pinyin: 'niú',  base: 'niu',  shengmu: 'n', yunmu: 'iu', tone: 2, emoji: '🐮' },
    { char: '羊', pinyin: 'yáng', base: 'yang', shengmu: 'y', yunmu: 'ang',tone: 2, emoji: '🐑' },
    { char: '鸡', pinyin: 'jī',   base: 'ji',   shengmu: 'j', yunmu: 'i',  tone: 1, emoji: '🐔' },
    { char: '鸭', pinyin: 'yā',   base: 'ya',   shengmu: 'y', yunmu: 'a',  tone: 1, emoji: '🦆' },
    { char: '猪', pinyin: 'zhū',  base: 'zhu',  shengmu: 'zh',yunmu: 'u',  tone: 1, emoji: '🐷' },
    { char: '虎', pinyin: 'hǔ',   base: 'hu',   shengmu: 'h', yunmu: 'u',  tone: 3, emoji: '🐯' },
    { char: '龙', pinyin: 'lóng', base: 'long', shengmu: 'l', yunmu: 'ong',tone: 2, emoji: '🐉' },
    { char: '蛇', pinyin: 'shé',  base: 'she',  shengmu: 'sh',yunmu: 'e',  tone: 2, emoji: '🐍' },

    // 颜色
    { char: '红', pinyin: 'hóng', base: 'hong', shengmu: 'h', yunmu: 'ong',tone: 2, emoji: '🟥' },
    { char: '黄', pinyin: 'huáng',base: 'huang',shengmu: 'h', yunmu: 'uang',tone: 2,emoji: '🟨' },
    { char: '蓝', pinyin: 'lán',  base: 'lan',  shengmu: 'l', yunmu: 'an', tone: 2, emoji: '🟦' },
    { char: '绿', pinyin: 'lǜ',   base: 'lü',   shengmu: 'l', yunmu: 'ü',  tone: 4, emoji: '🟩' },
    { char: '白', pinyin: 'bái',  base: 'bai',  shengmu: 'b', yunmu: 'ai', tone: 2, emoji: '⬜' },
    { char: '黑', pinyin: 'hēi',  base: 'hei',  shengmu: 'h', yunmu: 'ei', tone: 1, emoji: '⬛' },

    // 动作
    { char: '看', pinyin: 'kàn',  base: 'kan',  shengmu: 'k', yunmu: 'an', tone: 4, emoji: '👀' },
    { char: '听', pinyin: 'tīng', base: 'ting', shengmu: 't', yunmu: 'ing',tone: 1, emoji: '👂' },
    { char: '笑', pinyin: 'xiào', base: 'xiao', shengmu: 'x', yunmu: 'iao',tone: 4, emoji: '😄' },
    { char: '跑', pinyin: 'pǎo',  base: 'pao',  shengmu: 'p', yunmu: 'ao', tone: 3, emoji: '🏃' },
    { char: '走', pinyin: 'zǒu',  base: 'zou',  shengmu: 'z', yunmu: 'ou', tone: 3, emoji: '🚶' },
    { char: '飞', pinyin: 'fēi',  base: 'fei',  shengmu: 'f', yunmu: 'ei', tone: 1, emoji: '✈️' },
    { char: '来', pinyin: 'lái',  base: 'lai',  shengmu: 'l', yunmu: 'ai', tone: 2, emoji: '' },
    { char: '去', pinyin: 'qù',   base: 'qu',   shengmu: 'q', yunmu: 'u',  tone: 4, emoji: '' },
    { char: '吃', pinyin: 'chī',  base: 'chi',  shengmu: 'ch',yunmu: '',   tone: 1, emoji: '🍴' },

    // 形容/性质
    { char: '大', pinyin: 'dà',   base: 'da',   shengmu: 'd', yunmu: 'a',  tone: 4, emoji: '' },
    { char: '小', pinyin: 'xiǎo', base: 'xiao', shengmu: 'x', yunmu: 'iao',tone: 3, emoji: '' },
    { char: '多', pinyin: 'duō',  base: 'duo',  shengmu: 'd', yunmu: 'uo', tone: 1, emoji: '' },
    { char: '少', pinyin: 'shǎo', base: 'shao', shengmu: 'sh',yunmu: 'ao', tone: 3, emoji: '' },
    { char: '高', pinyin: 'gāo',  base: 'gao',  shengmu: 'g', yunmu: 'ao', tone: 1, emoji: '' },
    { char: '好', pinyin: 'hǎo',  base: 'hao',  shengmu: 'h', yunmu: 'ao', tone: 3, emoji: '👍' }
  ];

  // 索引：按 base / shengmu / yunmu 快速找字
  function indexBy(arr, keyFn) {
    const map = {};
    for (const item of arr) {
      const k = keyFn(item);
      if (!map[k]) map[k] = [];
      map[k].push(item);
    }
    return map;
  }

  const BY_BASE     = indexBy(CHARS, c => c.base);
  const BY_SHENGMU  = indexBy(CHARS, c => c.shengmu);
  const BY_YUNMU    = indexBy(CHARS, c => c.yunmu);

  // 根据已勾选拼音元素，过滤出"该孩子能认"的字
  function charsForSelected(selectedShengmu, selectedYunmu, selectedZhengti) {
    const smSet = new Set(selectedShengmu || []);
    const ymSet = new Set(selectedYunmu || []);
    const ztSet = new Set(selectedZhengti || []);

    return CHARS.filter(c => {
      // 整体认读音节的字：base 在 ZHENGTI 列表里
      if (App.ZHENGTI && App.ZHENGTI.includes(c.base)) {
        return ztSet.has(c.base);
      }
      // 零声母字：只看 yunmu
      if (c.shengmu === '') {
        return ymSet.has(c.yunmu);
      }
      // 无 yunmu 的"整体认读型"字（实际本表里基本不会出现，因为已经走 zhengti 分支）
      if (c.yunmu === '') {
        return smSet.has(c.shengmu);
      }
      // 普通：声母 + 韵母 都得在已选范围里
      return smSet.has(c.shengmu) && ymSet.has(c.yunmu);
    });
  }

  App.CHARS = CHARS;
  App.CHARS_BY_BASE    = BY_BASE;
  App.CHARS_BY_SHENGMU = BY_SHENGMU;
  App.CHARS_BY_YUNMU   = BY_YUNMU;
  App.charsForSelected = charsForSelected;
})(window.App);
