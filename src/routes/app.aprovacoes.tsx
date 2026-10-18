import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileText,
  Images,
  Search,
  X,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { AprovacaoActions, CancelarReservaButton } from "@/components/ReservaActions";
import { ReservaFormDialog } from "@/components/ReservaFormDialog";
import { EmptyState, ErrorState, LoadingState, StatusBadge } from "@/components/common";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

  const [tab, setTab] = useState<"reservas" | "cancelamentos" | "reagendar">("reservas");
  const [searchQuery, setSearchQuery] = useState("");
  const [de, setDe] = useState("");
  const [ate, setAte] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const [alvoComprovante, setAlvoComprovante] = useState<string | null>(null);
  const [detalheReserva, setDetalheReserva] = useState<Reserva | null>(null);
  const [reservaParaReagendar, setReservaParaReagendar] = useState<Reserva | null>(null);

  const reservas = reservasQ.data ?? [];
  const salas = salasQ.data ?? [];
  const unidades = unidadesQ.data ?? [];
  const usuarios = usuariosQ.data ?? [];

  const nomeSala = (id: string) => salas.find((s) => s.id === id)?.nome ?? "—";
  const nomeUnidade = (id: string, salaId?: string) => {
    const u = unidades.find(
      (un) => un.id === id || (salaId && un.id === salas.find((s) => s.id === salaId)?.unidade_id),
    );
    return u?.nome ?? "—";
  };
  const prof = (id: string) => usuarios.find((u) => u.id === id);

  // Filtra por busca textual e intervalo de datas
  const reservasFiltradas = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    const cleanDigits = query.replace(/\D/g, "");

    return reservas
      .filter((r) => !de || r.data >= de)
      .filter((r) => !ate || r.data <= ate)
      .filter((r) => {
        if (!query) return true;
        const p = usuarios.find((u) => u.id === r.profissional_id);
        const s = salas.find((sa) => sa.id === r.sala_id);
        const u = unidades.find((un) => un.id === r.unidade_id || un.id === s?.unidade_id);

        const matchProfNome = (p?.nome || "").toLowerCase().includes(query);
        const matchProfEmail = (p?.email || "").toLowerCase().includes(query);
        const matchProfBoard = (p?.boardNumber || "").toLowerCase().includes(query);
        const matchProfTel =
          cleanDigits.length > 0
            ? (p?.telefone || "").replace(/\D/g, "").includes(cleanDigits)
            : (p?.telefone || "").toLowerCase().includes(query);
        const matchProfCpf =
          cleanDigits.length > 0
            ? (p?.cpf || "").replace(/\D/g, "").includes(cleanDigits)
            : (p?.cpf || "").toLowerCase().includes(query);

        const matchSala = (s?.nome || "").toLowerCase().includes(query);
        const matchUnidade = (u?.nome || "").toLowerCase().includes(query);
        const matchObs = (r.observacoes || "").toLowerCase().includes(query);
        const matchData = formatarData(r.data).toLowerCase().includes(query) || r.data.includes(query);
        const matchHora = `${r.hora_inicio} ${r.hora_fim}`.toLowerCase().includes(query);
        const matchRecorrencia = formatRecorrencia(r.recorrencia).toLowerCase().includes(query);

        return (
          matchProfNome ||
          matchProfEmail ||
          matchProfBoard ||
          matchProfTel ||
          matchProfCpf ||
          matchSala ||
          matchUnidade ||
          matchObs ||
          matchData ||
          matchHora ||
          matchRecorrencia
        );
      });
  }, [reservas, de, ate, searchQuery, usuarios, salas, unidades]);

  const pendentesReserva = useMemo(
    () =>
      reservasFiltradas
        .filter((r) => r.status === "pendente")
        .sort((a, b) => (a.data + a.hora_inicio).localeCompare(b.data + b.hora_inicio)),
    [reservasFiltradas],
  );

  const pendentesCancelamento = useMemo(
    () =>
      reservasFiltradas
        .filter((r) => r.status === "solicitacao_cancelamento")
        .sort((a, b) => (a.data + a.hora_inicio).localeCompare(b.data + b.hora_inicio)),
    [reservasFiltradas],
  );

  const pendentesReagendar = useMemo(
    () =>
      reservasFiltradas
        .filter((r) => r.status === "reagendar")
        .sort((a, b) => (a.data + a.hora_inicio).localeCompare(b.data + b.hora_inicio)),
    [reservasFiltradas],
  );

  const pendentesComComprovante = useMemo(
    () =>
      pendentesReserva.filter(
        (r) =>
          r.comprovante &&
          r.comprovante !== "empty" &&
          r.comprovante !== "reserva_especial_admin",
      ),
    [pendentesReserva],
  );

  const listaAtiva =
    tab === "reservas"
      ? pendentesReserva
      : tab === "reagendar"
        ? pendentesReagendar
        : pendentesCancelamento;

  const totalItems = listaAtiva.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(Math.max(currentPage, 1), totalPages);

  const paginatedLista = useMemo(() => {
    const startIndex = (safePage - 1) * pageSize;
    return listaAtiva.slice(startIndex, startIndex + pageSize);
  }, [listaAtiva, safePage, pageSize]);

  const totalPendencias =
    pendentesReserva.length + pendentesCancelamento.length + pendentesReagendar.length;
  const temFiltroAtivo = searchQuery.trim() !== "" || de !== "" || ate !== "";

  return (
    <AppShell
      title="Aprovações pendentes"
      description={`${totalPendencias} solicitação(ões) aguardando análise do administrador`}
    >
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Tabs
            value={tab}
            onValueChange={(v) => {
              setTab(v as "reservas" | "cancelamentos" | "reagendar");
              setCurrentPage(1);
            }}
          >
            <TabsList>
              <TabsTrigger value="reservas" className="gap-2">
                Solicitações de Reserva
                {pendentesReserva.length > 0 && (
                  <Badge variant="secondary" className="px-1.5 py-0.2 text-[10px]">
                    {pendentesReserva.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="reagendar" className="gap-2">
                A Reagendar (Feriado)
                {pendentesReagendar.length > 0 && (
                  <Badge variant="outline" className="px-1.5 py-0.2 text-[10px] border-purple-500/40 bg-purple-500/15 text-purple-700 dark:text-purple-300">
                    {pendentesReagendar.length}
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

        {/* Barra de Pesquisa e Filtro por Datas */}
        <div className="grid gap-4 rounded-xl border border-border bg-card p-4 shadow-soft md:grid-cols-12 items-end">
          <div className="space-y-2 md:col-span-6">
            <Label htmlFor="search-aprovacoes">Pesquisar</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                id="search-aprovacoes"
                placeholder="Buscar por profissional, CRP, sala, unidade, data ou observação..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-9 pr-4 text-sm"
              />
            </div>
          </div>

          <div className="space-y-2 md:col-span-3">
            <Label htmlFor="de-aprovacoes">De</Label>
            <Input
              id="de-aprovacoes"
              type="date"
              value={de}
              onChange={(e) => {
                setDe(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>

          <div className="space-y-2 md:col-span-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="ate-aprovacoes">Até</Label>
              {temFiltroAtivo && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setDe("");
                    setAte("");
                    setCurrentPage(1);
                  }}
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-medium"
                >
                  <X className="size-3" /> Limpar filtros
                </button>
              )}
            </div>
            <Input
              id="ate-aprovacoes"
              type="date"
              value={ate}
              onChange={(e) => {
                setAte(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>
        </div>

        {reservasQ.isLoading ? (
          <LoadingState />
        ) : reservasQ.error ? (
          <ErrorState message={reservasQ.error.message} />
        ) : tab === "reservas" ? (
          pendentesReserva.length === 0 ? (
            <EmptyState
              title="Nenhuma solicitação de reserva pendente"
              description={
                temFiltroAtivo
                  ? "Nenhuma solicitação corresponde aos filtros aplicados."
                  : "Novas solicitações de reserva por profissionais aparecerão aqui automaticamente."
              }
            />
          ) : (
            <ul className="space-y-3">
              {paginatedLista.map((r) => {
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
                                {nomeSala(r.sala_id)} · {nomeUnidade(r.unidade_id, r.sala_id)}
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
        ) : tab === "reagendar" ? (
          pendentesReagendar.length === 0 ? (
            <EmptyState
              title="Nenhuma reserva para reagendar"
              description={
                temFiltroAtivo
                  ? "Nenhuma reserva corresponde aos filtros aplicados."
                  : "Quando feriados ou bloqueios atingirem reservas existentes, elas aparecerão aqui para reagendamento ou cancelamento."
              }
            />
          ) : (
            <ul className="space-y-3">
              {paginatedLista.map((r) => {
                const p = prof(r.profissional_id);
                return (
                  <li key={r.id} className="rounded-xl border border-purple-500/30 bg-purple-500/5 p-4 shadow-soft">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start gap-3">
                          <Avatar className="size-11 border border-border shrink-0 mt-0.5">
                            <AvatarImage src={p?.foto} alt={p?.nome ?? "Profissional"} />
                            <AvatarFallback className="bg-purple-500/10 text-purple-700 font-semibold">
                              {getInitials(p?.nome)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-semibold text-card-foreground">{p?.nome ?? "—"}</p>
                              <StatusBadge status={r.status} />
                            </div>
                            <p className="text-xs text-purple-700 dark:text-purple-300 font-medium mt-1">
                              Esta reserva coincidiu com feriado/bloqueio cadastrado na unidade. Reagende para nova data/hora ou cancele.
                            </p>

                            <div className="mt-3 pt-2 border-t border-border/60">
                              <p className="text-sm font-medium text-card-foreground">
                                {nomeSala(r.sala_id)} · {nomeUnidade(r.unidade_id, r.sala_id)}
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
                          variant="default"
                          size="sm"
                          className="bg-purple-600 hover:bg-purple-700 text-white gap-1.5"
                          onClick={() => setReservaParaReagendar(r)}
                        >
                          <CalendarIcon className="size-3.5" />
                          Reagendar Reserva
                        </Button>
                        <CancelarReservaButton
                          reserva={r}
                          label="Cancelar"
                          size="sm"
                        />
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )
        ) : pendentesCancelamento.length === 0 ? (
          <EmptyState
            title="Nenhuma solicitação de cancelamento pendente"
            description={
              temFiltroAtivo
                ? "Nenhuma solicitação corresponde aos filtros aplicados."
                : "Solicitações de cancelamento enviadas por locatários aparecerão nesta aba."
            }
          />
        ) : (
          <ul className="space-y-3">
            {paginatedLista.map((r) => {
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
                              {nomeSala(r.sala_id)} · {nomeUnidade(r.unidade_id, r.sala_id)}
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

        {/* Controles de Paginação */}
        {!reservasQ.isLoading && !reservasQ.error && totalPages > 1 && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4 text-xs text-muted-foreground">
            <div>
              Exibindo <strong>{(safePage - 1) * pageSize + 1}</strong> a{" "}
              <strong>{Math.min(safePage * pageSize, totalItems)}</strong> de{" "}
              <strong>{totalItems}</strong> solicitação(ões)
            </div>

            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="outline"
                disabled={safePage === 1}
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                className="h-8 px-2.5"
              >
                <ChevronLeft className="size-4 mr-1" /> Anterior
              </Button>

              <span className="px-2 font-medium text-foreground">
                Página {safePage} de {totalPages}
              </span>

              <Button
                size="sm"
                variant="outline"
                disabled={safePage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                className="h-8 px-2.5"
              >
                Próxima <ChevronRight className="size-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>

      <ReceiptViewerDialog
        open={!!alvoComprovante}
        onOpenChange={(v) => !v && setAlvoComprovante(null)}
        reservaId={alvoComprovante}
        reservas={pendentesReserva}
        salas={salas}
        unidades={unidades}
        usuarios={usuarios}
        onNavigateReservaId={(id) => setAlvoComprovante(id)}
      />

      <ReservaDetailDialog
        open={!!detalheReserva}
        onOpenChange={(v) => !v && setDetalheReserva(null)}
        reserva={detalheReserva}
        sala={salas.find((s) => s.id === detalheReserva?.sala_id)}
        unidade={unidades.find(
          (u) =>
            u.id === detalheReserva?.unidade_id ||
            u.id === salas.find((s) => s.id === detalheReserva?.sala_id)?.unidade_id,
        )}
        usuario={usuarios.find((u) => u.id === detalheReserva?.profissional_id)}
      />

      {reservaParaReagendar && (
        <ReservaFormDialog
          open={!!reservaParaReagendar}
          onOpenChange={(v) => !v && setReservaParaReagendar(null)}
          unidades={unidades}
          salas={salas}
          usuarios={usuarios}
          reservas={reservas}
          reserva={reservaParaReagendar}
        />
      )}
    </AppShell>
  );
}
