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
import { useDeleteUnidade, useSalas, useSaveUnidade, useUnidades } from "@/hooks/useApi";
import type { Unidade } from "@/types";

export const Route = createFileRoute("/app/unidades")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Unidades — Salas Psi" },
      {
        name: "description",
        content: "Cadastro das unidades da clínica: endereço, status e salas vinculadas.",
      },
      { property: "og:title", content: "Unidades — Salas Psi" },
      { property: "og:description", content: "Gerencie as unidades onde as salas estão alocadas." },
    ],
  }),
  component: UnidadesPage,
});

function UnidadesPage() {
  const unidadesQ = useUnidades();
  const { data: salas } = useSalas();
  const excluir = useDeleteUnidade();
  const [open, setOpen] = useState(false);
  const [editando, setEditando] = useState<Unidade | null>(null);
  const [alvo, setAlvo] = useState<Unidade | null>(null);

  const unidades = unidadesQ.data ?? [];

  return (
    <AppShell
      title="Unidades"
      description={`${unidades.length} unidade(s)`}
      actions={
        <Button
          size="sm"
          onClick={() => {
            setEditando(null);
            setOpen(true);
          }}
        >
          Nova unidade
        </Button>
      }
    >
      {unidadesQ.isLoading ? (
        <LoadingState />
      ) : unidadesQ.error ? (
        <ErrorState message={unidadesQ.error.message} />
      ) : unidades.length === 0 ? (
        <EmptyState title="Nenhuma unidade cadastrada" />
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {unidades.map((u) => (
            <li key={u.id} className="rounded-xl border border-border bg-card p-4 shadow-soft">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-card-foreground">{u.nome}</p>
                  <p className="text-xs text-muted-foreground">{u.endereco}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {(salas ?? []).filter((s) => s.unidade_id === u.id).length} sala(s)
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className={
                    u.status === "ativa"
                      ? "border-success/40 bg-success/15 text-success-foreground"
                      : "text-muted-foreground"
                  }
                >
                  {u.status === "ativa" ? "Ativa" : "Inativa"}
                </Badge>
              </div>
              <div className="mt-4 flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setEditando(u);
                    setOpen(true);
                  }}
                >
                  Editar
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive"
                  onClick={() => setAlvo(u)}
                >
                  Excluir
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <UnidadeDialog open={open} onOpenChange={setOpen} unidade={editando} />

      <ConfirmDialog
        open={!!alvo}
        onOpenChange={(v) => !v && setAlvo(null)}
        title="Excluir esta unidade?"
        description="Só é possível excluir unidades sem salas vinculadas."
        confirmLabel="Excluir"
        destructive
        onConfirm={() => alvo && excluir.mutate(alvo.id)}
      />
    </AppShell>
  );
}

function UnidadeDialog({
  open,
  onOpenChange,
  unidade,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  unidade: Unidade | null;
}) {
  const salvar = useSaveUnidade();
  const [nome, setNome] = useState("");
  const [endereco, setEndereco] = useState("");
  const [status, setStatus] = useState<"ativa" | "inativa">("ativa");

  useEffect(() => {
    if (!open) return;
    setNome(unidade?.nome ?? "");
    setEndereco(unidade?.endereco ?? "");
    setStatus(unidade?.status ?? "ativa");
  }, [open, unidade]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{unidade ? "Editar unidade" : "Nova unidade"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nome">Nome</Label>
            <Input
              id="nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              maxLength={80}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="end">Endereço</Label>
            <Input
              id="end"
              value={endereco}
              onChange={(e) => setEndereco(e.target.value)}
              maxLength={160}
            />
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as "ativa")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ativa">Ativa</SelectItem>
                <SelectItem value="inativa">Inativa</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            disabled={!nome.trim() || !endereco.trim() || salvar.isPending}
            onClick={async () => {
              await salvar.mutateAsync({
                ...(unidade ? { id: unidade.id } : {}),
                nome: nome.trim(),
                endereco: endereco.trim(),
                status,
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
