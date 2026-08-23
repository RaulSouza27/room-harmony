import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { AprovacaoActions } from "@/components/ReservaActions";
import { EmptyState, ErrorState, LoadingState } from "@/components/common";
import { Badge } from "@/components/ui/badge";
import { useReservas, useSalas, useUnidades, useUsuarios } from "@/hooks/useApi";
import { formatarData, formatRecorrencia } from "@/lib/format";
import { findConflitos } from "@/services/api";

export const Route = createFileRoute("/app/aprovacoes")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Aprovações pendentes — Clínica Escuta" },
      {
        name: "description",
        content: "Fila de solicitações de reserva aguardando aprovação do administrador.",
      },
      { property: "og:title", content: "Aprovações pendentes — Clínica Escuta" },
      {
        property: "og:description",
        content: "Aprove ou negue solicitações com alerta de conflito.",
      },
    ],
  }),
  component: AprovacoesPage,
});

function AprovacoesPage() {
  const reservasQ = useReservas();
  const salasQ = useSalas();
  const unidadesQ = useUnidades();
  const usuariosQ = useUsuarios();

  const reservas = reservasQ.data ?? [];
  const pendentes = reservas
    .filter((r) => r.status === "pendente")
    .sort((a, b) => (a.data + a.hora_inicio).localeCompare(b.data + b.hora_inicio));

  const nomeSala = (id: string) => salasQ.data?.find((s) => s.id === id)?.nome ?? "—";
  const nomeUnidade = (id: string) => unidadesQ.data?.find((u) => u.id === id)?.nome ?? "—";
  const prof = (id: string) => usuariosQ.data?.find((u) => u.id === id);

  return (
    <AppShell
      title="Aprovações pendentes"
      description={`${pendentes.length} solicitação(ões) aguardando análise`}
    >
      {reservasQ.isLoading ? (
        <LoadingState />
      ) : reservasQ.error ? (
        <ErrorState message={reservasQ.error.message} />
      ) : pendentes.length === 0 ? (
        <EmptyState
          title="Nenhuma solicitação pendente"
          description="Novas solicitações aparecerão aqui automaticamente."
        />
      ) : (
        <ul className="space-y-3">
          {pendentes.map((r) => {
            const conflitos = findConflitos(reservas, {
              sala_id: r.sala_id,
              data: r.data,
              hora_inicio: r.hora_inicio,
              hora_fim: r.hora_fim,
              ignoreId: r.id,
            }).filter((c) => c.status === "pendente");
            const p = prof(r.profissional_id);
            return (
              <li key={r.id} className="rounded-xl border border-border bg-card p-4 shadow-soft">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-card-foreground">{p?.nome ?? "—"}</p>
                    <p className="text-xs text-muted-foreground">
                      {p?.especialidade ?? "Psicólogo(a)"} · {p?.telefone}
                    </p>
                    <p className="mt-2 text-sm text-card-foreground">
                      {nomeSala(r.sala_id)} · {nomeUnidade(r.unidade_id)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {formatarData(r.data)} · {r.hora_inicio}–{r.hora_fim} ·{" "}
                      <span>{formatRecorrencia(r.recorrencia)}</span>
                    </p>
                    {r.observacoes ? (
                      <p className="mt-2 text-xs text-muted-foreground">{r.observacoes}</p>
                    ) : null}
                    {conflitos.length ? (
                      <Badge
                        variant="outline"
                        className="mt-3 gap-1.5 border-warning/40 bg-warning/15 text-warning-foreground"
                      >
                        <AlertTriangle className="size-3" />
                        {conflitos.length} solicitação(ões) em conflito
                      </Badge>
                    ) : null}
                  </div>
                  <AprovacaoActions reserva={r} reservas={reservas} compact />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </AppShell>
  );
}
