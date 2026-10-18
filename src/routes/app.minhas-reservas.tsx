import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { EmptyState, ErrorState, LoadingState, StatusBadge } from "@/components/common";
import { CancelarReservaButton } from "@/components/ReservaActions";
import { ReceiptViewerDialog } from "@/components/ReceiptViewerDialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { useReservas, useSalas, useUnidades } from "@/hooks/useApi";
import { formatarData, formatRecorrencia, isReservaComMaisDe24h } from "@/lib/format";
import type { Reserva, ReservaStatus } from "@/types";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, FileText, BellRing, Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ReservaFormDialog } from "@/components/ReservaFormDialog";
import { getNotifications, markNotificationsAsRead, type UserNotification } from "@/services/notificationService";
import { toast } from "sonner";

export const Route = createFileRoute("/app/minhas-reservas")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Minhas reservas — Clínica Escuta" },
      {
        name: "description",
        content:
          "Histórico das suas reservas de sala com status, solicitação de cancelamento e motivo de negação.",
      },
      { property: "og:title", content: "Minhas reservas — Clínica Escuta" },
      {
        property: "og:description",
        content: "Acompanhe pendentes, aprovadas, solicitações de cancelamento e negadas.",
      },
    ],
  }),
  component: MinhasReservasPage,
});

const filtros: Array<{ value: "ativas" | ReservaStatus; label: string }> = [
  { value: "ativas", label: "Ativas" },
  { value: "reagendar", label: "A Reagendar (Feriado)" },
  { value: "pendente", label: "Pendentes" },
  { value: "aprovada", label: "Aprovadas" },
  { value: "solicitacao_cancelamento", label: "Solicitado Cancelamento" },
  { value: "negada", label: "Negadas" },
  { value: "cancelada", label: "Canceladas" },
];

