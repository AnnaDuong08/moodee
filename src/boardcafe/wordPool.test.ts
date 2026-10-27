import { describe, expect, it } from 'vitest';
import { LANGS } from './i18n';
import { candidates, isValidNext, lastChar, norm, WORDS } from './wordPool';

describe('word relay pools', () => {
  it.each(LANGS.map((l) => l.id))('%s: words are normalized, unique and mostly chainable', (lang) => {
    const pool = WORDS[lang];
    expect(pool.length).toBeGreaterThan(100);
    expect(new Set(pool).size).toBe(pool.length);
    for (const w of pool) expect(norm(lang, w)).toBe(w);
    const linked = pool.filter((w) => candidates(lang, w, [w]).length > 0);
    expect(linked.length / pool.length).toBeGreaterThan(0.6);
  });

  it('ja: hiragana only, never ending in ん', () => {
    for (const w of WORDS.ja) {
      expect(w).toMatch(/^[ぁ-ゖー]+$/);
      expect(lastChar('ja', w)).not.toBe('ん');
    }
  });

  it('ja: long vowels and small kana', () => {
    expect(lastChar('ja', 'こーひー')).toBe('ひ');
    expect(lastChar('ja', 'おちゃ')).toBe('や');
    expect(isValidNext('ja', 'こーひー', [], 'ヒコウキ')).toBe(true);
    expect(isValidNext('ja', 'おちゃ', [], 'やま')).toBe(true);
  });

  it('vi: chains by syllable', () => {
    expect(lastChar('vi', 'cà phê')).toBe('phê');
    expect(isValidNext('vi', 'cà phê', [], '  Phê   Bình ')).toBe(true);
    expect(isValidNext('vi', 'cà phê', [], 'trà sữa')).toBe(false);
  });

  it('en and ko still chain by letter', () => {
    expect(isValidNext('en', 'coffee', [], 'egg')).toBe(true);
    expect(isValidNext('ko', '커피', [], '피아노')).toBe(true);
    expect(isValidNext('ko', '커피', ['피아노'], '피아노')).toBe(false);
  });
});
