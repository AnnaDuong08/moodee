// Word Relay 단어 풀(카페·자연·일상 명사). 한국어는 두음법칙 없이 "첫 글자 = 이전 단어 마지막 글자"
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
export type RelayLang = keyof typeof WORDS;

export const lastChar = (w: string) => w[w.length - 1];
export const firstChar = (w: string) => w[0];
const norm = (w: string) => w.trim().toLowerCase();
export const inPool = (lang: RelayLang, w: string) => WORDS[lang].includes(norm(w));

// 이어갈 수 있는 후보(이미 쓴 단어 제외)
export function candidates(lang: RelayLang, prev: string | null, used: string[]): string[] {
  const pool = WORDS[lang].filter((w) => !used.includes(w));
  return prev ? pool.filter((w) => firstChar(w) === lastChar(prev)) : pool;
}

export function isValidNext(lang: RelayLang, prev: string | null, used: string[], word: string) {
  const w = norm(word);
  return inPool(lang, w) && !used.includes(w) && (!prev || firstChar(w) === lastChar(prev));
}

export const pickRandom = <T,>(list: T[]) => list[Math.floor(Math.random() * list.length)];
