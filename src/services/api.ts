import { overlaps, readDB, uid, writeDB } from "./db";
import type { NovaReserva, Reserva, ReservaStatus, Sala, Unidade, User } from "@/types";

/**
 * Camada de serviço mockada. As assinaturas imitam uma API REST
 * (GET /reservas, POST /reservas, PATCH /reservas/:id ...) para
 * facilitar a substituição por fetch real no futuro.
 */
const delay = (ms = 260) => new Promise((r) => setTimeout(r, ms));

/* ------------------------------- Auth ------------------------------- */
export async function login(email: string, senha: string): Promise<User> {
  await delay();
  const db = readDB();
  const user = db.users.find(
    (u) => u.email.toLowerCase() === email.trim().toLowerCase() && u.senha === senha,
  );
  if (!user) throw new Error("E-mail ou senha inválidos.");
  if (user.status === "inativo") throw new Error("Usuário inativo. Procure o administrador.");
  return user;
}

export async function bypassLogin(papel: "ADMINISTRADOR" | "PSICOLOGO"): Promise<User> {
  await delay();
  const db = readDB();
  const id = papel === "ADMINISTRADOR" ? "admin-bypass" : "psicologo-bypass";
  let user = db.users.find((u) => u.id === id);

  if (!user) {
    user = {
      id,
      nome: papel === "ADMINISTRADOR" ? "Administrador (Bypass)" : "Psicólogo (Bypass)",
      email: papel === "ADMINISTRADOR" ? "admin@clinica.com" : "psicologo@clinica.com",
      senha: "",
      papel,
      status: "ativo",
      telefone: "(85) 99999-0000",
      especialidade: papel === "PSICOLOGO" ? "Psicologia Geral" : undefined,
      unidades: [],
    };
    db.users.push(user);
    writeDB(db);
  }

  return user;
}

export async function getUser(id: string): Promise<User | undefined> {
  await delay(80);
  return readDB().users.find((u) => u.id === id);
}

/* ----------------------------- Unidades ----------------------------- */
export async function listUnidades(): Promise<Unidade[]> {
  await delay();
  return readDB().unidades;
}

export async function saveUnidade(input: Omit<Unidade, "id"> & { id?: string }): Promise<Unidade> {
  await delay();
  const db = readDB();
  if (input.id) {
    db.unidades = db.unidades.map((u) => (u.id === input.id ? ({ ...u, ...input } as Unidade) : u));
    writeDB(db);
    return db.unidades.find((u) => u.id === input.id)!;
  }
  const nova: Unidade = { ...input, id: uid("u") };
  db.unidades.push(nova);
  writeDB(db);
  return nova;
}

export async function deleteUnidade(id: string): Promise<void> {
  await delay();
  const db = readDB();
  if (db.salas.some((s) => s.unidade_id === id))
    throw new Error("Existem salas vinculadas a esta unidade.");
  db.unidades = db.unidades.filter((u) => u.id !== id);
  writeDB(db);
}

/* ------------------------------- Salas ------------------------------ */
export async function listSalas(): Promise<Sala[]> {
  await delay();
  return readDB().salas;
}

export async function saveSala(input: Omit<Sala, "id"> & { id?: string }): Promise<Sala> {
  await delay();
  const db = readDB();
  if (input.id) {
    db.salas = db.salas.map((s) => (s.id === input.id ? ({ ...s, ...input } as Sala) : s));
    writeDB(db);
    return db.salas.find((s) => s.id === input.id)!;
  }
  const nova: Sala = { ...input, id: uid("s") };
  db.salas.push(nova);
  writeDB(db);
  return nova;
}

export async function deleteSala(id: string): Promise<void> {
  await delay();
  const db = readDB();
  db.salas = db.salas.filter((s) => s.id !== id);
  db.reservas = db.reservas.filter((r) => r.sala_id !== id);
  writeDB(db);
}

/* --------------------------- Profissionais -------------------------- */
export async function listUsuarios(): Promise<User[]> {
  await delay();
  return readDB().users;
}

export async function saveUsuario(input: Partial<User> & { id?: string }): Promise<User> {
  await delay();
  const db = readDB();
  if (input.id) {
    db.users = db.users.map((u) => (u.id === input.id ? { ...u, ...input } : u));
    writeDB(db);
    return db.users.find((u) => u.id === input.id)!;
  }
  if (db.users.some((u) => u.email.toLowerCase() === input.email?.toLowerCase()))
    throw new Error("Já existe um usuário com este e-mail.");
  const novo: User = {
    id: uid("p"),
    nome: input.nome ?? "",
    email: input.email ?? "",
    senha: input.senha ?? "psi123",
    papel: input.papel ?? "PSICOLOGO",
    status: input.status ?? "ativo",
    telefone: input.telefone ?? "",
    especialidade: input.especialidade,
    unidades: input.unidades ?? [],
  };
  db.users.push(novo);
  writeDB(db);
  return novo;
}

/* ------------------------------ Reservas ---------------------------- */
export async function listReservas(): Promise<Reserva[]> {
  await delay();
  return readDB().reservas;
}

/** Conflitos que ocupam o horário (aprovadas e pendentes). */
export function findConflitos(
  reservas: Reserva[],
  input: {
    sala_id: string;
    data: string;
    hora_inicio: string;
    hora_fim: string;
    ignoreId?: string;
  },
) {
  return reservas.filter(
    (r) =>
      r.id !== input.ignoreId &&
      r.sala_id === input.sala_id &&
      r.data === input.data &&
      (r.status === "aprovada" || r.status === "pendente") &&
      overlaps(input.hora_inicio, input.hora_fim, r.hora_inicio, r.hora_fim),
  );
}

export async function createReserva(input: NovaReserva): Promise<Reserva> {
  await delay();
  const db = readDB();
  const conflitos = findConflitos(db.reservas, input).filter((r) => r.status === "aprovada");
  if (conflitos.length) throw new Error("Horário já reservado para esta sala.");
  const nova: Reserva = {
    id: uid("r"),
    sala_id: input.sala_id,
    unidade_id: input.unidade_id,
    profissional_id: input.profissional_id,
    data: input.data,
    hora_inicio: input.hora_inicio,
    hora_fim: input.hora_fim,
    status: input.status ?? "pendente",
    criado_em: new Date().toISOString(),
    observacoes: input.observacoes,
    recorrencia: input.recorrencia ?? "unica",
  };
  db.reservas.push(nova);
  writeDB(db);
  return nova;
}

export async function updateReserva(id: string, patch: Partial<Reserva>): Promise<Reserva> {
  await delay();
  const db = readDB();
  db.reservas = db.reservas.map((r) => (r.id === id ? { ...r, ...patch } : r));
  writeDB(db);
  return db.reservas.find((r) => r.id === id)!;
}

export async function setStatusReserva(
  id: string,
  status: ReservaStatus,
  extra?: { motivo_negacao?: string; aprovado_por?: string },
): Promise<Reserva> {
  return updateReserva(id, { status, ...extra });
}

export async function deleteReserva(id: string): Promise<void> {
  await delay();
  const db = readDB();
  db.reservas = db.reservas.filter((r) => r.id !== id);
  writeDB(db);
}
