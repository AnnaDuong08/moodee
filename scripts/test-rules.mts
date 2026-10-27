// Cloud Tiles 패턴 판정 테스트: `npm run test:rules` (Node 24의 TypeScript 타입 제거 실행)
import { canPlace, isComplete, makeDeck, nextPattern, PATTERNS, type Tile, type TileColor } from '../src/boardcafe/rules.ts';

let pass = 0, fail = 0;
const t = (name: string, got: boolean, want: boolean) => {
  if (got === want) pass++;
  else {
    fail++;
    console.log(`✗ ${name}: got ${got}, want ${want}`);
  }
};
const T = (color: TileColor, n: number): Tile => ({ id: `${color}${n}`, color, n });
const P = (id: string) => PATTERNS.find((p) => p.id === id)!;

// path_234: 같은 색, 2·3·4
{
  const p = P('path_234');
  t('path 빈 슬롯에 맞는 숫자', canPlace(p, [null, null, null], 0, T('sky', 2)), true);
  t('path 숫자 틀림', canPlace(p, [null, null, null], 0, T('sky', 3)), false);
  t('path 같은 색 이어가기', canPlace(p, [T('sky', 2), null, null], 1, T('sky', 3)), true);
  t('path 다른 색 거절', canPlace(p, [T('sky', 2), null, null], 1, T('dream', 3)), false);
  t('path 이미 찬 슬롯', canPlace(p, [T('sky', 2), null, null], 0, T('sky', 2)), false);
}
// rainbow_555: 모두 5, 서로 다른 색
{
  const p = P('rainbow_555');
  t('rainbow 5 아무 슬롯', canPlace(p, [null, null, null], 2, T('forest', 5)), true);
  t('rainbow 5 아닌 숫자', canPlace(p, [null, null, null], 0, T('forest', 4)), false);
  t('rainbow 같은 색 거절', canPlace(p, [T('sky', 5), null, null], 1, T('sky', 5)), false);
  t('rainbow 다른 색 허용', canPlace(p, [T('sky', 5), null, null], 1, T('sunset', 5)), true);
}
// pair_33: 모두 3, 서로 다른 색
{
  const p = P('pair_33');
  t('pair 3', canPlace(p, [null, null], 0, T('dream', 3)), true);
  t('pair 같은 색 거절', canPlace(p, [T('dream', 3), null], 1, T('dream', 3)), false);
  t('pair 완성 판정', isComplete([T('dream', 3), T('sky', 3)]), true);
}
// colorstep_123: 1·2·3, 서로 다른 색
{
  const p = P('colorstep_123');
  t('colorstep 다른 색', canPlace(p, [T('sky', 1), null, null], 1, T('forest', 2)), true);
  t('colorstep 같은 색 거절', canPlace(p, [T('sky', 1), null, null], 1, T('sky', 2)), false);
  t('colorstep 자리 숫자', canPlace(p, [null, null, null], 2, T('sky', 2)), false);
}
// pyramid_123: 1·2·3, 색 무관
{
  const p = P('pyramid_123');
  t('pyramid 같은 색도 허용', canPlace(p, [T('sky', 1), null, null], 1, T('sky', 2)), true);
  t('pyramid 숫자 틀림', canPlace(p, [null, null, null], 0, T('sky', 2)), false);
}
// odd_135_moon / even_246_sun: 같은 색
{
  const o = P('odd_135_moon');
  t('odd 1·3·5', canPlace(o, [T('dream', 1), null, null], 1, T('dream', 3)), true);
  t('odd 다른 색 거절', canPlace(o, [T('dream', 1), null, null], 2, T('sky', 5)), false);
  t('odd 짝수 거절', canPlace(o, [null, null, null], 1, T('dream', 4)), false);
  const e = P('even_246_sun');
  t('even 2·4·6', canPlace(e, [null, null, null], 2, T('sunset', 6)), true);
  t('even 홀수 거절', canPlace(e, [null, null, null], 0, T('sunset', 1)), false);
}
// colorcycle: 4색 한 장씩, 숫자 무관
{
  const p = P('colorcycle');
  t('cycle 아무 숫자', canPlace(p, [null, null, null, null], 3, T('forest', 6)), true);
  t('cycle 같은 색 거절', canPlace(p, [T('forest', 1), null, null, null], 1, T('forest', 2)), false);
  t('cycle 네 색 완성', isComplete([T('sky', 1), T('sunset', 2), T('dream', 3), T('forest', 4)]), true);
  t('cycle 미완성', isComplete([T('sky', 1), null, T('dream', 3), T('forest', 4)]), false);
}
// 덱과 패턴 교체
t('덱 48장', makeDeck().length === 48, true);
t('덱 id 중복 없음', new Set(makeDeck().map((x) => x.id)).size === 48, true);
t('같은 패턴 연속 금지', Array.from({ length: 200 }, () => nextPattern('pair_33').id).includes('pair_33'), false);

console.log(`${fail ? '✗' : '✓'} rules: ${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
