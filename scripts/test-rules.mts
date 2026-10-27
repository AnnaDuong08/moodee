// Cloud Tiles pattern-check tests: `npm run test:rules` (runs via Node 24's TypeScript type stripping)
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

// path_234: same color, 2·3·4
{
  const p = P('path_234');
  t('path correct number in empty slot', canPlace(p, [null, null, null], 0, T('sky', 2)), true);
  t('path wrong number', canPlace(p, [null, null, null], 0, T('sky', 3)), false);
  t('path continue same color', canPlace(p, [T('sky', 2), null, null], 1, T('sky', 3)), true);
  t('path rejects different color', canPlace(p, [T('sky', 2), null, null], 1, T('dream', 3)), false);
  t('path slot already filled', canPlace(p, [T('sky', 2), null, null], 0, T('sky', 2)), false);
}
// rainbow_555: all 5s, all different colors
{
  const p = P('rainbow_555');
  t('rainbow 5 in any slot', canPlace(p, [null, null, null], 2, T('forest', 5)), true);
  t('rainbow non-5 number', canPlace(p, [null, null, null], 0, T('forest', 4)), false);
  t('rainbow rejects same color', canPlace(p, [T('sky', 5), null, null], 1, T('sky', 5)), false);
  t('rainbow allows different color', canPlace(p, [T('sky', 5), null, null], 1, T('sunset', 5)), true);
}
// pair_33: all 3s, different colors
{
  const p = P('pair_33');
  t('pair 3', canPlace(p, [null, null], 0, T('dream', 3)), true);
  t('pair rejects same color', canPlace(p, [T('dream', 3), null], 1, T('dream', 3)), false);
  t('pair completion check', isComplete([T('dream', 3), T('sky', 3)]), true);
}
// colorstep_123: 1·2·3, all different colors
{
  const p = P('colorstep_123');
  t('colorstep different color', canPlace(p, [T('sky', 1), null, null], 1, T('forest', 2)), true);
  t('colorstep rejects same color', canPlace(p, [T('sky', 1), null, null], 1, T('sky', 2)), false);
  t('colorstep slot number', canPlace(p, [null, null, null], 2, T('sky', 2)), false);
}
// pyramid_123: 1·2·3, any color
{
  const p = P('pyramid_123');
  t('pyramid allows same color', canPlace(p, [T('sky', 1), null, null], 1, T('sky', 2)), true);
  t('pyramid wrong number', canPlace(p, [null, null, null], 0, T('sky', 2)), false);
}
// odd_135_moon / even_246_sun: same color
{
  const o = P('odd_135_moon');
  t('odd 1·3·5', canPlace(o, [T('dream', 1), null, null], 1, T('dream', 3)), true);
  t('odd rejects different color', canPlace(o, [T('dream', 1), null, null], 2, T('sky', 5)), false);
  t('odd rejects even number', canPlace(o, [null, null, null], 1, T('dream', 4)), false);
  const e = P('even_246_sun');
  t('even 2·4·6', canPlace(e, [null, null, null], 2, T('sunset', 6)), true);
  t('even rejects odd number', canPlace(e, [null, null, null], 0, T('sunset', 1)), false);
}
// colorcycle: one of each of the 4 colors, any number
{
  const p = P('colorcycle');
  t('cycle any number', canPlace(p, [null, null, null, null], 3, T('forest', 6)), true);
  t('cycle rejects same color', canPlace(p, [T('forest', 1), null, null, null], 1, T('forest', 2)), false);
  t('cycle four colors complete', isComplete([T('sky', 1), T('sunset', 2), T('dream', 3), T('forest', 4)]), true);
  t('cycle incomplete', isComplete([T('sky', 1), null, T('dream', 3), T('forest', 4)]), false);
}
// Deck and pattern swapping
t('deck has 48 tiles', makeDeck().length === 48, true);
t('deck ids unique', new Set(makeDeck().map((x) => x.id)).size === 48, true);
t('no same pattern twice in a row', Array.from({ length: 200 }, () => nextPattern('pair_33').id).includes('pair_33'), false);

console.log(`${fail ? '✗' : '✓'} rules: ${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
