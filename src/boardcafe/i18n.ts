// Board Café UI text per language (the language itself is the app-wide setting from src/i18n)
import type { Lang } from '../i18n';

export { LANGS, type Lang } from '../i18n';

const TEXT = {
  language: { en: 'Language', ko: '언어', ja: '言語', vi: 'Ngôn ngữ' },
  lead: { en: 'Little games you finish together', ko: '같이 하나를 완성하는 작은 게임들', ja: 'みんなでひとつ完成させる小さなゲーム', vi: 'Những trò chơi nhỏ cùng nhau hoàn thành' },
  comingSoon: { en: 'Cloud Match is coming soon', ko: 'Cloud Match는 곧 열려요', ja: 'Cloud Match はもうすぐ遊べます', vi: 'Cloud Match sắp ra mắt' },
  soonBadge: { en: 'Coming soon', ko: '곧 열려요', ja: 'もうすぐ', vi: 'Sắp ra mắt' },
  gather: { en: 'Luna and Hieu join your table', ko: 'Luna와 Hieu가 테이블로 왔어요', ja: 'Luna と Hieu がテーブルに来たよ', vi: 'Luna và Hieu đến bàn của bạn' },
  letsPlay: { en: 'Let’s play!', ko: '시작해 볼까요?', ja: 'はじめよう！', vi: 'Chơi thôi!' },
  allClouds: { en: 'All 3 clouds!', ko: '구름 3개 완성!', ja: '雲が3つできた！', vi: 'Đủ 3 đám mây!' },
  closing: { en: 'Café is closing ☕', ko: '카페가 문을 닫아요 ☕', ja: 'カフェが閉まるよ ☕', vi: 'Quán sắp đóng cửa ☕' },
  cloudsMade: { en: 'We made {n} cloud{s} together!', ko: '함께 구름 {n}개를 만들었어요!', ja: 'みんなで雲を{n}つ作ったよ！', vi: 'Chúng ta đã cùng làm {n} đám mây!' },
  niceChain: { en: 'Nice chain! ☁️', ko: '멋진 이어가기! ☁️', ja: 'いいしりとり！ ☁️', vi: 'Nối hay lắm! ☁️' },
  wordsChained: { en: '{n} words together', ko: '함께 단어 {n}개를 이었어요', ja: 'みんなで{n}語つないだよ', vi: 'Cùng nối được {n} từ' },
  anotherGame: { en: 'Another game', ko: '다른 게임', ja: 'ほかのゲーム', vi: 'Trò khác' },
  backToTable: { en: 'Back to the table', ko: '테이블로 돌아가기', ja: 'テーブルにもどる', vi: 'Quay lại bàn' },
  // Cloud Tiles
  notThisOne: { en: 'Hmm, not this one', ko: '음, 여기는 아닌가 봐', ja: 'うーん、ここじゃないみたい', vi: 'Hừm, không phải chỗ này' },
  sameColor: { en: 'Same color', ko: '같은 색', ja: '同じ色', vi: 'Cùng màu' },
  diffColor: { en: 'All different colors', ko: '모두 다른 색', ja: 'ぜんぶちがう色', vi: 'Tất cả khác màu' },
  anyColor: { en: 'Any color', ko: '색 상관없음', ja: '色は自由', vi: 'Màu nào cũng được' },
  cloudMade: { en: 'Cloud made!', ko: '구름 완성!', ja: '雲ができた！', vi: 'Xong một đám mây!' },
  clouds: { en: 'Clouds', ko: '구름', ja: '雲', vi: 'Mây' },
  turn: { en: 'Turn', ko: '차례', ja: 'ターン', vi: 'Lượt' },
  yourTiles: { en: 'YOUR TILES', ko: '내 타일', ja: 'じぶんのタイル', vi: 'THẺ CỦA BẠN' },
  yourTurnHint: { en: 'Your turn — drag or tap a tile', ko: '네 차례! 끌거나 탭해서 놓기', ja: 'きみの番！ドラッグかタップで置こう', vi: 'Đến lượt bạn — kéo hoặc chạm vào thẻ' },
  thinking: { en: '{name} is thinking…', ko: '{name}이(가) 생각 중…', ja: '{name} が考え中…', vi: '{name} đang nghĩ…' },
  pass: { en: 'Pass', ko: '패스', ja: 'パス', vi: 'Bỏ lượt' },
  plusTile: { en: '+1 tile', ko: '+1장', ja: '+1枚', vi: '+1 thẻ' },
  // Word Relay
  relayTitle: { en: 'Word Relay', ko: '끝말잇기', ja: 'しりとり', vi: 'Nối từ' },
  wordsTogether: { en: 'words together', ko: '단어 이어짐', ja: '語つながった', vi: 'từ đã nối' },
  startFreshSay: { en: '{name}: Let’s start fresh!', ko: '{name}: 새로 시작하자!', ja: '{name}：あたらしくはじめよう！', vi: '{name}: Bắt đầu lại nhé!' },
  alreadyUsed: { en: 'Already used', ko: '이미 나온 단어야', ja: 'もう出たことばだよ', vi: 'Từ này dùng rồi' },
  tryStart: { en: 'Try a word starting with “{c}”', ko: '‘{c}’(으)로 시작해 볼까?', ja: '「{c}」ではじまることばにしよう', vi: 'Thử một từ bắt đầu bằng “{c}”' },
  notInList: { en: 'Not in our café word list', ko: '카페 단어장에 없는 말이야', ja: 'カフェのことば帳にないよ', vi: 'Không có trong sổ từ của quán' },
  freshTag: { en: ' · fresh start', ko: ' · 새 시작', ja: ' · あたらしく', vi: ' · bắt đầu lại' },
  startFresh: { en: 'Start fresh', ko: '새로 시작하기', ja: 'あたらしくはじめる', vi: 'Bắt đầu lại' },
  startsWith: { en: 'A word starting with “{c}”', ko: '‘{c}’(으)로 시작하는 단어', ja: '「{c}」ではじまることば', vi: 'Từ bắt đầu bằng “{c}”' },
  anyWord: { en: 'Any word', ko: '아무 단어나', ja: 'どんなことばでも', vi: 'Từ nào cũng được' },
  timeUp: { en: 'Time’s up ☁️', ko: '시간이 다 됐어요 ☁️', ja: 'じかんだよ ☁️', vi: 'Hết giờ ☁️' },
  whoseTurn: { en: '{name}’s turn', ko: '{name}의 차례', ja: '{name} の番', vi: 'Lượt của {name}' },
  poolSize: { en: '{n} café words', ko: '카페 단어장 {n}개', ja: 'カフェのことば {n}語', vi: '{n} từ của quán' },
} satisfies Record<string, Record<Lang, string>>;

export function t(lang: Lang, key: keyof typeof TEXT, vars: Record<string, string | number> = {}) {
  return TEXT[key][lang].replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? ''));
}
