import { Fragment } from "react";
import { HORARIOS, toMinutes } from "@/services/db";
import { cn } from "@/lib/utils";
import type { Reserva, Sala, Unidade, User } from "@/types";
import { useHolidays } from "@/hooks/useApi";
import { useAuth } from "@/contexts/AuthContext";
import { formatRecorrencia } from "@/lib/format";
import { CalendarOff } from "lucide-react";

export type SlotInfo =
  | { tipo: "livre"; sala: Sala; hora: string }
  | { tipo: "reserva"; sala: Sala; hora: string; reserva: Reserva };

interface Props {
  salas: Sala[];
  unidades: Unidade[];
  reservas: Reserva[];
  usuarios: User[];
  onSlotClick?: (slot: SlotInfo) => void;
  emptyLabel?: string;
  data?: string;
  isAdmin?: boolean;
}

function reservaNoSlot(reservas: Reserva[], salaId: string, hora: string) {
  return reservas.find(
    (r) =>
      r.sala_id === salaId &&
      (r.status === "aprovada" || r.status === "pendente") &&
      toMinutes(r.hora_inicio) <= toMinutes(hora) &&
      toMinutes(hora) < toMinutes(r.hora_fim),
  );
}

type TipoReserva = "avulsa" | "fixa" | "turno";

function getTipoReserva(reserva: Reserva): TipoReserva {
  const rec = reserva.recorrencia as string | undefined;
  if (rec === "semanal_anual" || rec === "turno") {
    return "turno";
  }
  if (rec === "semanal_mensal" || rec === "semanal") {
    return "fixa";
  }
  return "avulsa";
}

function getTipoLabel(reserva: Reserva): string {
  const tipo = getTipoReserva(reserva);
  if (tipo === "turno") return "Turno";
  if (tipo === "fixa") return "Hora fixa";
  return "Avulsa";
}

function getSlotStyle({
  indisponivel,
  reserva,
}: {
  indisponivel: boolean;
  reserva?: Reserva | undefined;
}) {
  if (indisponivel) {
    return "bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30";
  }

  if (!reserva) {
    return "bg-white hover:bg-zinc-100 text-zinc-600 dark:bg-card dark:hover:bg-accent/40 dark:text-muted-foreground";
  }

  if (reserva.status === "pendente") {
    return "bg-orange-500/20 hover:bg-orange-500/30 text-orange-950 dark:text-orange-200 border-orange-500/40";
  }

  const tipo = getTipoReserva(reserva);
  if (tipo === "turno") {
    return "bg-[#78350f]/20 hover:bg-[#78350f]/30 text-[#451a03] dark:text-[#fde68a] border-[#78350f]/40";
  }
  if (tipo === "fixa") {
    return "bg-yellow-400/25 hover:bg-yellow-400/35 text-yellow-950 dark:text-yellow-200 border-yellow-400/40";
  }
  return "bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-950 dark:text-emerald-200 border-emerald-600/40";
}

