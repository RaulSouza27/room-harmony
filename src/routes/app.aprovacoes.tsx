import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AlertTriangle, FileText } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { AprovacaoActions } from "@/components/ReservaActions";
import { EmptyState, ErrorState, LoadingState } from "@/components/common";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ReceiptViewerDialog } from "@/components/ReceiptViewerDialog";
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

function getInitials(name?: string) {
  if (!name) return "U";
  const parts = name.trim().split(" ");
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function AprovacoesPage() {
  const reservasQ = useReservas();
  const salasQ = useSalas();
  const unidadesQ = useUnidades();
  const usuariosQ = useUsuarios();

  const [alvoComprovante, setAlvoComprovante] = useState<string | null>(null);

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
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start gap-3">
                      <Avatar className="size-11 border border-border shrink-0 mt-0.5">
                        <AvatarImage src={p?.foto} alt={p?.nome ?? "Profissional"} />
                        <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                          {getInitials(p?.nome)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-card-foreground">{p?.nome ?? "—"}</p>
                        <div className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground mt-0.5">
                          <span>{p?.especialidade ?? "Psicólogo(a)"}</span>
                          {p?.boardNumber ? (
                            <>
                              <span>•</span>
                              <span>CRP: {p.boardNumber}</span>
                            </>
                          ) : null}
                          {p?.telefone ? (
                            <>
                              <span>•</span>
                              <span>Tel: {p.telefone}</span>
                            </>
                          ) : null}
                          {p?.email ? (
                            <>
                              <span>•</span>
                              <span className="truncate">{p.email}</span>
                            </>
                          ) : null}
                        </div>

                        <div className="mt-3 pt-2 border-t border-border/60">
                          <p className="text-sm font-medium text-card-foreground">
                            {nomeSala(r.sala_id)} · {nomeUnidade(r.unidade_id)}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {formatarData(r.data)} · {r.hora_inicio}–{r.hora_fim} ·{" "}
                            <span>{formatRecorrencia(r.recorrencia)}</span>
                          </p>
                        </div>

                        {r.observacoes ? (
                          <p className="mt-2 text-xs text-muted-foreground bg-muted/30 p-2 rounded-md">
                            <span className="font-medium text-foreground">Obs:</span> {r.observacoes}
                          </p>
                        ) : null}

                        {r.comprovante && r.comprovante !== "empty" ? (
                          <div className="mt-2.5">
                            <button
                              type="button"
                              onClick={() => setAlvoComprovante(r.comprovante!)}
                              className="inline-flex items-center gap-1.5 text-xs text-primary font-medium hover:underline bg-primary/5 hover:bg-primary/10 border border-primary/20 px-2.5 py-1 rounded-md transition-colors"
                            >
                              <FileText className="size-3.5" />
                              Ver comprovante de pagamento
                            </button>
                          </div>
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
                    </div>
                  </div>
                  <AprovacaoActions reserva={r} reservas={reservas} compact />
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <ReceiptViewerDialog
        open={!!alvoComprovante}
        onOpenChange={(v) => !v && setAlvoComprovante(null)}
        receiptUrl={alvoComprovante}
      />
    </AppShell>
  );
}

