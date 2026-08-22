import { BACKEND_URL } from "@/config/api";
import { overlaps, readDB, uid, writeDB } from "./db";
import type { NovaReserva, Profession, Reserva, ReservaStatus, Sala, Unidade, User } from "@/types";

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
    id: data.id ? String(data.id) : data.username || email,
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
  const response = await fetch(`${BACKEND_URL}/rooms/readAll`, {
    headers: getHeaders(),
  });
  if (!response.ok) {
    throw new Error("Falha ao carregar salas.");
  }
  const data = await response.json();
  return data.map((item: any) => ({
    id: String(item.id),
    unidade_id: String(item.unitId),
    nome: item.name,
    descricao: item.description || "",
    status: item.status ? "ativa" : "inativa",
    fotos: item.photos || [],
  }));
}

export async function saveSala(input: Omit<Sala, "id"> & { id?: string }): Promise<Sala> {
  const isUpdate = !!input.id;
  const url = isUpdate ? `${BACKEND_URL}/rooms/${input.id}` : `${BACKEND_URL}/rooms`;
  const method = isUpdate ? "PUT" : "POST";

  const body = {
    name: input.nome,
    unitId: Number(input.unidade_id),
    status: input.status === "ativa",
    description: input.descricao,
    comments: "",
    photos: input.fotos || [],
  };

  const response = await fetch(url, {
    method,
    headers: getHeaders(),
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "Falha ao salvar sala.");
  }

  const data = await response.json();
  return {
    id: String(data.id),
    unidade_id: String(data.unitId),
    nome: data.name,
    descricao: data.description || "",
    status: data.status ? "ativa" : "inativa",
    fotos: data.photos || [],
  };
}

export async function deleteSala(id: string): Promise<void> {
  const response = await fetch(`${BACKEND_URL}/rooms/${id}`, {
    method: "DELETE",
    headers: getHeaders(),
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "Falha ao excluir sala.");
  }

  // Sincronizar reservas no localStorage para evitar inconsistências
  const db = readDB();
  db.reservas = db.reservas.filter((r) => r.sala_id !== id);
  writeDB(db);
}

/* --------------------------- Profissionais -------------------------- */
export async function listUsuarios(): Promise<User[]> {
  const response = await fetch(`${BACKEND_URL}/users`, {
    headers: getHeaders(),
  });
  if (!response.ok) {
    throw new Error("Falha ao carregar profissionais.");
  }
  const data = await response.json();
  return data.map((item: any) => ({
    id: String(item.id),
    nome: item.username,
    email: item.email,
    senha: "",
    papel: item.accessLevel === "admin" ? "ADMINISTRADOR" : "PSICOLOGO",
    status: item.status ? "ativo" : "inativo",
    telefone: item.phone || "",
    especialidade: item.specialty || "",
    foto: item.photo || "",
    unidades: item.units || [],
    professionId: item.professionId,
  }));
}

export async function saveUsuario(input: Partial<User> & { id?: string }): Promise<User> {
  const isUpdate = !!input.id;
  const url = isUpdate ? `${BACKEND_URL}/users/${input.id}` : `${BACKEND_URL}/users`;
  const method = isUpdate ? "PUT" : "POST";

  const body = {
    username: input.nome,
    email: input.email,
    password: input.senha,
    accessLevel: input.papel === "ADMINISTRADOR" ? "admin" : "psi",
    status: input.status === "ativo",
    phone: input.telefone,
    specialty: input.especialidade,
    photo: input.foto,
    units: input.unidades,
    professionId: input.professionId,
  };

  const response = await fetch(url, {
    method,
    headers: getHeaders(),
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "Falha ao salvar profissional.");
  }

  const data = await response.json();
  return {
    id: String(data.id),
    nome: data.username,
    email: data.email,
    senha: "",
    papel: data.accessLevel === "admin" ? "ADMINISTRADOR" : "PSICOLOGO",
    status: data.status ? "ativo" : "inativo",
    telefone: data.phone || "",
    especialidade: data.specialty || "",
    foto: data.photo || "",
    unidades: data.units || [],
    professionId: data.professionId,
  };
}

/* ------------------------------ Reservas ---------------------------- */
export async function listReservas(): Promise<Reserva[]> {
  const rooms = await listSalas();

  const response = await fetch(`${BACKEND_URL}/reservations/readAll`, {
    headers: getHeaders(),
  });
  if (!response.ok) {
    throw new Error("Falha ao carregar reservas.");
  }
  const data = await response.json();
  return data.map((item: any) => {
    const room = rooms.find((r) => r.id === String(item.roomsId));
    return {
      id: String(item.id),
      sala_id: String(item.roomsId),
      unidade_id: room ? room.unidade_id : "",
      profissional_id: String(item.userId),
      data: item.data,
      hora_inicio: item.horaInicio.slice(0, 5),
      hora_fim: item.horaFim.slice(0, 5),
      status: item.statusString || "pendente",
      criado_em: new Date().toISOString(),
      observacoes: item.description || "",
      motivo_negacao: item.motivoNegacao || "",
      aprovado_por: item.aprovadoPor || "",
      recorrencia: item.recorrencia || "unica",
      comprovante: item.depositImage || "",
    };
  });
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
  const body = {
    roomsId: Number(input.sala_id),
    userId: Number(input.profissional_id),
    data: input.data,
    horaInicio: input.hora_inicio.length === 5 ? `${input.hora_inicio}:00` : input.hora_inicio,
    horaFim: input.hora_fim.length === 5 ? `${input.hora_fim}:00` : input.hora_fim,
    depositImage: input.comprovante || "empty",
    description: input.observacoes || "",
    statusString: input.status || "pendente",
    motivoNegacao: "",
    aprovadoPor: "",
    recorrencia: input.recorrencia || "unica",
  };

  const response = await fetch(`${BACKEND_URL}/reservations`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "Falha ao criar reserva.");
  }

  const data = await response.json();
  const rooms = await listSalas();
  const room = rooms.find((r) => r.id === String(data.roomsId));

  return {
    id: String(data.id),
    sala_id: String(data.roomsId),
    unidade_id: room ? room.unidade_id : "",
    profissional_id: String(data.userId),
    data: data.data,
    hora_inicio: data.horaInicio.slice(0, 5),
    hora_fim: data.horaFim.slice(0, 5),
    status: data.statusString || "pendente",
    criado_em: new Date().toISOString(),
    observacoes: data.description || "",
    motivo_negacao: data.motivoNegacao || "",
    aprovado_por: data.aprovadoPor || "",
    recorrencia: data.recorrencia || "unica",
    comprovante: data.depositImage || "",
  };
}

