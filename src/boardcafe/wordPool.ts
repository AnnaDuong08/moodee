// Word Relay word pool (café, nature and everyday nouns)
// - Korean: "first letter = last letter of the previous word", without the initial-sound rule
// - Japanese (しりとり): hiragana; a final ー uses the kana before it, small kana count as full size; no words ending in ん
// - Vietnamese (nối từ): "first syllable = last syllable of the previous word"
import type { Lang } from './i18n';

export const WORDS = {
  ko: [
    '커피', '피아노', '노트', '트리', '리본', '본차이나', '나무', '무지개', '개구리', '리듬', '음악', '악보', '보리차', '차나무', '무릎', '바다', '다리', '리모컨', '컨트롤', '구름',
    '름', '사과', '과자', '자두', '두부', '부엉이', '이불', '불빛', '빛깔', '깔때기', '기차', '차표', '표지', '지도', '도넛', '넛맥', '고양이', '이야기', '기린', '린스',
    '스웨터', '터널', '널빤지', '지우개', '개나리', '리코더', '더위', '위로', '로봇', '봇짐', '짐가방', '방석', '석양', '양말', '말차', '차고', '고구마', '마카롱', '롱부츠', '츠키',
    '키위', '위성', '성냥', '냥이', '이슬', '슬리퍼', '퍼즐', '즐거움', '움집', '집게', '게임', '임금', '금붕어', '어항', '항구', '구두', '두유', '유자차', '차례', '례',
    '우유', '유리컵', '컵케이크', '크림', '림보', '보석', '석류', '류', '라떼', '떼구름', '비스킷', '킷캣', '캣타워', '워터', '터전', '전구', '구슬', '슬픔', '픔', '마들렌',
    '렌즈', '즈음', '음료', '료리', '리스', '스콘', '콘칩', '칩', '케이크', '크레파스', '스푼', '푼돈', '돈가스', '스탠드', '드레스', '스노우볼', '볼펜', '펜촉', '촉감', '감자',
    '자전거', '거울', '울타리', '리필', '필통', '통나무', '무화과', '과일', '일기', '기타', '타자기', '기억', '억새', '새벽', '벽시계', '계단', '단풍', '풍선', '선물', '물감',
    '감귤', '귤껍질', '질문', '문어', '어깨', '깨소금', '금요일', '일요일', '일출', '출구', '구슬비', '비누', '누룽지', '지하철', '철쭉', '쭉정이', '이끼', '끼니', '니트', '트럭',
    '럭비', '비행기', '기러기', '기념품', '품', '달빛', '빛', '별빛', '햇살', '살구', '구름빵', '빵집', '집밥', '밥그릇', '릇', '연필', '필기', '기록', '녹차', '차분함',
  ].filter((w) => w.length >= 2),
  ja: [
    'こーひー', 'ひこうき', 'きつね', 'ねこ', 'こあら', 'らっぱ', 'ぱせり', 'りす', 'すいか', 'かさ', 'さくら', 'らくだ', 'たまご', 'ごりら', 'りんご', 'ごま', 'まくら', 'いちご', 'はさみ', 'みず',
    'かめ', 'めだか', 'かき', 'きのこ', 'こま', 'まど', 'どーなつ', 'つくえ', 'えんぴつ', 'つき', 'きって', 'てがみ', 'みみ', 'みるく', 'くり', 'くも', 'もも', 'もり', 'りょうり', 'りか',
    'かぎ', 'ぎたー', 'たぬき', 'きつつき', 'きもの', 'のーと', 'とけい', 'いす', 'すずめ', 'めがね', 'ねずみ', 'みそしる', 'るーぺ', 'ぺーじ', 'じてんしゃ', 'やさい', 'いぬ', 'ぬいぐるみ', 'みち', 'ちず',
    'すな', 'なす', 'すし', 'しまうま', 'まっちゃ', 'やま', 'まめ', 'あめ', 'にじ', 'じゅーす', 'すみれ', 'れたす', 'すいとう', 'うさぎ', 'ぎゅうにゅう', 'うみ', 'みかづき', 'きく', 'くま', 'まふらー',
    'らむね', 'ねぎ', 'ほし', 'しか', 'かえる', 'るびー', 'びすけっと', 'とまと', 'とり', 'くっきー', 'ぱすた', 'たいやき', 'きゃべつ', 'つばめ', 'めーる', 'ろうそく', 'くつした', 'たこ', 'こたつ', 'つみき',
    'つる', 'おちゃ', 'やぎ', 'ぎょうざ', 'ざっし', 'しお', 'おにぎり', 'うし', 'しろくま', 'まつぼっくり', 'あさがお', 'おかし', 'しずく', 'くじら', 'らっこ', 'こおり', 'てぶくろ', 'ろぼっと', 'とんぼ', 'ぼうし',
    'かぶ', 'ぶどう', 'うめ', 'あり', 'いるか', 'かもめ', 'めじろ', 'ろば', 'ばなな', 'なつ', 'のり', 'はな', 'なべ', 'べんとう', 'うぐいす', 'きいろ', 'ふね', 'たいこ', 'こいぬ', 'ぬりえ',
    'えき', 'きゅうり', 'えだ', 'だんご', 'ごぼう', 'うま', 'けーき', 'きんぎょ', 'よる', 'よーぐると', 'とびら', 'らじお', 'おと', 'とうふ', 'ふくろう', 'うきわ', 'わに', 'にわとり', 'ゆき', 'ゆび',
    'びわ', 'そら', 'そば', 'ばけつ', 'つくし', 'ひまわり', 'はっぱ', 'ぱんだ', 'だちょう', 'ほたる', 'あひる', 'へび', 'びーだま', 'るす', 'わたあめ', 'うちわ', 'ふくろ', 'ろけっと', 'とかい', 'いけ',
  ],
  vi: [
    'cà phê', 'phê bình', 'bình hoa', 'hoa hồng', 'hồng trà', 'trà sữa', 'sữa chua', 'chua ngọt', 'ngọt ngào', 'trà xanh', 'xanh lá', 'lá cây', 'cây bút', 'bút chì', 'chì màu', 'màu sắc', 'sắc màu', 'màu xanh', 'xanh dương', 'dương cầm',
    'cầm tay', 'tay áo', 'áo mưa', 'mưa rào', 'mưa phùn', 'bánh mì', 'mì gói', 'gói quà', 'quà tặng', 'bánh ngọt', 'ngôi sao', 'sao băng', 'băng giá', 'giá sách', 'sách vở', 'vở nháp', 'mặt trời', 'trời xanh', 'trời mưa', 'hoa mai',
    'mai vàng', 'vàng anh', 'anh đào', 'nắng vàng', 'bàn học', 'học sinh', 'sinh nhật', 'nhật ký', 'sinh tố', 'đèn bàn', 'bàn ghế', 'ghế đá', 'đá quý', 'gió mát', 'mát mẻ', 'con mèo', 'mèo con', 'con cá', 'cá vàng', 'con chim',
    'chim sẻ', 'mây trắng', 'trắng tinh', 'ly nước', 'nước cam', 'nước dừa', 'dừa xiêm', 'đậu phộng', 'đậu xanh', 'kem dâu', 'dâu tây', 'bánh kem', 'kem que', 'que kem', 'kem tươi', 'tươi vui', 'vui vẻ', 'vẻ đẹp', 'đẹp trời', 'hoa cúc',
    'cúc áo', 'áo khoác', 'áo len', 'trăng tròn', 'tròn trịa', 'truyện tranh', 'tranh vẽ', 'vẽ tranh', 'tranh màu', 'buổi sáng', 'sáng sớm', 'sớm mai', 'đêm trăng', 'trăng sáng', 'trà đá', 'cốc sữa', 'sữa tươi', 'tươi mát', 'nhà sách', 'góc phố',
    'phố cổ', 'cổ tích', 'âm nhạc', 'nhạc nhẹ', 'nhẹ nhàng', 'học bài', 'bài hát', 'cửa sổ', 'sổ tay', 'rau má', 'má hồng', 'chuông gió', 'đồng hồ', 'hồ nước', 'nước ngọt', 'bông hoa', 'hoa lan', 'lan can', 'lá thư', 'thư viện',
    'ấm trà', 'trà chanh', 'chanh dây', 'dây đàn', 'đàn gà', 'gà con', 'con đường', 'đường phố', 'kẹo ngọt', 'cây thông', 'thông minh', 'minh họa', 'họa sĩ', 'biển xanh', 'hồ sen', 'sen hồng', 'bánh bao', 'bao thư', 'thư tay', 'tay đàn',
    'giấc mơ', 'mơ màng', 'hạt dẻ', 'dẻ cười', 'cười vui', 'vui chơi', 'chơi đùa', 'cánh diều', 'diều giấy', 'giấy màu', 'bút mực', 'nến thơm', 'thơm ngon', 'ngon miệng', 'miệng cười', 'cầu vồng', 'quả cam', 'cam sành', 'sân vườn', 'vườn hoa',
  ],
  en: [
    'coffee', 'egg', 'garden', 'nest', 'tea', 'apple', 'eraser', 'rain', 'notebook', 'kettle', 'lemon', 'napkin', 'night', 'tulip', 'pencil', 'lamp', 'pillow', 'window', 'waffle', 'envelope',
    'echo', 'orange', 'ember', 'river', 'rose', 'star', 'rabbit', 'table', 'leaf', 'feather', 'rainbow', 'wind', 'dream', 'moon', 'nutmeg', 'guitar', 'rug', 'grape', 'eclair', 'road',
    'desk', 'kite', 'ear', 'robin', 'napkin', 'noodle', 'easel', 'latte', 'eagle', 'elephant', 'teapot', 'tree', 'evening', 'garlic', 'candle', 'eclipse', 'earth', 'honey', 'yarn', 'north',
    'hat', 'tomato', 'owl', 'lake', 'error', 'ribbon', 'nap', 'pie', 'island', 'drum', 'mug', 'goose', 'etude', 'sugar', 'rice', 'essay', 'yogurt', 'toast', 'teacup', 'plant',
    'tart', 'thunder', 'radio', 'oven', 'needle', 'eraser', 'reed', 'daisy', 'yellow', 'wool', 'lily', 'yard', 'dew', 'wave', 'eel', 'lantern', 'nectar', 'raindrop', 'pumpkin', 'nightlight',
    'tangerine', 'engine', 'ember', 'ruler', 'rice', 'eggplant', 'tiger', 'rocket', 'toy', 'yawn', 'notepad', 'donut', 'tunnel', 'lighthouse', 'elm', 'maple', 'eyelash', 'hammock', 'kiwi', 'igloo',
    'ocean', 'nutshell', 'lollipop', 'popcorn', 'nachos', 'sandwich', 'hill', 'lavender', 'raven', 'noon', 'nook', 'key', 'yoyo', 'olive', 'espresso', 'orchard', 'dawn', 'nimbus', 'sunset', 'tide',
    'melody', 'yarn', 'napkin', 'cocoa', 'acorn', 'nutcracker', 'rain', 'cloud', 'daydream', 'meadow', 'window', 'wish', 'hug', 'glow', 'woods', 'scarf', 'fern', 'nutella', 'almond', 'dune',
  ].filter((w, i, a) => a.indexOf(w) === i),
};
export type RelayLang = Lang;

