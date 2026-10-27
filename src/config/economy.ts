// 코인 규칙(명세 "경제 & 멤버십"): 값은 여기서만 바꾼다
export const COINS_PER_HOUR = 30; // 세션 보상: 집중 1시간당 30코인(분 단위 비례)
export const MIN_REWARD_MINUTES = 10; // 10분 미만은 보상 없이 기록만
export const DAILY_COINS = { free: 10, pro: 40 } as const; // 그날 첫 세션을 끝내면 지급
// 출석 도장판(7일): 그날 첫 세션을 끝내면 도장이 "받기" 상태가 되고, 상점에서 받는다. 7일째는 큰 선물
export const STAMP_REWARDS = { free: [10, 10, 10, 10, 10, 10, 30], pro: [40, 40, 40, 40, 40, 40, 100] } as const;
export const CLOUDEE_PRICE = 300; // 잠긴 Cloudee(캐릭터) 해제
export const PART_PRICE = 100; // 옷장 파츠 기본 가격
export const FREE_PARTS_PER_TAB = 3; // 탭마다 처음 3개는 무료
export const DEMO_TOPUP = 300; // 시연용 코인 충전

export const sessionCoins = (minutes: number) => (minutes < MIN_REWARD_MINUTES ? 0 : Math.round((minutes / 60) * COINS_PER_HOUR));

const base = import.meta.env.BASE_URL;

// Pro 월간 보상(멤버십 시안)
export const MONTHLY_REWARDS = [
  { day: 10, id: 'sneakers', name: 'Cloud Sneakers', img: `${base}assets/rewards/sneakers.png` },
  { day: 20, id: 'headband', name: 'Moodee Headband', img: `${base}assets/rewards/headband.png` },
  { day: 30, id: 'jacket', name: 'Cloud Jacket', img: `${base}assets/rewards/jacket.png` },
];

// 옷장 파츠: 시트에서 잘라낸 타일
const tiles = (tab: string, count: number) =>
  Array.from({ length: count }, (_, i) => ({
    id: `${tab}-${String(i + 1).padStart(2, '0')}`,
    img: `${base}assets/customize/${tab}-${String(i + 1).padStart(2, '0')}.jpg`,
    price: i < FREE_PARTS_PER_TAB ? 0 : PART_PRICE,
  }));

export const WARDROBE = [
  { id: 'hair', label: 'Hair', noun: 'hair style', items: tiles('hair', 12) },
  { id: 'tops', label: 'Tops', noun: 'top', items: tiles('tops', 21) },
  { id: 'bottoms', label: 'Bottoms', noun: 'bottom', items: tiles('bottoms', 18) },
  { id: 'glasses', label: 'Glasses', noun: 'pair of glasses', items: tiles('glasses', 12) },
] as const;

// 방·전시에 놓을 수 있는 오브젝트
export const OBJECTS = [
  { id: 'clock', name: 'Wall clock', img: `${base}assets/places/props/prop-clock.png`, price: 0 },
  { id: 'book', name: 'Open book', img: `${base}assets/objects/book.png`, price: 0 },
  { id: 'mug', name: 'Glass mug', img: `${base}assets/objects/mug.png`, price: 40 },
  { id: 'bookshelf', name: 'Plant shelf', img: `${base}assets/places/props/prop-bookshelf.png`, price: 120 },
  { id: 'desk', name: 'Study desk', img: `${base}assets/places/props/prop-desk.png`, price: 150 },
  { id: 'blackboard', name: 'Blackboard', img: `${base}assets/places/props/prop-blackboard.png`, price: 180 },
];
export const objectById = (id: string) => OBJECTS.find((o) => o.id === id);

// 카페 메뉴
export const DRINKS = [
  { id: 'latte', name: 'Café latte', price: 5, tint: '#C99A6B' },
  { id: 'honey', name: 'Honey milk', price: 8, tint: '#F2D59A' },
  { id: 'matcha', name: 'Matcha latte', price: 8, tint: '#A9C58A' },
];

// 박물관: 현장에서 찍은 사진(카메라에 비치는 장면) → 3D 기억 오브젝트
const ex = (n: string) => `${base}assets/exhibits/${n}`;
export const EXHIBIT_OBJECTS = {
  'banana-milk': { name: 'Milk break', img: ex('object-banana-milk.png') },
  pringles: { name: 'Snack stack', img: ex('object-pringles.png') },
  'team-whiteboard': { name: 'Team whiteboard', img: ex('object-team-whiteboard.png') },
  'hackathon-banner': { name: 'Hackathon banner', img: ex('object-hackathon-banner.png') },
  'duck-sock': { name: 'Duck sock', img: ex('object-duck-sock.png') },
} as const;
export type ExhibitObjectId = keyof typeof EXHIBIT_OBJECTS;

// 카메라 앞에 놓을 수 있는 장면들(어떤 오브젝트로 바뀌는지)
export const CAMERA_SCENES: { id: string; label: string; photo: string; object: ExhibitObjectId }[] = [
  { id: 'banana-milk', label: 'Milk on the desk', photo: ex('photo-banana-milk.jpg'), object: 'banana-milk' },
  { id: 'pringles', label: 'Snacks by the laptop', photo: ex('photo-pringles.jpg'), object: 'pringles' },
  { id: 'team-drawing', label: 'Our team drawing', photo: ex('photo-team-drawing.jpg'), object: 'team-whiteboard' },
  { id: 'whiteboard-stand', label: 'The whiteboard', photo: ex('photo-whiteboard-stand.jpg'), object: 'team-whiteboard' },
  { id: 'hackathon-banner', label: 'Hackathon banner', photo: ex('photo-hackathon-banner.jpg'), object: 'hackathon-banner' },
  { id: 'duck-sock', label: 'Lucky duck sock', photo: ex('object-duck-sock.png'), object: 'duck-sock' },
];

// My Room 방 스타일(꾸미기 시안의 방 그림). 코인으로 해제
const spot = { x: 0.5, y: 0.77, h: 0.42 };
export const ROOM_LOOKS = [
  { id: 'classic', name: 'Dorm room', src: `${base}assets/places/myroom.jpg`, width: 941, height: 1440, price: 0, spot: { x: 0.56, y: 0.655, h: 0.5 } },
  { id: 'empty', name: 'Fresh start', src: `${base}assets/places/room-1-empty.jpg`, width: 941, height: 1250, price: 0, spot },
  { id: 'desk', name: 'Study corner', src: `${base}assets/places/room-2-desk.jpg`, width: 941, height: 1250, price: 60, spot },
  { id: 'cozy', name: 'Cozy nook', src: `${base}assets/places/room-3-cozy.jpg`, width: 941, height: 1250, price: 120, spot },
  { id: 'full', name: 'Sunset lounge', src: `${base}assets/places/room-4-full.jpg`, width: 941, height: 1250, price: 200, spot },
  { id: 'loft', name: 'Loft studio', src: `${base}assets/places/room-5-loft.jpg`, width: 941, height: 1250, price: 300, spot },
];
export const roomLook = (id: string) => ROOM_LOOKS.find((r) => r.id === id) ?? ROOM_LOOKS[0];
