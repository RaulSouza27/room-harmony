export type Role = 'LOCADOR'|'ADMINISTRADOR';
export type UserStatus = 'ativo'|'inativo';

export interface Profession {
  id: number;
  profission: string;
}

export interface User {
  id: string;
  nome: string;
  email: string;
  senha: string;
  papel: Role;
  status: UserStatus;
  telefone: string;
  especialidade?: string|undefined;
  foto?: string|undefined;
  unidades: string[];
  professionId?: number|null;
  mustCompleteTour?: boolean;
  cpf: string;
  endereco: string;
  cep: string;
  boardNumber: string;
  firstLogin?: boolean;
}

export interface HorarioDia {
  ativo: boolean;
  abertura: string|null;
  fechamento: string|null;
}

export type BusinessHours = Record<string, HorarioDia>;

export interface Unidade {
  id: string;
  nome: string;
  endereco: string;
  status: 'ativa'|'inativa';
  business_hours?: BusinessHours;
}

export type SalaStatus = 'ativa'|'inativa';

export interface Sala {
  id: string;
  nome: string;
  unidade_id: string;
  descricao: string;
  status: SalaStatus;
  fotos: string[];
  photoCount?: number;
}

export type ReservaStatus = 'pendente'|'aprovada'|'negada'|'cancelada'|
    'solicitacao_cancelamento'|'reagendar';
export type Recorrencia = 'unica'|'semanal_mensal'|'semanal_anual'|'semanal';

export interface Reserva {
  id: string;
  sala_id: string;
  unidade_id: string;
  profissional_id: string;
  data: string;         // yyyy-MM-dd
  hora_inicio: string;  // HH:mm
  hora_fim: string;     // HH:mm
  status: ReservaStatus;
  criado_em: string;
  observacoes?: string|undefined;
  motivo_negacao?: string|undefined;
  aprovado_por?: string|undefined;
  recorrencia: Recorrencia;
  comprovante?: string;
  paid_with_credits?: boolean;
  credit_hours_used?: number;
}

export interface NovaReserva {
  sala_id: string;
  unidade_id: string;
  profissional_id: string;
  data: string;
  hora_inicio: string;
  hora_fim: string;
  observacoes?: string|undefined;
  recorrencia?: Recorrencia|undefined;
  status?: ReservaStatus|undefined;
  comprovante?: string;
  paid_with_credits?: boolean;
}

export interface Holiday {
  id: number;
  name: string;
  startDate: string;  // yyyy-MM-dd
  endDate: string;    // yyyy-MM-dd
  unitId?: number|null;
  unitName?: string;
  description?: string;
  status: boolean;
}

export interface Complaint {
  id: number;
  userId?: number|null;
  userName: string;
  userEmail?: string|null;
  userPhone?: string|null;
  anonymous: boolean;
  complaints: string;
  solved: boolean;
  resolutionNotes?: string|null;
  resolvedBy?: string|null;
  resolvedAt?: string|null;
  createdAt: string;
}

export interface ComplaintQuota {
  used: number;
  limit: number;
  remaining: number;
}

export interface ComplaintStats {
  total: number;
  pending: number;
  solved: number;
}

export interface ComplaintPage {
  content: Complaint[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export type CreditPackageStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';

export interface CreditPackage {
  id: number;
  userId: number;
  userName: string;
  userEmail?: string | null;
  userPhone?: string | null;
  unitId: number;
  unitName: string;
  totalCredits: number;
  remainingCredits: number;
  receiptImage: string;
  status: CreditPackageStatus;
  rejectionReason?: string | null;
  createdAt: string;
  reviewedAt?: string | null;
  reviewedByUserId?: number | null;
  reviewedByName?: string | null;
  expiresAt?: string | null;
}

export interface CreditPackageStats {
  pending: number;
  approved: number;
  rejected: number;
  expired: number;
  total: number;
}

export type CreditTransactionType =
  | 'CREDITO_PACOTE'
  | 'USO_RESERVA'
  | 'ESTORNO_CANCELAMENTO'
  | 'AJUSTE_EDICAO'
  | 'EXPIRACAO';

export interface CreditTransaction {
  id: number;
  packageId: number;
  userId: number;
  userName: string;
  userEmail?: string | null;
  unitId: number;
  unitName: string;
  reservationId?: number | null;
  type: CreditTransactionType;
  amount: number;
  balanceAfter: number;
  description: string;
  performedByUserId?: number | null;
  performedByName?: string | null;
  createdAt: string;
}

export interface CreditTransactionPage {
  content: CreditTransaction[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}
