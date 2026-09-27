import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useCallback } from "react";
import {
  ShieldCheck,
  Search,
  RefreshCw,
  Info,
  Calendar,
  User,
  Activity,
  Layers,
  ChevronLeft,
  ChevronRight,
  Clock,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fetchAuditLogs, type AuditLogItem } from "@/services/auditService";
import { EmptyState, ErrorState, LoadingState } from "@/components/common";

export const Route = createFileRoute("/app/auditoria")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Histórico de Auditoria — Clínica Escuta" },
      {
        name: "description",
        content: "Rastreabilidade e log de auditoria das atividades do sistema.",
      },
    ],
  }),
  component: AuditoriaPage,
});

function AuditoriaPage() {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("ALL");
  const [targetTypeFilter, setTargetTypeFilter] = useState<string>("ALL");

  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchAuditLogs({
        page,
        size: 15,
        search: debouncedSearch || undefined,
        action: actionFilter !== "ALL" ? actionFilter : undefined,
        targetType: targetTypeFilter !== "ALL" ? targetTypeFilter : undefined,
      });
      setLogs(res.content || []);
      setTotalPages(res.totalPages || 1);
      setTotalElements(res.totalElements || 0);
    } catch (err: any) {
      console.error("Erro ao carregar auditoria:", err);
      setError(err.message || "Erro ao carregar registros de auditoria.");
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, actionFilter, targetTypeFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const formatActionBadge = (action: string) => {
    switch (action) {
      case "SOLICITACAO_RESERVA":
        return <Badge className="bg-blue-600 text-white hover:bg-blue-700">Solicitação Reserva</Badge>;
      case "APROVACAO_RESERVA":
        return <Badge className="bg-emerald-600 text-white hover:bg-emerald-700">Aprovação Reserva</Badge>;
      case "REJEICAO_RESERVA":
        return <Badge className="bg-amber-600 text-white hover:bg-amber-700">Rejeição Reserva</Badge>;
      case "EXCLUSAO_RESERVA":
      case "EXCLUSAO_LOTE_RESERVA":
        return <Badge className="bg-rose-600 text-white hover:bg-rose-700">Exclusão Reserva</Badge>;
      case "GERACAO_LICENCA_USUARIO":
        return <Badge className="bg-purple-600 text-white hover:bg-purple-700">Geração Licença</Badge>;
      case "ALTERACAO_USUARIO":
        return <Badge className="bg-indigo-600 text-white hover:bg-indigo-700">Alteração Usuário</Badge>;
      case "RESET_SENHA_USUARIO":
      case "PRIMEIRO_ACESSO_SENHA":
        return <Badge className="bg-cyan-600 text-white hover:bg-cyan-700">Reset de Senha</Badge>;
      case "CRIACAO_SALA":
      case "ALTERACAO_SALA":
      case "DESATIVACAO_SALA":
        return <Badge className="bg-orange-600 text-white hover:bg-orange-700">Gestão de Sala</Badge>;
      case "CRIACAO_UNIDADE":
      case "ALTERACAO_UNIDADE":
      case "DESATIVACAO_UNIDADE":
        return <Badge className="bg-teal-600 text-white hover:bg-teal-700">Gestão de Unidade</Badge>;
      default:
        return <Badge variant="outline">{action}</Badge>;
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "-";
    try {
      const d = new Date(dateStr);
      return d.toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  const formatTargetName = (rawName?: string | null, targetType?: string | null) => {
    if (!rawName) return targetType || "-";
    const cleaned = rawName.replace(/\s*\(\s*ID:\s*null\s*\)/gi, "").trim();
    return cleaned || targetType || "-";
  };

  return (
    <AppShell
      title="Histórico de Auditoria"
      description="Monitoramento e rastreabilidade de todas as atividades administrativas e operacionais."
      actions={
        <Button variant="outline" size="sm" onClick={loadData} disabled={loading} className="gap-2">
          <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
          Atualizar
        </Button>
      }
    >
      <div className="space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="bg-card/50 shadow-xs border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Registrado
              </CardTitle>
              <Activity className="size-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalElements}</div>
              <p className="text-xs text-muted-foreground mt-1">Eventos auditados no sistema</p>
            </CardContent>
          </Card>

          <Card className="bg-card/50 shadow-xs border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Página Atual
              </CardTitle>
              <Layers className="size-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {totalPages > 0 ? page + 1 : 0} <span className="text-sm font-normal text-muted-foreground">de {totalPages}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Exibindo 15 registros por página</p>
            </CardContent>
          </Card>

          <Card className="bg-card/50 shadow-xs border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Status Auditoria
              </CardTitle>
              <ShieldCheck className="size-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">Ativo</div>
              <p className="text-xs text-muted-foreground mt-1">Monitoramento em tempo real</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters bar */}
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-card p-4 rounded-xl border shadow-xs">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por usuário, e-mail, recurso ou detalhes..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              className="pl-9"
            />
          </div>

          <div className="flex flex-wrap sm:flex-nowrap gap-2">
            <Select
              value={targetTypeFilter}
              onValueChange={(val) => {
                setTargetTypeFilter(val);
                setPage(0);
              }}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Tipo de Recurso" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos os Recursos</SelectItem>
                <SelectItem value="RESERVA">Reservas</SelectItem>
                <SelectItem value="USUARIO">Usuários / Licenças</SelectItem>
                <SelectItem value="SALA">Salas</SelectItem>
                <SelectItem value="UNIDADE">Unidades</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={actionFilter}
              onValueChange={(val) => {
                setActionFilter(val);
                setPage(0);
              }}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Ação" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todas as Ações</SelectItem>
                <SelectItem value="SOLICITACAO_RESERVA">Solicitação de Reserva</SelectItem>
                <SelectItem value="APROVACAO_RESERVA">Aprovação de Reserva</SelectItem>
                <SelectItem value="REJEICAO_RESERVA">Rejeição de Reserva</SelectItem>
                <SelectItem value="EXCLUSAO_RESERVA">Exclusão de Reserva</SelectItem>
                <SelectItem value="GERACAO_LICENCA_USUARIO">Geração de Licença</SelectItem>
                <SelectItem value="ALTERACAO_USUARIO">Alteração de Usuário</SelectItem>
                <SelectItem value="CRIACAO_SALA">Criação de Sala</SelectItem>
                <SelectItem value="ALTERACAO_SALA">Alteração de Sala</SelectItem>
                <SelectItem value="DESATIVACAO_SALA">Desativação de Sala</SelectItem>
                <SelectItem value="CRIACAO_UNIDADE">Criação de Unidade</SelectItem>
                <SelectItem value="ALTERACAO_UNIDADE">Alteração de Unidade</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Content Table */}
        {loading ? (
          <LoadingState message="Carregando histórico de auditoria..." />
        ) : error ? (
          <ErrorState message={error} onRetry={loadData} />
        ) : logs.length === 0 ? (
          <EmptyState
            title="Nenhum registro encontrado"
            description="Não foram encontrados registros de auditoria com os filtros selecionados."
          />
        ) : (
          <div className="bg-card rounded-xl border shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted/50 text-muted-foreground text-xs uppercase font-medium border-b">
                  <tr>
                    <th className="py-3 px-4">Data / Hora</th>
                    <th className="py-3 px-4">Ator (Usuário)</th>
                    <th className="py-3 px-4">Ação Executada</th>
                    <th className="py-3 px-4">Recurso Atingido</th>
                    <th className="py-3 px-4 text-right">Detalhes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {logs.map((log) => (
                    <tr
                      key={log.id}
                      className="hover:bg-muted/30 transition-colors cursor-pointer"
                      onClick={() => setSelectedLog(log)}
                    >
                      <td className="py-3.5 px-4 font-mono text-xs text-muted-foreground whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Clock className="size-3.5 shrink-0 text-muted-foreground" />
                          {formatDate(log.createdAt)}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col">
                          <span className="font-medium text-foreground">{log.userName}</span>
                          <span className="text-xs text-muted-foreground">{log.userEmail}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {formatActionBadge(log.action)}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium">{formatTargetName(log.targetName, log.targetType)}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedLog(log);
                          }}
                        >
                          <Info className="size-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination controls */}
            <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/20 text-xs text-muted-foreground">
              <div>
                Página <span className="font-medium">{page + 1}</span> de{" "}
                <span className="font-medium">{totalPages}</span> ({totalElements} registros no total)
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 0 || loading}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  className="h-8 w-8 p-0"
                >
                  <ChevronLeft className="size-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page + 1 >= totalPages || loading}
                  onClick={() => setPage((p) => p + 1)}
                  className="h-8 w-8 p-0"
                >
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Detalhes */}
        <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ShieldCheck className="size-5 text-primary" />
                Detalhes do Registro de Auditoria
              </DialogTitle>
              <DialogDescription>
                Informações completas gravadas para esta operação.
              </DialogDescription>
            </DialogHeader>

            {selectedLog && (
              <div className="space-y-4 py-2 text-sm">
                <div className="grid grid-cols-2 gap-3 bg-muted/40 p-3 rounded-lg border">
                  <div>
                    <span className="text-xs text-muted-foreground block">ID do Registro</span>
                    <span className="font-mono font-medium">#{selectedLog.id}</span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block">Data e Hora</span>
                    <span className="font-medium">{formatDate(selectedLog.createdAt)}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                    <User className="size-3.5" /> Ator (Responsável)
                  </div>
                  <div className="bg-card p-3 rounded-lg border space-y-1">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Nome:</span>
                      <span className="font-medium">{selectedLog.userName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">E-mail:</span>
                      <span>{selectedLog.userEmail}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Nível de Acesso:</span>
                      <Badge variant="outline">{selectedLog.userRole || "Profissional"}</Badge>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                    <Activity className="size-3.5" /> Ação e Recurso
                  </div>
                  <div className="bg-card p-3 rounded-lg border space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Ação:</span>
                      {formatActionBadge(selectedLog.action)}
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tipo de Recurso:</span>
                      <span className="font-medium">{selectedLog.targetType}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Recurso Atingido:</span>
                      <span className="font-medium">{formatTargetName(selectedLog.targetName, selectedLog.targetType)}</span>
                    </div>
                  </div>
                </div>

                {selectedLog.details && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                      <Info className="size-3.5" /> Observações e Detalhes
                    </div>
                    <div className="bg-card p-3 rounded-lg border">
                      <div className="bg-muted p-2 rounded text-xs font-mono whitespace-pre-wrap">
                        {selectedLog.details}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
}
