import { describe, expect, it } from 'vitest';
import { translate } from '.';
import { ja } from './ja';
import { ko } from './ko';
import { vi } from './vi';

const slots = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join();

describe('app translations', () => {
  it('covers the same English text in every language', () => {
    expect(Object.keys(ja).sort()).toEqual(Object.keys(ko).sort());
    expect(Object.keys(vi).sort()).toEqual(Object.keys(ko).sort());
  });

  it.each([['ko', ko], ['ja', ja], ['vi', vi]] as const)('%s keeps every {placeholder}', (_, dict) => {
    for (const [en, text] of Object.entries(dict)) expect(slots(text), en).toBe(slots(en));
  });

  it('fills placeholders and falls back to English', () => {
    expect(translate('ko', 'Go to {place}', { place: '카페' })).toBe('카페(으)로 가기');
    expect(translate('en', 'Go to {place}', { place: 'Café' })).toBe('Go to Café');
    expect(translate('ja', 'Not translated yet')).toBe('Not translated yet');
  });
});
