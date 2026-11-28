import { useEffect, useState } from "react";
import { Sparkles, CheckCircle2, Wrench, ShieldCheck, UserRound } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { useChangelog } from "@/hooks/useApi";
import { ErrorState, LoadingState } from "@/components/common";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ChangelogDialog({ open, onOpenChange }: Props) {
  const { user, isAdmin } = useAuth();
  const [audienceTab, setAudienceTab] = useState<"ADMIN" | "LOCADOR">(
    isAdmin ? "ADMIN" : "LOCADOR",
  );

  useEffect(() => {
    setAudienceTab(isAdmin ? "ADMIN" : "LOCADOR");
  }, [isAdmin, open]);

  const effectiveAudience = isAdmin ? audienceTab : "LOCADOR";
  const changelogQ = useChangelog(effectiveAudience, open && !!user?.id);
  const releases = changelogQ.data ?? [];

  useEffect(() => {
    if (open && user?.id && releases.length > 0 && releases[0]?.version) {
      const storageKey = `clinica-salas-changelog-seen-${user.id}-${isAdmin ? "ADMIN" : "LOCADOR"}`;
      localStorage.setItem(storageKey, releases[0].version);
    }
  }, [open, user?.id, isAdmin, releases]);

  const getCategoryBadge = (category: string, label: string) => {
    if (category === "feature") {
      return (
        <Badge className="bg-primary/15 text-primary border border-primary/30 hover:bg-primary/20 text-[10px] gap-1">
          <Sparkles className="size-3" />
          {label}
        </Badge>
      );
    }
    if (category === "fix") {
      return (
        <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 hover:bg-amber-500/20 text-[10px] gap-1">
          <Wrench className="size-3" />
          {label}
        </Badge>
      );
    }
    return (
      <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/20 text-[10px] gap-1">
        <CheckCircle2 className="size-3" />
        {label}
      </Badge>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <div className="flex flex-wrap items-center justify-between gap-2 pr-4">
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="size-5 text-primary" />
              Novidades da Plataforma (Changelog)
            </DialogTitle>
            <Badge
              variant="outline"
              className={cn(
                "text-[11px] gap-1 font-semibold",
                effectiveAudience === "ADMIN"
                  ? "border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-300"
                  : "border-primary/40 bg-primary/10 text-primary",
              )}
            >
              {effectiveAudience === "ADMIN" ? (
                <>
                  <ShieldCheck className="size-3.5" />
                  Perfil Administrador
                </>
              ) : (
                <>
                  <UserRound className="size-3.5" />
                  Perfil Locatário
                </>
              )}
            </Badge>
          </div>
          <DialogDescription>
            {isAdmin
              ? "Histórico de recursos, melhorias e correções técnicas voltadas à administração da Clínica Escuta."
              : "Confira as novas funcionalidades e melhorias liberadas para facilitar suas reservas na Clínica Escuta."}
          </DialogDescription>
        </DialogHeader>

        {isAdmin && (
          <div className="pt-1">
            <Tabs
              value={audienceTab}
              onValueChange={(v) => setAudienceTab(v as "ADMIN" | "LOCADOR")}
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="ADMIN" className="gap-1.5 text-xs">
                  <ShieldCheck className="size-3.5" />
                  Changelog de Administradores
                </TabsTrigger>
                <TabsTrigger value="LOCADOR" className="gap-1.5 text-xs">
                  <UserRound className="size-3.5" />
                  Visão dos Locatários
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        )}

        <div className="space-y-5 py-2">
          {changelogQ.isLoading ? (
            <LoadingState label="Carregando histórico de novidades..." />
          ) : changelogQ.error ? (
            <ErrorState message={(changelogQ.error as Error).message} />
          ) : releases.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Nenhuma nota de atualização disponível no momento.
            </p>
          ) : (
            releases.map((rel, idx) => (
              <div
                key={`${rel.version}-${rel.audience}`}
                className={cn(
                  "rounded-xl border p-4 space-y-3.5",
                  idx === 0
                    ? "border-primary/35 bg-primary/5 shadow-soft"
                    : "border-border bg-card",
                )}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-2.5">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={idx === 0 ? "default" : "secondary"}
                      className="font-mono text-xs"
                    >
                      v{rel.version}
                    </Badge>
                    <h3 className="text-sm font-bold text-foreground">{rel.title}</h3>
                  </div>
                  <span className="text-xs text-muted-foreground font-medium">
                    {rel.releaseDate}
                  </span>
                </div>

                <ul className="space-y-3">
                  {rel.items.map((item, i) => (
                    <li
                      key={i}
                      className="rounded-lg border border-border/60 bg-background/80 p-3 space-y-1.5"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        {getCategoryBadge(item.category, item.categoryLabel)}
                        <span className="text-xs font-semibold text-foreground">
                          {item.title}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {item.description}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </div>

        <div className="flex justify-end pt-2">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
