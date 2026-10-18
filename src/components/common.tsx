import { Loader2, Inbox, AlertCircle } from "lucide-react";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ReservaStatus } from "@/types";

export function LoadingState({ label = "Carregando..." }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-card/50 py-16 text-muted-foreground">
      <Loader2 className="size-5 animate-spin" />
      <p className="text-sm">{label}</p>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-card/50 px-6 py-16 text-center">
      <Inbox className="size-6 text-muted-foreground" />
      <p className="text-sm font-medium text-foreground">{title}</p>
      {description ? <p className="max-w-sm text-sm text-muted-foreground">{description}</p> : null}
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}

export function ErrorState({ message }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-6 py-16 text-center">
      <AlertCircle className="size-6 text-destructive" />
      <p className="text-sm font-medium text-foreground">Não foi possível carregar os dados</p>
      <p className="text-sm text-muted-foreground">{message ?? "Tente novamente em instantes."}</p>
    </div>
  );
}

const statusStyles: Record<ReservaStatus, string> = {
  pendente: "border-warning/40 bg-warning/15 text-warning-foreground",
  aprovada: "border-success/40 bg-success/15 text-success-foreground",
  negada: "border-destructive/30 bg-destructive/10 text-destructive",
  cancelada: "border-border bg-muted text-muted-foreground",
  solicitacao_cancelamento: "border-amber-500/40 bg-amber-500/15 text-amber-700 dark:text-amber-300",
  reagendar: "border-purple-500/40 bg-purple-500/15 text-purple-700 dark:text-purple-300",
};

const statusLabel: Record<ReservaStatus, string> = {
  pendente: "Pendente",
  aprovada: "Aprovada",
  negada: "Negada",
  cancelada: "Cancelada",
  solicitacao_cancelamento: "Solicitação de Cancelamento",
  reagendar: "A Reagendar (Feriado)",
};

export function StatusBadge({ status }: { status: ReservaStatus }) {
  return (
    <Badge variant="outline" className={cn("font-medium", statusStyles[status])}>
      {statusLabel[status]}
    </Badge>
  );
}

export function SectionCard({
  title,
  description,
  children,
  actions,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-card shadow-soft">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
        <div>
          <h2 className="text-sm font-semibold text-card-foreground">{title}</h2>
          {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
        </div>
        {actions}
      </header>
      <div className="p-5">{children}</div>
    </section>
  );
}
