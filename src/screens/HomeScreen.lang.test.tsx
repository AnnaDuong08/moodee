// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { setLang } from '../i18n';
import { HomeScreen } from './HomeScreen';

describe('home language button', () => {
  it('switches the whole screen to the picked language', () => {
    const noop = () => {};
    render(<HomeScreen characterId={null} onGo={noop} onChangeCharacter={noop} onRecords={noop} onMembership={noop} onCalendar={noop} onSoundSettings={noop} />);
    expect(screen.getByText('Where to today?')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Language/ }));
    fireEvent.click(screen.getByRole('menuitemradio', { name: /한국어/ }));
    expect(screen.getByText('오늘은 어디로 갈까요?')).toBeTruthy();
    expect(screen.getByText('캘린더')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /언어/ }));
    fireEvent.click(screen.getByRole('menuitemradio', { name: /Tiếng Việt/ }));
    expect(screen.getByText('Hôm nay đi đâu nhỉ?')).toBeTruthy();
    setLang('en');
  });
});
