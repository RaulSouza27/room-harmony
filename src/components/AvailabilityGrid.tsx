import { Fragment } from "react";
import { HORARIOS, toMinutes } from "@/services/db";
import { cn } from "@/lib/utils";
import type { Reserva, Sala, Unidade, User } from "@/types";

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
}: Props) {
  const nomeUnidade = (id: string) => unidades.find((u) => u.id === id)?.nome ?? "—";
  const nomeProf = (id: string) => usuarios.find((u) => u.id === id)?.nome ?? "Profissional";

  if (!salas.length) {
    return (
      <p className="rounded-lg border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
        {emptyLabel}
      </p>
    );
  }

  return (
    <div className="space-y-4">
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
                  const indisponivel = sala.status !== "ativa";
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
                        {indisponivel
                          ? sala.status === "manutencao"
                            ? "Manutenção"
                            : "Inativa"
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
                {sala.status === "manutencao" ? "Sala em manutenção" : "Sala inativa"}
              </p>
            ) : (
              <div className="grid grid-cols-3 gap-1.5">
                {HORARIOS.map((hora) => {
                  const reserva = reservaNoSlot(reservas, sala.id, hora);
                  const key = reserva
                    ? reserva.status === "pendente"
                      ? "pendente"
                      : "aprovada"
                    : "livre";
                  return (
                    <button
                      key={hora}
                      type="button"
                      onClick={() =>
                        onSlotClick?.(
                          reserva
                            ? { tipo: "reserva", sala, hora, reserva }
                            : { tipo: "livre", sala, hora },
                        )
                      }
                      className={cn(
                        "rounded-md px-1 py-2 text-[11px] font-medium transition-colors",
                        slotStyles[key],
                      )}
                    >
                      {hora}
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
    ["Indisponível", "bg-border/60"],
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
