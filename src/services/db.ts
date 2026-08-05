import type { Reserva, Sala, Unidade, User } from "@/types";

const KEY = "clinica-salas-db-v1";

export interface DB {
  users: User[];
  unidades: Unidade[];
  salas: Sala[];
  reservas: Reserva[];
}

export const HORARIOS = Array.from({ length: 15 }, (_, i) =>
  `${String(7 + i).padStart(2, "0")}:00`,
);

function today(offset = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
}

function seed(): DB {
  const unidades: Unidade[] = [
    { id: "u1", nome: "Unidade Centro", endereco: "Rua Barão do Rio Branco, 120", status: "ativa" },
    { id: "u2", nome: "Unidade Aldeota", endereco: "Av. Dom Luís, 880", status: "ativa" },
  ];

  const salas: Sala[] = [
    { id: "s1", nome: "Sala 101", unidade_id: "u1", capacidade: 2, recursos: ["Ar-condicionado", "Blackout"], status: "ativa" },
    { id: "s2", nome: "Sala 102", unidade_id: "u1", capacidade: 4, recursos: ["Ar-condicionado"], status: "ativa" },
    { id: "s3", nome: "Sala 103", unidade_id: "u1", capacidade: 2, recursos: ["Maca", "Blackout"], status: "manutencao" },
    { id: "s4", nome: "Sala A", unidade_id: "u2", capacidade: 3, recursos: ["Ar-condicionado", "Maca"], status: "ativa" },
    { id: "s5", nome: "Sala B", unidade_id: "u2", capacidade: 6, recursos: ["Projetor"], status: "ativa" },
  ];

  const users: User[] = [
    {
      id: "adm1", nome: "Helena Duarte", email: "admin@clinica.com", senha: "admin123",
      papel: "ADMINISTRADOR", status: "ativo", telefone: "(85) 99999-0001", unidades: ["u1", "u2"],
    },
    {
      id: "p1", nome: "Rafael Menezes", email: "rafael@clinica.com", senha: "psi123",
      papel: "PSICOLOGO", status: "ativo", telefone: "(85) 99999-0002",
      especialidade: "Terapia Cognitivo-Comportamental", unidades: ["u1", "u2"],
    },
    {
      id: "p2", nome: "Carla Bastos", email: "carla@clinica.com", senha: "psi123",
      papel: "PSICOLOGO", status: "ativo", telefone: "(85) 99999-0003",
      especialidade: "Psicanálise", unidades: ["u1"],
    },
    {
      id: "p3", nome: "Iara Lopes", email: "iara@clinica.com", senha: "psi123",
      papel: "PSICOLOGO", status: "inativo", telefone: "(85) 99999-0004",
      especialidade: "Neuropsicologia", unidades: ["u2"],
    },
  ];

  const reservas: Reserva[] = [
    { id: "r1", sala_id: "s1", unidade_id: "u1", profissional_id: "p1", data: today(0), hora_inicio: "09:00", hora_fim: "11:00", status: "aprovada", criado_em: new Date().toISOString(), recorrencia: "unica", aprovado_por: "adm1" },
    { id: "r2", sala_id: "s2", unidade_id: "u1", profissional_id: "p2", data: today(0), hora_inicio: "14:00", hora_fim: "15:00", status: "pendente", criado_em: new Date().toISOString(), recorrencia: "unica", observacoes: "Atendimento infantil" },
    { id: "r3", sala_id: "s1", unidade_id: "u1", profissional_id: "p2", data: today(1), hora_inicio: "09:00", hora_fim: "10:00", status: "pendente", criado_em: new Date().toISOString(), recorrencia: "unica" },
    { id: "r4", sala_id: "s4", unidade_id: "u2", profissional_id: "p1", data: today(1), hora_inicio: "16:00", hora_fim: "18:00", status: "aprovada", criado_em: new Date().toISOString(), recorrencia: "semanal", aprovado_por: "adm1" },
    { id: "r5", sala_id: "s5", unidade_id: "u2", profissional_id: "p1", data: today(-3), hora_inicio: "10:00", hora_fim: "11:00", status: "negada", criado_em: new Date().toISOString(), recorrencia: "unica", motivo_negacao: "Sala reservada para treinamento interno." },
  ];

  return { users, unidades, salas, reservas };
}

export function readDB(): DB {
  if (typeof window === "undefined") return seed();
  const raw = window.localStorage.getItem(KEY);
  if (!raw) {
    const s = seed();
    window.localStorage.setItem(KEY, JSON.stringify(s));
    return s;
  }
  try {
    return JSON.parse(raw) as DB;
  } catch {
    const s = seed();
    window.localStorage.setItem(KEY, JSON.stringify(s));
    return s;
  }
}

export function writeDB(db: DB) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(db));
}

export function uid(prefix: string) {
  return `${prefix}${Math.random().toString(36).slice(2, 9)}`;
}

export const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

export const overlaps = (aStart: string, aEnd: string, bStart: string, bEnd: string) =>
  toMinutes(aStart) < toMinutes(bEnd) && toMinutes(bStart) < toMinutes(aEnd);
