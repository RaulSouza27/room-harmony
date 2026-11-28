import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  CalendarCheck,
  CalendarDays,
  CalendarPlus,
  CalendarOff,
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
  ShieldCheck,
  MessageSquareWarning,
  Sparkles,
} from "lucide-react";
import { useState, useMemo, useEffect, type ReactNode } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ChangelogDialog } from "@/components/ChangelogDialog";
import { useAuth } from "@/contexts/AuthContext";
import { useExpiringAlerts, useReservasPendentesCount, useCompleteTour } from "@/hooks/useApi";
import { DEFAULT_PASSWORD } from "@/config/api";
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
  const [changelogOpen, setChangelogOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const pendentes = useReservasPendentesCount(isAdmin);
  const { data: expiringAlerts = [] } = useExpiringAlerts(
    !isAdmin ? user?.id : undefined,
    !isAdmin && !!user?.id,
  );

  useEffect(() => {
    if (isAdmin || !user?.id || expiringAlerts.length === 0) return;
    const sessionKey = `clinica-salas-expiring-toast-${user.id}`;
    if (sessionStorage.getItem(sessionKey)) return;
    sessionStorage.setItem(sessionKey, "1");
    toast.warning(
      `Você possui ${expiringAlerts.length} reserva(s) recorrente(s) próxima(s) de expirar. Acesse "Minhas reservas" para renovar.`,
      { duration: 6000 },
    );
  }, [isAdmin, user?.id, expiringAlerts.length]);

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
        { to: "/app/feriados", label: "Feriados e Bloqueios", icon: CalendarOff },
        { to: "/app/ouvidoria", label: "Fale Conosco", icon: MessageSquareWarning },
        { to: "/app/auditoria", label: "Auditoria", icon: ShieldCheck },
        { to: "/app/perfil", label: "Meu perfil", icon: UserRound },
      ]
    : [
        { to: "/app/dashboard", label: "Dashboard", icon: LayoutDashboard },
        { to: "/app/agenda", label: "Disponibilidade", icon: CalendarDays },
        { to: "/app/solicitar", label: "Solicitar reserva", icon: CalendarPlus },
        { to: "/app/minhas-reservas", label: "Minhas reservas", icon: CalendarCheck, badge: expiringAlerts.length },
        { to: "/app/ouvidoria", label: "Fale Conosco", icon: MessageSquareWarning },
        { to: "/app/perfil", label: "Meu perfil", icon: UserRound },
      ];

  const nav = (
    <nav className={cn("flex flex-1 flex-col gap-1 p-3 overflow-y-auto min-h-0", user?.mustCompleteTour && "pointer-events-none opacity-50")}>
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
    <div className="flex items-center gap-2.5 border-b border-sidebar-border px-4 py-4 shrink-0">
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
    <div className="border-t border-sidebar-border p-3 shrink-0">
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
            {isAdmin ? "Administrador" : "Locador(a)"}
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
      <aside className="sticky top-0 h-screen hidden w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar md:flex">
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
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setChangelogOpen(true)}
            className="gap-1.5 border-primary/30 text-primary hover:bg-primary/10 shrink-0"
            title="Ver novidades e atualizações da plataforma"
          >
            <Sparkles className="size-3.5" />
            <span className="hidden sm:inline">Novidades</span>
          </Button>
          {actions}
        </header>
        <main className="flex-1 p-4 md:p-8">{children}</main>
      </div>

      <ChangelogDialog open={changelogOpen} onOpenChange={setChangelogOpen} />

      {user?.mustCompleteTour && !user?.firstLogin && <TourOverlay />}
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
  if (user?.firstLogin) return null;
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
            description: "Esta é a tela principal de controle da clínica. Nela você tem um panorama rápido das operações diárias e alertas de vencimento.",
            actions: [
              "Acompanhe o total de salas ativas, pendências e reservas futuras.",
              "Monitore reservas recorrentes (Hora Fixa e Turno) próximas da expiração e avise os locatários pelo WhatsApp.",
              "Consulte o botão 'Novidades' no topo para ver o Changelog exclusivo de administradores."
            ]
          },
          {
            to: "/app/agenda",
            title: "Agenda Interativa Geral",
            description: "A grade horária completa que mostra em tempo real a ocupação de cada espaço físico por unidade.",
            actions: [
              "Selecione primeiro a unidade desejada para visualizar suas salas nos modos Dia, Mês ou Ano.",
              "Reserve diretamente: clique em qualquer horário livre ou crie uma Reserva Especial (Admin).",
              "Transfira horários de um Turno: clique em um turno aprovado para ceder 1 ou mais horas específicas a outro profissional."
            ]
          },
          {
            to: "/app/aprovacoes",
            title: "Fila de Aprovações e Cancelamentos",
            description: "Central de decisão para solicitações de reserva, reagendamentos de feriado e pedidos de cancelamento.",
            actions: [
              "Aprove reservas ou negue inserindo uma justificativa para o profissional.",
              "Gerencie as 3 abas dedicadas: Solicitações de Reserva, A Reagendar (Feriado) e Solicitações de Cancelamento.",
              "Selecione múltiplos itens para efetivar cancelamentos em massa e navegue pelos comprovantes anexados."
            ]
          },
          {
            to: "/app/reservas",
            title: "Todas as Reservas da Clínica",
            description: "Listagem completa e gestão avançada de todos os agendamentos registrados.",
            actions: [
              "Filtre reservas por unidade, sala, profissional, tipo (Avulsa, Fixa, Turno, Especial), data ou status.",
              "Selecione várias reservas para cancelar ou excluir em lote com apenas um clique.",
              "Transfira horas específicas de um turno de administrador para qualquer locatário."
            ]
          },
          {
            to: "/app/profissionais",
            title: "Cadastro de Profissionais",
            description: "Controle de usuários, níveis de acesso e contas de profissionais e administradores.",
            actions: [
              `Cadastre individualmente ou importe vários profissionais de uma vez via planilha CSV (senha padrão '${DEFAULT_PASSWORD}').`,
              "Use o botão 'Resetar Senha' para restaurar a credencial inicial do usuário quando necessário.",
              "Inative ou ative o acesso de contas à plataforma a qualquer momento."
            ]
          },
          {
            to: "/app/profissoes",
            title: "Cadastro de Profissões",
            description: "Gerencie a lista de profissões aceitas e vinculadas aos perfis dos usuários.",
            actions: [
              "Adicione ou edite especialidades e profissões para segmentação no cadastro de profissionais."
            ]
          },
          {
            to: "/app/salas",
            title: "Configuração de Salas",
            description: "Painel de administração dos consultórios específicos disponíveis em cada sede.",
            actions: [
              "Insira até 4 fotos por sala para visualização dos profissionais no momento do agendamento.",
              "Descreva a estrutura interna (presença de divã, ar-condicionado, poltronas, recursos infantis, etc.).",
              "Ative ou inative salas para manutenção periódica."
            ]
          },
          {
            to: "/app/unidades",
            title: "Configuração de Unidades",
            description: "Cadastro de filiais físicas, endereços e expediente de funcionamento da clínica.",
            actions: [
              "Cadastre sedes clínicas informando nome e endereço completo.",
              "Configure os horários de abertura e fechamento de cada dia da semana para validação automática das reservas."
            ]
          },
          {
            to: "/app/feriados",
            title: "Feriados e Bloqueios",
            description: "Gerencie dias de fechamento global da clínica ou bloqueios específicos por unidade.",
            actions: [
              "Cadastre feriados ou períodos de manutenção em uma unidade específica ou para toda a clínica.",
              "Reservas existentes na data bloqueada mudam automaticamente para o status 'A Reagendar' para que o profissional escolha nova data."
            ]
          },
          {
            to: "/app/ouvidoria",
            title: "Fale Conosco — Gestão de Manifestações",
            description: "Canal oficial para receber e responder elogios, sugestões, comentários e reclamações dos locatários.",
            actions: [
              "Visualize relatos identificados ou anônimos enviados pelos profissionais e filtre por status.",
              "Registre obrigatoriamente o Parecer da Resolução ao concluir uma manifestação.",
              "Envie o parecer diretamente ao WhatsApp do profissional nos relatos identificados."
            ]
          },
          {
            to: "/app/auditoria",
            title: "Histórico de Auditoria",
            description: "Monitoramento e rastreabilidade completa de todas as operações administrativas e de agendamento.",
            actions: [
              "Consulte quem solicitou cada reserva, quem aprovou/negou, transferências de turno e alterações cadastrais.",
              "Filtre eventos por tipo de recurso (Reservas, Usuários, Salas, Unidades, Feriados, Fale Conosco) e por ação."
            ]
          },
          {
            to: "/app/perfil",
            title: "Meu Perfil e Segurança",
            description: "Área de controle do seu cadastro pessoal e credenciais de acesso.",
            actions: [
              "Confira e atualize suas informações de contato, foto e endereço.",
              "Altere sua senha de acesso definindo uma nova credencial segura."
            ]
          }
        ]
      : [
          {
            to: "/app/dashboard",
            title: "Seu Painel Inicial",
            description: "O seu centro de controle diário como profissional na Clínica Escuta.",
            actions: [
              "Acompanhe seus próximos atendimentos e o resumo das suas reservas.",
              "Receba alertas automáticos quando suas reservas de Hora Fixa ou Turno estiverem próximas de expirar e renove em 1 clique.",
              "Clique em 'Novidades' no topo da tela para conferir as melhorias liberadas para você."
            ]
          },
          {
            to: "/app/agenda",
            title: "Consulta de Disponibilidade",
            description: "Grade interativa de salas e horários livres por unidade.",
            actions: [
              "Selecione a unidade desejada para carregar os consultórios e horários disponíveis.",
              "Alterne entre as visões de Dia, Mês e Ano para planejar seus atendimentos.",
              "Clique diretamente em um horário livre para abrir a solicitação já preenchida."
            ]
          },
          {
            to: "/app/solicitar",
            title: "Formulário de Solicitação",
            description: "Área para requisitar reservas de salas de forma rápida e validada.",
            actions: [
              "Escolha o tipo de reserva: Hora Avulsa (1h), Hora Avulsa Fixa (mensal) ou Turno (4h anual).",
              "Anexe a imagem do comprovante de pagamento diretamente na solicitação.",
              "Consulte fotos e detalhes da estrutura do consultório selecionado antes de confirmar."
            ]
          },
          {
            to: "/app/minhas-reservas",
            title: "Minhas Reservas",
            description: "O seu painel completo de acompanhamento, renovação e gestão de horários.",
            actions: [
              "Acompanhe o status das suas reservas (Aprovadas, Pendentes, A Reagendar ou Canceladas).",
              "Selecione várias reservas ao mesmo tempo para cancelar ou solicitar cancelamento em massa (> 24h).",
              "Reagende facilmente reservas atingidas por feriados sem precisar enviar novo comprovante."
            ]
          },
          {
            to: "/app/ouvidoria",
            title: "Fale Conosco",
            description: "Espaço dedicado para você compartilhar elogios, sugestões, comentários ou reclamações.",
            actions: [
              "Envie sua mensagem de forma Identificada ou 100% Anônima para a administração da clínica.",
              "Nos envios identificados, acompanhe o andamento e leia a Resposta / Parecer da Administração diretamente nesta tela."
            ]
          },
          {
            to: "/app/perfil",
            title: "Seu Perfil Profissional",
            description: "Cadastro pessoal e segurança de acesso à plataforma.",
            actions: [
              "Mantenha seu telefone, endereço e foto de perfil atualizados.",
              "Altere sua senha de acesso sempre que desejar."
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
    if (user?.firstLogin) return;
    if (pathname !== currentStep.to) {
      navigate({ to: currentStep.to });
    }
  }, [user?.firstLogin, pathname, currentStep.to, navigate]);

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