export function AvailabilityGrid({
  salas,
  unidades,
  reservas,
  usuarios,
  onSlotClick,
  emptyLabel = "Nenhuma sala encontrada para os filtros escolhidos.",
  data,
  isAdmin: propIsAdmin,
}: Props) {
  const auth = useAuth();
  const isAdmin = propIsAdmin ?? auth.isAdmin;
  const { data: holidays = [] } = useHolidays();

  const nomeUnidade = (id: string) => unidades.find((u) => u.id === id)?.nome ?? "—";
  const nomeProf = (id: string) => usuarios.find((u) => u.id === id)?.nome ?? "Profissional";

  const getHolidayForSala = (sala: Sala) => {
    if (!data) return null;
    return holidays.find((h) => {
      if (!h.status) return null;
      const isGlobalOrUnit = !h.unitId || String(h.unitId) === String(sala.unidade_id);
      if (!isGlobalOrUnit) return false;
      const startDate = h.startDate;
      const endDate = h.endDate || h.startDate;
      return data >= startDate && data <= endDate;
    });
  };

  const isSlotForaDoHorario = (sala: Sala, hora: string) => {
    if (!data) return false;
    if (getHolidayForSala(sala)) return true;
    const dateObj = new Date(data + "T00:00:00");
    const dayOfWeek = dateObj.getDay();
    const unidade = unidades.find((u) => u.id === sala.unidade_id);
    if (!unidade?.business_hours) return false;
    const bh = unidade.business_hours[String(dayOfWeek)];
    if (!bh || !bh.ativo || !bh.abertura || !bh.fechamento) return true;
    const hMin = toMinutes(hora);
    return hMin < toMinutes(bh.abertura) || hMin >= toMinutes(bh.fechamento);
  };

  if (!salas.length) {
    return (
      <p className="rounded-lg border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
        {emptyLabel}
      </p>
    );
  }

  const holidaysNaData = data
    ? holidays.filter(
        (h) =>
          h.status &&
          data >= h.startDate &&
          data <= (h.endDate || h.startDate)
      )
    : [];

  return (
    <div className="space-y-4">
      {holidaysNaData.length > 0 && (
        <div className="space-y-2">
          {holidaysNaData.map((h) => {
            const unitObj = h.unitId ? unidades.find((u) => String(u.id) === String(h.unitId)) : null;
            const unitText = h.unitId
              ? (unitObj ? `Unidade ${unitObj.nome}` : h.unitName || `Unidade ${h.unitId}`)
              : "Todas as Unidades";

            return (
              <div
                key={h.id}
                className="flex items-center gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-300"
              >
                <CalendarOff className="size-5 shrink-0 text-amber-600 dark:text-amber-400" />
                <div>
                  <span className="font-semibold">
                    {h.unitId ? `Fechamento (${unitText})` : "Fechamento (Todas as Unidades)"}: {h.name}
                  </span>
                  {h.description && (
                    <span className="block text-xs opacity-90">{h.description}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Legend />

      {/* Grade (desktop / tablet) */}
      <div className="hidden overflow-x-auto rounded-xl border border-border bg-card sm:block">
        <table className="w-full min-w-[560px] border-collapse text-sm">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 w-20 border-b border-r border-border bg-card px-3 py-2.5 text-left text-xs font-medium text-muted-foreground">
                Horário
              </th>
              {salas.map((sala) => (
                <th
                  key={sala.id}
                  className="border-b border-r border-border px-3 py-2.5 text-left text-xs font-semibold text-card-foreground last:border-r-0"
                >
                  <span className="block truncate">{sala.nome}</span>
                  <span className="block truncate text-[11px] font-normal text-muted-foreground">
                    {nomeUnidade(sala.unidade_id)}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {HORARIOS.map((hora) => (
              <tr key={hora}>
                <th className="sticky left-0 z-10 border-b border-r border-border bg-card px-3 py-2 text-left text-xs font-medium text-muted-foreground">
                  {hora}
                </th>
                {salas.map((sala) => {
                  const foraDoHorario = isSlotForaDoHorario(sala, hora);
                  const indisponivel = sala.status !== "ativa" || foraDoHorario;
                  const reserva = indisponivel ? undefined : reservaNoSlot(reservas, sala.id, hora);
                  const disabled = indisponivel || (!isAdmin && !!reserva);
                  const styleClass = getSlotStyle({ indisponivel, reserva });

                  return (
                    <td
                      key={sala.id}
                      className="border-b border-r border-border p-0 last:border-r-0"
                    >
                      <button
                        type="button"
                        disabled={disabled}
                        onClick={() =>
                          onSlotClick?.(
                            reserva
                              ? { tipo: "reserva", sala, hora, reserva }
                              : { tipo: "livre", sala, hora },
                          )
                        }
                        title={
                          reserva
                            ? isAdmin
                              ? `${nomeProf(reserva.profissional_id)} (${reserva.status === "pendente" ? "Aprovação pendente" : formatRecorrencia(reserva.recorrencia)})`
                              : `Horário reservado (${reserva.status === "pendente" ? "Pendente" : formatRecorrencia(reserva.recorrencia)})`
                            : foraDoHorario
                              ? "Unidade fechada / Feriado"
                              : sala.status !== "ativa"
                                ? (isAdmin ? "Sala inativa" : "Indisponível")
                                : "Horário livre para reserva"
                        }
                        className={cn(
                          "h-11 w-full px-2 text-left text-[11px] transition-colors disabled:cursor-not-allowed",
                          styleClass,
                        )}
                      >
                        {sala.status !== "ativa" ? (
                          isAdmin ? "Inativa" : "Indisponível"
                        ) : foraDoHorario ? (
                          "Fechado"
                        ) : reserva ? (
                          isAdmin ? (
                            <div className="flex flex-col justify-center leading-tight overflow-hidden">
                              <span className="truncate font-medium">
                                {nomeProf(reserva.profissional_id).split(" ")[0]}
                              </span>
                              <span className="text-[9px] opacity-80 truncate">
                                {reserva.status === "pendente" ? "Aprovar" : getTipoLabel(reserva)}
                              </span>
                            </div>
                          ) : (
                            <div className="flex flex-col justify-center leading-tight overflow-hidden">
                              <span className="truncate font-medium">Reservado</span>
                              <span className="text-[9px] opacity-80 truncate">
                                {reserva.status === "pendente" ? "Pendente" : getTipoLabel(reserva)}
                              </span>
                            </div>
                          )
                        ) : (
                          <span>Livre</span>
                        )}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Lista (mobile) */}
      <div className="space-y-3 sm:hidden">
        {salas.map((sala) => (
          <div key={sala.id} className="rounded-xl border border-border bg-card p-3">
            <div className="mb-2 flex items-baseline justify-between gap-2">
              <p className="text-sm font-semibold text-card-foreground">{sala.nome}</p>
              <span className="text-xs text-muted-foreground">{nomeUnidade(sala.unidade_id)}</span>
            </div>
            {sala.status !== "ativa" ? (
              <p className="rounded-md bg-red-500/15 border border-red-500/30 px-3 py-2 text-xs text-red-700 dark:text-red-300">
                {isAdmin ? "Sala inativa" : "Indisponível"}
              </p>
            ) : (
              <div className="grid grid-cols-3 gap-1.5">
                {HORARIOS.map((hora) => {
                  const foraDoHorario = isSlotForaDoHorario(sala, hora);
                  const indisponivel = foraDoHorario;
                  const reserva = foraDoHorario ? undefined : reservaNoSlot(reservas, sala.id, hora);
                  const disabled = indisponivel || (!isAdmin && !!reserva);
                  const styleClass = getSlotStyle({ indisponivel, reserva });

                  return (
                    <button
                      key={hora}
                      type="button"
                      disabled={disabled}
                      onClick={() =>
                        onSlotClick?.(
                          reserva
                            ? { tipo: "reserva", sala, hora, reserva }
                            : { tipo: "livre", sala, hora },
                        )
                      }
                      title={
                        reserva
                          ? isAdmin
                            ? `${nomeProf(reserva.profissional_id)} (${reserva.status === "pendente" ? "Aprovação pendente" : formatRecorrencia(reserva.recorrencia)})`
                            : `Horário reservado (${reserva.status === "pendente" ? "Pendente" : formatRecorrencia(reserva.recorrencia)})`
                          : foraDoHorario
                            ? "Unidade fechada / Feriado"
                            : "Horário livre para reserva"
                      }
                      className={cn(
                        "rounded-md border border-border/40 px-1 py-2 text-[11px] font-medium transition-colors disabled:cursor-not-allowed",
                        styleClass,
                      )}
                    >
                      {foraDoHorario
                        ? `${hora} (Fechado)`
                        : reserva
                          ? isAdmin
                            ? `${hora} - ${nomeProf(reserva.profissional_id).split(" ")[0]}`
                            : `${hora} - ${reserva.status === "pendente" ? "Pendente" : getTipoLabel(reserva)}`
                          : hora}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function Legend() {
  const items: Array<[string, string]> = [
    ["Livre", "bg-white dark:bg-card border-border"],
    ["A ser aprovada", "bg-orange-500/40 border-orange-500/60"],
    ["Hora avulsa", "bg-emerald-600/40 border-emerald-600/60"],
    ["Hora fixa", "bg-yellow-400/60 border-yellow-400/70"],
    ["Turno", "bg-[#78350f]/50 border-[#78350f]/70"],
    ["Fechado / Feriado", "bg-red-500/40 border-red-500/60"],
  ];

  return (
    <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
      {items.map(([label, color]) => (
        <Fragment key={label}>
          <span className="flex items-center gap-1.5">
            <span className={cn("size-3 rounded-xs border", color)} />
            {label}
          </span>
        </Fragment>
      ))}
    </div>
  );
}
