// 汉语拼音数据：声母、韵母、整体认读音节、合法音节表、声调标注
window.App = window.App || {};

(function (App) {
  const SHENGMU = [
    'b','p','m','f','d','t','n','l',
    'g','k','h','j','q','x',
    'zh','ch','sh','r',
    'z','c','s',
    'y','w'
  ];

  const YUNMU = [
    'a','o','e','i','u','ü',
    'ai','ei','ui','ao','ou','iu','ie','üe','er',
    'an','en','in','un','ün',
    'ang','eng','ing','ong'
  ];

  const ZHENGTI = [
    'zhi','chi','shi','ri',
    'zi','ci','si',
    'yi','wu','yu',
    'ye','yue','yuan',
    'yin','yun','ying'
  ];

  // 标准汉语拼音音节集合（不带声调），用于过滤"声母+韵母"是否真实存在
  const VALID_SYLLABLES = new Set([
    'a','o','e','ai','ei','ao','ou','an','en','ang','eng','er',
    'ba','bo','bai','bei','bao','ban','ben','bang','beng','bi','bie','biao','bian','bin','bing','bu',
    'pa','po','pai','pei','pao','pou','pan','pen','pang','peng','pi','pie','piao','pian','pin','ping','pu',
    'ma','mo','me','mai','mei','mao','mou','man','men','mang','meng','mi','mie','miao','miu','mian','min','ming','mu',
    'fa','fo','fei','fou','fan','fen','fang','feng','fu',
    'da','de','dai','dei','dao','dou','dan','den','dang','deng','dong','di','die','diao','diu','dian','ding','du','duo','dui','duan','dun',
    'ta','te','tai','tao','tou','tan','tang','teng','tong','ti','tie','tiao','tian','ting','tu','tuo','tui','tuan','tun',
    'na','ne','nai','nei','nao','nou','nan','nen','nang','neng','nong','ni','nie','niao','niu','nian','nin','niang','ning','nu','nuo','nuan','nü','nüe',
    'la','le','lai','lei','lao','lou','lan','lang','leng','long','li','lia','lie','liao','liu','lian','lin','liang','ling','lu','luo','luan','lun','lü','lüe',
    'ga','ge','gai','gei','gao','gou','gan','gen','gang','geng','gong','gu','gua','guo','guai','gui','guan','gun','guang',
    'ka','ke','kai','kei','kao','kou','kan','ken','kang','keng','kong','ku','kua','kuo','kuai','kui','kuan','kun','kuang',
    'ha','he','hai','hei','hao','hou','han','hen','hang','heng','hong','hu','hua','huo','huai','hui','huan','hun','huang',
    'ji','jia','jie','jiao','jiu','jian','jin','jiang','jing','jiong','ju','jue','juan','jun',
    'qi','qia','qie','qiao','qiu','qian','qin','qiang','qing','qiong','qu','que','quan','qun',
    'xi','xia','xie','xiao','xiu','xian','xin','xiang','xing','xiong','xu','xue','xuan','xun',
    'zhi','zha','zhe','zhai','zhei','zhao','zhou','zhan','zhen','zhang','zheng','zhong','zhu','zhua','zhuo','zhuai','zhui','zhuan','zhun','zhuang',
    'chi','cha','che','chai','chao','chou','chan','chen','chang','cheng','chong','chu','chuo','chuai','chui','chuan','chun','chuang',
    'shi','sha','she','shai','shei','shao','shou','shan','shen','shang','sheng','shu','shua','shuo','shuai','shui','shuan','shun','shuang',
    'ri','re','rao','rou','ran','ren','rang','reng','rong','ru','ruo','rui','ruan','run',
    'zi','za','ze','zai','zei','zao','zou','zan','zen','zang','zeng','zong','zu','zuo','zui','zuan','zun',
    'ci','ca','ce','cai','cao','cou','can','cen','cang','ceng','cong','cu','cuo','cui','cuan','cun',
    'si','sa','se','sai','sao','sou','san','sen','sang','seng','song','su','suo','sui','suan','sun',
    'yi','ya','ye','yao','you','yan','yin','yang','ying','yong','yu','yue','yuan','yun',
    'wu','wa','wo','wai','wei','wan','wen','wang','weng'
  ]);

  // 元音 → 四声字符
  const TONE_MARKS = {
    a: ['ā','á','ǎ','à'],
    o: ['ō','ó','ǒ','ò'],
    e: ['ē','é','ě','è'],
    i: ['ī','í','ǐ','ì'],
    u: ['ū','ú','ǔ','ù'],
    ü: ['ǖ','ǘ','ǚ','ǜ']
  };

  function addTone(syllable, tone) {
    if (tone < 1 || tone > 4) return syllable;
    const idx = tone - 1;

    // 规则：有 a 标 a；没 a 找 o e；i u 并列标在后一个；否则标在唯一元音上
    let target = -1;
    if (syllable.includes('a')) {
      target = syllable.indexOf('a');
    } else if (syllable.includes('o')) {
      target = syllable.indexOf('o');
    } else if (syllable.includes('e')) {
      target = syllable.indexOf('e');
    } else if (syllable.includes('iu')) {
      target = syllable.indexOf('iu') + 1;
    } else if (syllable.includes('ui')) {
      target = syllable.indexOf('ui') + 1;
    } else {
      for (let i = 0; i < syllable.length; i++) {
        if ('iuü'.includes(syllable[i])) { target = i; break; }
      }
    }
    if (target < 0) return syllable;

    const ch = syllable[target];
    const marks = TONE_MARKS[ch];
    if (!marks) return syllable;
    return syllable.slice(0, target) + marks[idx] + syllable.slice(target + 1);
  }

  // j/q/x/y + ü → u
  function applyUmlautRule(shengmu, yunmu) {
    if (['j','q','x','y'].includes(shengmu)) {
      if (yunmu === 'ü') return 'u';
      if (yunmu === 'üe') return 'ue';
      if (yunmu === 'ün') return 'un';
      if (yunmu === 'üan') return 'uan';
    }
    return yunmu;
  }

  function combine(shengmu, yunmu) {
    const y = applyUmlautRule(shengmu, yunmu);
    const s = (shengmu || '') + y;
    return VALID_SYLLABLES.has(s) ? s : null;
  }

  App.SHENGMU = SHENGMU;
  App.YUNMU = YUNMU;
  App.ZHENGTI = ZHENGTI;
  App.VALID_SYLLABLES = VALID_SYLLABLES;
  App.addTone = addTone;
  App.applyUmlautRule = applyUmlautRule;
  App.combine = combine;
})(window.App);
