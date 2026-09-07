/**
 * Abre o WhatsApp de forma inteligente:
 * - No Desktop: Reutiliza sempre a mesma aba ('whatsapp_tab') no WhatsApp Web para evitar múltiplas abas e lentidão.
 * - No Mobile: Redireciona via https://wa.me/ para abrir diretamente o app nativo do WhatsApp.
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
  } else {
    const desktopUrl = `https://web.whatsapp.com/send?phone=${fullPhone}${encodedMsg ? `&text=${encodedMsg}` : ""}`;
    window.open(desktopUrl, "whatsapp_tab");
  }
}
