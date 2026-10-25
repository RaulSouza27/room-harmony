import { describe, it, expect, vi, beforeEach } from 'vitest';
import { openWhatsApp, resetWhatsAppWindowRef } from './whatsapp';

describe('whatsapp utility', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    resetWhatsAppWindowRef();
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

  it('reuses an already open WhatsApp tab on desktop without calling window.open again', () => {
    const mockTab = {
      closed: false,
      location: { href: '' },
      focus: vi.fn(),
    } as unknown as Window;

    const spyOpen = vi.spyOn(window, 'open').mockReturnValue(mockTab);

    // Primeira chamada abre a aba e guarda a referência
    openWhatsApp('11987654321', 'Primeira mensagem');
    expect(spyOpen).toHaveBeenCalledTimes(1);
    expect(mockTab.focus).toHaveBeenCalledTimes(1);

    // Segunda chamada detecta a aba aberta e atualiza a URL diretamente nela
    openWhatsApp('11911112222', 'Segunda mensagem');
    expect(spyOpen).toHaveBeenCalledTimes(1);
    expect(mockTab.location.href).toBe(
      'https://web.whatsapp.com/send?phone=5511911112222&text=Segunda%20mensagem'
    );
    expect(mockTab.focus).toHaveBeenCalledTimes(2);
  });
});