function MinhasReservasPage() {
  const { user } = useAuth();
  const reservasQ = useReservas(user?.id ? { userId: user.id } : undefined);
  const salasQ = useSalas();
  const unidadesQ = useUnidades();
  const [filtro, setFiltro] = useState<"ativas" | ReservaStatus>("ativas");
  const [alvoVisualizacaoComprovante, setAlvoVisualizacaoComprovante] = useState<string | null>(
    null,
  );
  const [reservaParaReagendar, setReservaParaReagendar] = useState<Reserva | null>(null);
  const [notifications, setNotifications] = useState<UserNotification[]>([]);

  useEffect(() => {
    if (!user?.id) return;
    const userNotifs = getNotifications(user.id);
    if (userNotifs.length > 0) {
      setNotifications(userNotifs);
      const unread = userNotifs.filter((n) => !n.read);
      unread.forEach((n) => {
        toast.success(n.message, { duration: 6000 });
      });
      markNotificationsAsRead(user.id);
    }
  }, [user]);

  const salas = salasQ.data ?? [];
  const unidades = unidadesQ.data ?? [];
  const minhasReservas = (reservasQ.data ?? []).filter((r) => r.profissional_id === user?.id);
  const lista = minhasReservas
    .filter((r) => {
      if (filtro === "ativas") return r.status !== "cancelada";
      return r.status === filtro;
    })
    .sort((a, b) => (b.data + b.hora_inicio).localeCompare(a.data + a.hora_inicio));

  return (
    <AppShell title="Minhas reservas" description="Histórico e status das suas solicitações">
      <div className="space-y-5">
        {notifications.length > 0 && (
          <div className="space-y-2">
            {notifications.map((n) => (
              <Alert key={n.id} className="bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300">
                <BellRing className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <AlertTitle className="font-semibold text-emerald-800 dark:text-emerald-200">Notificação de Cancelamento</AlertTitle>
                <AlertDescription className="text-emerald-700 dark:text-emerald-300">
                  {n.message}
                </AlertDescription>
              </Alert>
            ))}
          </div>
        )}

        <Alert className="bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400">
          <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          <AlertTitle className="font-semibold text-amber-700 dark:text-amber-300">Aviso importante</AlertTitle>
          <AlertDescription className="text-amber-600/90 dark:text-amber-400/90">
            O cancelamento de reservas já aprovadas não pode ser feito diretamente, mas você pode solicitar o cancelamento ao administrador com no mínimo 24h de antecedência.
          </AlertDescription>
        </Alert>

        <Tabs value={filtro} onValueChange={(v) => setFiltro(v as "ativas" | ReservaStatus)}>
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
              const podeSolicitarCancelamento = r.status === "aprovada" || r.status === "pendente";
              const temMaisDe24h = isReservaComMaisDe24h(r.data, r.hora_inicio);
              const bloqueadoPor24h = r.status === "aprovada" && !temMaisDe24h;

              return (
                <li key={r.id} className="rounded-xl border border-border bg-card p-4 shadow-soft">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-card-foreground">
                        {sala?.nome ?? "Sala removida"}{" "}
                        <span className="font-normal text-muted-foreground">
                          · {unidade?.nome ?? "—"}
                        </span>
                      </p>
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        {formatarData(r.data)} · {r.hora_inicio}–{r.hora_fim} ·{" "}
                        <span>{formatRecorrencia(r.recorrencia)}</span>
                      </p>
                      {r.observacoes ? (
                        <p className="mt-2 text-xs text-muted-foreground">{r.observacoes}</p>
                      ) : null}
                      {r.status === "reagendar" ? (
                        <p className="mt-2 rounded-md border border-purple-500/30 bg-purple-500/10 px-3 py-2 text-xs text-purple-700 dark:text-purple-300 font-medium">
                          Data atingida por feriado/fechamento da unidade. Esta reserva precisa ser reagendada junto à administração ou cancelada.
                        </p>
                      ) : null}
                      {r.status === "negada" && r.motivo_negacao ? (
                        <p className="mt-2 rounded-md border border-destructive/25 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                          Motivo da negação: {r.motivo_negacao}
                        </p>
                      ) : null}
                      {r.comprovante && r.comprovante !== "empty" ? (
                        <button
                          type="button"
                          onClick={() => setAlvoVisualizacaoComprovante(r.id)}
                          className="inline-flex items-center gap-1.5 text-xs text-primary font-medium hover:underline bg-primary/5 hover:bg-primary/10 border border-primary/20 px-2.5 py-1 rounded-md mt-2 transition-colors"
                        >
                          <FileText className="size-3.5" />
                          Ver comprovante de pagamento
                        </button>
                      ) : null}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge status={r.status} />
                        {r.status === "reagendar" && (
                          <Button
                            variant="default"
                            size="sm"
                            className="bg-purple-600 hover:bg-purple-700 text-white gap-1.5 h-8 text-xs"
                            onClick={() => setReservaParaReagendar(r)}
                          >
                            <CalendarIcon className="size-3.5" />
                            Reagendar Reserva
                          </Button>
                        )}
                        {podeSolicitarCancelamento && (
                          <CancelarReservaButton reserva={r} size="sm" />
                        )}
                      </div>
                      {bloqueadoPor24h && (
                        <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                          Prazo de cancelamento expirado (&lt; 24h)
                        </span>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <ReceiptViewerDialog
        open={!!alvoVisualizacaoComprovante}
        onOpenChange={(v) => !v && setAlvoVisualizacaoComprovante(null)}
        reservaId={alvoVisualizacaoComprovante}
        reservas={minhasReservas}
        salas={salasQ.data ?? []}
        unidades={unidadesQ.data ?? []}
        usuarios={user ? [user] : []}
        onNavigateReservaId={(id) => setAlvoVisualizacaoComprovante(id)}
      />

      {reservaParaReagendar && (
        <ReservaFormDialog
          open={!!reservaParaReagendar}
          onOpenChange={(v) => !v && setReservaParaReagendar(null)}
          unidades={unidades}
          salas={salas}
          usuarios={user ? [user] : []}
          reservas={reservasQ.data ?? []}
          reserva={reservaParaReagendar}
          modoReagendamento={true}
        />
      )}
    </AppShell>
  );
}
