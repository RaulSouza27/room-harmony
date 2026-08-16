import { Link, createFileRoute } from "@tanstack/react-router";
import { CalendarClock, CalendarPlus, ClipboardList, DoorOpen, Percent } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import {
  EmptyState,
  ErrorState,
  LoadingState,
  SectionCard,
  StatusBadge,
} from "@/components/common";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useReservas, useSalas, useUnidades, useUsuarios } from "@/hooks/useApi";
import { HORARIOS, toMinutes } from "@/services/db";
import { formatarData } from "@/lib/format";

export const Route = createFileRoute("/app/dashboard")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Dashboard — Clínica Escuta Gestão de Salas" },
      {
        name: "description",
        content: "Resumo das reservas, pendências e ocupação das salas da clínica.",
      },
      { property: "og:title", content: "Dashboard — Clínica Escuta" },
      { property: "og:description", content: "Resumo de reservas e ocupação das salas." },
    ],
  }),
  component: DashboardPage,
});

function Metric({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon: typeof Percent;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-soft">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <Icon className="size-4 text-primary" />
      </div>
      <p className="mt-3 text-2xl font-semibold text-card-foreground">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function DashboardPage() {
  const { user, isAdmin } = useAuth();
  const reservasQ = useReservas();
  const salasQ = useSalas();
  const unidadesQ = useUnidades();
  const usuariosQ = useUsuarios();

  const loading = reservasQ.isLoading || salasQ.isLoading || unidadesQ.isLoading;
  const error = reservasQ.error ?? salasQ.error ?? unidadesQ.error;

  const hoje = new Date().toISOString().slice(0, 10);
  const reservas = reservasQ.data ?? [];
  const salas = salasQ.data ?? [];
  const unidades = unidadesQ.data ?? [];
  const usuarios = usuariosQ.data ?? [];

  const nomeSala = (id: string) => salas.find((s) => s.id === id)?.nome ?? "—";
  const nomeUnidade = (id: string) => unidades.find((u) => u.id === id)?.nome ?? "—";
  const nomeProf = (id: string) => usuarios.find((u) => u.id === id)?.nome ?? "—";

  const minhas = reservas
    .filter((r) => r.profissional_id === user?.id && r.data >= hoje)
    .sort((a, b) => (a.data + a.hora_inicio).localeCompare(b.data + b.hora_inicio));

  const pendentes = reservas.filter((r) => r.status === "pendente");
  const aprovadasFuturas = reservas.filter((r) => r.status === "aprovada" && r.data >= hoje);

  const capacidadeSemanal = salas.filter((s) => s.status === "ativa").length * HORARIOS.length;
  const horasAprovadasHoje = reservas
    .filter((r) => r.status === "aprovada" && r.data === hoje)
    .reduce((acc, r) => acc + (toMinutes(r.hora_fim) - toMinutes(r.hora_inicio)) / 60, 0);
  const ocupacao = capacidadeSemanal
    ? Math.round((horasAprovadasHoje / capacidadeSemanal) * 100)
    : 0;

  const usoPorSala = salas
    .map((s) => ({
      sala: s,
      total: reservas.filter((r) => r.sala_id === s.id && r.status === "aprovada").length,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  return (
    <AppShell
      title={`Olá, ${user?.nome.split(" ")[0]}`}
      description={
        isAdmin ? "Visão geral da operação das salas" : "Suas próximas reservas na clínica"
      }
      actions={
        isAdmin ? (
          <Button asChild size="sm">
            <Link to="/app/aprovacoes">Ver aprovações</Link>
          </Button>
        ) : (
          <Button asChild size="sm">
            <Link to="/app/solicitar">
              <CalendarPlus className="size-4" /> Solicitar
            </Link>
          </Button>
        )
      }
    >
      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error.message} />
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {isAdmin ? (
              <>
                <Metric
                  label="Pendentes"
                  value={pendentes.length}
                  hint="Aguardando aprovação"
                  icon={ClipboardList}
                />
                <Metric
                  label="Reservas futuras"
                  value={aprovadasFuturas.length}
                  hint="Aprovadas de hoje em diante"
                  icon={CalendarClock}
                />
                <Metric
                  label="Ocupação hoje"
                  value={`${ocupacao}%`}
                  hint={`${salas.filter((s) => s.status === "ativa").length} salas ativas`}
                  icon={Percent}
                />
                <Metric
                  label="Unidades"
                  value={unidades.filter((u) => u.status === "ativa").length}
                  hint="Ativas"
                  icon={DoorOpen}
                />
              </>
            ) : (
              <>
                <Metric
                  label="Aprovadas"
                  value={minhas.filter((r) => r.status === "aprovada").length}
                  hint="Próximos atendimentos"
                  icon={CalendarClock}
                />
                <Metric
                  label="Pendentes"
                  value={minhas.filter((r) => r.status === "pendente").length}
                  hint="Em análise pela coordenação"
                  icon={ClipboardList}
                />
                <Metric
                  label="Unidades liberadas"
                  value={
                    user?.unidades && user.unidades.length > 0
                      ? user.unidades.length
                      : unidades.filter((u) => u.status === "ativa").length
                  }
                  hint="Onde você pode reservar"
                  icon={DoorOpen}
                />
              </>
            )}
          </div>

          {isAdmin ? (
            <div className="grid gap-6 lg:grid-cols-2">
              <SectionCard title="Pendências recentes" description="Solicitações mais novas">
                {pendentes.length === 0 ? (
                  <EmptyState title="Nenhuma solicitação pendente" />
                ) : (
                  <ul className="divide-y divide-border">
                    {pendentes.slice(0, 5).map((r) => (
                      <li key={r.id} className="flex items-center justify-between gap-3 py-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-card-foreground">
                            {nomeProf(r.profissional_id)}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {nomeSala(r.sala_id)} · {nomeUnidade(r.unidade_id)} ·{" "}
                            {formatarData(r.data)} {r.hora_inicio}–{r.hora_fim}
                          </p>
                        </div>
                        <StatusBadge status={r.status} />
                      </li>
                    ))}
                  </ul>
                )}
              </SectionCard>

              <SectionCard title="Salas mais utilizadas" description="Reservas aprovadas">
                {usoPorSala.length === 0 ? (
                  <EmptyState title="Sem dados de uso" />
                ) : (
                  <ul className="space-y-3">
                    {usoPorSala.map(({ sala, total }) => {
                      const max = usoPorSala[0]?.total || 1;
                      return (
                        <li key={sala.id}>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-card-foreground">
                              {sala.nome}{" "}
                              <span className="text-xs text-muted-foreground">
                                {nomeUnidade(sala.unidade_id)}
                              </span>
                            </span>
                            <span className="text-muted-foreground">{total}</span>
                          </div>
                          <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full rounded-full bg-primary/70"
                              style={{ width: `${(total / max) * 100}%` }}
                            />
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </SectionCard>
            </div>
          ) : (
            <SectionCard
              title="Minhas próximas reservas"
              description="Aprovadas e pendentes"
              actions={
                <Button asChild variant="ghost" size="sm">
                  <Link to="/app/minhas-reservas">Ver todas</Link>
                </Button>
              }
            >
              {minhas.length === 0 ? (
                <EmptyState
                  title="Você ainda não tem reservas futuras"
                  description="Consulte a disponibilidade e solicite uma sala."
                  action={
                    <Button asChild size="sm">
                      <Link to="/app/solicitar">Solicitar reserva</Link>
                    </Button>
                  }
                />
              ) : (
                <ul className="divide-y divide-border">
                  {minhas.slice(0, 6).map((r) => (
                    <li key={r.id} className="flex items-center justify-between gap-3 py-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-card-foreground">
                          {nomeSala(r.sala_id)} · {nomeUnidade(r.unidade_id)}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {formatarData(r.data)} · {r.hora_inicio}–{r.hora_fim}
                        </p>
                      </div>
                      <StatusBadge status={r.status} />
                    </li>
                  ))}
                </ul>
              )}
            </SectionCard>
          )}
        </div>
      )}
    </AppShell>
  );
}
