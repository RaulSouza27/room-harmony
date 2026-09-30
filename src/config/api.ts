// Configuração do endereço do backend para ambientes locais e produção
export const BACKEND_URL =
  import.meta.env['VITE_API_URL'] ||
  'https://salas.psi.backend.raulsouza.online';

// Senha padrão inicial para exibição e resgate no frontend
export const DEFAULT_PASSWORD =
  import.meta.env['VITE_DEFAULT_PASSWORD'] || 'escuta123';


