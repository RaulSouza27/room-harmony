import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Coins,
  PlusCircle,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Building2,
  FileText,
  History,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Loader2,
  Eye,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { EmptyState, ErrorState, LoadingState, SectionCard } from "@/components/common";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import {
  useMyCreditPackages,
  useCreateCreditPackageRequest,
  useMyCreditTransactions,
  useUnidades,
} from "@/hooks/useApi";
import { getCreditPackageReceipt } from "@/services/api";
import type { CreditPackageStatus, CreditTransactionType } from "@/types";
import { toast } from "sonner";

export const Route = createFileRoute("/app/creditos")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Meus Créditos (Pacotes 12h) — Clínica Escuta" },
      {
        name: "description",
        content:
          "Compre pacotes de 12 créditos (horas), consulte validade por unidade e acompanhe seu extrato de uso.",
      },
    ],
  }),
  component: MeusCreditosPage,
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

function formatDateOnly(iso?: string | null) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
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
          <CheckCircle2 className="size-3" /> Ativo / Aprovado
        </Badge>
      );
    case "PENDING":
      return (
        <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 gap-1">
          <Clock className="size-3" /> Aguardando Aprovação
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
        <Badge variant="outline" className="text-muted-foreground gap-1">
          <AlertTriangle className="size-3" /> Expirado (30 dias)
        </Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

function TransactionTypeBadge({ type }: { type: CreditTransactionType }) {
  switch (type) {
    case "CREDITO_PACOTE":
      return (
        <Badge className="bg-emerald-600 text-white hover:bg-emerald-700">
          Compra Aprovada (+12h)
        </Badge>
      );
    case "USO_RESERVA":
      return (
        <Badge className="bg-sky-600 text-white hover:bg-sky-700">
          Uso em Reserva
        </Badge>
      );
    case "ESTORNO_CANCELAMENTO":
      return (
        <Badge className="bg-purple-600 text-white hover:bg-purple-700">
          Estorno por Cancelamento
        </Badge>
      );
    case "AJUSTE_EDICAO":
      return (
        <Badge className="bg-amber-600 text-white hover:bg-amber-700">
          Ajuste de Edição
        </Badge>
      );
    case "EXPIRACAO":
      return (
        <Badge variant="outline" className="text-muted-foreground">
          Expiração de Prazo
        </Badge>
      );
    default:
      return <Badge variant="outline">{type}</Badge>;
  }
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (err) => reject(err);
  });
}

