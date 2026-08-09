import { BACKEND_URL } from "@/config/api";
import { overlaps, readDB, uid, writeDB } from "./db";
import type { NovaReserva, Reserva, ReservaStatus, Sala, Unidade, User } from "@/types";

/**
 * Camada de serviço mockada. As assinaturas imitam uma API REST
 * (GET /reservas, POST /reservas, PATCH /reservas/:id ...) para
 * facilitar a substituição por fetch real no futuro.
 */
const delay = (ms = 260) => new Promise((r) => setTimeout(r, ms));

function getHeaders(): HeadersInit {
  const token =
    typeof window !== "undefined" ? window.localStorage.getItem("clinica-salas-jwt") : null;
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

/* ------------------------------- Auth ------------------------------- */
export async function login(email: string, senha: string): Promise<User> {
  let response: Response;
  try {
    response = await fetch(`${BACKEND_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password: senha }),
    });
  } catch (error) {
    console.error("Erro de conexão com o backend:", error);
    throw new Error(
      "Não foi possível conectar ao servidor. Por favor, verifique se o backend está ativo e rodando.",
    );
  }

  if (response.status === 403) {
    throw new Error("Usuário inativo. Procure o administrador.");
  }
  if (response.status === 401) {
    throw new Error("E-mail ou senha inválidos.");
  }
  if (!response.ok) {
    throw new Error("Erro no servidor ao realizar login. Tente novamente mais tarde.");
  }

  let data;
  try {
    data = await response.json();
  } catch (error) {
    console.error("Erro ao analisar resposta JSON:", error);
    throw new Error("Resposta inválida recebida do servidor.");
  }

  if (!data || !data.token) {
    throw new Error(data?.message || "Credenciais ou resposta do servidor incorretas.");
  }

  const papel = data.accessLevel === "admin" ? "ADMINISTRADOR" : "PSICOLOGO";

  const user: User = {
    id: data.username || email,
    nome: data.username || "Usuário",
    email: data.email || email,
    senha: "",
    papel,
    status: "ativo",
    telefone: "",
    unidades: [],
  };

  const db = readDB();
  const index = db.users.findIndex(
    (u) => u.email && user.email && u.email.toLowerCase() === user.email.toLowerCase(),
  );
  if (index > -1) {
    db.users[index] = { ...db.users[index], ...user };
  } else {
    db.users.push(user);
  }
  writeDB(db);

  window.localStorage.setItem("clinica-salas-jwt", data.token);

  return user;
}

export async function getUser(id: string): Promise<User | undefined> {
  await delay(80);
  return readDB().users.find((u) => u.id === id);
}

/* ----------------------------- Unidades ----------------------------- */
export async function listUnidades(): Promise<Unidade[]> {
  const response = await fetch(`${BACKEND_URL}/units/readAll`, {
    headers: getHeaders(),
  });
  if (!response.ok) {
    throw new Error("Falha ao carregar unidades.");
  }
  const data = await response.json();
  return data.map((item: any) => ({
    id: String(item.id),
    nome: item.name,
    endereco: item.address,
    status: item.status ? "ativa" : "inativa",
  }));
}

export async function saveUnidade(input: Omit<Unidade, "id"> & { id?: string }): Promise<Unidade> {
  const body = {
    name: input.nome,
    address: input.endereco,
    status: input.status === "ativa",
  };

  const url = input.id ? `${BACKEND_URL}/units/${input.id}` : `${BACKEND_URL}/units`;
  const method = input.id ? "PUT" : "POST";

  const response = await fetch(url, {
    method,
    headers: getHeaders(),
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "Falha ao salvar unidade.");
  }

  const data = await response.json();
  return {
    id: String(data.id),
    nome: data.name,
    endereco: data.address,
    status: data.status ? "ativa" : "inativa",
  };
}

export async function deleteUnidade(id: string): Promise<void> {
  const db = readDB();
  if (db.salas.some((s) => s.unidade_id === id))
    throw new Error("Existem salas vinculadas a esta unidade.");

  const response = await fetch(`${BACKEND_URL}/units/${id}`, {
    method: "DELETE",
    headers: getHeaders(),
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "Falha ao excluir unidade.");
  }
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
