import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { ConfirmDialog } from "@/components/ReservaActions";
import { EmptyState, ErrorState, LoadingState } from "@/components/common";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
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
import { useDeleteSala, useSalas, useSaveSala, useUnidades } from "@/hooks/useApi";
import type { Sala, SalaStatus } from "@/types";

export const Route = createFileRoute("/app/salas")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Salas — Salas Psi" },
      {
        name: "description",
        content: "Cadastro de salas por unidade com capacidade, recursos e status operacional.",
      },
      { property: "og:title", content: "Salas — Salas Psi" },
      { property: "og:description", content: "Crie e edite salas, recursos e disponibilidade." },
    ],
  }),
  component: SalasPage,
});

const statusLabel: Record<SalaStatus, string> = {
  ativa: "Ativa",
  manutencao: "Em manutenção",
  inativa: "Inativa",
};

function SalasPage() {
  const salasQ = useSalas();
  const { data: unidades } = useUnidades();
  const excluir = useDeleteSala();
  const [open, setOpen] = useState(false);
  const [editando, setEditando] = useState<Sala | null>(null);
  const [alvo, setAlvo] = useState<Sala | null>(null);

  const salas = salasQ.data ?? [];

  return (
    <AppShell
      title="Salas"
      description={`${salas.length} sala(s) cadastrada(s)`}
      actions={
        <Button
          size="sm"
          onClick={() => {
            setEditando(null);
            setOpen(true);
          }}
        >
          Nova sala
        </Button>
      }
    >
      {salasQ.isLoading ? (
        <LoadingState />
      ) : salasQ.error ? (
        <ErrorState message={salasQ.error.message} />
      ) : salas.length === 0 ? (
        <EmptyState title="Nenhuma sala cadastrada" description="Crie a primeira sala." />
      ) : (
        <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {salas.map((s) => (
            <li key={s.id} className="rounded-xl border border-border bg-card p-4 shadow-soft">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-card-foreground">{s.nome}</p>
                  <p className="text-xs text-muted-foreground">
                    {unidades?.find((u) => u.id === s.unidade_id)?.nome ?? "—"} · {s.capacidade}{" "}
                    lugares
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className={
                    s.status === "ativa"
                      ? "border-success/40 bg-success/15 text-success-foreground"
                      : s.status === "manutencao"
                        ? "border-warning/40 bg-warning/15 text-warning-foreground"
                        : "text-muted-foreground"
                  }
                >
                  {statusLabel[s.status]}
                </Badge>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {s.recursos.map((r) => (
                  <Badge key={r} variant="secondary" className="text-xs">
                    {r}
                  </Badge>
                ))}
              </div>
              <div className="mt-4 flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setEditando(s);
                    setOpen(true);
                  }}
                >
                  Editar
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive"
                  onClick={() => setAlvo(s)}
                >
                  Excluir
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <SalaDialog open={open} onOpenChange={setOpen} sala={editando} unidades={unidades ?? []} />

      <ConfirmDialog
        open={!!alvo}
        onOpenChange={(v) => !v && setAlvo(null)}
        title="Excluir esta sala?"
        description="As reservas vinculadas também serão removidas."
        confirmLabel="Excluir"
        destructive
        onConfirm={() => alvo && excluir.mutate(alvo.id)}
      />
    </AppShell>
  );
}

function SalaDialog({
  open,
  onOpenChange,
  sala,
  unidades,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  sala: Sala | null;
  unidades: { id: string; nome: string }[];
}) {
  const salvar = useSaveSala();
  const [nome, setNome] = useState("");
  const [unidadeId, setUnidadeId] = useState("");
  const [capacidade, setCapacidade] = useState(2);
  const [recursos, setRecursos] = useState("");
  const [status, setStatus] = useState<SalaStatus>("ativa");

  useEffect(() => {
    if (!open) return;
    setNome(sala?.nome ?? "");
    setUnidadeId(sala?.unidade_id ?? unidades[0]?.id ?? "");
    setCapacidade(sala?.capacidade ?? 2);
    setRecursos((sala?.recursos ?? []).join(", "));
    setStatus(sala?.status ?? "ativa");
  }, [open, sala, unidades]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{sala ? "Editar sala" : "Nova sala"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome / número</Label>
              <Input
                id="nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                maxLength={60}
              />
            </div>
            <div className="space-y-2">
              <Label>Unidade</Label>
              <Select value={unidadeId} onValueChange={setUnidadeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {unidades.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="cap">Capacidade</Label>
              <Input
                id="cap"
                type="number"
                min={1}
                max={50}
                value={capacidade}
                onChange={(e) => setCapacidade(Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as SalaStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ativa">Ativa</SelectItem>
                  <SelectItem value="manutencao">Em manutenção</SelectItem>
                  <SelectItem value="inativa">Inativa</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="rec">Recursos (separados por vírgula)</Label>
            <Input
              id="rec"
              value={recursos}
              onChange={(e) => setRecursos(e.target.value)}
              placeholder="Maca, Ar-condicionado, Blackout"
              maxLength={200}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            disabled={!nome.trim() || !unidadeId || salvar.isPending}
            onClick={async () => {
              await salvar.mutateAsync({
                ...(sala ? { id: sala.id } : {}),
                nome: nome.trim(),
                unidade_id: unidadeId,
                capacidade,
                status,
                recursos: recursos
                  .split(",")
                  .map((r) => r.trim())
                  .filter(Boolean),
              });
              onOpenChange(false);
            }}
          >
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
