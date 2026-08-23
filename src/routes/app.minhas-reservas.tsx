import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { EmptyState, ErrorState, LoadingState, StatusBadge } from "@/components/common";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { useReservas, useSalas, useUnidades } from "@/hooks/useApi";
import { formatarData, hojeISO, formatRecorrencia } from "@/lib/format";
import type { ReservaStatus } from "@/types";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

export const Route = createFileRoute("/app/minhas-reservas")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Minhas reservas — Clínica Escuta" },
      {
        name: "description",
        content:
          "Histórico das suas reservas de sala com status, cancelamento e motivo de negação.",
      },
      { property: "og:title", content: "Minhas reservas — Clínica Escuta" },
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
  const [alvoVisualizacaoComprovante, setAlvoVisualizacaoComprovante] = useState<string | null>(
    null,
  );

  const salas = salasQ.data ?? [];
  const unidades = unidadesQ.data ?? [];
  const lista = (reservasQ.data ?? [])
    .filter((r) => r.profissional_id === user?.id)
    .filter((r) => filtro === "todas" || r.status === filtro)
    .sort((a, b) => (b.data + b.hora_inicio).localeCompare(a.data + a.hora_inicio));

  return (
    <AppShell title="Minhas reservas" description="Histórico e status das suas solicitações">
      <div className="space-y-5">
        <Alert className="bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400">
          <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          <AlertTitle className="font-semibold text-amber-700 dark:text-amber-300">Aviso importante</AlertTitle>
          <AlertDescription className="text-amber-600/90 dark:text-amber-400/90">
            O cancelamento de reservas pelo sistema só pode ser solicitado com, no mínimo, 24 horas de antecedência da data da reserva.
          </AlertDescription>
        </Alert>

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
                        <span>{formatRecorrencia(r.recorrencia)}</span>
                      </p>
                      {r.observacoes ? (
                        <p className="mt-2 text-xs text-muted-foreground">{r.observacoes}</p>
                      ) : null}
                      {r.status === "negada" && r.motivo_negacao ? (
                        <p className="mt-2 rounded-md border border-destructive/25 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                          Motivo da negação: {r.motivo_negacao}
                        </p>
                      ) : null}
                      {r.comprovante && r.comprovante !== "empty" ? (
                        <span
                          className="text-xs text-primary underline cursor-pointer inline-flex items-center gap-1 mt-2 block"
                          onClick={() => {
                            setAlvoVisualizacaoComprovante(r.comprovante!);
                          }}
                        >
                          📄 Ver comprovante de pagamento
                        </span>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={r.status} />
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {alvoVisualizacaoComprovante ? (
        <Dialog
          open={!!alvoVisualizacaoComprovante}
          onOpenChange={() => setAlvoVisualizacaoComprovante(null)}
        >
          <DialogContent className="sm:max-w-xl p-3 flex flex-col items-center justify-center bg-background/95 border-none shadow-2xl">
            <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-black flex items-center justify-center">
              <img
                src={alvoVisualizacaoComprovante}
                alt="Comprovante de pagamento"
                className="max-w-full max-h-full object-contain animate-fade-in"
              />
            </div>
            <div className="mt-2 text-xs text-muted-foreground font-medium">
              Comprovante de Pagamento Anexado
            </div>
          </DialogContent>
        </Dialog>
      ) : null}
    </AppShell>
  );
}
