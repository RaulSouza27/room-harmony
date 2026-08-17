import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { ConfirmDialog } from "@/components/ReservaActions";
import { EmptyState, ErrorState, LoadingState } from "@/components/common";
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
import { useDeleteProfession, useProfessions, useSaveProfession } from "@/hooks/useApi";
import type { Profession } from "@/types";

export const Route = createFileRoute("/app/profissoes")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Profissões — Clínica Escuta" },
      {
        name: "description",
        content: "Cadastro e gestão das profissões aceitas na clínica.",
      },
      { property: "og:title", content: "Profissões — Clínica Escuta" },
      { property: "og:description", content: "Gerencie a lista de profissões." },
    ],
  }),
  component: ProfissoesPage,
});

function ProfissoesPage() {
  const profissoesQ = useProfessions();
  const excluir = useDeleteProfession();
  const [open, setOpen] = useState(false);
  const [editando, setEditando] = useState<Profession | null>(null);
  const [alvo, setAlvo] = useState<Profession | null>(null);
  const [busca, setBusca] = useState("");

  const profissoes = profissoesQ.data ?? [];
  const filtradas = profissoes.filter((p) =>
    p.profission.toLowerCase().includes(busca.toLowerCase()),
  );

  return (
    <AppShell
      title="Profissões"
      description={`${profissoes.length} profissão(ões) cadastrada(s)`}
      actions={
        <Button
          size="sm"
          onClick={() => {
            setEditando(null);
            setOpen(true);
          }}
        >
          Nova profissão
        </Button>
      }
    >
      <div className="space-y-4">
        <div className="max-w-xs">
          <Input
            placeholder="Buscar profissão..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>

        {profissoesQ.isLoading ? (
          <LoadingState />
        ) : profissoesQ.error ? (
          <ErrorState message={profissoesQ.error.message} />
        ) : filtradas.length === 0 ? (
          <EmptyState
            title={busca ? "Nenhuma profissão encontrada" : "Nenhuma profissão cadastrada"}
            description={busca ? "Tente buscar por outro termo." : "Cadastre uma nova profissão."}
          />
        ) : (
          <ul className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {filtradas.map((p) => (
              <li key={p.id} className="rounded-xl border border-border bg-card p-4 shadow-soft">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-card-foreground">{p.profission}</p>
                    <p className="text-xs text-muted-foreground">ID: {p.id}</p>
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditando(p);
                      setOpen(true);
                    }}
                  >
                    Editar
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive"
                    onClick={() => setAlvo(p)}
                  >
                    Excluir
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <ProfissaoDialog open={open} onOpenChange={setOpen} profissao={editando} />

      <ConfirmDialog
        open={!!alvo}
        onOpenChange={(v) => !v && setAlvo(null)}
        title="Excluir esta profissão?"
        description="Esta ação removerá a profissão permanentemente."
        confirmLabel="Excluir"
        destructive
        onConfirm={() => alvo && excluir.mutate(alvo.id)}
      />
    </AppShell>
  );
}

function ProfissaoDialog({
  open,
  onOpenChange,
  profissao,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  profissao: Profession | null;
}) {
  const salvar = useSaveProfession();
  const [nome, setNome] = useState("");

  useEffect(() => {
    if (!open) return;
    setNome(profissao?.profission ?? "");
  }, [open, profissao]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{profissao ? "Editar profissão" : "Nova profissão"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nome">Nome da Profissão</Label>
            <Input
              id="nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              maxLength={80}
              placeholder="Ex: Psicólogo(a)"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            disabled={!nome.trim() || salvar.isPending}
            onClick={async () => {
              await salvar.mutateAsync({
                ...(profissao ? { id: profissao.id } : {}),
                profission: nome.trim(),
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
