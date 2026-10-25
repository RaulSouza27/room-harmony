const WHATSAPP_WINDOW_NAME = "whatsapp_tab";
let whatsappWindowRef: Window | null = null;

/**
 * Reseta a referência da aba do WhatsApp (utilitário para testes).
 */
export function resetWhatsAppWindowRef() {
  whatsappWindowRef = null;
}

/**
 * Abre o WhatsApp de forma inteligente:
 * - No Desktop (PC): Verifica primeiro se já existe uma aba do WhatsApp aberta
 *   (via referência de janela ativa ou pelo nome da aba 'whatsapp_tab').
 *   Se já estiver aberta, reutiliza a mesma aba e traz o foco para ela.
 * - No Mobile: Redireciona via https://wa.me/ para abrir diretamente o app nativo.
 */
export function openWhatsApp(phone?: string, message?: string) {
  if (!phone) return;
  const cleanPhone = phone.replace(/\D/g, "");
  if (!cleanPhone) return;

  // Garante DDI 55 do Brasil se o número tiver 10 ou 11 dígitos (DDD + Número)
  const fullPhone = cleanPhone.length <= 11 ? `55${cleanPhone}` : cleanPhone;
  const encodedMsg = message ? encodeURIComponent(message) : "";

  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    typeof navigator !== "undefined" ? navigator.userAgent : ""
  );

  if (isMobile) {
    const mobileUrl = `https://wa.me/${fullPhone}${encodedMsg ? `?text=${encodedMsg}` : ""}`;
    window.location.href = mobileUrl;
    return;
  }

  const desktopUrl = `https://web.whatsapp.com/send?phone=${fullPhone}${encodedMsg ? `&text=${encodedMsg}` : ""}`;

  // Se já temos referência para uma aba aberta que não foi fechada pelo usuário,
  // reutilizamos essa mesma aba e focamos nela sem criar outra.
  if (whatsappWindowRef && !whatsappWindowRef.closed) {
    try {
      whatsappWindowRef.location.href = desktopUrl;
      whatsappWindowRef.focus();
      return;
    } catch {
      // Caso o navegador aplique bloqueio cross-origin em location.href,
      // o window.open abaixo com o mesmo target name ('whatsapp_tab')
      // navega na aba existente e devolve a referência atualizada.
    }
  }

  const openedWindow = window.open(desktopUrl, WHATSAPP_WINDOW_NAME);
  if (openedWindow) {
    whatsappWindowRef = openedWindow;
    try {
      openedWindow.focus();
    } catch {
      // Ignora caso o navegador bloqueie o focus programático
    }
  }
}
