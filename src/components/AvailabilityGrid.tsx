import { Fragment } from "react";
import { HORARIOS, toMinutes } from "@/services/db";
import { cn } from "@/lib/utils";
import type { Reserva, Sala, Unidade, User } from "@/types";
import { useHolidays } from "@/hooks/useApi";
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

const slotStyles = {
  livre: "bg-success/10 hover:bg-success/20 text-success-foreground",
  pendente: "bg-warning/20 hover:bg-warning/30 text-warning-foreground",
  aprovada: "bg-muted hover:bg-muted/80 text-foreground",
  indisponivel: "bg-border/40 text-muted-foreground",
};

export function AvailabilityGrid({
  salas,
  unidades,
  reservas,
  usuarios,
  onSlotClick,
  emptyLabel = "Nenhuma sala encontrada para os filtros escolhidos.",
  data,
}: Props) {
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
                  const key = indisponivel
                    ? "indisponivel"
                    : reserva
                      ? reserva.status === "pendente"
                        ? "pendente"
                        : "aprovada"
                      : "livre";
                  return (
                    <td
                      key={sala.id}
                      className="border-b border-r border-border p-0 last:border-r-0"
                    >
                      <button
                        type="button"
                        disabled={indisponivel}
                        onClick={() =>
                          onSlotClick?.(
                            reserva
                              ? { tipo: "reserva", sala, hora, reserva }
                              : { tipo: "livre", sala, hora },
                          )
                        }
                        className={cn(
                          "h-11 w-full px-2 text-left text-[11px] transition-colors disabled:cursor-not-allowed",
                          slotStyles[key],
                        )}
                      >
                        {sala.status !== "ativa"
                          ? "Inativa"
                          : foraDoHorario
                            ? "Fechado"
                            : reserva
                              ? nomeProf(reserva.profissional_id).split(" ")[0]
                              : "Livre"}
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
              <p className="rounded-md bg-border/40 px-3 py-2 text-xs text-muted-foreground">
                Sala inativa
              </p>
            ) : (
              <div className="grid grid-cols-3 gap-1.5">
                {HORARIOS.map((hora) => {
                  const foraDoHorario = isSlotForaDoHorario(sala, hora);
                  const reserva = foraDoHorario ? undefined : reservaNoSlot(reservas, sala.id, hora);
                  const key = foraDoHorario
                    ? "indisponivel"
                    : reserva
                      ? reserva.status === "pendente"
                        ? "pendente"
                        : "aprovada"
                      : "livre";
                  return (
                    <button
                      key={hora}
                      type="button"
                      disabled={foraDoHorario}
                      onClick={() =>
                        onSlotClick?.(
                          reserva
                            ? { tipo: "reserva", sala, hora, reserva }
                            : { tipo: "livre", sala, hora },
                        )
                      }
                      className={cn(
                        "rounded-md px-1 py-2 text-[11px] font-medium transition-colors disabled:cursor-not-allowed",
                        slotStyles[key],
                      )}
                    >
                      {foraDoHorario ? `${hora} (Fechado)` : hora}
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
    ["Livre", "bg-success/25"],
    ["Pendente", "bg-warning/40"],
    ["Ocupado", "bg-muted"],
    ["Indisponível / Fechado", "bg-border/60"],
  ];
  return (
    <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
      {items.map(([label, color]) => (
        <Fragment key={label}>
          <span className="flex items-center gap-1.5">
            <span className={cn("size-3 rounded-sm border border-border", color)} />
            {label}
          </span>
        </Fragment>
      ))}
    </div>
  );
}
