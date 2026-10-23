import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  EyeOff,
  Info,
  MessageSquareWarning,
  RotateCcw,
  Search,
  Send,
  ShieldAlert,
  UserCheck,
  X,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { ConfirmDialog } from "@/components/ReservaActions";
import { EmptyState, ErrorState, LoadingState } from "@/components/common";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import {
  useComplaintQuota,
  useComplaints,
  useCreateComplaint,
  useUpdateComplaintSolved,
} from "@/hooks/useApi";

const MAX_LENGTH = 255;
const ITEMS_PER_PAGE = 10;

export const Route = createFileRoute("/app/ouvidoria")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Ouvidoria — Clínica Escuta" },
      {
        name: "description",
        content:
          "Canal de Ouvidoria para envio e gestão de reclamações, sugestões e relatos.",
      },
      { property: "og:title", content: "Ouvidoria — Clínica Escuta" },
      {
        property: "og:description",
        content: "Envie manifestações de forma identificada ou anônima.",
      },
    ],
  }),
  component: OuvidoriaPage,
});

function OuvidoriaPage() {
  const { isAdmin } = useAuth();
  return isAdmin ? <AdminOuvidoriaView /> : <LocadorOuvidoriaView />;
}

/* ========================================================================== */
/*                            VISÃO DO LOCATÁRIO                              */
/* ========================================================================== */

