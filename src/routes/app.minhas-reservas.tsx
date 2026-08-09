import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { CancelarReservaButton } from "@/components/ReservaActions";
import { EmptyState, ErrorState, LoadingState, StatusBadge } from "@/components/common";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { useReservas, useSalas, useUnidades } from "@/hooks/useApi";
import { formatarData, hojeISO } from "@/lib/format";
import type { ReservaStatus } from "@/types";

export const Route = createFileRoute("/app/minhas-reservas")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Minhas reservas — Clínica Serena" },
      {
        name: "description",
        content:
          "Histórico das suas reservas de sala com status, cancelamento e motivo de negação.",
      },
      { property: "og:title", content: "Minhas reservas — Clínica Serena" },
      {
        property: "og:description",
        content: "Acompanhe pendentes, aprovadas, negadas e canceladas.",
      },
    ],
  }),
  component: MinhasReservasPage,
});

const filtros: Array<{ value: "todas" | ReservaStatus; label: string }> = [
  { value: "todas", label: "Todas" },
  { value: "pendente", label: "Pendentes" },
  { value: "aprovada", label: "Aprovadas" },
  { value: "negada", label: "Negadas" },
  { value: "cancelada", label: "Canceladas" },
];

function MinhasReservasPage() {
  const { user } = useAuth();
  const reservasQ = useReservas();
  const salasQ = useSalas();
  const unidadesQ = useUnidades();
  const [filtro, setFiltro] = useState<"todas" | ReservaStatus>("todas");

  const salas = salasQ.data ?? [];
  const unidades = unidadesQ.data ?? [];
  const lista = (reservasQ.data ?? [])
    .filter((r) => r.profissional_id === user?.id)
    .filter((r) => filtro === "todas" || r.status === filtro)
    .sort((a, b) => (b.data + b.hora_inicio).localeCompare(a.data + a.hora_inicio));

  return (
    <AppShell title="Minhas reservas" description="Histórico e status das suas solicitações">
      <div className="space-y-5">
        <Tabs value={filtro} onValueChange={(v) => setFiltro(v as ReservaStatus)}>
          <TabsList className="flex-wrap">
            {filtros.map((f) => (
              <TabsTrigger key={f.value} value={f.value}>
                {f.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {reservasQ.isLoading ? (
          <LoadingState />
        ) : reservasQ.error ? (
          <ErrorState message={reservasQ.error.message} />
        ) : lista.length === 0 ? (
          <EmptyState
            title="Nenhuma reserva encontrada"
            description="Ajuste o filtro ou solicite uma nova sala."
          />
        ) : (
          <ul className="space-y-3">
            {lista.map((r) => {
              const sala = salas.find((s) => s.id === r.sala_id);
              const unidade = unidades.find((u) => u.id === r.unidade_id);
              const futura = r.data >= hojeISO();
              return (
                <li key={r.id} className="rounded-xl border border-border bg-card p-4 shadow-soft">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-card-foreground">
                        {sala?.nome ?? "Sala removida"}{" "}
                        <span className="font-normal text-muted-foreground">
                          · {unidade?.nome ?? "—"}
                        </span>
                      </p>
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        {formatarData(r.data)} · {r.hora_inicio}–{r.hora_fim} ·{" "}
                        <span className="capitalize">{r.recorrencia}</span>
                      </p>
                      {r.observacoes ? (
                        <p className="mt-2 text-xs text-muted-foreground">{r.observacoes}</p>
                      ) : null}
                      {r.status === "negada" && r.motivo_negacao ? (
                        <p className="mt-2 rounded-md border border-destructive/25 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                          Motivo da negação: {r.motivo_negacao}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={r.status} />
                      {futura && (r.status === "pendente" || r.status === "aprovada") ? (
                        <CancelarReservaButton reserva={r} />
                      ) : null}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </AppShell>
  );
}
