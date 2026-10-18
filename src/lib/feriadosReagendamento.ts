import type { Holiday, Reserva, Sala } from "../types";

/**
 * Identifica se uma reserva colide com um feriado/bloqueio específico.
 */
export function reservaColideComFeriado(
  reserva: Pick<Reserva, "data" | "sala_id">,
  holiday: Pick<Holiday, "startDate" | "endDate" | "unitId" | "status">,
  sala?: Pick<Sala, "id" | "unidade_id"> | null,
): boolean {
  if (!holiday.status) return false;
  if (!reserva.data) return false;

  const dataFim = holiday.endDate || holiday.startDate;
  if (reserva.data < holiday.startDate || reserva.data > dataFim) {
    return false;
  }

  // Se o feriado é global (unitId null ou undefined), colide com todas as salas/unidades
  if (holiday.unitId === null || holiday.unitId === undefined) {
    return true;
  }

  // Se o feriado é de uma unidade específica, checa se a sala pertence a essa unidade
  if (sala && String(sala.unidade_id) === String(holiday.unitId)) {
    return true;
  }

  return false;
}

/**
 * Aplica a transição para "reagendar" nas reservas ativas que colidem com o feriado.
 */
export function aplicarTransicaoReagendarFeriado(
  reservas: Reserva[],
  holiday: Pick<Holiday, "startDate" | "endDate" | "unitId" | "status">,
  salas: Sala[],
): Reserva[] {
  const salaMap = new Map(salas.map((s) => [s.id, s]));

  return reservas.map((r) => {
    // Apenas reservas ativas ("aprovada" ou "pendente") são movidas para reagendar
    if (r.status !== "aprovada" && r.status !== "pendente") {
      return r;
    }

    const sala = salaMap.get(r.sala_id);
    if (reservaColideComFeriado(r, holiday, sala)) {
      return {
        ...r,
        status: "reagendar",
        motivo_negacao: "Feriado/Bloqueio cadastrado na unidade",
      };
    }

    return r;
  });
}

/**
 * Filtra as reservas de um locatário específico, garantindo isolamento total entre usuários.
 */
export function filtrarMinhasReservas(
  reservas: Reserva[],
  userId: string,
  filtroStatus?: string,
): Reserva[] {
  const doUsuario = reservas.filter((r) => r.profissional_id === userId);
  if (!filtroStatus || filtroStatus === "todas") return doUsuario;
  if (filtroStatus === "ativas") {
    return doUsuario.filter((r) => r.status !== "cancelada");
  }
  return doUsuario.filter((r) => r.status === filtroStatus);
}

/**
 * Calcula o total de pendências a serem exibidas para o Administrador,
 * incluindo solicitações de reserva pendente, cancelamento e reagendamento por feriado.
 */
export function calcularPendenciasAdmin(reservas: Reserva[]): {
  reservasPendentes: number;
  cancelamentosPendentes: number;
  reagendamentosPendentes: number;
  total: number;
} {
  const reservasPendentes = reservas.filter((r) => r.status === "pendente").length;
  const cancelamentosPendentes = reservas.filter((r) => r.status === "solicitacao_cancelamento").length;
  const reagendamentosPendentes = reservas.filter((r) => r.status === "reagendar").length;

  return {
    reservasPendentes,
    cancelamentosPendentes,
    reagendamentosPendentes,
    total: reservasPendentes + cancelamentosPendentes + reagendamentosPendentes,
  };
}

