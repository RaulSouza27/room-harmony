// Configuração do endereço do backend para ambientes locais e produção
export const BACKEND_URL =
  import.meta.env['VITE_API_URL'] || 'https://salas.psi.backend.raulsouza.online';