function LocadorOuvidoriaView() {
  const { user } = useAuth();
  const quotaQ = useComplaintQuota(true);
  const criar = useCreateComplaint();

  const [texto, setTexto] = useState("");
  const [anonimo, setAnonimo] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [ultimoEnvioSucesso, setUltimoEnvioSucesso] = useState(false);

  const used = quotaQ.data?.used ?? 0;
  const limit = quotaQ.data?.limit ?? 3;
  const remaining = quotaQ.data?.remaining ?? Math.max(0, limit - used);

  const textoLimpo = texto.trim();
  const podeEnviar =
    textoLimpo.length > 0 &&
    textoLimpo.length <= MAX_LENGTH &&
    remaining > 0 &&
    !criar.isPending;

  const handleConfirmSend = async () => {
    if (!podeEnviar) return;
    await criar.mutateAsync({
      complaints: textoLimpo,
      anonymous: anonimo,
    });
    setTexto("");
    setConfirmOpen(false);
    setUltimoEnvioSucesso(true);
  };

  return (
    <AppShell
      title="Ouvidoria — Canal de Escuta"
      description="Espaço dedicado para relatos, reclamações ou sugestões sobre a clínica, administração, salas ou sistema."
    >
      <div className="mx-auto max-w-2xl space-y-6">
        {/* Card de Regras e Cota Diária */}
        <Card className="border-border bg-card shadow-soft">
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <MessageSquareWarning className="size-5 text-primary" />
                Como funciona a Ouvidoria
              </CardTitle>
              <Badge
                variant={remaining > 0 ? "secondary" : "destructive"}
                className="px-2.5 py-1 text-xs font-medium"
              >
                {remaining} de {limit} envio(s) disponível(is) hoje
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              Você pode enviar até <strong>{limit} manifestações por dia</strong>{" "}
              (de até {MAX_LENGTH} caracteres cada) diretamente para a administração
              da clínica.
            </p>
            <div className="flex items-start gap-2.5 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-900 dark:text-amber-200">
              <Info className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <span>
                <strong>Importante:</strong> Para garantir o sigilo e a integridade
                do canal, uma vez enviada a manifestação,{" "}
                <strong>você não poderá mais visualizá-la ou editá-la</strong>.
              </span>
            </div>
          </CardContent>
        </Card>

        {ultimoEnvioSucesso && (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-900 dark:text-emerald-200">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="size-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span>
                Sua manifestação foi registrada e encaminhada à administração com
                sucesso!
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setUltimoEnvioSucesso(false)}
              className="h-7 px-2 text-xs"
            >
              Fechar
            </Button>
          </div>
        )}

        {quotaQ.isLoading ? (
          <LoadingState label="Verificando seu limite diário..." />
        ) : quotaQ.error ? (
          <ErrorState message={(quotaQ.error as Error).message} />
        ) : remaining <= 0 ? (
          <Card className="border-destructive/30 bg-destructive/5 shadow-soft">
            <CardContent className="flex flex-col items-center justify-center py-10 text-center">
              <ShieldAlert className="mb-3 size-10 text-destructive" />
              <h3 className="text-base font-semibold text-foreground">
                Limite diário atingido ({used}/{limit})
              </h3>
              <p className="mt-1 max-w-md text-sm text-muted-foreground">
                Você já realizou os {limit} envios permitidos para o dia de hoje.
                Agradecemos sua colaboração! Amanhã sua cota diária será renovada.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-border bg-card shadow-soft">
            <CardHeader>
              <CardTitle className="text-base font-semibold">
                Nova Manifestação
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Opção de Anonimato */}
              <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-muted/30 p-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    {anonimo ? (
                      <EyeOff className="size-4 text-primary" />
                    ) : (
                      <UserCheck className="size-4 text-emerald-600" />
                    )}
                    <Label
                      htmlFor="switch-anonimo"
                      className="cursor-pointer text-sm font-medium"
                    >
                      Enviar de forma anônima
                    </Label>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {anonimo
                      ? "Sua identidade será ocultada (nenhum vínculo com seu usuário será salvo na reclamação)."
                      : `Sua manifestação será identificada como ${user?.nome ?? "você"} (${user?.email ?? ""}).`}
                  </p>
                </div>
                <Switch
                  id="switch-anonimo"
                  checked={anonimo}
                  onCheckedChange={setAnonimo}
                />
              </div>

              {/* Campo de Texto */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="texto-ouvidoria">
                    Sua mensagem <span className="text-destructive">*</span>
                  </Label>
                  <span
                    className={`text-xs font-medium ${
                      texto.length >= MAX_LENGTH
                        ? "text-destructive"
                        : texto.length > MAX_LENGTH * 0.85
                          ? "text-amber-600"
                          : "text-muted-foreground"
                    }`}
                  >
                    {texto.length}/{MAX_LENGTH} caracteres
                  </span>
                </div>
                <Textarea
                  id="texto-ouvidoria"
                  rows={5}
                  maxLength={MAX_LENGTH}
                  value={texto}
                  onChange={(e) => {
                    setTexto(e.target.value.slice(0, MAX_LENGTH));
                    if (ultimoEnvioSucesso) setUltimoEnvioSucesso(false);
                  }}
                  placeholder="Descreva aqui sua reclamação, relato ou sugestão sobre a clínica, administração, salas ou sistema..."
                  className="resize-none"
                />
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  disabled={!podeEnviar}
                  onClick={() => setConfirmOpen(true)}
                  className="gap-2"
                >
                  <Send className="size-4" />
                  Enviar para a Ouvidoria
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Confirmar envio à Ouvidoria?"
        description={
          anonimo
            ? "Sua mensagem será enviada de forma 100% ANÔNIMA. Após o envio, você não poderá mais visualizá-la ou editá-la."
            : `Sua mensagem será enviada identificada com seu nome (${user?.nome}). Após o envio, você não poderá mais visualizá-la ou editá-la.`
        }
        confirmLabel={criar.isPending ? "Enviando..." : "Confirmar e Enviar"}
        onConfirm={handleConfirmSend}
      />
    </AppShell>
  );
}

/* ========================================================================== */
/*                           VISÃO DO ADMINISTRADOR                           */
/* ========================================================================== */

function AdminOuvidoriaView() {
  const complaintsQ = useComplaints(true);
  const atualizarStatus = useUpdateComplaintSolved();

  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<"todas" | "pendentes" | "resolvidas">(
    "todas"
  );
  const [page, setPage] = useState(1);

  const lista = complaintsQ.data ?? [];

  const totais = useMemo(() => {
    const resolvidas = lista.filter((c) => c.solved).length;
    const pendentes = lista.length - resolvidas;
    return {
      total: lista.length,
      pendentes,
      resolvidas,
    };
  }, [lista]);

  const filtradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return lista.filter((item) => {
      if (filtroStatus === "pendentes" && item.solved) return false;
      if (filtroStatus === "resolvidas" && !item.solved) return false;

      if (!termo) return true;
      const matchTexto = item.complaints.toLowerCase().includes(termo);
      const matchAutor = (item.userName || "").toLowerCase().includes(termo);
      const matchEmail = (item.userEmail || "").toLowerCase().includes(termo);
      const matchId = `#${item.id}`.includes(termo) || String(item.id) === termo;
      return matchTexto || matchAutor || matchEmail || matchId;
    });
  }, [lista, busca, filtroStatus]);

  useEffect(() => {
    setPage(1);
  }, [busca, filtroStatus]);

  const totalPages = Math.max(1, Math.ceil(filtradas.length / ITEMS_PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const paginadas = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filtradas.slice(start, start + ITEMS_PER_PAGE);
  }, [filtradas, currentPage]);

  const formatDataHora = (iso: string) => {
    if (!iso) return "Data não informada";
    try {
      const d = new Date(iso);
      return d.toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return iso;
    }
  };

  return (
    <AppShell
      title="Ouvidoria — Gestão de Manifestações"
      description="Visualize as reclamações e sugestões enviadas pelos locatários e acompanhe a resolução."
    >
      <div className="space-y-6">
        {/* Cards de Resumo */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card className="border bg-card/60 shadow-xs">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Recebidas
              </CardTitle>
              <MessageSquareWarning className="size-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totais.total}</div>
              <p className="mt-1 text-xs text-muted-foreground">
                Registros permanentes na Ouvidoria
              </p>
            </CardContent>
          </Card>

          <Card className="border bg-card/60 shadow-xs">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Não Resolvidas
              </CardTitle>
              <Clock className="size-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                {totais.pendentes}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Aguardando análise/tratativa
              </p>
            </CardContent>
          </Card>

          <Card className="border bg-card/60 shadow-xs">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Resolvidas
              </CardTitle>
              <CheckCircle2 className="size-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {totais.resolvidas}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Manifestações já solucionadas
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Barra de Busca e Filtro por Status */}
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-soft sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por texto da reclamação, autor, e-mail ou #ID..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant={filtroStatus === "todas" ? "default" : "outline"}
              onClick={() => setFiltroStatus("todas")}
            >
              Todas ({totais.total})
            </Button>
            <Button
              size="sm"
              variant={filtroStatus === "pendentes" ? "default" : "outline"}
              onClick={() => setFiltroStatus("pendentes")}
            >
              Não resolvidas ({totais.pendentes})
            </Button>
            <Button
              size="sm"
              variant={filtroStatus === "resolvidas" ? "default" : "outline"}
              onClick={() => setFiltroStatus("resolvidas")}
            >
              Resolvidas ({totais.resolvidas})
            </Button>

            {(busca.trim() !== "" || filtroStatus !== "todas") && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setBusca("");
                  setFiltroStatus("todas");
                }}
                className="gap-1 text-muted-foreground"
              >
                <X className="size-4" />
                Limpar
              </Button>
            )}
          </div>
        </div>

        {/* Lista de Manifestações */}
        {complaintsQ.isLoading ? (
          <LoadingState label="Carregando manifestações da Ouvidoria..." />
        ) : complaintsQ.error ? (
          <ErrorState message={(complaintsQ.error as Error).message} />
        ) : filtradas.length === 0 ? (
          <EmptyState
            title="Nenhuma manifestação encontrada"
            description={
              busca || filtroStatus !== "todas"
                ? "Tente ajustar o termo de busca ou o filtro de status."
                : "Ainda não há reclamações ou sugestões registradas pelos locatários."
            }
          />
        ) : (
          <div className="space-y-4">
            <ul className="space-y-3">
              {paginadas.map((item) => (
                <li
                  key={item.id}
                  className="rounded-xl border border-border bg-card p-4 shadow-soft transition-colors"
                >
                  <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                    <div className="min-w-0 flex-1 space-y-2.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-semibold text-muted-foreground">
                          #{item.id}
                        </span>

                        {item.anonymous ? (
                          <Badge
                            variant="secondary"
                            className="gap-1.5 bg-slate-500/15 text-slate-700 dark:text-slate-300"
                          >
                            <EyeOff className="size-3" />
                            Anônimo
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="gap-1.5 border-primary/30 bg-primary/5 text-foreground"
                          >
                            <UserCheck className="size-3 text-primary" />
                            {item.userName}
                            {item.userEmail ? ` (${item.userEmail})` : ""}
                          </Badge>
                        )}

                        {item.solved ? (
                          <Badge className="gap-1 bg-emerald-600 text-white hover:bg-emerald-700">
                            <CheckCircle2 className="size-3" />
                            Resolvida
                          </Badge>
                        ) : (
                          <Badge className="gap-1 bg-amber-600 text-white hover:bg-amber-700">
                            <Clock className="size-3" />
                            Não resolvida
                          </Badge>
                        )}

                        <span className="text-xs text-muted-foreground">
                          • Enviada em {formatDataHora(item.createdAt)}
                        </span>
                      </div>

                      <p className="whitespace-pre-wrap break-words rounded-lg bg-muted/40 p-3 text-sm text-card-foreground">
                        {item.complaints}
                      </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-2 self-end sm:self-center">
                      {item.solved ? (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={atualizarStatus.isPending}
                          onClick={() =>
                            atualizarStatus.mutate({
                              id: item.id,
                              solved: false,
                            })
                          }
                          className="gap-1.5"
                        >
                          <RotateCcw className="size-3.5" />
                          Marcar como não resolvida
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          disabled={atualizarStatus.isPending}
                          onClick={() =>
                            atualizarStatus.mutate({
                              id: item.id,
                              solved: true,
                            })
                          }
                          className="gap-1.5"
                        >
                          <CheckCircle2 className="size-3.5" />
                          Marcar como resolvida
                        </Button>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            {/* Paginação */}
            {totalPages > 1 && (
              <div className="flex flex-col items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3 sm:flex-row">
                <p className="text-xs text-muted-foreground">
                  Mostrando{" "}
                  <span className="font-medium text-foreground">
                    {(currentPage - 1) * ITEMS_PER_PAGE + 1}
                  </span>{" "}
                  a{" "}
                  <span className="font-medium text-foreground">
                    {Math.min(currentPage * ITEMS_PER_PAGE, filtradas.length)}
                  </span>{" "}
                  de{" "}
                  <span className="font-medium text-foreground">
                    {filtradas.length}
                  </span>{" "}
                  manifestação(ões)
                </p>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    <ChevronLeft className="mr-1 size-4" />
                    Anterior
                  </Button>
                  <span className="px-2 text-xs font-medium">
                    Página {currentPage} de {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  >
                    Próxima
                    <ChevronRight className="ml-1 size-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}

