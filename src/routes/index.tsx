import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2, Stethoscope } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Entrar — Clínica Serena Gestão de Salas" },
      {
        name: "description",
        content:
          "Acesse o sistema de gestão de salas da Clínica Serena para consultar disponibilidade e solicitar reservas.",
      },
      { property: "og:title", content: "Entrar — Clínica Serena Gestão de Salas" },
      {
        property: "og:description",
        content: "Login para psicólogos e administradores da Clínica Serena.",
      },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { user, loading, signIn, signInBypass } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function handleBypass(papel: "ADMINISTRADOR" | "PSICOLOGO") {
    setErro(null);
    setEnviando(true);
    try {
      await signInBypass(papel);
      navigate({ to: "/app/dashboard", replace: true });
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Falha no bypass.");
    } finally {
      setEnviando(false);
    }
  }

  useEffect(() => {
    if (user) navigate({ to: "/app/dashboard", replace: true });
  }, [user, navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      await signIn(email, senha);
      navigate({ to: "/app/dashboard", replace: true });
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Falha no login.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-sidebar p-12 lg:flex">
        <div className="flex items-center gap-2.5">
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Stethoscope className="size-5" />
          </div>
          <p className="text-sm font-semibold">Clínica Serena</p>
        </div>
        <div className="max-w-md">
          <h2 className="text-3xl font-semibold leading-tight text-foreground">
            Salas organizadas, atendimentos tranquilos.
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            Consulte a disponibilidade em tempo real, solicite reservas em qualquer unidade e
            acompanhe as aprovações da coordenação em um só lugar.
          </p>
        </div>
        <p className="text-xs text-muted-foreground">
          Usuários são criados pelo administrador da clínica.
        </p>
      </div>

      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Stethoscope className="size-5" />
            </div>
            <p className="text-sm font-semibold">Clínica Serena</p>
          </div>

          <h1 className="text-2xl font-semibold text-foreground">Entrar</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Use as credenciais fornecidas pela administração.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nome@clinica.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="senha">Senha</Label>
              <Input
                id="senha"
                type="password"
                autoComplete="current-password"
                required
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            {erro ? (
              <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                {erro}
              </p>
            ) : null}
            <Button type="submit" className="w-full" disabled={enviando || loading}>
              {enviando ? <Loader2 className="size-4 animate-spin" /> : null}
              Entrar
            </Button>
          </form>

          <div className="mt-8 rounded-xl border border-border bg-card/50 p-5 backdrop-blur-sm transition-all duration-300 hover:shadow-md">
            <div className="flex items-center gap-2">
              <span className="flex size-2 rounded-full bg-primary animate-pulse" />
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Acesso Rápido (Bypass)
              </p>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              Todos os dados mockados pré-existentes foram removidos. Use os botões abaixo para
              acessar diretamente com o papel desejado:
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="group relative flex items-center justify-center gap-1.5 overflow-hidden border-primary/20 bg-background/50 hover:bg-primary/5 hover:text-primary transition-all duration-300"
                onClick={() => handleBypass("ADMINISTRADOR")}
                disabled={enviando || loading}
              >
                Entrar como Admin
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="group relative flex items-center justify-center gap-1.5 overflow-hidden border-primary/20 bg-background/50 hover:bg-primary/5 hover:text-primary transition-all duration-300"
                onClick={() => handleBypass("PSICOLOGO")}
                disabled={enviando || loading}
              >
                Entrar como Psicólogo
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
