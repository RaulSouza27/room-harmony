import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  CalendarCheck,
  CalendarDays,
  CalendarPlus,
  Building2,
  ClipboardList,
  DoorOpen,
  LayoutDashboard,
  LogOut,
  Menu,
  Stethoscope,
  UserRound,
  Users,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/contexts/AuthContext";
import { useReservas } from "@/hooks/useApi";
import { cn } from "@/lib/utils";

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  badge?: number;
}

export function AppShell({
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
  const { user, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const [openMobile, setOpenMobile] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { data: reservas } = useReservas();
  const pendentes = (reservas ?? []).filter((r) => r.status === "pendente").length;

  const items: NavItem[] = isAdmin
    ? [
        { to: "/app/dashboard", label: "Dashboard", icon: LayoutDashboard },
        { to: "/app/agenda", label: "Agenda geral", icon: CalendarDays },
        { to: "/app/aprovacoes", label: "Aprovações", icon: ClipboardList, badge: pendentes },
        { to: "/app/reservas", label: "Todas as reservas", icon: CalendarCheck },
        { to: "/app/profissionais", label: "Profissionais", icon: Users },
        { to: "/app/salas", label: "Salas", icon: DoorOpen },
        { to: "/app/unidades", label: "Unidades", icon: Building2 },
        { to: "/app/perfil", label: "Meu perfil", icon: UserRound },
      ]
    : [
        { to: "/app/dashboard", label: "Dashboard", icon: LayoutDashboard },
        { to: "/app/agenda", label: "Disponibilidade", icon: CalendarDays },
        { to: "/app/solicitar", label: "Solicitar reserva", icon: CalendarPlus },
        { to: "/app/minhas-reservas", label: "Minhas reservas", icon: CalendarCheck },
        { to: "/app/perfil", label: "Meu perfil", icon: UserRound },
      ];

  const nav = (
    <nav className="flex flex-1 flex-col gap-1 p-3">
      {items.map((item) => {
        const active = pathname === item.to;
        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={() => setOpenMobile(false)}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
              active
                ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                : "text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
            )}
          >
            <item.icon className="size-4 shrink-0" />
            <span className="flex-1 truncate">{item.label}</span>
            {item.badge ? (
              <Badge variant="secondary" className="h-5 min-w-5 justify-center px-1.5">
                {item.badge}
              </Badge>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );

  const brand = (
    <div className="flex items-center gap-2.5 border-b border-sidebar-border px-4 py-4">
      <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Stethoscope className="size-5" />
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-sidebar-foreground">Clínica Serena</p>
        <p className="truncate text-xs text-muted-foreground">Gestão de salas</p>
      </div>
    </div>
  );

  const footer = (
    <div className="border-t border-sidebar-border p-3">
      <div className="flex items-center gap-3 rounded-lg px-2 py-2">
        <Avatar className="size-8">
          {user?.foto ? <AvatarImage src={user.foto} alt={user.nome} /> : null}
          <AvatarFallback className="text-xs">
            {user?.nome
              .split(" ")
              .map((n) => n[0])
              .slice(0, 2)
              .join("")}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-sidebar-foreground">{user?.nome}</p>
          <p className="truncate text-xs text-muted-foreground">
            {isAdmin ? "Administrador" : "Psicólogo(a)"}
          </p>
        </div>
      </div>
      <Button
        variant="ghost"
        className="mt-1 w-full justify-start gap-3 text-sidebar-foreground/75"
        onClick={() => {
          signOut();
          navigate({ to: "/", replace: true });
        }}
      >
        <LogOut className="size-4" /> Sair
      </Button>
    </div>
  );

  return (
    <div className="flex min-h-screen w-full bg-background">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar md:flex">
        {brand}
        {nav}
        {footer}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-background/85 px-4 py-3 backdrop-blur md:px-8">
          <Sheet open={openMobile} onOpenChange={setOpenMobile}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="md:hidden">
                <Menu className="size-4" />
                <span className="sr-only">Abrir menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="flex w-72 flex-col bg-sidebar p-0">
              {brand}
              {nav}
              {footer}
            </SheetContent>
          </Sheet>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-base font-semibold text-foreground md:text-lg">{title}</h1>
            {description ? (
              <p className="hidden truncate text-sm text-muted-foreground sm:block">{description}</p>
            ) : null}
          </div>
          {actions}
        </header>
        <main className="flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