function MeusCreditosPage() {
  const { user } = useAuth();
  const unidadesQ = useUnidades();
  const packagesQ = useMyCreditPackages();

  const [tab, setTab] = useState("pacotes");
  const [buyModalOpen, setBuyModalOpen] = useState(false);
  const [selectedUnitId, setSelectedUnitId] = useState("");
  const [receiptBase64, setReceiptBase64] = useState("");
  const [viewingReceiptImg, setViewingReceiptImg] = useState<string | null>(null);
  const [loadingReceipt, setLoadingReceipt] = useState(false);

  // Filtros do extrato
  const [txUnitFilter, setTxUnitFilter] = useState("ALL");
  const [txTypeFilter, setTxTypeFilter] = useState("ALL");
  const [txStartDate, setTxStartDate] = useState("");
  const [txEndDate, setTxEndDate] = useState("");

  const txParams = useMemo(
    () => ({
      ...(txUnitFilter !== "ALL" ? { unitId: Number(txUnitFilter) } : {}),
      ...(txTypeFilter !== "ALL" ? { type: txTypeFilter } : {}),
      ...(txStartDate ? { startDate: txStartDate } : {}),
      ...(txEndDate ? { endDate: txEndDate } : {}),
    }),
    [txUnitFilter, txTypeFilter, txStartDate, txEndDate]
  );

  const transactionsQ = useMyCreditTransactions(txParams);
  const createPackageMut = useCreateCreditPackageRequest();

  const unidadesAtivas = useMemo(() => {
    const all = unidadesQ.data ?? [];
    return all.filter(
      (u) =>
        u.status === "ativa" &&
        (!user?.unidades || user.unidades.length === 0 || user.unidades.includes(u.id))
    );
  }, [unidadesQ.data, user]);

  const packages = packagesQ.data ?? [];
  const transactions = transactionsQ.data ?? [];

  // Saldo consolidado por unidade (apenas pacotes APPROVED e dentro da validade)
  const saldoPorUnidade = useMemo(() => {
    const now = new Date();
    const map = new Map<
      number,
      {
        unitId: number;
        unitName: string;
        totalRemaining: number;
        activePackages: typeof packages;
      }
    >();

    for (const p of packages) {
      if (
        p.status === "APPROVED" &&
        p.remainingCredits > 0 &&
        (!p.expiresAt || new Date(p.expiresAt) >= now)
      ) {
        const entry = map.get(p.unitId) ?? {
          unitId: p.unitId,
          unitName: p.unitName,
          totalRemaining: 0,
          activePackages: [],
        };
        entry.totalRemaining += p.remainingCredits;
        entry.activePackages.push(p);
        map.set(p.unitId, entry);
      }
    }

    // Ordena os pacotes ativos de cada unidade pelo que vence antes (FEFO)
    for (const entry of map.values()) {
      entry.activePackages.sort((a, b) =>
        (a.expiresAt || "").localeCompare(b.expiresAt || "")
      );
    }

    return Array.from(map.values());
  }, [packages]);

  const totalCreditosDisponiveis = useMemo(
    () => saldoPorUnidade.reduce((acc, u) => acc + u.totalRemaining, 0),
    [saldoPorUnidade]
  );

  const handleOpenBuyModal = () => {
    setSelectedUnitId(unidadesAtivas[0]?.id ?? "");
    setReceiptBase64("");
    setBuyModalOpen(true);
  };

  const handleSubmitPurchase = async () => {
    if (!selectedUnitId) {
      toast.error("Selecione a unidade.");
      return;
    }
    if (!receiptBase64) {
      toast.error("Anexe o comprovante de pagamento.");
      return;
    }
    await createPackageMut.mutateAsync({
      unitId: Number(selectedUnitId),
      receiptImage: receiptBase64,
    });
    setBuyModalOpen(false);
  };

  const handleViewReceipt = async (pkgId: number) => {
    setLoadingReceipt(true);
    try {
      const img = await getCreditPackageReceipt(pkgId);
      if (img && img !== "empty") {
        setViewingReceiptImg(img);
      } else {
        toast.error("Comprovante não encontrado.");
      }
    } catch (e: any) {
      toast.error(e.message || "Erro ao abrir comprovante.");
    } finally {
      setLoadingReceipt(false);
    }
  };

  return (
    <AppShell
      title="Meus Créditos (Pacotes de 12h)"
      description="Adquira pacotes de 12 horas por unidade, reserve salas com aprovação automática e acompanhe seu extrato."
      actions={
        <Button size="sm" onClick={handleOpenBuyModal} className="gap-1.5">
          <PlusCircle className="size-4" />
          Comprar Pacote (12h)
        </Button>
      }
    >
      <div className="space-y-6">
        {/* Resumo de Saldo por Unidade */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-5 shadow-soft">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                Saldo Total Disponível
              </p>
              <Coins className="size-5 text-primary" />
            </div>
            <p className="mt-3 text-3xl font-bold text-foreground">
              {totalCreditosDisponiveis}h
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              1 crédito = 1 hora inteira · Uso automático sem fila de aprovação
            </p>
          </div>

          {saldoPorUnidade.map((u) => {
            const nextExpiring = u.activePackages[0];
            return (
              <div
                key={u.unitId}
                className="rounded-xl border border-border bg-card p-5 shadow-soft flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                      <Building2 className="size-3.5 text-primary" />
                      {u.unitName}
                    </p>
                    <Badge variant="secondary">{u.activePackages.length} pacote(s) ativo(s)</Badge>
                  </div>
                  <p className="mt-3 text-2xl font-semibold text-card-foreground">
                    {u.totalRemaining} crédito(s){" "}
                    <span className="text-sm font-normal text-muted-foreground">disponíveis</span>
                  </p>
                </div>
                {nextExpiring?.expiresAt && (
                  <p className="mt-2 text-xs text-amber-600 dark:text-amber-400 font-medium">
                    Próximo vencimento: {formatDateOnly(nextExpiring.expiresAt)} (
                    {nextExpiring.remainingCredits}h restantes neste pacote)
                  </p>
                )}
              </div>
            );
          })}
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="pacotes" className="gap-1.5">
              <Coins className="size-4" />
              Meus Pacotes e Solicitações ({packages.length})
            </TabsTrigger>
            <TabsTrigger value="extrato" className="gap-1.5">
              <History className="size-4" />
              Extrato de Uso ({transactions.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pacotes" className="mt-4 space-y-4">
            <div className="rounded-xl border border-border bg-muted/20 p-4 text-xs text-muted-foreground space-y-1">
              <p className="font-semibold text-foreground">Regras de uso dos pacotes de 12 horas:</p>
              <ul className="list-disc pl-4 space-y-0.5">
                <li>Cada pacote aprovado libera <strong>12 créditos (12 horas)</strong> exclusivos para a unidade escolhida.</li>
                <li>Validade de <strong>30 dias corridos</strong> a partir da aprovação: a reserva precisa <strong>acontecer</strong> dentro da validade do pacote.</li>
                <li>Quando você possui mais de um pacote ativo na mesma unidade, o sistema consome automaticamente o pacote que <strong>vence mais cedo</strong>.</li>
                <li>Cancelamentos feitos com <strong>24h ou mais de antecedência</strong> devolvem os créditos automaticamente ao pacote.</li>
              </ul>
            </div>

            {packagesQ.isLoading ? (
              <LoadingState label="Carregando seus pacotes..." />
            ) : packagesQ.error ? (
              <ErrorState message={(packagesQ.error as Error).message} />
            ) : packages.length === 0 ? (
              <EmptyState
                title="Você ainda não solicitou pacotes de créditos"
                description="Adquira um pacote de 12 créditos para reservar salas diretamente sem aguardar aprovação a cada reserva."
                action={
                  <Button size="sm" onClick={handleOpenBuyModal}>
                    Solicitar meu primeiro pacote (12h)
                  </Button>
                }
              />
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {packages.map((pkg) => {
                  const pct =
                    pkg.totalCredits > 0
                      ? Math.round((pkg.remainingCredits / pkg.totalCredits) * 100)
                      : 0;
                  return (
                    <div
                      key={pkg.id}
                      className="rounded-xl border border-border bg-card p-5 shadow-soft flex flex-col justify-between gap-4"
                    >
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-mono text-muted-foreground">
                                Pacote #{pkg.id}
                              </span>
                              <PackageStatusBadge status={pkg.status} />
                            </div>
                            <h3 className="mt-1 text-base font-semibold text-card-foreground flex items-center gap-1.5">
                              <Building2 className="size-4 text-primary" />
                              {pkg.unitName}
                            </h3>
                          </div>

                          <div className="text-right">
                            <span className="text-2xl font-bold text-card-foreground">
                              {pkg.remainingCredits}h
                            </span>
                            <span className="text-xs text-muted-foreground block">
                              de {pkg.totalCredits}h
                            </span>
                          </div>
                        </div>

                        {pkg.status === "APPROVED" && (
                          <div className="space-y-1">
                            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                              <div
                                className="h-full rounded-full bg-primary transition-all"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <div className="flex justify-between text-[11px] text-muted-foreground">
                              <span>
                                Usados: {pkg.totalCredits - pkg.remainingCredits}h
                              </span>
                              <span className="font-medium text-foreground">
                                Válido para reservas até: {formatDateOnly(pkg.expiresAt)}
                              </span>
                            </div>
                          </div>
                        )}

                        {pkg.status === "REJECTED" && pkg.rejectionReason && (
                          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
                            <strong>Motivo da rejeição:</strong> {pkg.rejectionReason}
                          </div>
                        )}

                        <div className="text-xs text-muted-foreground space-y-0.5 pt-1 border-t border-border/60">
                          <p>Solicitado em: {formatDateTime(pkg.createdAt)}</p>
                          {pkg.reviewedAt && (
                            <p>
                              Avaliado em: {formatDateTime(pkg.reviewedAt)}
                              {pkg.reviewedByName ? ` por ${pkg.reviewedByName}` : ""}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5 text-xs"
                          disabled={loadingReceipt}
                          onClick={() => handleViewReceipt(pkg.id)}
                        >
                          <Eye className="size-3.5" />
                          Ver comprovante enviado
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="extrato" className="mt-4 space-y-4">
            {/* Barra de Filtros do Extrato */}
            <div className="grid gap-4 rounded-xl border border-border bg-card p-4 shadow-soft sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1.5">
                <Label>Unidade</Label>
                <Select value={txUnitFilter} onValueChange={setTxUnitFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Todas as unidades</SelectItem>
                    {(unidadesQ.data ?? []).map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Tipo de Movimentação</Label>
                <Select value={txTypeFilter} onValueChange={setTxTypeFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Todos os tipos</SelectItem>
                    <SelectItem value="CREDITO_PACOTE">Compra de Pacote (+12h)</SelectItem>
                    <SelectItem value="USO_RESERVA">Uso em Reserva</SelectItem>
                    <SelectItem value="ESTORNO_CANCELAMENTO">Devolução por Cancelamento</SelectItem>
                    <SelectItem value="AJUSTE_EDICAO">Ajuste de Edição</SelectItem>
                    <SelectItem value="EXPIRACAO">Expiração de Prazo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>De</Label>
                <Input
                  type="date"
                  value={txStartDate}
                  onChange={(e) => setTxStartDate(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Até</Label>
                <Input
                  type="date"
                  value={txEndDate}
                  onChange={(e) => setTxEndDate(e.target.value)}
                />
              </div>
            </div>

            {transactionsQ.isLoading ? (
              <LoadingState label="Carregando extrato de créditos..." />
            ) : transactionsQ.error ? (
              <ErrorState message={(transactionsQ.error as Error).message} />
            ) : transactions.length === 0 ? (
              <EmptyState
                title="Nenhuma movimentação encontrada"
                description="Seus créditos aprovados, usos em reservas e devoluções por cancelamento aparecerão aqui."
              />
            ) : (
              <div className="rounded-xl border border-border bg-card shadow-soft overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-muted/50 text-muted-foreground text-xs uppercase font-medium border-b border-border">
                      <tr>
                        <th className="py-3 px-4">Data / Hora</th>
                        <th className="py-3 px-4">Unidade / Pacote</th>
                        <th className="py-3 px-4">Tipo</th>
                        <th className="py-3 px-4">Descrição (Sala / Horário)</th>
                        <th className="py-3 px-4 text-right">Horas</th>
                        <th className="py-3 px-4 text-right">Saldo do Pacote Após</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {transactions.map((tx) => {
                        const isPositive = tx.amount > 0;
                        return (
                          <tr key={tx.id} className="hover:bg-muted/30 transition-colors">
                            <td className="py-3 px-4 whitespace-nowrap text-xs text-muted-foreground">
                              {formatDateTime(tx.createdAt)}
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap">
                              <span className="font-medium text-card-foreground">
                                {tx.unitName}
                              </span>
                              <span className="block text-xs text-muted-foreground">
                                Pacote #{tx.packageId}
                              </span>
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap">
                              <TransactionTypeBadge type={tx.type} />
                            </td>
                            <td className="py-3 px-4 text-card-foreground">
                              {tx.description}
                            </td>
                            <td className="py-3 px-4 text-right whitespace-nowrap font-semibold">
                              <span
                                className={
                                  isPositive
                                    ? "text-emerald-600 dark:text-emerald-400 inline-flex items-center gap-0.5"
                                    : "text-rose-600 dark:text-rose-400 inline-flex items-center gap-0.5"
                                }
                              >
                                {isPositive ? (
                                  <ArrowUpRight className="size-3.5" />
                                ) : (
                                  <ArrowDownRight className="size-3.5" />
                                )}
                                {isPositive ? `+${tx.amount}h` : `${tx.amount}h`}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right whitespace-nowrap font-mono text-xs font-semibold">
                              {tx.balanceAfter}h
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Modal de Solicitação de Compra de Pacote */}
      <Dialog open={buyModalOpen} onOpenChange={setBuyModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Coins className="size-5 text-primary" />
              Solicitar Pacote de 12 Créditos
            </DialogTitle>
            <DialogDescription>
              Escolha a unidade desejada e anexe o comprovante de pagamento. Assim que aprovado pela administração, os 12 créditos (horas) serão liberados por 30 dias.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Unidade de Utilização *</Label>
              <Select value={selectedUnitId} onValueChange={setSelectedUnitId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a unidade" />
                </SelectTrigger>
                <SelectContent>
                  {unidadesAtivas.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">
                Atenção: Os créditos valem exclusivamente na unidade escolhida acima.
              </p>
            </div>

            <div className="rounded-lg border border-border bg-muted/20 p-3 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Quantidade do pacote:</span>
              <span className="font-bold text-foreground">12 créditos (12 horas inteiras)</span>
            </div>

            <div className="space-y-2">
              <Label>Comprovante de Pagamento *</Label>
              {receiptBase64 ? (
                <div className="relative border border-border rounded-lg p-2 bg-muted/10">
                  <div className="relative aspect-video rounded overflow-hidden bg-black flex items-center justify-center h-40">
                    <img
                      src={receiptBase64}
                      alt="Comprovante do pacote"
                      className="max-w-full max-h-full object-contain"
                    />
                    <button
                      type="button"
                      onClick={() => setReceiptBase64("")}
                      className="absolute top-1 right-1 bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-full p-1 text-[10px]"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center cursor-pointer border border-dashed border-border rounded-lg p-4 h-28 bg-muted/20 hover:bg-muted/30 transition-colors">
                  <FileText className="size-5 text-primary mb-1" />
                  <span className="text-sm font-medium text-foreground">
                    Anexar Comprovante de Pagamento
                  </span>
                  <span className="text-xs text-muted-foreground mt-0.5">
                    Clique para enviar imagem (PNG, JPG, WEBP)
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        try {
                          const b64 = await fileToBase64(file);
                          setReceiptBase64(b64);
                        } catch {
                          toast.error("Não foi possível ler a imagem selecionada.");
                        }
                      }
                    }}
                  />
                </label>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setBuyModalOpen(false)}
              disabled={createPackageMut.isPending}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubmitPurchase}
              disabled={!selectedUnitId || !receiptBase64 || createPackageMut.isPending}
              className="gap-2"
            >
              {createPackageMut.isPending && <Loader2 className="size-4 animate-spin" />}
              Enviar Solicitação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Visualizador de Comprovante */}
      <Dialog
        open={!!viewingReceiptImg}
        onOpenChange={(v) => !v && setViewingReceiptImg(null)}
      >
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Comprovante do Pacote de Créditos</DialogTitle>
          </DialogHeader>
          {viewingReceiptImg && (
            <div className="rounded-lg overflow-hidden bg-black flex items-center justify-center max-h-[70vh]">
              <img
                src={viewingReceiptImg}
                alt="Comprovante"
                className="max-w-full max-h-[70vh] object-contain"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

