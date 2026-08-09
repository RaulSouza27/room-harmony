import type { Reserva, Sala, Unidade, User } from "@/types";

const KEY = "clinica-salas-db-v2";

export interface DB {
  users: User[];
  unidades: Unidade[];
  salas: Sala[];
  reservas: Reserva[];
}

export const HORARIOS = Array.from(
  { length: 15 },
  (_, i) => `${String(7 + i).padStart(2, "0")}:00`,
);

function today(offset = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
}

function seed(): DB {
  return { users: [], unidades: [], salas: [], reservas: [] };
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
  return (h ?? 0) * 60 + (m ?? 0);
};

export const overlaps = (aStart: string, aEnd: string, bStart: string, bEnd: string) =>
  toMinutes(aStart) < toMinutes(bEnd) && toMinutes(bStart) < toMinutes(aEnd);
