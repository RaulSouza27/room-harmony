import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { openWhatsApp } from './whatsapp';

describe('whatsapp utility', () => {
  const originalWindowLocation = window.location;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('does nothing if phone is undefined or empty', () => {
    const spyOpen = vi.spyOn(window, 'open').mockImplementation(() => null);
    openWhatsApp(undefined);
    openWhatsApp('');
    expect(spyOpen).not.toHaveBeenCalled();
  });

  it('opens desktop WhatsApp Web tab when not mobile', () => {
    const spyOpen = vi.spyOn(window, 'open').mockImplementation(() => null);
    openWhatsApp('11987654321', 'Olá, teste');

    expect(spyOpen).toHaveBeenCalledWith(
      'https://web.whatsapp.com/send?phone=5511987654321&text=Ol%C3%A1%2C%20teste',
      'whatsapp_tab'
    );
  });

  it('formats 10 or 11 digit numbers with country code 55', () => {
    const spyOpen = vi.spyOn(window, 'open').mockImplementation(() => null);
    openWhatsApp('11999998888');

    expect(spyOpen).toHaveBeenCalledWith(
      'https://web.whatsapp.com/send?phone=5511999998888',
      'whatsapp_tab'
    );
  });
});
