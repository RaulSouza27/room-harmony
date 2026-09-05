import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Calendar, CalendarDays, CalendarRange } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { AvailabilityGrid, type SlotInfo } from "@/components/AvailabilityGrid";
import { MonthlyCalendarView } from "@/components/MonthlyCalendarView";
import { YearlyCalendarView } from "@/components/YearlyCalendarView";
import {
  AprovacaoActions,
  CancelarReservaButton,
  ExcluirReservaButton,
} from "@/components/ReservaActions";
import { ReservaFormDialog } from "@/components/ReservaFormDialog";
import { ReceiptViewerDialog } from "@/components/ReceiptViewerDialog";
import { ErrorState, LoadingState, StatusBadge } from "@/components/common";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { useReservas, useSalas, useUnidades, useUsuarios } from "@/hooks/useApi";
import { formatarDataLonga, formatarMesAno, hojeISO, formatRecorrencia } from "@/lib/format";
import type { Reserva } from "@/types";

export const Route = createFileRoute("/app/agenda")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Disponibilidade de salas — Clínica Escuta" },
      {
        name: "description",
        content:
          "Grade de disponibilidade das salas por unidade, dia, mês ou ano: livre, pendente ou ocupado.",
      },
      { property: "og:title", content: "Disponibilidade de salas — Clínica Escuta" },
      {
        property: "og:description",
        content: "Consulte livre, pendente e ocupado em todas as unidades.",
      },
    ],
  }),
  component: AgendaPage,
});

type ModoVisao = "diario" | "mensal" | "anual";

