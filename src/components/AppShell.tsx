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
  UserRound,
  Users,
  Briefcase,
  CheckCircle2,
} from "lucide-react";
import { useState, useMemo, useEffect, type ReactNode } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/contexts/AuthContext";
import { useReservas, useCompleteTour } from "@/hooks/useApi";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

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
        { to: "/app/profissoes", label: "Profissões", icon: Briefcase },
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
    <nav className={cn("flex flex-1 flex-col gap-1 p-3", user?.mustCompleteTour && "pointer-events-none opacity-50")}>
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
      <div className="flex size-9 items-center justify-center rounded-lg overflow-hidden">
        <img src="/logo.PNG" alt="Logo" className="size-7 object-contain" />
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-sidebar-foreground">Clínica Escuta</p>
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
              <p className="hidden truncate text-sm text-muted-foreground sm:block">
                {description}
              </p>
            ) : null}
          </div>
          {actions}
        </header>
        <main className="flex-1 p-4 md:p-8">{children}</main>
      </div>

      {user?.mustCompleteTour && <TourOverlay />}
    </div>
  );
}

interface TourStep {
  to: string;
  title: string;
  description: string;
  actions: string[];
}

function TourOverlay() {
  const { user, isAdmin, refresh } = useAuth();
  const navigate = useNavigate();
  const { location } = useRouterState();
  const pathname = location.pathname;
  const completeTourMutation = useCompleteTour();

  const steps = useMemo<TourStep[]>(() => {
    return isAdmin
      ? [
          {
            to: "/app/dashboard",
            title: "Painel Geral (Dashboard)",
            description: "Esta é a tela principal de controle da clínica. Nela você tem um panorama rápido das operações diárias.",
            actions: [
              "Acompanhe o total de salas ativas e profissionais cadastrados.",
              "Veja todas as reservas agendadas para a data de hoje.",
              "Acesse atalhos rápidos de navegação pelo menu lateral."
            ]
          },
          {
            to: "/app/agenda",
            title: "Agenda Interativa Geral",
            description: "A grade horária completa que mostra em tempo real a ocupação de cada espaço físico.",
            actions: [
              "Filtre os horários por filiais/unidades específicas da clínica.",
              "Navegue pelo calendário para ver a disponibilidade de qualquer data futura.",
              "Reserve diretamente: clique em qualquer slot verde ('Livre') para abrir o formulário já pré-preenchido."
            ]
          },
          {
            to: "/app/aprovacoes",
            title: "Fila de Aprovações de Reserva",
            description: "Central de aprovação para solicitações recebidas de psicólogos.",
            actions: [
              "Aprove reservas ou negue inserindo uma justificativa para o profissional.",
              "Alerta de conflito: o sistema avisa se dois pedidos concorrerem pelo mesmo espaço e horário.",
              "Verifique imagens de comprovantes de depósito ou transferência bancária anexadas."
            ]
          },
          {
            to: "/app/reservas",
            title: "Histórico de Reservas da Clínica",
            description: "Listagem e consulta de todos os agendamentos registrados.",
            actions: [
              "Filtre reservas por profissional, unidade, sala, data ou status.",
              "Edite agendamentos, confirme pagamentos ou remova registros se necessário."
            ]
          },
          {
            to: "/app/profissionais",
            title: "Cadastro de Profissionais",
            description: "Controle de usuários, níveis de acesso e contas de psicólogos e administradores.",
            actions: [
              "Cadastre novas contas. A senha inicial gerada por padrão é 'psi123'.",
              "Resetar senha: use o botão 'Resetar Senha' para restaurar a credencial inicial do usuário em caso de perda.",
              "Inative ou ative o acesso de contas à plataforma a qualquer momento."
            ]
          },
          {
            to: "/app/profissoes",
            title: "Cadastro de Profissões",
            description: "Gerencie a lista de profissões aceitas e vinculadas aos perfis dos usuários.",
            actions: [
              "Adicione especialidades ou profissões para segmentação no cadastro."
            ]
          },
          {
            to: "/app/salas",
            title: "Configuração de Salas",
            description: "Painel de administração dos consultórios específicos disponíveis.",
            actions: [
              "Insira fotos das salas para visualização dos psicólogos no agendamento.",
              "Descreva a estrutura interna (presença de divã, ar condicionado, brinquedos, etc.).",
              "Ative ou inative salas para manutenção periódica."
            ]
          },
          {
            to: "/app/unidades",
            title: "Configuração de Unidades",
            description: "Cadastro de filiais físicas e endereços da clínica.",
            actions: [
              "Defina novas sedes clínicas informando nome e endereço completo."
            ]
          },
          {
            to: "/app/perfil",
            title: "Meu Perfil e Segurança",
            description: "Área de controle do seu cadastro e credenciais de acesso.",
            actions: [
              "Confira suas informações e nível de acesso atual.",
              "Altere sua senha de acesso definindo uma nova credencial segura."
            ]
          }
        ]
      : [
          {
            to: "/app/dashboard",
            title: "Seu Painel Inicial",
            description: "O seu centro de controle diário como profissional na clínica.",
            actions: [
              "Acompanhe o painel de atendimentos do dia.",
              "Visualize rapidamente o status de suas solicitações mais recentes."
            ]
          },
          {
            to: "/app/agenda",
            title: "Consulta de Disponibilidade",
            description: "Grade interativa de salas e horários livres por unidade.",
            actions: [
              "Verifique se o consultório desejado está livre no dia pretendido.",
              "Navegue pelas datas para programar futuros atendimentos de pacientes."
            ]
          },
          {
            to: "/app/solicitar",
            title: "Formulário de Solicitação",
            description: "Área para requisitar reservas de salas de forma prática.",
            actions: [
              "Escolha o tipo de reserva: Hora Avulsa (1h), Hora Avulsa Fixa (mensal) ou Turno (4h anual).",
              "Anexe o comprovante de pagamento diretamente na requisição.",
              "Consulte fotos e detalhes do consultório selecionado antes de fechar a reserva."
            ]
          },
          {
            to: "/app/minhas-reservas",
            title: "Histórico de Reservas Pessoais",
            description: "O seu painel de acompanhamento e controle de agendas solicitadas.",
            actions: [
              "Acompanhe se a solicitação foi Aprovada, Negada ou está Pendente.",
              "Cancele horários reservados com antecedência para liberar o espaço.",
              "Leia as justificativas enviadas pela coordenação em caso de reservas negadas."
            ]
          },
          {
            to: "/app/perfil",
            title: "Seu Perfil Profissional",
            description: "Cadastro pessoal e segurança de acesso à plataforma.",
            actions: [
              "Veja em quais unidades e com qual especialidade você está vinculado.",
              "Atualize sua senha de acesso pessoal para maior privacidade."
            ]
          }
        ];
  }, [isAdmin]);

  const [currentStepIndex, setCurrentStepIndex] = useState(() => {
    const saved = localStorage.getItem("clinica-salas-tour-step");
    return saved ? Number(saved) : 0;
  });

  const currentStep = steps[currentStepIndex] || steps[0];

  // Lock navigation to the current step
  useEffect(() => {
    if (pathname !== currentStep.to) {
      navigate({ to: currentStep.to });
    }
  }, [pathname, currentStep.to, navigate]);

  const handleNext = async () => {
    if (currentStepIndex < steps.length - 1) {
      const nextIndex = currentStepIndex + 1;
      localStorage.setItem("clinica-salas-tour-step", String(nextIndex));
      setCurrentStepIndex(nextIndex);
      navigate({ to: steps[nextIndex].to });
    } else {
      if (!user) return;
      try {
        await completeTourMutation.mutateAsync(user.id);
        localStorage.removeItem("clinica-salas-tour-step");
        await refresh();
        toast.success("Tour concluído com sucesso!");
        navigate({ to: "/app/dashboard" });
      } catch (err) {
        console.error(err);
      }
    }
  };

  return (
    <div className="fixed bottom-8 right-8 z-50 w-full max-w-md rounded-xl border-t-4 border-t-primary border-x border-b border-border bg-card p-6 shadow-2xl animate-in fade-in-50 slide-in-from-bottom-5">
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            <span className="text-xs font-semibold text-primary uppercase tracking-wider">
              Tour de Apresentação
            </span>
          </div>
          <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
            {currentStepIndex + 1} de {steps.length}
          </span>
        </div>
        
        <div className="space-y-2">
          <h4 className="text-base font-bold text-card-foreground">
            {currentStep.title}
          </h4>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {currentStep.description}
          </p>
        </div>

        <div className="space-y-2.5 border-t border-border/60 pt-4">
          <p className="text-xs font-semibold text-card-foreground uppercase tracking-wider">
            O que você pode fazer nesta tela:
          </p>
          <ul className="space-y-2">
            {currentStep.actions.map((action, idx) => (
              <li key={idx} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                <CheckCircle2 className="size-4 shrink-0 text-primary mt-0.5" />
                <span>{action}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="pt-3">
          <Button
            size="default"
            className="w-full font-medium"
            onClick={handleNext}
            disabled={completeTourMutation.isPending}
          >
            {currentStepIndex === steps.length - 1 ? "Concluir Tour" : "Próximo Passo"}
          </Button>
        </div>
      </div>
    </div>
  );
}
