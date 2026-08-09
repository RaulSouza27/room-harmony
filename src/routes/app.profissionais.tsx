import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { ConfirmDialog } from "@/components/ReservaActions";
import { EmptyState, ErrorState, LoadingState } from "@/components/common";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { useSaveUsuario, useUnidades, useUsuarios } from "@/hooks/useApi";
import type { Role, User } from "@/types";

export const Route = createFileRoute("/app/profissionais")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Profissionais — Salas Psi" },
      {
        name: "description",
        content: "Cadastro de psicólogos e administradores, unidades de acesso e status.",
      },
      { property: "og:title", content: "Profissionais — Salas Psi" },
      { property: "og:description", content: "Crie, edite e ative/inative profissionais." },
    ],
  }),
  component: ProfissionaisPage,
});

function ProfissionaisPage() {
  const usuariosQ = useUsuarios();
  const { data: unidades } = useUnidades();
  const salvar = useSaveUsuario();
  const [editando, setEditando] = useState<User | null>(null);
  const [open, setOpen] = useState(false);
  const [alvoStatus, setAlvoStatus] = useState<User | null>(null);

  const usuarios = usuariosQ.data ?? [];

  return (
    <AppShell
      title="Profissionais"
      description={`${usuarios.length} usuário(s) cadastrado(s)`}
      actions={
        <Button
          size="sm"
          onClick={() => {
            setEditando(null);
            setOpen(true);
          }}
        >
          Novo profissional
        </Button>
      }
    >
      {usuariosQ.isLoading ? (
        <LoadingState />
      ) : usuariosQ.error ? (
        <ErrorState message={usuariosQ.error.message} />
      ) : usuarios.length === 0 ? (
        <EmptyState title="Nenhum profissional cadastrado" />
      ) : (
        <ul className="space-y-3">
          {usuarios.map((u) => (
            <li key={u.id} className="rounded-xl border border-border bg-card p-4 shadow-soft">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-card-foreground">{u.nome}</p>
                    <Badge variant="secondary">
                      {u.papel === "ADMINISTRADOR" ? "Administrador" : "Psicólogo(a)"}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={
                        u.status === "ativo"
                          ? "border-success/40 bg-success/15 text-success-foreground"
                          : "text-muted-foreground"
                      }
                    >
                      {u.status === "ativo" ? "Ativo" : "Inativo"}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {u.email} · {u.telefone}
                    {u.especialidade ? ` · ${u.especialidade}` : ""}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {u.unidades.map((id) => (
                      <Badge key={id} variant="outline" className="text-xs">
                        {unidades?.find((x) => x.id === id)?.nome ?? id}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
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
                  <Button size="sm" variant="ghost" onClick={() => setAlvoStatus(u)}>
                    {u.status === "ativo" ? "Inativar" : "Ativar"}
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <ProfissionalDialog
        open={open}
        onOpenChange={setOpen}
        usuario={editando}
        unidades={unidades ?? []}
      />

      <ConfirmDialog
        open={!!alvoStatus}
        onOpenChange={(v) => !v && setAlvoStatus(null)}
        title={alvoStatus?.status === "ativo" ? "Inativar profissional?" : "Ativar profissional?"}
        description={
          alvoStatus?.status === "ativo"
            ? "O profissional perderá o acesso ao sistema."
            : "O profissional voltará a acessar o sistema."
        }
        onConfirm={() =>
          alvoStatus &&
          salvar.mutate({
            id: alvoStatus.id,
            status: alvoStatus.status === "ativo" ? "inativo" : "ativo",
          })
        }
      />
    </AppShell>
  );
}

function ProfissionalDialog({
  open,
  onOpenChange,
  usuario,
  unidades,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  usuario: User | null;
  unidades: { id: string; nome: string }[];
}) {
  const salvar = useSaveUsuario();
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [especialidade, setEspecialidade] = useState("");
  const [papel, setPapel] = useState<Role>("PSICOLOGO");
  const [vinculos, setVinculos] = useState<string[]>([]);

  useEffect(() => {
    if (!open) return;
    setNome(usuario?.nome ?? "");
    setEmail(usuario?.email ?? "");
    setTelefone(usuario?.telefone ?? "");
    setEspecialidade(usuario?.especialidade ?? "");
    setPapel(usuario?.papel ?? "PSICOLOGO");
    setVinculos(usuario?.unidades ?? []);
  }, [open, usuario]);

  const valido = nome.trim().length > 2 && /\S+@\S+\.\S+/.test(email);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{usuario ? "Editar profissional" : "Novo profissional"}</DialogTitle>
          <DialogDescription>
            {usuario ? "Atualize os dados do usuário." : "A senha inicial padrão é psi123."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nome">Nome completo</Label>
            <Input
              id="nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              maxLength={100}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                maxLength={255}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tel">Telefone</Label>
              <Input
                id="tel"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                maxLength={20}
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Papel</Label>
              <Select value={papel} onValueChange={(v) => setPapel(v as Role)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PSICOLOGO">Psicólogo(a)</SelectItem>
                  <SelectItem value="ADMINISTRADOR">Administrador</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="esp">Especialidade</Label>
              <Input
                id="esp"
                value={especialidade}
                onChange={(e) => setEspecialidade(e.target.value)}
                maxLength={80}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Unidades de acesso</Label>
            <div className="space-y-2 rounded-lg border border-border p-3">
              {unidades.map((u) => (
                <label key={u.id} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={vinculos.includes(u.id)}
                    onCheckedChange={(c) =>
                      setVinculos((prev) =>
                        c ? [...prev, u.id] : prev.filter((id) => id !== u.id),
                      )
                    }
                  />
                  {u.nome}
                </label>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            disabled={!valido || salvar.isPending}
            onClick={async () => {
              await salvar.mutateAsync({
                ...(usuario ? { id: usuario.id } : {}),
                nome: nome.trim(),
                email: email.trim(),
                telefone: telefone.trim(),
                especialidade: especialidade.trim() || undefined,
                papel,
                unidades: vinculos,
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
