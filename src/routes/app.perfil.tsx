import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { AppShell } from "@/components/AppShell";
import { SectionCard } from "@/components/common";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { useUnidades, useChangePassword, useProfessions, useSaveUsuario } from "@/hooks/useApi";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/app/perfil")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Meu perfil — Clínica Escuta" },
      { name: "description", content: "Visualizar dados do seu perfil na clínica." },
      { property: "og:title", content: "Meu perfil — Clínica Escuta" },
      { property: "og:description", content: "Dados pessoais e unidades vinculadas." },
    ],
  }),
  component: PerfilPage,
});

function PerfilPage() {
  const { user, isAdmin, refresh } = useAuth();
  const { data: unidades } = useUnidades();
  const { data: profissoes } = useProfessions();
  const salvar = useSaveUsuario();
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const alterarSenha = useChangePassword();

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [cpf, setCpf] = useState("");
  const [endereco, setEndereco] = useState("");
  const [cep, setCep] = useState("");
  const [boardNumber, setBoardNumber] = useState("");
  const [photo, setPhoto] = useState("");
  const [professionId, setProfessionId] = useState("0");

  useEffect(() => {
    if (!editDialogOpen || !user) return;
    setNome(user.nome ?? "");
    setEmail(user.email ?? "");
    setPhone(user.telefone ?? "");
    setCpf(user.cpf ?? "");
    setEndereco(user.endereco ?? "");
    setCep(user.cep ?? "");
    setBoardNumber(user.boardNumber ?? "");
    setPhoto(user.foto ?? "");
    setProfessionId(user.professionId ? String(user.professionId) : "0");
  }, [editDialogOpen, user]);

  const cleanCpf = cpf.replace(/\D/g, "");
  const cleanCep = cep.replace(/\D/g, "");

  const editValido =
    nome.trim().length > 2 &&
    /\S+@\S+\.\S+/.test(email) &&
    (cleanCpf.length === 0 || cleanCpf.length === 11) &&
    (cleanCep.length === 0 || cleanCep.length === 8);

  const handleProfileSave = async () => {
    if (!user) return;
    try {
      await salvar.mutateAsync({
        id: user.id,
        nome: nome.trim(),
        email: email.trim(),
        telefone: phone.trim(),
        cpf: cleanCpf,
        endereco: endereco.trim(),
        cep: cleanCep,
        boardNumber: boardNumber.trim(),
        foto: photo,
        professionId: professionId !== "0" ? Number(professionId) : null,
      });
      await refresh();
      setEditDialogOpen(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handlePasswordChange = async () => {
    if (!user) return;
    if (newPassword !== confirmPassword) return;
    try {
      await alterarSenha.mutateAsync({ id: user.id, password: newPassword });
      setPasswordDialogOpen(false);
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      console.error(err);
    }
  };

  const errorMsg =
    newPassword.length > 0 && newPassword.length < 6
      ? "A senha deve ter pelo menos 6 caracteres."
      : newPassword.length >= 6 && confirmPassword.length > 0 && newPassword !== confirmPassword
        ? "As senhas não coincidem."
        : "";

  return (
    <AppShell title="Meu perfil" description="Dados pessoais e vínculos">
      <div className="max-w-xl">
        <SectionCard title="Informações do cadastro">
          <div className="flex flex-col items-center gap-4 border-b border-border pb-6 mb-6">
            <Avatar className="size-20">
              {user?.foto ? <AvatarImage src={user.foto} alt={user?.nome ?? ""} /> : null}
              <AvatarFallback className="text-xl">
                {user?.nome
                  .split(" ")
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join("")}
              </AvatarFallback>
            </Avatar>
            <div className="text-center">
              <h2 className="text-lg font-semibold text-card-foreground">{user?.nome}</h2>
              <p className="text-xs text-muted-foreground">
                {isAdmin ? "Administrador" : "Psicólogo(a)"}
              </p>
            </div>
          </div>

          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-xs text-muted-foreground">Nome completo</dt>
              <dd className="font-medium text-card-foreground">{user?.nome}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">E-mail</dt>
              <dd className="text-card-foreground">{user?.email}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Telefone</dt>
              <dd className="text-card-foreground">{user?.telefone || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">CPF</dt>
              <dd className="text-card-foreground">{user?.cpf || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Registro do Conselho (CRP/etc)</dt>
              <dd className="text-card-foreground">{user?.boardNumber || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">CEP</dt>
              <dd className="text-card-foreground">{user?.cep || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Endereço</dt>
              <dd className="text-card-foreground">{user?.endereco || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Papel / Acesso</dt>
              <dd className="text-card-foreground">{isAdmin ? "Administrador" : "Psicólogo(a)"}</dd>
            </div>
            {user?.professionId ? (
              <div>
                <dt className="text-xs text-muted-foreground">Profissão</dt>
                <dd className="text-card-foreground font-medium text-primary">
                  {profissoes?.find((p) => p.id === user.professionId)?.profission ?? "—"}
                </dd>
              </div>
            ) : null}
            <div>
              <dt className="text-xs text-muted-foreground">Status da conta</dt>
              <dd className="mt-1">
                <Badge
                  variant="outline"
                  className={
                    user?.status === "ativo"
                      ? "border-success/40 bg-success/15 text-success-foreground"
                      : "text-muted-foreground"
                  }
                >
                  {user?.status === "ativo" ? "Ativo" : "Inativo"}
                </Badge>
              </dd>
            </div>
            {user?.especialidade ? (
              <div>
                <dt className="text-xs text-muted-foreground">Especialidade</dt>
                <dd className="text-card-foreground">{user.especialidade}</dd>
              </div>
            ) : null}
            <div>
              <dt className="text-xs text-muted-foreground">Unidades vinculadas</dt>
              <dd className="mt-1 flex flex-wrap gap-1.5">
                {(user?.unidades ?? []).map((id) => (
                  <Badge key={id} variant="secondary">
                    {unidades?.find((u) => u.id === id)?.nome ?? id}
                  </Badge>
                ))}
              </dd>
            </div>
          </dl>

          <div className="mt-6 pt-4 border-t border-border flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditDialogOpen(true)}>
              ✏️ Editar Perfil
            </Button>
            <Button variant="outline" size="sm" onClick={() => setPasswordDialogOpen(true)}>
              🔒 Alterar Senha
            </Button>
          </div>
        </SectionCard>
      </div>

      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Alterar minha senha</DialogTitle>
            <DialogDescription>
              Digite a sua nova senha abaixo para atualizá-la.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="new-password">Nova Senha</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirmar Nova Senha</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repita a nova senha"
              />
            </div>
            {errorMsg && (
              <p className="text-xs font-semibold text-destructive">
                {errorMsg}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPasswordDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              disabled={
                newPassword.length < 6 ||
                newPassword !== confirmPassword ||
                alterarSenha.isPending
              }
              onClick={handlePasswordChange}
            >
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Informações do Perfil</DialogTitle>
            <DialogDescription>
              Atualize as suas informações pessoais abaixo.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
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
                            const base64 = await fileToBase64Helper(file);
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
              <Label htmlFor="edit-nome">Nome completo</Label>
              <Input
                id="edit-nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                maxLength={100}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="edit-email">E-mail</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  maxLength={255}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-phone">Telefone</Label>
                <Input
                  id="edit-phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  maxLength={20}
                  placeholder="(00) 00000-0000"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="edit-cpf">CPF</Label>
                <Input
                  id="edit-cpf"
                  value={cpf}
                  onChange={(e) => setCpf(e.target.value)}
                  maxLength={14}
                  placeholder="000.000.000-00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-boardNumber">Registro do Conselho (CRP/etc)</Label>
                <Input
                  id="edit-boardNumber"
                  value={boardNumber}
                  onChange={(e) => setBoardNumber(e.target.value)}
                  maxLength={11}
                  placeholder="Ex: CRP-00000"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="edit-cep">CEP</Label>
                <Input
                  id="edit-cep"
                  value={cep}
                  onChange={(e) => setCep(e.target.value)}
                  maxLength={9}
                  placeholder="00000-000"
                />
              </div>
              <div className="col-span-2 space-y-2">
                <Label htmlFor="edit-endereco">Endereço</Label>
                <Input
                  id="edit-endereco"
                  value={endereco}
                  onChange={(e) => setEndereco(e.target.value)}
                  maxLength={50}
                  placeholder="Rua, número, complemento"
                />
              </div>
            </div>

            {!isAdmin && (
              <div className="space-y-2">
                <Label>Profissão</Label>
                <Select value={professionId} onValueChange={setProfessionId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma profissão" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Nenhuma</SelectItem>
                    {(profissoes ?? []).map((p) => (
                      <SelectItem key={p.id} value={String(p.id)}>
                        {p.profission}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              disabled={!editValido || salvar.isPending}
              onClick={handleProfileSave}
            >
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

function fileToBase64Helper(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
}
