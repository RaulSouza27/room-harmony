import { useMemo, useState } from "react";
import { createFileRoute, Navigate } from "@tanstack/react-router";
import {
  ArrowDownRight,
  ArrowUpRight,
  Building2,
  CalendarClock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Coins,
  DoorOpen,
  Eye,
  History,
  Loader2,
  Package,
  Search,
  UserRound,
  X,
  XCircle,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { EmptyState, ErrorState, LoadingState, SectionCard } from "@/components/common";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import {
  useAllCreditPackages,
  useAllCreditTransactionsPaged,
  useApproveCreditPackage,
  useCreditPackageStats,
  useRejectCreditPackage,
  useUnidades,
  useUsuarios,
} from "@/hooks/useApi";
import { formatarData } from "@/lib/format";
import { getCreditPackageReceipt } from "@/services/api";
import type { CreditPackage, CreditPackageStatus, CreditTransactionType } from "@/types";
import { toast } from "sonner";

export const Route = createFileRoute("/app/gestao-creditos")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Gestão de Pacotes de Crédito — Clínica Escuta" },
      {
        name: "description",
        content:
          "Aprovação e rejeição de solicitações de pacotes de 12 horas e extrato geral de uso de créditos.",
      },
    ],
  }),
  component: GestaoCreditosAdminPage,
});

