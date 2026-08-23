export type Role = "PSICOLOGO" | "ADMINISTRADOR";
export type UserStatus = "ativo" | "inativo";

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
  especialidade?: string | undefined;
  foto?: string | undefined;
  unidades: string[];
  professionId?: number | null;
  mustCompleteTour?: boolean;
}

export interface Unidade {
  id: string;
  nome: string;
  endereco: string;
  status: "ativa" | "inativa";
}

export type SalaStatus = "ativa" | "inativa";

export interface Sala {
  id: string;
  nome: string;
  unidade_id: string;
  descricao: string;
  status: SalaStatus;
  fotos: string[];
}

export type ReservaStatus = "pendente" | "aprovada" | "negada" | "cancelada";
export type Recorrencia = "unica" | "semanal_mensal" | "semanal_anual" | "semanal";

export interface Reserva {
  id: string;
  sala_id: string;
  unidade_id: string;
  profissional_id: string;
  data: string; // yyyy-MM-dd
  hora_inicio: string; // HH:mm
  hora_fim: string; // HH:mm
  status: ReservaStatus;
  criado_em: string;
  observacoes?: string | undefined;
  motivo_negacao?: string | undefined;
  aprovado_por?: string | undefined;
  recorrencia: Recorrencia;
  comprovante?: string;
}

export interface NovaReserva {
  sala_id: string;
  unidade_id: string;
  profissional_id: string;
  data: string;
  hora_inicio: string;
  hora_fim: string;
  observacoes?: string | undefined;
  recorrencia?: Recorrencia | undefined;
  status?: ReservaStatus | undefined;
  comprovante?: string;
}
