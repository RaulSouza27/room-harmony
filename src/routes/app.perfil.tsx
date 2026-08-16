import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { SectionCard } from "@/components/common";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useUnidades } from "@/hooks/useApi";

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
  const { user, isAdmin } = useAuth();
  const { data: unidades } = useUnidades();

  return (
    <AppShell title="Meu perfil" description="Dados pessoais e vínculos">
      <div className="max-w-xl">
        <SectionCard title="Informações do cadastro" description="Somente o administrador altera">
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
              <dt className="text-xs text-muted-foreground">Papel / Acesso</dt>
              <dd className="text-card-foreground">{isAdmin ? "Administrador" : "Psicólogo(a)"}</dd>
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