const SMALL_KANA: Record<string, string> = { ぁ: 'あ', ぃ: 'い', ぅ: 'う', ぇ: 'え', ぉ: 'お', ゃ: 'や', ゅ: 'ゆ', ょ: 'よ', ゎ: 'わ', っ: 'つ' };
const syllables = (w: string) => w.split(' ');

// Katakana is accepted and turned into hiragana; Vietnamese spacing and accents are normalized
export function norm(lang: RelayLang, w: string) {
  const s = w.normalize('NFC').trim().toLowerCase();
  if (lang === 'ja') return s.replace(/[\u30a1-\u30f6]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));
  if (lang === 'vi') return s.replace(/\s+/g, ' ');
  return s;
}

// The piece the next word has to start with
export function lastChar(lang: RelayLang, w: string) {
  if (lang === 'vi') {
    const s = syllables(w);
    return s[s.length - 1];
  }
  let i = w.length - 1;
  if (lang === 'ja') while (i > 0 && w[i] === 'ー') i--;
  return lang === 'ja' ? (SMALL_KANA[w[i]] ?? w[i]) : w[i];
}
export const firstChar = (lang: RelayLang, w: string) => (lang === 'vi' ? syllables(w)[0] : w[0]);
const links = (lang: RelayLang, prev: string, w: string) => firstChar(lang, w) === lastChar(lang, prev);
export const inPool = (lang: RelayLang, w: string) => WORDS[lang].includes(norm(lang, w));

// Candidates that can continue the chain (excluding words already used)
export function candidates(lang: RelayLang, prev: string | null, used: string[]): string[] {
  const pool = WORDS[lang].filter((w) => !used.includes(w));
  return prev ? pool.filter((w) => links(lang, prev, w)) : pool;
}

export function isValidNext(lang: RelayLang, prev: string | null, used: string[], word: string) {
  const w = norm(lang, word);
  return inPool(lang, w) && !used.includes(w) && (!prev || links(lang, prev, w));
}

export const pickRandom = <T,>(list: T[]) => list[Math.floor(Math.random() * list.length)];
