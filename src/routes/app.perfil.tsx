import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { SectionCard } from "@/components/common";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { useUnidades } from "@/hooks/useApi";
import * as api from "@/services/api";

export const Route = createFileRoute("/app/perfil")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Meu perfil — Clínica Serena" },
      { name: "description", content: "Atualize telefone e foto do seu perfil na clínica." },
      { property: "og:title", content: "Meu perfil — Clínica Serena" },
      { property: "og:description", content: "Dados pessoais e unidades vinculadas." },
    ],
  }),
  component: PerfilPage,
});

function PerfilPage() {
  const { user, refresh, isAdmin } = useAuth();
  const { data: unidades } = useUnidades();
  const [telefone, setTelefone] = useState(user?.telefone ?? "");
  const [foto, setFoto] = useState(user?.foto ?? "");
  const [salvando, setSalvando] = useState(false);

  async function salvar() {
    if (!user) return;
    if (telefone.trim().length < 8) {
      toast.error("Informe um telefone válido.");
      return;
    }
    setSalvando(true);
    try {
      await api.saveUsuario({ id: user.id, telefone: telefone.trim(), foto: foto.trim() });
      await refresh();
      toast.success("Perfil atualizado.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <AppShell title="Meu perfil" description="Dados pessoais e vínculos">
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <SectionCard title="Dados editáveis" description="Telefone e foto de perfil">
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="size-14">
                  {foto ? <AvatarImage src={foto} alt={user?.nome ?? ""} /> : null}
                  <AvatarFallback>
                    {user?.nome
                      .split(" ")
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join("")}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-2">
                  <Label htmlFor="foto">URL da foto</Label>
                  <Input
                    id="foto"
                    value={foto}
                    onChange={(e) => setFoto(e.target.value)}
                    placeholder="https://..."
                    maxLength={500}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="telefone">Telefone</Label>
                <Input
                  id="telefone"
                  value={telefone}
                  onChange={(e) => setTelefone(e.target.value)}
                  maxLength={20}
                />
              </div>
              <Button onClick={salvar} disabled={salvando}>
                Salvar alterações
              </Button>
            </div>
          </SectionCard>
        </div>

        <SectionCard title="Informações do cadastro" description="Somente o administrador altera">
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-xs text-muted-foreground">Nome</dt>
              <dd className="font-medium text-card-foreground">{user?.nome}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">E-mail</dt>
              <dd className="text-card-foreground">{user?.email}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Papel</dt>
              <dd>{isAdmin ? "Administrador" : "Psicólogo(a)"}</dd>
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
        </SectionCard>
      </div>
    </AppShell>
  );
}
