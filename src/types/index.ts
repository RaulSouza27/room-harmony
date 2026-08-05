export type Role = "PSICOLOGO" | "ADMINISTRADOR";
export type UserStatus = "ativo" | "inativo";

export interface User {
  id: string;
  nome: string;
  email: string;
  senha: string;
  papel: Role;
  status: UserStatus;
  telefone: string;
  especialidade?: string;
  foto?: string;
  unidades: string[];
}

export interface Unidade {
  id: string;
  nome: string;
  endereco: string;
  status: "ativa" | "inativa";
}

export type SalaStatus = "ativa" | "manutencao" | "inativa";

export interface Sala {
  id: string;
  nome: string;
  unidade_id: string;
  capacidade: number;
  recursos: string[];
  status: SalaStatus;
}

export type ReservaStatus = "pendente" | "aprovada" | "negada" | "cancelada";
export type Recorrencia = "unica" | "semanal";

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
  observacoes?: string;
  motivo_negacao?: string;
  aprovado_por?: string;
  recorrencia: Recorrencia;
}

export interface NovaReserva {
  sala_id: string;
  unidade_id: string;
  profissional_id: string;
  data: string;
  hora_inicio: string;
  hora_fim: string;
  observacoes?: string;
  recorrencia?: Recorrencia;
  status?: ReservaStatus;
}
