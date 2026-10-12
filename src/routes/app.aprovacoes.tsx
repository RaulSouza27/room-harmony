import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AlertTriangle, Eye, FileText, Images, XCircle } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { AprovacaoActions, CancelarReservaButton } from "@/components/ReservaActions";
import { EmptyState, ErrorState, LoadingState, StatusBadge } from "@/components/common";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ReceiptViewerDialog } from "@/components/ReceiptViewerDialog";
import { ReservaDetailDialog } from "@/components/ReservaDetailDialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useReservas, useSalas, useUnidades, useUsuarios, useUpdateReserva } from "@/hooks/useApi";
import { formatarData, formatRecorrencia } from "@/lib/format";
import { findConflitos } from "@/services/api";
import type { Reserva } from "@/types";
import { toast } from "sonner";

export const Route = createFileRoute("/app/aprovacoes")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Aprovações pendentes — Clínica Escuta" },
      {
        name: "description",
        content: "Fila de solicitações de reserva e cancelamento aguardando análise do administrador.",
      },
      { property: "og:title", content: "Aprovações pendentes — Clínica Escuta" },
      {
        property: "og:description",
        content: "Aprove ou negue solicitações de reserva e analise solicitações de cancelamento.",
      },
    ],
  }),
  component: AprovacoesPage,
});

