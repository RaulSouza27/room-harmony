import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { Loader2, Lock, Check, Eye, EyeOff, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import * as api from "@/services/api";
import { toast } from "sonner";

export const Route = createFileRoute("/app/reset-first-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Definir nova senha — Clínica Escuta" },
      {
        name: "description",
        content: "Defina sua senha de acesso em seu primeiro login.",
      },
    ],
  }),
  component: ResetFirstPasswordPage,
});

function ResetFirstPasswordPage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Requisitos de validação em tempo real
  const hasMinLength = useMemo(() => password.length >= 8, [password]);
  const hasUppercase = useMemo(() => /[A-Z]/.test(password), [password]);
  const hasNumber = useMemo(() => /[0-9]/.test(password), [password]);
  const passwordsMatch = useMemo(() => {
    return password !== "" && password === confirmPassword;
  }, [password, confirmPassword]);

  const isFormValid = useMemo(() => {
    return hasMinLength && hasUppercase && hasNumber && passwordsMatch;
  }, [hasMinLength, hasUppercase, hasNumber, passwordsMatch]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (!isFormValid) {
      setError("Por favor, atenda a todos os requisitos de segurança da senha.");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      await api.changePasswordFirstLogin(user.id, password);
      
      // Exibe toast de sucesso e desconecta o usuário para forçar o login com a nova senha
      toast.success("Senha redefinida com sucesso! Acesse o sistema com suas novas credenciais.");
      signOut();
      navigate({ to: "/", replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao alterar a senha. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center text-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary shadow-inner mb-4 transition-transform duration-300 hover:scale-105">
            <Lock className="size-6" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Definir Nova Senha
          </h2>
          <p className="mt-2 text-sm text-muted-foreground max-w-sm">
            Olá, <span className="font-semibold text-foreground">{user?.nome}</span>! 
            Este é o seu primeiro acesso. Para a segurança de sua conta, redefina sua senha antes de prosseguir.
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-lg sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="password">Nova senha</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar nova senha</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground"
                >
                  {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            {/* Critérios de Validação */}
            <div className="rounded-lg bg-muted/40 p-4 space-y-2.5 text-xs border border-border/50">
              <p className="font-medium text-muted-foreground mb-1">A senha deve conter:</p>
              
              <div className="flex items-center gap-2">
                <div className={`flex size-4 items-center justify-center rounded-full ${hasMinLength ? "bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400" : "bg-neutral-100 text-neutral-400 dark:bg-neutral-800"}`}>
                  {hasMinLength ? <Check className="size-3" /> : <div className="size-1 bg-current rounded-full" />}
                </div>
                <span className={hasMinLength ? "text-green-700 dark:text-green-400 font-medium" : "text-muted-foreground"}>
                  No mínimo 8 caracteres
                </span>
              </div>

              <div className="flex items-center gap-2">
                <div className={`flex size-4 items-center justify-center rounded-full ${hasUppercase ? "bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400" : "bg-neutral-100 text-neutral-400 dark:bg-neutral-800"}`}>
                  {hasUppercase ? <Check className="size-3" /> : <div className="size-1 bg-current rounded-full" />}
                </div>
                <span className={hasUppercase ? "text-green-700 dark:text-green-400 font-medium" : "text-muted-foreground"}>
                  Pelo menos uma letra maiúscula
                </span>
              </div>

              <div className="flex items-center gap-2">
                <div className={`flex size-4 items-center justify-center rounded-full ${hasNumber ? "bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400" : "bg-neutral-100 text-neutral-400 dark:bg-neutral-800"}`}>
                  {hasNumber ? <Check className="size-3" /> : <div className="size-1 bg-current rounded-full" />}
                </div>
                <span className={hasNumber ? "text-green-700 dark:text-green-400 font-medium" : "text-muted-foreground"}>
                  Pelo menos um número
                </span>
              </div>

              <div className="flex items-center gap-2">
                <div className={`flex size-4 items-center justify-center rounded-full ${passwordsMatch ? "bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400" : "bg-neutral-100 text-neutral-400 dark:bg-neutral-800"}`}>
                  {passwordsMatch ? <Check className="size-3" /> : <div className="size-1 bg-current rounded-full" />}
                </div>
                <span className={passwordsMatch ? "text-green-700 dark:text-green-400 font-medium" : "text-muted-foreground"}>
                  Senhas são iguais
                </span>
              </div>
            </div>

            {error ? (
              <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive flex items-start gap-2 animate-shake">
                <X className="size-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            ) : null}

            <Button
              type="submit"
              className="w-full"
              disabled={loading || !isFormValid}
            >
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin mr-2" />
                  Redefinindo...
                </>
              ) : (
                "Confirmar e salvar nova senha"
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
