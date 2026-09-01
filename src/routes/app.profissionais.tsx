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
import { useSaveUsuario, useUsuarios, useProfessions, useResetPassword } from "@/hooks/useApi";
import type { Role, User } from "@/types";

export const Route = createFileRoute("/app/profissionais")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Profissionais — Clínica Escuta" },
      {
        name: "description",
        content: "Cadastro de psicólogos e administradores e status.",
      },
      { property: "og:title", content: "Profissionais — Clínica Escuta" },
      { property: "og:description", content: "Crie, edite e ative/inative profissionais." },
    ],
  }),
  component: ProfissionaisPage,
});

function ProfissionaisPage() {
  const usuariosQ = useUsuarios();
  const profissoesQ = useProfessions();
  const salvar = useSaveUsuario();
  const resetarSenha = useResetPassword();
  const [editando, setEditando] = useState<User | null>(null);
  const [open, setOpen] = useState(false);
  const [alvoStatus, setAlvoStatus] = useState<User | null>(null);
  const [alvoReset, setAlvoReset] = useState<User | null>(null);

  const usuarios = usuariosQ.data ?? [];
  const profissoes = profissoesQ.data ?? [];

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
                    {u.professionId ? (
                      <Badge variant="outline" className="border-primary/30 text-primary">
                        {profissoes.find((p) => p.id === u.professionId)?.profission ?? "Profissão"}
                      </Badge>
                    ) : null}
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
                  <p className="mt-1 text-sm text-muted-foreground">{u.email}</p>
                  <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-1 text-xs text-muted-foreground bg-muted/20 p-2.5 rounded-lg border border-border/40">
                    {u.telefone && <div><strong>Telefone:</strong> {u.telefone}</div>}
                    {u.cpf && <div><strong>CPF:</strong> {u.cpf}</div>}
                    {u.boardNumber && <div><strong>Reg. Conselho:</strong> {u.boardNumber}</div>}
                    {u.cep && <div><strong>CEP:</strong> {u.cep}</div>}
                    {u.endereco && <div className="sm:col-span-2 truncate"><strong>Endereço:</strong> {u.endereco}</div>}
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
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-destructive border-destructive/20 hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => setAlvoReset(u)}
                  >
                    Resetar Senha
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

      <ProfissionalDialog open={open} onOpenChange={setOpen} usuario={editando} />

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

      <ConfirmDialog
        open={!!alvoReset}
        onOpenChange={(v) => !v && setAlvoReset(null)}
        title="Resetar senha?"
        description={
          alvoReset
            ? `TEM CERTEZA que quer resetar a senha desse profissional (${alvoReset.nome})?`
            : ""
        }
        confirmLabel="Resetar"
        destructive
        onConfirm={() => {
          if (alvoReset) {
            resetarSenha.mutate(alvoReset.id);
            setAlvoReset(null);
          }
        }}
      />
    </AppShell>
  );
}

function ProfissionalDialog({
  open,
  onOpenChange,
  usuario,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  usuario: User | null;
}) {
  const salvar = useSaveUsuario();
  const profissoesQ = useProfessions();
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [papel, setPapel] = useState<Role>("PSICOLOGO");
  const [status, setStatus] = useState<"ativo" | "inativo">("ativo");
  const [professionId, setProfessionId] = useState<string>("0");
  const [phone, setPhone] = useState("");
  const [cpf, setCpf] = useState("");
  const [endereco, setEndereco] = useState("");
  const [cep, setCep] = useState("");
  const [boardNumber, setBoardNumber] = useState("");
  const [photo, setPhoto] = useState("");

  useEffect(() => {
    if (!open) return;
    setNome(usuario?.nome ?? "");
    setEmail(usuario?.email ?? "");
    setPapel(usuario?.papel ?? "PSICOLOGO");
    setStatus(usuario?.status ?? "ativo");
    setProfessionId(usuario?.professionId ? String(usuario.professionId) : "0");
    setPhone(usuario?.telefone ?? "");
    setCpf(usuario?.cpf ?? "");
    setEndereco(usuario?.endereco ?? "");
    setCep(usuario?.cep ?? "");
    setBoardNumber(usuario?.boardNumber ?? "");
    setPhoto(usuario?.foto ?? "");
  }, [open, usuario]);

  const cleanCpf = cpf.replace(/\D/g, "");
  const cleanCep = cep.replace(/\D/g, "");

  const valido =
    nome.trim().length > 2 &&
    /\S+@\S+\.\S+/.test(email) &&
    (cleanCpf.length === 0 || cleanCpf.length === 11) &&
    (cleanCep.length === 0 || cleanCep.length === 8);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{usuario ? "Editar profissional" : "Novo profissional"}</DialogTitle>
          <DialogDescription>
            {usuario ? "Atualize os dados do usuário." : "A senha inicial padrão é psi123."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex flex-col items-center justify-center gap-2 mb-2">
            <Label className="text-xs font-semibold text-muted-foreground">Foto de Perfil</Label>
            <div className="relative group size-20 rounded-full border border-border overflow-hidden bg-muted flex items-center justify-center shadow-soft">
              {photo ? (
                <>
                  <img src={photo} alt="Foto de perfil" className="size-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setPhoto("")}
                    className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-semibold cursor-pointer"
                  >
                    Remover
                  </button>
                </>
              ) : (
                <label className="cursor-pointer size-full flex flex-col items-center justify-center text-[10px] text-muted-foreground hover:text-foreground">
                  <span>Adicionar</span>
                  <span>Foto</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        try {
                          const base64 = await fileToBase64(file);
                          setPhoto(base64);
                        } catch (err) {
                          console.error(err);
                        }
                      }
                    }}
                  />
                </label>
              )}
            </div>
          </div>

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
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                maxLength={20}
                placeholder="(00) 00000-0000"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="cpf">CPF</Label>
              <Input
                id="cpf"
                value={cpf}
                onChange={(e) => setCpf(e.target.value)}
                maxLength={14}
                placeholder="000.000.000-00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="boardNumber">Registro do Conselho (CRP/etc)</Label>
              <Input
                id="boardNumber"
                value={boardNumber}
                onChange={(e) => setBoardNumber(e.target.value)}
                maxLength={11}
                placeholder="Ex: CRP-00000"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="cep">CEP</Label>
              <Input
                id="cep"
                value={cep}
                onChange={(e) => setCep(e.target.value)}
                maxLength={9}
                placeholder="00000-000"
              />
            </div>
            <div className="col-span-2 space-y-2">
              <Label htmlFor="endereco">Endereço</Label>
              <Input
                id="endereco"
                value={endereco}
                onChange={(e) => setEndereco(e.target.value)}
                maxLength={50}
                placeholder="Rua, número, complemento"
              />
            </div>
          </div>

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
          {papel === "PSICOLOGO" && (
            <div className="space-y-2">
              <Label>Profissão</Label>
              <Select value={professionId} onValueChange={setProfessionId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma profissão" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Nenhuma</SelectItem>
                  {(profissoesQ.data ?? []).map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.profission}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as "ativo" | "inativo")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ativo">Ativo</SelectItem>
                <SelectItem value="inativo">Inativo</SelectItem>
              </SelectContent>
            </Select>
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
                papel,
                status,
                professionId: papel === "PSICOLOGO" && professionId !== "0" ? Number(professionId) : null,
                telefone: phone.trim(),
                cpf: cleanCpf,
                endereco: endereco.trim(),
                cep: cleanCep,
                boardNumber: boardNumber.trim(),
                foto: photo,
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

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
}
