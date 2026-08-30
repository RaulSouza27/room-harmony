import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import {
  AprovacaoActions,
  CancelarReservaButton,
  ExcluirReservaButton,
  ConfirmDialog,
} from "@/components/ReservaActions";
import { ReservaFormDialog } from "@/components/ReservaFormDialog";
import { EmptyState, ErrorState, LoadingState, StatusBadge } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useReservas, useSalas, useUnidades, useUsuarios, useDeleteReservasBatch } from "@/hooks/useApi";
import { formatarData } from "@/lib/format";
import type { Reserva } from "@/types";

export const Route = createFileRoute("/app/reservas")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Todas as reservas — Clínica Escuta" },
      {
        name: "description",
        content: "Gestão completa das reservas: filtros por unidade, sala, profissional e período.",
      },
      { property: "og:title", content: "Todas as reservas — Clínica Escuta" },
      {
        property: "og:description",
        content: "Edite, cancele ou exclua reservas de qualquer profissional.",
      },
    ],
  }),
  component: ReservasPage,
});

function ReservasPage() {
  const reservasQ = useReservas();
  const salasQ = useSalas();
  const unidadesQ = useUnidades();
  const usuariosQ = useUsuarios();

  const [unidade, setUnidade] = useState("todas");
  const [sala, setSala] = useState("todas");
  const [profissional, setProfissional] = useState("todos");
  const [status, setStatus] = useState("todos");
  const [de, setDe] = useState("");
  const [ate, setAte] = useState("");
  const [criar, setCriar] = useState(false);
  const [editando, setEditando] = useState<Reserva | null>(null);
  const [alvoVisualizacaoComprovante, setAlvoVisualizacaoComprovante] = useState<string | null>(
    null,
  );
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [confirmBatchDelete, setConfirmBatchDelete] = useState(false);
  const excluirLote = useDeleteReservasBatch();

  const reservas = reservasQ.data ?? [];
  const salas = salasQ.data ?? [];
  const unidades = unidadesQ.data ?? [];
  const usuarios = usuariosQ.data ?? [];

  const lista = reservas
    .filter((r) => unidade === "todas" || r.unidade_id === unidade)
    .filter((r) => sala === "todas" || r.sala_id === sala)
    .filter((r) => profissional === "todos" || r.profissional_id === profissional)
    .filter((r) => status === "todos" || r.status === status)
    .filter((r) => !de || r.data >= de)
    .filter((r) => !ate || r.data <= ate)
    .sort((a, b) => (b.data + b.hora_inicio).localeCompare(a.data + a.hora_inicio));

  const handleBatchDelete = async () => {
    await excluirLote.mutateAsync(selectedIds);
    setSelectedIds([]);
    setConfirmBatchDelete(false);
  };

  return (
    <AppShell
      title="Todas as reservas"
      description={`${lista.length} registro(s)`}
      actions={
        <div className="flex gap-2">
          {selectedIds.length > 0 && (
            <Button
              size="sm"
              variant="destructive"
              onClick={() => setConfirmBatchDelete(true)}
              disabled={excluirLote.isPending}
            >
              Excluir {selectedIds.length} selecionada(s)
            </Button>
          )}
          <Button size="sm" onClick={() => setCriar(true)}>
            Nova reserva
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        <div className="grid gap-4 rounded-xl border border-border bg-card p-4 shadow-soft md:grid-cols-3 xl:grid-cols-6">
          <div className="space-y-2">
            <Label>Unidade</Label>
            <Select
              value={unidade}
              onValueChange={(v) => {
                setUnidade(v);
                setSala("todas");
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas</SelectItem>
                {unidades.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Sala</Label>
            <Select value={sala} onValueChange={setSala}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas</SelectItem>
                {salas
                  .filter((s) => unidade === "todas" || s.unidade_id === unidade)
                  .map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.nome}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Profissional</Label>
            <Select value={profissional} onValueChange={setProfissional}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {usuarios
                  .filter((u) => u.status === "ativo")
                  .map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.nome}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="pendente">Pendente</SelectItem>
                <SelectItem value="aprovada">Aprovada</SelectItem>
                <SelectItem value="negada">Negada</SelectItem>
                <SelectItem value="cancelada">Cancelada</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="de">De</Label>
            <Input id="de" type="date" value={de} onChange={(e) => setDe(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ate">Até</Label>
            <Input id="ate" type="date" value={ate} onChange={(e) => setAte(e.target.value)} />
          </div>
        </div>

        {reservasQ.isLoading ? (
          <LoadingState />
        ) : reservasQ.error ? (
          <ErrorState message={reservasQ.error.message} />
        ) : lista.length === 0 ? (
          <EmptyState title="Nenhuma reserva encontrada" description="Ajuste os filtros acima." />
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2 px-4 py-3 bg-muted/30 border border-border rounded-xl text-sm justify-between shadow-soft">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="select-all"
                  checked={selectedIds.length === lista.length && lista.length > 0}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setSelectedIds(lista.map((r) => r.id));
                    } else {
                      setSelectedIds([]);
                    }
                  }}
                />
                <Label htmlFor="select-all" className="cursor-pointer font-medium text-foreground select-none">
                  Selecionar todas as {lista.length} reservas filtradas
                </Label>
              </div>
              {selectedIds.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedIds([])}
                  className="text-xs text-primary hover:underline font-semibold"
                >
                  Limpar seleção
                </button>
              )}
            </div>

            <ul className="space-y-3">
              {lista.map((r) => {
                const isSelected = selectedIds.includes(r.id);
                return (
                  <li
                    key={r.id}
                    className={`rounded-xl border p-4 shadow-soft transition-colors flex gap-4 items-start ${
                      isSelected
                        ? "border-primary/45 bg-primary/5"
                        : "border-border bg-card"
                    }`}
                  >
                    <Checkbox
                      className="mt-1"
                      checked={isSelected}
                      onCheckedChange={(checked) => {
                        setSelectedIds((prev) =>
                          checked ? [...prev, r.id] : prev.filter((id) => id !== r.id),
                        );
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-semibold text-card-foreground">
                              {usuarios.find((u) => u.id === r.profissional_id)?.nome ?? "—"}
                            </p>
                            <StatusBadge status={r.status} />
                          </div>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {salas.find((s) => s.id === r.sala_id)?.nome ?? "—"} ·{" "}
                            {unidades.find((u) => u.id === r.unidade_id)?.nome ?? "—"} ·{" "}
                            {formatarData(r.data)} · {r.hora_inicio}–{r.hora_fim}
                          </p>
                          {r.motivo_negacao ? (
                            <p className="mt-1 text-xs text-destructive">Negada: {r.motivo_negacao}</p>
                          ) : null}
                          {r.comprovante && r.comprovante !== "empty" ? (
                            <span
                              className="text-xs text-primary underline cursor-pointer inline-flex items-center gap-1 mt-1 block"
                              onClick={() => {
                                setAlvoVisualizacaoComprovante(r.comprovante!);
                              }}
                            >
                              📄 Ver comprovante de pagamento
                            </span>
                          ) : null}
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          {r.status === "pendente" ? (
                            <AprovacaoActions reserva={r} reservas={reservas} compact />
                          ) : null}
                          <Button size="sm" variant="outline" onClick={() => setEditando(r)}>
                            Editar
                          </Button>
                          {r.status !== "cancelada" ? <CancelarReservaButton reserva={r} /> : null}
                          <ExcluirReservaButton reserva={r} />
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>

      <ReservaFormDialog
        open={criar}
        onOpenChange={setCriar}
        unidades={unidades}
        salas={salas}
        usuarios={usuarios}
        reservas={reservas}
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
      <ConfirmDialog
        open={confirmBatchDelete}
        onOpenChange={setConfirmBatchDelete}
        title={`Excluir ${selectedIds.length} reserva(s) definitivamente?`}
        description="Esta ação removerá todas as reservas selecionadas e não poderá ser desfeita."
        confirmLabel="Excluir"
        destructive
        onConfirm={handleBatchDelete}
      />
    </AppShell>
  );
}