function AgendaPage() {
  const { user, isAdmin } = useAuth();
  const unidadesQ = useUnidades();
  const salasQ = useSalas();
  const reservasQ = useReservas();
  const usuariosQ = useUsuarios();

  const [modoVisao, setModoVisao] = useState<ModoVisao>("diario");
  const [unidadeFiltro, setUnidadeFiltro] = useState("todas");
  const [data, setData] = useState(hojeISO());

  const hojeDate = new Date();
  const [ano, setAno] = useState(hojeDate.getFullYear());
  const [mes, setMes] = useState(hojeDate.getMonth() + 1); // 1..12

  const [preset, setPreset] = useState<SlotInfo | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [detalhe, setDetalhe] = useState<Reserva | null>(null);
  const [editando, setEditando] = useState<Reserva | null>(null);
  const [alvoVisualizacaoComprovante, setAlvoVisualizacaoComprovante] = useState<string | null>(
    null,
  );

  const unidades = unidadesQ.data ?? [];
  const salas = salasQ.data ?? [];
  const reservas = reservasQ.data ?? [];
  const usuarios = usuariosQ.data ?? [];

  const unidadesVisiveis = useMemo(
    () =>
      unidades.filter(
        (u) =>
          isAdmin || !user?.unidades || user.unidades.length === 0 || user.unidades.includes(u.id),
      ),
    [unidades, isAdmin, user],
  );

  const salasVisiveis = salas.filter(
    (s) =>
      unidadesVisiveis.some((u) => u.id === s.unidade_id) &&
      (unidadeFiltro === "todas" || s.unidade_id === unidadeFiltro),
  );

  const idsSalasVisiveis = useMemo(() => new Set(salasVisiveis.map((s) => s.id)), [salasVisiveis]);

  const reservasFiltradas = useMemo(
    () => reservas.filter((r) => idsSalasVisiveis.has(r.sala_id)),
    [reservas, idsSalasVisiveis],
  );

  const reservasDoDia = reservasFiltradas.filter((r) => r.data === data);
  const loading = unidadesQ.isLoading || salasQ.isLoading || reservasQ.isLoading;
  const error = unidadesQ.error ?? salasQ.error ?? reservasQ.error;

  function handleSlot(slot: SlotInfo) {
    if (slot.tipo === "reserva") {
      setDetalhe(slot.reserva);
      return;
    }
    setPreset(slot);
    setFormOpen(true);
  }

  function handleSelectDayFromMonth(dataISO: string) {
    setData(dataISO);
    const [y, m] = dataISO.split("-").map(Number);
    if (y && m) {
      setAno(y);
      setMes(m);
    }
    setModoVisao("diario");
  }

  function handleSelectMonthFromYear(mesSelecionado: number) {
    setMes(mesSelecionado);
    setModoVisao("mensal");
  }

  function handleDataChange(novaData: string) {
    setData(novaData);
    if (novaData) {
      const [y, m] = novaData.split("-").map(Number);
      if (y && m) {
        setAno(y);
        setMes(m);
      }
    }
  }

  function handlePrevMonth() {
    if (mes === 1) {
      setMes(12);
      setAno((a) => a - 1);
    } else {
      setMes((m) => m - 1);
    }
  }

  function handleNextMonth() {
    if (mes === 12) {
      setMes(1);
      setAno((a) => a + 1);
    } else {
      setMes((m) => m + 1);
    }
  }

  function handleToday() {
    const hoje = hojeISO();
    setData(hoje);
    const d = new Date();
    setAno(d.getFullYear());
    setMes(d.getMonth() + 1);
  }

  const nomeSala = (id: string) => salas.find((s) => s.id === id)?.nome ?? "—";
  const nomeUnidade = (id: string) => unidades.find((u) => u.id === id)?.nome ?? "—";
  const nomeProf = (id: string) => usuarios.find((u) => u.id === id)?.nome ?? "—";

  const descricaoHeader =
    modoVisao === "diario"
      ? formatarDataLonga(data)
      : modoVisao === "mensal"
        ? formatarMesAno(ano, mes)
        : `Ano de ${ano}`;

  return (
    <AppShell
      title={isAdmin ? "Agenda geral" : "Disponibilidade"}
      description={descricaoHeader}
    >
      <div className="space-y-5">
        {/* Filtros e Modos de Visão */}
        <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 shadow-soft sm:flex-row sm:items-end sm:justify-between">
          <div className="grid gap-4 sm:flex sm:items-end flex-1">
            <div className="space-y-2 min-w-[200px]">
              <Label>Unidade</Label>
              <Select value={unidadeFiltro} onValueChange={setUnidadeFiltro}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas as unidades</SelectItem>
                  {unidadesVisiveis.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {modoVisao === "diario" && (
              <div className="space-y-2 min-w-[170px]">
                <Label htmlFor="data">Data</Label>
                <Input
                  id="data"
                  type="date"
                  value={data}
                  onChange={(e) => handleDataChange(e.target.value)}
                />
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Seletor de Modo de Visão */}
            <Tabs
              value={modoVisao}
              onValueChange={(v) => setModoVisao(v as ModoVisao)}
              className="w-auto"
            >
              <TabsList className="grid grid-cols-3 w-[240px]">
                <TabsTrigger value="diario" className="gap-1 text-xs">
                  <Calendar className="size-3.5" /> Dia
                </TabsTrigger>
                <TabsTrigger value="mensal" className="gap-1 text-xs">
                  <CalendarDays className="size-3.5" /> Mês
                </TabsTrigger>
                <TabsTrigger value="anual" className="gap-1 text-xs">
                  <CalendarRange className="size-3.5" /> Ano
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <Button
              variant="outline"
              onClick={() => {
                setPreset(null);
                setFormOpen(true);
              }}
            >
              {isAdmin ? "Nova reserva" : "Solicitar reserva"}
            </Button>
          </div>
        </div>

        {loading ? (
          <LoadingState label="Carregando dados de disponibilidade..." />
        ) : error ? (
          <ErrorState message={error.message} />
        ) : modoVisao === "diario" ? (
          <AvailabilityGrid
            salas={salasVisiveis}
            unidades={unidades}
            reservas={reservasDoDia}
            usuarios={usuarios}
            onSlotClick={handleSlot}
          />
        ) : modoVisao === "mensal" ? (
          <MonthlyCalendarView
            ano={ano}
            mes={mes}
            salas={salasVisiveis}
            unidades={unidades}
            reservas={reservasFiltradas}
            usuarios={usuarios}
            onSelectDay={handleSelectDayFromMonth}
            onPrevMonth={handlePrevMonth}
            onNextMonth={handleNextMonth}
            onToday={handleToday}
          />
        ) : (
          <YearlyCalendarView
            ano={ano}
            salas={salasVisiveis}
            reservas={reservasFiltradas}
            onSelectMonth={handleSelectMonthFromYear}
            onPrevYear={() => setAno((a) => a - 1)}
            onNextYear={() => setAno((a) => a + 1)}
            onCurrentYear={() => setAno(hojeDate.getFullYear())}
          />
        )}
      </div>


      <ReservaFormDialog
        open={formOpen}
        onOpenChange={(v) => {
          setFormOpen(v);
          if (!v) setPreset(null);
        }}
        unidades={unidades}
        salas={salas}
        usuarios={usuarios}
        reservas={reservas}
        preset={
          preset
            ? {
                unidade_id: preset.sala.unidade_id,
                sala_id: preset.sala.id,
                data,
                hora_inicio: preset.hora,
              }
            : { data }
        }
      />

      {editando ? (
        <ReservaFormDialog
          open={!!editando}
          onOpenChange={(v) => !v && setEditando(null)}
          unidades={unidades}
          salas={salas}
          usuarios={usuarios}
          reservas={reservas}
          reserva={editando}
        />
      ) : null}

      <Dialog open={!!detalhe} onOpenChange={(v) => !v && setDetalhe(null)}>
        <DialogContent className="sm:max-w-md">
          {detalhe ? (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {nomeSala(detalhe.sala_id)} <StatusBadge status={detalhe.status} />
                </DialogTitle>
                <DialogDescription>
                  {nomeUnidade(detalhe.unidade_id)} · {formatarDataLonga(detalhe.data)} ·{" "}
                  {detalhe.hora_inicio}–{detalhe.hora_fim}
                </DialogDescription>
              </DialogHeader>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Profissional</dt>
                  <dd className="text-right font-medium">{nomeProf(detalhe.profissional_id)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Tipo de Reserva</dt>
                  <dd className="text-right">{formatRecorrencia(detalhe.recorrencia)}</dd>
                </div>
                {detalhe.observacoes ? (
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">Observações</dt>
                    <dd className="text-right">{detalhe.observacoes}</dd>
                  </div>
                ) : null}
              </dl>
              {detalhe.comprovante && detalhe.comprovante !== "empty" ? (
                <div className="mt-3 border-t border-border pt-3 space-y-1">
                  <dt className="text-xs font-semibold text-muted-foreground font-medium">
                    Comprovante de pagamento:
                  </dt>
                  <div className="relative aspect-video rounded overflow-hidden bg-black flex items-center justify-center h-40 border border-border">
                    <img
                      src={detalhe.comprovante}
                      alt="Comprovante de pagamento"
                      className="max-w-full max-h-full object-contain cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => {
                        setAlvoVisualizacaoComprovante(detalhe.comprovante!);
                      }}
                    />
                  </div>
                </div>
              ) : null}

              {isAdmin ? (
                <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
                  {detalhe.status === "pendente" ? (
                    <AprovacaoActions reserva={detalhe} reservas={reservas} compact />
                  ) : null}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditando(detalhe);
                      setDetalhe(null);
                    }}
                  >
                    Editar
                  </Button>
                  {detalhe.status !== "cancelada" ? (
                    <CancelarReservaButton reserva={detalhe} />
                  ) : null}
                  <ExcluirReservaButton reserva={detalhe} />
                </div>
              ) : detalhe.profissional_id === user?.id &&
                detalhe.status !== "cancelada" &&
                detalhe.data >= hojeISO() ? (
                <div className="border-t border-border pt-4">
                  <CancelarReservaButton reserva={detalhe} label="Cancelar minha reserva" />
                </div>
              ) : null}
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <ReceiptViewerDialog
        open={!!alvoVisualizacaoComprovante}
        onOpenChange={(v) => !v && setAlvoVisualizacaoComprovante(null)}
        receiptUrl={alvoVisualizacaoComprovante}
      />
    </AppShell>
  );
}