function getInitials(name?: string) {
  if (!name) return "U";
  const parts = name.trim().split(" ");
  const first = parts[0];
  const last = parts[parts.length - 1];
  if (parts.length >= 2 && first && last && first[0] && last[0]) {
    return `${first[0]}${last[0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function AprovacoesPage() {
  const reservasQ = useReservas();
  const salasQ = useSalas();
  const unidadesQ = useUnidades();
  const usuariosQ = useUsuarios();
  const atualizar = useUpdateReserva();

  const [tab, setTab] = useState<"reservas" | "cancelamentos">("reservas");
  const [alvoComprovante, setAlvoComprovante] = useState<string | null>(null);
  const [detalheReserva, setDetalheReserva] = useState<Reserva | null>(null);

  const reservas = reservasQ.data ?? [];
  const pendentesReserva = reservas
    .filter((r) => r.status === "pendente")
    .sort((a, b) => (a.data + a.hora_inicio).localeCompare(b.data + b.hora_inicio));

  const pendentesCancelamento = reservas
    .filter((r) => r.status === "solicitacao_cancelamento")
    .sort((a, b) => (a.data + a.hora_inicio).localeCompare(b.data + b.hora_inicio));

  const pendentesComComprovante = reservas
    .filter(
      (r) =>
        r.status === "pendente" &&
        r.comprovante &&
        r.comprovante !== "empty" &&
        r.comprovante !== "reserva_especial_admin",
    )
    .sort((a, b) => (a.data + a.hora_inicio).localeCompare(b.data + b.hora_inicio));

  const nomeSala = (id: string) => salasQ.data?.find((s) => s.id === id)?.nome ?? "—";
  const nomeUnidade = (id: string) => unidadesQ.data?.find((u) => u.id === id)?.nome ?? "—";
  const prof = (id: string) => usuariosQ.data?.find((u) => u.id === id);

  const totalPendencias = pendentesReserva.length + pendentesCancelamento.length;

  return (
    <AppShell
      title="Aprovações pendentes"
      description={`${totalPendencias} solicitação(ões) aguardando análise do administrador`}
    >
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Tabs value={tab} onValueChange={(v) => setTab(v as "reservas" | "cancelamentos")}>
            <TabsList>
              <TabsTrigger value="reservas" className="gap-2">
                Solicitações de Reserva
                {pendentesReserva.length > 0 && (
                  <Badge variant="secondary" className="px-1.5 py-0.2 text-[10px]">
                    {pendentesReserva.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="cancelamentos" className="gap-2">
                Solicitações de Cancelamento
                {pendentesCancelamento.length > 0 && (
                  <Badge variant="destructive" className="px-1.5 py-0.2 text-[10px]">
                    {pendentesCancelamento.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {tab === "reservas" && pendentesComComprovante.length > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setAlvoComprovante(pendentesComComprovante[0]!.id)}
              className="gap-2 text-primary border-primary/30 hover:bg-primary/10 shadow-xs"
            >
              <Images className="size-4" />
              Navegar Comprovantes ({pendentesComComprovante.length})
            </Button>
          )}
        </div>

        {reservasQ.isLoading ? (
          <LoadingState />
        ) : reservasQ.error ? (
          <ErrorState message={reservasQ.error.message} />
        ) : tab === "reservas" ? (
          pendentesReserva.length === 0 ? (
            <EmptyState
              title="Nenhuma solicitação de reserva pendente"
              description="Novas solicitações de reserva por profissionais aparecerão aqui automaticamente."
            />
          ) : (
            <ul className="space-y-3">
              {pendentesReserva.map((r) => {
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

                            <div className="mt-2.5 flex flex-wrap items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setDetalheReserva(r)}
                                className="inline-flex items-center gap-1.5 text-xs text-primary font-medium hover:underline bg-primary/5 hover:bg-primary/10 border border-primary/20 px-2.5 py-1 rounded-md transition-colors"
                              >
                                <Eye className="size-3.5" />
                                Ver detalhes
                              </button>

                              {r.comprovante && r.comprovante !== "empty" ? (
                                <button
                                  type="button"
                                  onClick={() => setAlvoComprovante(r.id)}
                                  className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground font-medium hover:underline bg-muted/30 border border-border px-2.5 py-1 rounded-md transition-colors"
                                >
                                  <FileText className="size-3.5" />
                                  Ver comprovante
                                </button>
                              ) : null}
                            </div>

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
          )
        ) : pendentesCancelamento.length === 0 ? (
          <EmptyState
            title="Nenhuma solicitação de cancelamento pendente"
            description="Solicitações de cancelamento enviadas por locatários aparecerão nesta aba."
          />
        ) : (
          <ul className="space-y-3">
            {pendentesCancelamento.map((r) => {
              const p = prof(r.profissional_id);
              return (
                <li key={r.id} className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 shadow-soft">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start gap-3">
                        <Avatar className="size-11 border border-border shrink-0 mt-0.5">
                          <AvatarImage src={p?.foto} alt={p?.nome ?? "Profissional"} />
                          <AvatarFallback className="bg-amber-500/10 text-amber-700 font-semibold">
                            {getInitials(p?.nome)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-card-foreground">{p?.nome ?? "—"}</p>
                            <StatusBadge status={r.status} />
                          </div>
                          <p className="text-xs text-amber-700 dark:text-amber-300 font-medium mt-1">
                            O profissional solicitou o cancelamento desta reserva aprovada.
                          </p>

                          <div className="mt-3 pt-2 border-t border-border/60">
                            <p className="text-sm font-medium text-card-foreground">
                              {nomeSala(r.sala_id)} · {nomeUnidade(r.unidade_id)}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {formatarData(r.data)} · {r.hora_inicio}–{r.hora_fim} ·{" "}
                              <span>{formatRecorrencia(r.recorrencia)}</span>
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          await atualizar.mutateAsync({
                            id: r.id,
                            patch: { status: "aprovada" },
                          });
                          toast.info("Solicitação recusada. A reserva continuará como Aprovada.");
                        }}
                      >
                        Manter Aprovada
                      </Button>
                      <CancelarReservaButton
                        reserva={r}
                        label="Efetivar Cancelamento"
                        size="sm"
                      />
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <ReceiptViewerDialog
        open={!!alvoComprovante}
        onOpenChange={(v) => !v && setAlvoComprovante(null)}
        reservaId={alvoComprovante}
        reservas={pendentesReserva}
        salas={salasQ.data ?? []}
        unidades={unidadesQ.data ?? []}
        usuarios={usuariosQ.data ?? []}
        onNavigateReservaId={(id) => setAlvoComprovante(id)}
      />

      <ReservaDetailDialog
        open={!!detalheReserva}
        onOpenChange={(v) => !v && setDetalheReserva(null)}
        reserva={detalheReserva}
        sala={salasQ.data?.find((s) => s.id === detalheReserva?.sala_id)}
        unidade={unidadesQ.data?.find((u) => u.id === detalheReserva?.unidade_id)}
        usuario={usuariosQ.data?.find((u) => u.id === detalheReserva?.profissional_id)}
      />
    </AppShell>
  );
}