export async function updateReserva(id: string, patch: Partial<Reserva>): Promise<Reserva> {
  const body: any = {};
  if (patch.sala_id !== undefined) body.roomsId = Number(patch.sala_id);
  if (patch.profissional_id !== undefined) body.userId = Number(patch.profissional_id);
  if (patch.data !== undefined) body.data = patch.data;
  if (patch.hora_inicio !== undefined) {
    body.horaInicio =
      patch.hora_inicio.length === 5 ? `${patch.hora_inicio}:00` : patch.hora_inicio;
  }
  if (patch.hora_fim !== undefined) {
    body.horaFim = patch.hora_fim.length === 5 ? `${patch.hora_fim}:00` : patch.hora_fim;
  }
  if (patch.observacoes !== undefined) body.description = patch.observacoes;
  if (patch.status !== undefined) body.statusString = patch.status;
  if (patch.motivo_negacao !== undefined) body.motivoNegacao = patch.motivo_negacao;
  if (patch.aprovado_por !== undefined) body.aprovadoPor = patch.aprovado_por;
  if (patch.recorrencia !== undefined) body.recorrencia = patch.recorrencia;
  if (patch.comprovante !== undefined) body.depositImage = patch.comprovante;

  const response = await fetch(`${BACKEND_URL}/reservations/${id}`, {
    method: "PUT",
    headers: getHeaders(),
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "Falha ao atualizar reserva.");
  }

  const data = await response.json();
  const rooms = await listSalas();
  const room = rooms.find((r) => r.id === String(data.roomsId));

  return {
    id: String(data.id),
    sala_id: String(data.roomsId),
    unidade_id: room ? room.unidade_id : "",
    profissional_id: String(data.userId),
    data: data.data,
    hora_inicio: data.horaInicio.slice(0, 5),
    hora_fim: data.horaFim.slice(0, 5),
    status: data.statusString || "pendente",
    criado_em: new Date().toISOString(),
    observacoes: data.description || "",
    motivo_negacao: data.motivoNegacao || "",
    aprovado_por: data.aprovadoPor || "",
    recorrencia: data.recorrencia || "unica",
    comprovante: data.depositImage || "",
  };
}

export async function setStatusReserva(
  id: string,
  status: ReservaStatus,
  extra?: { motivo_negacao?: string; aprovado_por?: string },
): Promise<Reserva> {
  return updateReserva(id, { status, ...extra });
}

export async function deleteReserva(id: string): Promise<void> {
  const response = await fetch(`${BACKEND_URL}/reservations/${id}`, {
    method: "DELETE",
    headers: getHeaders(),
  });
  if (!response.ok) {
    throw new Error("Falha ao excluir reserva.");
  }
}

/* ----------------------------- Profissões --------------------------- */
export async function listProfessions(): Promise<Profession[]> {
  const response = await fetch(`${BACKEND_URL}/profissions/readAll`, {
    headers: getHeaders(),
  });
  if (!response.ok) {
    throw new Error("Falha ao carregar profissões.");
  }
  const data = await response.json();
  return data.map((item: any) => ({
    id: item.id,
    profission: item.profission,
  }));
}

export async function saveProfession(input: { id?: number; profission: string }): Promise<Profession> {
  const url = input.id ? `${BACKEND_URL}/profissions/${input.id}` : `${BACKEND_URL}/profissions`;
  const method = input.id ? "PUT" : "POST";

  const response = await fetch(url, {
    method,
    headers: getHeaders(),
    body: JSON.stringify({
      id: input.id,
      profission: input.profission,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "Falha ao salvar profissão.");
  }

  // Se for PUT (update), o backend retorna status 200 OK sem corpo (ResponseEntity.ok().build())
  // Se for POST (save), retorna a entidade criada
  if (method === "PUT") {
    return {
      id: input.id!,
      profission: input.profission,
    };
  }

  const data = await response.json();
  return {
    id: data.id,
    profission: data.profission,
  };
}

export async function deleteProfession(id: number): Promise<void> {
  const response = await fetch(`${BACKEND_URL}/profissions/${id}`, {
    method: "DELETE",
    headers: getHeaders(),
  });
  if (!response.ok) {
    throw new Error("Falha ao excluir profissão.");
  }
}