function formatDateTime(iso?: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function PackageStatusBadge({ status }: { status: CreditPackageStatus }) {
  switch (status) {
    case "APPROVED":
      return (
        <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 gap-1">
          <CheckCircle2 className="size-3" /> Aprovado
        </Badge>
      );
    case "PENDING":
      return (
        <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 gap-1">
          <Clock className="size-3" /> Pendente
        </Badge>
      );
    case "REJECTED":
      return (
        <Badge className="bg-destructive/15 text-destructive border-destructive/30 gap-1">
          <XCircle className="size-3" /> Rejeitado
        </Badge>
      );
    case "EXPIRED":
      return (
        <Badge variant="secondary" className="gap-1 text-muted-foreground">
          <CalendarClock className="size-3" /> Expirado
        </Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

function TransactionTypeBadge({ type }: { type: CreditTransactionType }) {
  switch (type) {
    case "PURCHASE_APPROVED":
      return (
        <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 gap-1">
          <ArrowUpRight className="size-3" /> Liberação de Pacote
        </Badge>
      );
    case "RESERVATION_USAGE":
      return (
        <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30 gap-1">
          <ArrowDownRight className="size-3" /> Uso em Reserva
        </Badge>
      );
    case "CANCELLATION_REFUND":
      return (
        <Badge className="bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30 gap-1">
          <ArrowUpRight className="size-3" /> Estorno (Cancelamento)
        </Badge>
      );
    case "PACKAGE_EXPIRED":
      return (
        <Badge variant="secondary" className="gap-1 text-muted-foreground">
          <CalendarClock className="size-3" /> Expiração (30 dias)
        </Badge>
      );
    default:
      return <Badge variant="outline">{type}</Badge>;
  }
}

function GestaoCreditosAdminPage() {
  const { isAdmin } = useAuth();
  const statsQ = useCreditPackageStats(isAdmin);
  const unidadesQ = useUnidades();
  const usuariosQ = useUsuarios();

  // Estado da Aba 1: Solicitações de Pacotes
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [pkgUnitFilter, setPkgUnitFilter] = useState<string>("ALL");
  const [pkgSearch, setPkgSearch] = useState<string>("");
  const packagesQ = useAllCreditPackages(
    statusFilter !== "ALL" ? { status: statusFilter } : undefined,
  );
  const approveMutation = useApproveCreditPackage();
  const rejectMutation = useRejectCreditPackage();

  const [pacoteParaAprovar, setPacoteParaAprovar] = useState<CreditPackage | null>(null);
  const [pacoteParaRejeitar, setPacoteParaRejeitar] = useState<CreditPackage | null>(null);
  const [motivoRejeicao, setMotivoRejeicao] = useState<string>("");

  // Visualizador de comprovante
  const [viewingReceiptPkg, setViewingReceiptPkg] = useState<CreditPackage | null>(null);
  const [receiptData, setReceiptData] = useState<string | null>(null);
  const [loadingReceipt, setLoadingReceipt] = useState(false);

  // Estado da Aba 2: Extrato Geral de Uso
  const [txUserId, setTxUserId] = useState<string>("ALL");
  const [txUnitId, setTxUnitId] = useState<string>("ALL");
  const [txType, setTxType] = useState<string>("ALL");
  const [txStartDate, setTxStartDate] = useState<string>("");
  const [txEndDate, setTxEndDate] = useState<string>("");
  const [txPage, setTxPage] = useState<number>(0);
  const [txPageSize, setTxPageSize] = useState<number>(20);

  const txParams = useMemo(
    () => ({
      userId: txUserId !== "ALL" ? Number(txUserId) : undefined,
      unitId: txUnitId !== "ALL" ? Number(txUnitId) : undefined,
      type: txType !== "ALL" ? txType : undefined,
      startDate: txStartDate || undefined,
      endDate: txEndDate || undefined,
      page: txPage,
      size: txPageSize,
    }),
    [txUserId, txUnitId, txType, txStartDate, txEndDate, txPage, txPageSize],
  );

  const transactionsQ = useAllCreditTransactionsPaged(txParams, isAdmin);

  if (!isAdmin) {
    return <Navigate to="/app/dashboard" />;
  }

  const stats = statsQ.data ?? { pending: 0, approved: 0, rejected: 0, expired: 0 };
  const unidades = unidadesQ.data ?? [];
  const locatarios = (usuariosQ.data ?? []).filter((u) => u.tipo !== "admin");
  const allPackages = packagesQ.data ?? [];

  const filteredPackages = allPackages.filter((pkg) => {
    if (pkgUnitFilter !== "ALL" && String(pkg.unitId) !== pkgUnitFilter) {
      return false;
    }
    if (pkgSearch.trim()) {
      const q = pkgSearch.toLowerCase().trim();
      const matchUser = (pkg.userName || "").toLowerCase().includes(q);
      const matchEmail = (pkg.userEmail || "").toLowerCase().includes(q);
      const matchUnit = (pkg.unitName || "").toLowerCase().includes(q);
      const matchId = String(pkg.id).includes(q);
      if (!matchUser && !matchEmail && !matchUnit && !matchId) return false;
    }
    return true;
  });

  async function handleViewReceipt(pkg: CreditPackage) {
    setViewingReceiptPkg(pkg);
    setReceiptData(null);
    setLoadingReceipt(true);
    try {
      const res = await getCreditPackageReceipt(pkg.id);
      setReceiptData(res.receiptImage);
    } catch (err: any) {
      toast.error(err.message || "Não foi possível carregar o comprovante.");
      setViewingReceiptPkg(null);
    } finally {
      setLoadingReceipt(false);
    }
  }

  async function handleConfirmApprove() {
    if (!pacoteParaAprovar) return;
    try {
      await approveMutation.mutateAsync(pacoteParaAprovar.id);
      toast.success(
        `Pacote #${pacoteParaAprovar.id} aprovado! 12 créditos liberados para ${pacoteParaAprovar.userName} na unidade ${pacoteParaAprovar.unitName}.`,
      );
      setPacoteParaAprovar(null);
    } catch (err: any) {
      toast.error(err.message || "Erro ao aprovar pacote de créditos.");
    }
  }

  async function handleConfirmReject() {
    if (!pacoteParaRejeitar) return;
    try {
      await rejectMutation.mutateAsync({
        id: pacoteParaRejeitar.id,
        reason: motivoRejeicao.trim() || undefined,
      });
      toast.success(`Solicitação do pacote #${pacoteParaRejeitar.id} rejeitada.`);
      setPacoteParaRejeitar(null);
      setMotivoRejeicao("");
    } catch (err: any) {
      toast.error(err.message || "Erro ao rejeitar pacote de créditos.");
    }
  }

  const txPageData = transactionsQ.data;
  const txList = txPageData?.content ?? [];
  const txTotalPages = Math.max(1, txPageData?.totalPages ?? 1);
  const txTotalElements = txPageData?.totalElements ?? 0;
  const temFiltroExtrato =
    txUserId !== "ALL" ||
    txUnitId !== "ALL" ||
    txType !== "ALL" ||
    txStartDate !== "" ||
    txEndDate !== "";

  return (
    <AppShell
      title="Pacotes de Crédito"
      description="Gerencie solicitações de compra de pacotes de 12 horas e acompanhe o extrato geral de uso de créditos."
    >
      <div className="space-y-6">
        {/* Indicadores de Resumo */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-5 shadow-soft">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-wide text-amber-700 dark:text-amber-300">
                Solicitações em Aberto
              </p>
              <Clock className="size-4 text-amber-600 dark:text-amber-400" />
            </div>
            <p className="mt-3 text-3xl font-bold text-amber-700 dark:text-amber-300">
              {stats.pending}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Aguardando conferência e aprovação</p>
          </div>

          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-5 shadow-soft">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
                Pacotes Aprovados
              </p>
              <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <p className="mt-3 text-3xl font-bold text-emerald-700 dark:text-emerald-300">
              {stats.approved}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Dentro do prazo de 30 dias</p>
          </div>

          <div className="rounded-xl border border-border bg-card p-5 shadow-soft">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Solicitações Rejeitadas
              </p>
              <XCircle className="size-4 text-destructive" />
            </div>
            <p className="mt-3 text-3xl font-bold text-card-foreground">{stats.rejected}</p>
            <p className="mt-1 text-xs text-muted-foreground">Comprovante inválido ou recusado</p>
          </div>

          <div className="rounded-xl border border-border bg-card p-5 shadow-soft">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Pacotes Expirados
              </p>
              <CalendarClock className="size-4 text-muted-foreground" />
            </div>
            <p className="mt-3 text-3xl font-bold text-card-foreground">{stats.expired}</p>
            <p className="mt-1 text-xs text-muted-foreground">Validade de 30 dias encerrada</p>
          </div>
        </div>

        {/* Abas: Solicitações de Pacotes vs Extrato Geral de Uso */}
        <Tabs defaultValue="solicitacoes" className="space-y-4">
          <TabsList className="flex-wrap">
            <TabsTrigger value="solicitacoes" className="gap-1.5">
              <Package className="size-4" />
              Solicitações de Compra ({allPackages.length})
              {stats.pending > 0 && (
                <Badge className="ml-1 bg-amber-600 text-white h-5 px-1.5">{stats.pending}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="extrato" className="gap-1.5">
              <History className="size-4" />
              Extrato Geral de Uso de Créditos
            </TabsTrigger>
          </TabsList>

          {/* ABA 1: SOLICITAÇÕES DE COMPRA DE PACOTE */}
          <TabsContent value="solicitacoes">
            <SectionCard
              title="Solicitações de Pacotes de 12 Horas"
              description="Analise o comprovante anexado pelo locatário e aprove para liberar 12 créditos válidos por 30 dias na unidade escolhida."
            >
              <div className="space-y-4">
                {/* Filtros de solicitações */}
                <div className="grid gap-3 rounded-xl border border-border bg-muted/15 p-4 md:grid-cols-12 items-end">
                  <div className="space-y-1.5 md:col-span-5">
                    <Label htmlFor="pkg-search">Buscar locatário ou unidade</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                      <Input
                        id="pkg-search"
                        placeholder="Nome, e-mail, unidade ou ID do pacote..."
                        value={pkgSearch}
                        onChange={(e) => setPkgSearch(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5 md:col-span-4">
                    <Label>Unidade</Label>
                    <Select value={pkgUnitFilter} onValueChange={setPkgUnitFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="Todas as unidades" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">Todas as unidades</SelectItem>
                        {unidades.map((u) => (
                          <SelectItem key={u.id} value={String(u.id)}>
                            {u.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5 md:col-span-3">
                    <Label>Status da Solicitação</Label>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="Todos os status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">Todos os status</SelectItem>
                        <SelectItem value="PENDING">Pendentes</SelectItem>
                        <SelectItem value="APPROVED">Aprovados</SelectItem>
                        <SelectItem value="REJECTED">Rejeitados</SelectItem>
                        <SelectItem value="EXPIRED">Expirados</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {packagesQ.isLoading ? (
                  <LoadingState />
                ) : packagesQ.error ? (
                  <ErrorState message={(packagesQ.error as Error).message} />
                ) : filteredPackages.length === 0 ? (
                  <EmptyState
                    title="Nenhuma solicitação encontrada"
                    description="Não há pacotes de crédito correspondentes aos filtros selecionados."
                  />
                ) : (
                  <div className="space-y-3">
                    {filteredPackages.map((pkg) => {
                      const pct = Math.round(
                        ((pkg.remainingCredits ?? 0) / (pkg.totalCredits || 12)) * 100,
                      );
                      return (
                        <div
                          key={pkg.id}
                          className="rounded-xl border border-border bg-card p-4 shadow-soft transition-colors hover:border-border/80"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-4">
                            <div className="space-y-1.5 min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-xs font-mono text-muted-foreground">
                                  #{pkg.id}
                                </span>
                                <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-card-foreground">
                                  <UserRound className="size-4 text-primary" />
                                  {pkg.userName}
                                </span>
                                {pkg.userEmail && (
                                  <span className="text-xs text-muted-foreground">
                                    ({pkg.userEmail})
                                  </span>
                                )}
                                <PackageStatusBadge status={pkg.status} />
                              </div>

                              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                                <span className="inline-flex items-center gap-1 font-medium text-foreground">
                                  <Building2 className="size-3.5 text-primary" />
                                  Unidade: {pkg.unitName}
                                </span>
                                <span>Pacote: {pkg.totalCredits} créditos (12h)</span>
                                <span>Solicitado em: {formatDateTime(pkg.createdAt)}</span>
                                {pkg.approvedAt && (
                                  <span>Aprovado em: {formatDateTime(pkg.approvedAt)}</span>
                                )}
                                {pkg.expiresAt && (
                                  <span className="font-medium text-foreground">
                                    Vencimento (30 dias): {formatarData(pkg.expiresAt.slice(0, 10))}
                                  </span>
                                )}
                                {pkg.reviewedByName && (
                                  <span>
                                    Analisado por: <strong>{pkg.reviewedByName}</strong> (
                                    {formatDateTime(pkg.reviewedAt)})
                                  </span>
                                )}
                              </div>

                              {pkg.status === "REJECTED" && pkg.rejectionReason && (
                                <div className="mt-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                                  <strong>Motivo da rejeição:</strong> {pkg.rejectionReason}
                                </div>
                              )}
                            </div>

                            <div className="flex flex-col items-end gap-2">
                              {pkg.status === "APPROVED" && (
                                <div className="text-right">
                                  <span className="text-xl font-bold text-primary">
                                    {pkg.remainingCredits}h
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    {" "}
                                    / {pkg.totalCredits}h disponíveis
                                  </span>
                                  <div className="mt-1 w-36 h-1.5 rounded-full bg-muted overflow-hidden">
                                    <div
                                      className="h-full bg-primary transition-all"
                                      style={{ width: `${pct}%` }}
                                    />
                                  </div>
                                </div>
                              )}

                              <div className="flex flex-wrap items-center gap-2">
                                {pkg.hasReceipt && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="gap-1.5 text-xs h-8"
                                    onClick={() => handleViewReceipt(pkg)}
                                  >
                                    <Eye className="size-3.5" />
                                    Ver Comprovante
                                  </Button>
                                )}

                                {pkg.status === "PENDING" && (
                                  <>
                                    <Button
                                      size="sm"
                                      className="gap-1.5 text-xs h-8 bg-emerald-600 hover:bg-emerald-700 text-white"
                                      onClick={() => setPacoteParaAprovar(pkg)}
                                    >
                                      <CheckCircle2 className="size-3.5" />
                                      Aprovar (Liberar 12h)
                                    </Button>
                                    <Button
                                      variant="destructive"
                                      size="sm"
                                      className="gap-1.5 text-xs h-8"
                                      onClick={() => {
                                        setPacoteParaRejeitar(pkg);
                                        setMotivoRejeicao("");
                                      }}
                                    >
                                      <XCircle className="size-3.5" />
                                      Rejeitar
                                    </Button>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </SectionCard>
          </TabsContent>

          {/* ABA 2: EXTRATO GERAL DE USO DE CRÉDITOS */}
          <TabsContent value="extrato">
            <SectionCard
              title="Extrato Geral de Uso de Créditos"
              description="Histórico auditável de todas as liberações de pacotes, reservas com créditos, estornos por cancelamento e expirações de todos os locatários."
            >
              <div className="space-y-4">
                {/* Barra de Filtros do Extrato Geral */}
                <div className="grid gap-3 rounded-xl border border-border bg-muted/15 p-4 md:grid-cols-12 items-end">
                  <div className="space-y-1.5 md:col-span-3">
                    <Label>Locatário</Label>
                    <Select
                      value={txUserId}
                      onValueChange={(v) => {
                        setTxUserId(v);
                        setTxPage(0);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Todos os locatários" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">Todos os locatários</SelectItem>
                        {locatarios.map((u) => (
                          <SelectItem key={u.id} value={String(u.id)}>
                            {u.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5 md:col-span-3">
                    <Label>Unidade</Label>
                    <Select
                      value={txUnitId}
                      onValueChange={(v) => {
                        setTxUnitId(v);
                        setTxPage(0);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Todas as unidades" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">Todas as unidades</SelectItem>
                        {unidades.map((u) => (
                          <SelectItem key={u.id} value={String(u.id)}>
                            {u.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5 md:col-span-2">
                    <Label>Movimentação</Label>
                    <Select
                      value={txType}
                      onValueChange={(v) => {
                        setTxType(v);
                        setTxPage(0);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Todos os tipos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">Todos os tipos</SelectItem>
                        <SelectItem value="PURCHASE_APPROVED">Liberação (+12h)</SelectItem>
                        <SelectItem value="RESERVATION_USAGE">Uso em Reserva</SelectItem>
                        <SelectItem value="CANCELLATION_REFUND">Estorno</SelectItem>
                        <SelectItem value="PACKAGE_EXPIRED">Expiração</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5 md:col-span-2">
                    <Label htmlFor="tx-de">Período De</Label>
                    <Input
                      id="tx-de"
                      type="date"
                      value={txStartDate}
                      onChange={(e) => {
                        setTxStartDate(e.target.value);
                        setTxPage(0);
                      }}
                    />
                  </div>

                  <div className="space-y-1.5 md:col-span-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="tx-ate">Até</Label>
                      {temFiltroExtrato && (
                        <button
                          type="button"
                          onClick={() => {
                            setTxUserId("ALL");
                            setTxUnitId("ALL");
                            setTxType("ALL");
                            setTxStartDate("");
                            setTxEndDate("");
                            setTxPage(0);
                          }}
                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-medium"
                        >
                          <X className="size-3" /> Limpar
                        </button>
                      )}
                    </div>
                    <Input
                      id="tx-ate"
                      type="date"
                      value={txEndDate}
                      onChange={(e) => {
                        setTxEndDate(e.target.value);
                        setTxPage(0);
                      }}
                    />
                  </div>
                </div>

                {transactionsQ.isLoading ? (
                  <LoadingState />
                ) : transactionsQ.error ? (
                  <ErrorState message={(transactionsQ.error as Error).message} />
                ) : txList.length === 0 ? (
                  <EmptyState
                    title="Nenhuma movimentação encontrada"
                    description="Ajuste os filtros de locatário ou período para consultar o extrato."
                  />
                ) : (
                  <>
                    <div className="space-y-2.5">
                      {txList.map((tx) => {
                        const isPositive = tx.hoursDelta > 0;
                        return (
                          <div
                            key={tx.id}
                            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4 shadow-soft"
                          >
                            <div className="space-y-1 min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="inline-flex items-center gap-1 text-sm font-semibold text-card-foreground">
                                  <UserRound className="size-3.5 text-primary" />
                                  {tx.userName}
                                </span>
                                <TransactionTypeBadge type={tx.type} />
                                {tx.unitName && (
                                  <Badge variant="outline" className="gap-1">
                                    <Building2 className="size-3" /> {tx.unitName}
                                  </Badge>
                                )}
                                {tx.roomName && (
                                  <Badge variant="secondary" className="gap-1">
                                    <DoorOpen className="size-3" /> {tx.roomName}
                                  </Badge>
                                )}
                              </div>

                              <p className="text-sm text-foreground">{tx.description}</p>

                              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                                <span>Registrado em: {formatDateTime(tx.createdAt)}</span>
                                {tx.reservationDate && (
                                  <span>
                                    Reserva: <strong>{formatarData(tx.reservationDate)}</strong>
                                    {tx.reservationStartTime && tx.reservationEndTime
                                      ? ` (${tx.reservationStartTime}–${tx.reservationEndTime})`
                                      : ""}
                                  </span>
                                )}
                                <span>Pacote #{tx.packageId}</span>
                              </div>
                            </div>

                            <div className="flex flex-col items-end">
                              <span
                                className={`text-base font-bold ${
                                  isPositive
                                    ? "text-emerald-600 dark:text-emerald-400"
                                    : "text-destructive"
                                }`}
                              >
                                {isPositive ? `+${tx.hoursDelta}h` : `${tx.hoursDelta}h`}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                Saldo do pacote após: <strong>{tx.balanceAfter}h</strong>
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Paginação do Extrato Geral */}
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4 text-xs text-muted-foreground">
                      <div className="flex flex-wrap items-center gap-3">
                        <span>
                          Total de <strong>{txTotalElements}</strong> movimentação(ões)
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span>Exibir:</span>
                          <Select
                            value={String(txPageSize)}
                            onValueChange={(v) => {
                              setTxPageSize(Number(v));
                              setTxPage(0);
                            }}
                          >
                            <SelectTrigger className="h-7 w-[72px] text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="10">10</SelectItem>
                              <SelectItem value="20">20</SelectItem>
                              <SelectItem value="30">30</SelectItem>
                              <SelectItem value="50">50</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={txPage <= 0}
                          onClick={() => setTxPage((p) => Math.max(0, p - 1))}
                          className="h-8 px-2.5"
                        >
                          <ChevronLeft className="size-4 mr-1" /> Anterior
                        </Button>
                        <span className="px-2 font-medium text-foreground">
                          Página {txPage + 1} de {txTotalPages}
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={txPage + 1 >= txTotalPages}
                          onClick={() => setTxPage((p) => p + 1)}
                          className="h-8 px-2.5"
                        >
                          Próxima <ChevronRight className="size-4 ml-1" />
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </SectionCard>
          </TabsContent>
        </Tabs>
      </div>

      {/* Modal: Confirmar Aprovação de Pacote */}
      <Dialog
        open={!!pacoteParaAprovar}
        onOpenChange={(v) => !v && setPacoteParaAprovar(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Coins className="size-5 text-emerald-600" />
              Aprovar Pacote de 12 Horas?
            </DialogTitle>
            <DialogDescription>
              Ao aprovar esta solicitação, <strong>12 créditos (12 horas)</strong> serão liberados
              imediatamente para o locatário na unidade selecionada, com validade de{" "}
              <strong>30 dias corridos</strong> a partir de hoje.
            </DialogDescription>
          </DialogHeader>

          {pacoteParaAprovar && (
            <div className="rounded-lg border border-border bg-muted/20 p-3 text-xs space-y-1">
              <p>
                <strong>Solicitação:</strong> #{pacoteParaAprovar.id}
              </p>
              <p>
                <strong>Locatário:</strong> {pacoteParaAprovar.userName} ({pacoteParaAprovar.userEmail})
              </p>
              <p>
                <strong>Unidade vinculada:</strong> {pacoteParaAprovar.unitName}
              </p>
              <p>
                <strong>Créditos liberados:</strong> 12 horas inteiras
              </p>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPacoteParaAprovar(null)}
              disabled={approveMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmApprove}
              disabled={approveMutation.isPending}
              className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {approveMutation.isPending && <Loader2 className="size-4 animate-spin" />}
              Confirmar e Liberar 12h
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Rejeitar Solicitação de Pacote */}
      <Dialog
        open={!!pacoteParaRejeitar}
        onOpenChange={(v) => !v && setPacoteParaRejeitar(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <XCircle className="size-5" />
              Rejeitar Solicitação de Pacote
            </DialogTitle>
            <DialogDescription>
              A solicitação será marcada como rejeitada e o locatário poderá visualizar o motivo informado abaixo.
            </DialogDescription>
          </DialogHeader>

          {pacoteParaRejeitar && (
            <div className="space-y-3 py-1">
              <div className="rounded-lg border border-border bg-muted/20 p-3 text-xs space-y-1">
                <p>
                  <strong>Solicitação:</strong> #{pacoteParaRejeitar.id} — {pacoteParaRejeitar.userName}
                </p>
                <p>
                  <strong>Unidade:</strong> {pacoteParaRejeitar.unitName}
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="motivo-rejeicao">Motivo da rejeição (opcional)</Label>
                <Textarea
                  id="motivo-rejeicao"
                  value={motivoRejeicao}
                  onChange={(e) => setMotivoRejeicao(e.target.value)}
                  placeholder="Ex.: Comprovante ilegível ou valor divergente do pacote de 12 horas."
                  maxLength={500}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPacoteParaRejeitar(null)}
              disabled={rejectMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmReject}
              disabled={rejectMutation.isPending}
              className="gap-2"
            >
              {rejectMutation.isPending && <Loader2 className="size-4 animate-spin" />}
              Rejeitar Solicitação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Visualizar Comprovante do Pacote */}
      <Dialog
        open={!!viewingReceiptPkg}
        onOpenChange={(v) => !v && setViewingReceiptPkg(null)}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Comprovante — Pacote #{viewingReceiptPkg?.id} ({viewingReceiptPkg?.userName})
            </DialogTitle>
            <DialogDescription>
              Unidade: {viewingReceiptPkg?.unitName} · Solicitado em{" "}
              {formatDateTime(viewingReceiptPkg?.createdAt)}
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center min-h-60 rounded-lg bg-black/90 p-2 overflow-hidden">
            {loadingReceipt ? (
              <div className="flex items-center gap-2 text-white text-sm">
                <Loader2 className="size-4 animate-spin" /> Carregando comprovante...
              </div>
            ) : receiptData ? (
              <img
                src={receiptData}
                alt="Comprovante do pacote"
                className="max-h-[65vh] max-w-full object-contain"
              />
            ) : (
              <span className="text-xs text-muted-foreground">Comprovante indisponível.</span>
            )}
          </div>
          <DialogFooter className="flex-wrap gap-2">
            {viewingReceiptPkg?.status === "PENDING" && (
              <>
                <Button
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                  onClick={() => {
                    const pkg = viewingReceiptPkg;
                    setViewingReceiptPkg(null);
                    setPacoteParaAprovar(pkg);
                  }}
                >
                  <CheckCircle2 className="size-4" />
                  Aprovar Pacote
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  className="gap-1.5"
                  onClick={() => {
                    const pkg = viewingReceiptPkg;
                    setViewingReceiptPkg(null);
                    setPacoteParaRejeitar(pkg);
                    setMotivoRejeicao("");
                  }}
                >
                  <XCircle className="size-4" />
                  Rejeitar
                </Button>
              </>
            )}
            <Button variant="outline" onClick={() => setViewingReceiptPkg(null)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

