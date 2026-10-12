import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  FileText,
  Loader2,
  Sparkles,
  ZoomIn,
  ZoomOut,
  Clock,
  Calendar,
  Building2,
} from "lucide-react";
import { useReservaReceipt, keys } from "@/hooks/useApi";
import * as api from "@/services/api";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { formatarData, formatRecorrencia, isReservaEspecial } from "@/lib/format";
import { StatusBadge } from "@/components/common";
import { AprovacaoActions } from "@/components/ReservaActions";
import type { Reserva, Sala, Unidade, User } from "@/types";

interface ReceiptViewerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  receiptUrl?: string | null;
  reservaId?: string | null;
  title?: string;
  reservas?: Reserva[];
  salas?: Sala[];
  unidades?: Unidade[];
  usuarios?: User[];
  onNavigateReservaId?: (newReservaId: string) => void;
}

function getInitials(name?: string) {
  if (!name) return "U";
  const parts = name.trim().split(" ");
  const first = parts[0];
  const last = parts[parts.length - 1];
  if (parts.length >= 2 && first && last && first[0] && last[0]) {
    return `${first[0]}${last[0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export function handleDownloadReceipt(url: string, filename = "comprovante.png") {
  if (!url || url === "empty" || url === "has_receipt") return;

  if (url.startsWith("data:")) {
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } else {
    fetch(url)
      .then((response) => response.blob())
      .then((blob) => {
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = blobUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(blobUrl);
      })
      .catch(() => {
        window.open(url, "_blank");
      });
  }
}

export function ReceiptViewerDialog({
  open,
  onOpenChange,
  receiptUrl,
  reservaId,
  title = "Comprovante de Pagamento",
  reservas,
  salas,
  unidades,
  usuarios,
  onNavigateReservaId,
}: ReceiptViewerDialogProps) {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [activeReservaId, setActiveReservaId] = useState<string | null>(reservaId ?? null);
  const [isZoomed, setIsZoomed] = useState(false);

  // Sincroniza o ID ativo quando o modal abre ou reservaId muda
  useEffect(() => {
    if (open) {
      setActiveReservaId(reservaId ?? null);
      setIsZoomed(false);
    }
  }, [open, reservaId]);

  // Filtra apenas as reservas que possuem comprovante válido
  const listaComprovantes = useMemo(() => {
    if (!reservas || reservas.length === 0) return [];
    return reservas.filter(
      (r) =>
        r.comprovante &&
        r.comprovante !== "empty" &&
        r.comprovante !== "reserva_especial_admin",
    );
  }, [reservas]);

  // Índice atual na lista
  const currentIndex = useMemo(() => {
    if (!activeReservaId || listaComprovantes.length === 0) return -1;
    return listaComprovantes.findIndex((r) => r.id === activeReservaId);
  }, [activeReservaId, listaComprovantes]);

  const hasNavigation = listaComprovantes.length > 1 && currentIndex >= 0;

  // Reserva atual selecionada
  const currentReserva = useMemo(() => {
    if (currentIndex >= 0) return listaComprovantes[currentIndex];
    if (activeReservaId && reservas) {
      return reservas.find((r) => r.id === activeReservaId) ?? null;
    }
    return null;
  }, [currentIndex, listaComprovantes, activeReservaId, reservas]);

  // Entidades relacionadas à reserva atual
  const profObj = useMemo(
    () => usuarios?.find((u) => u.id === currentReserva?.profissional_id),
    [usuarios, currentReserva],
  );
  const salaObj = useMemo(
    () => salas?.find((s) => s.id === currentReserva?.sala_id),
    [salas, currentReserva],
  );
  const unidadeObj = useMemo(
    () => unidades?.find((u) => u.id === currentReserva?.unidade_id),
    [unidades, currentReserva],
  );

  // Navegação
  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      const prev = listaComprovantes[currentIndex - 1];
      if (prev) {
        setIsZoomed(false);
        setActiveReservaId(prev.id);
        onNavigateReservaId?.(prev.id);
      }
    }
  }, [currentIndex, listaComprovantes, onNavigateReservaId]);

  const handleNext = useCallback(() => {
    if (currentIndex < listaComprovantes.length - 1) {
      const next = listaComprovantes[currentIndex + 1];
      if (next) {
        setIsZoomed(false);
        setActiveReservaId(next.id);
        onNavigateReservaId?.(next.id);
      }
    }
  }, [currentIndex, listaComprovantes, onNavigateReservaId]);

  // Atalhos de teclado (setas <- e ->)
  useEffect(() => {
    if (!open || !hasNavigation) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignora se estiver digitando em campos de texto
      if (
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA"
      ) {
        return;
      }

      if (e.key === "ArrowLeft") {
        e.preventDefault();
        handlePrev();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        handleNext();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, hasNavigation, handlePrev, handleNext]);

  // Pre-fetch inteligente em background com TanStack Query
  useEffect(() => {
    if (!open || currentIndex < 0) return;

    // Pré-carrega o próximo comprovante
    if (currentIndex < listaComprovantes.length - 1) {
      const nextRes = listaComprovantes[currentIndex + 1];
      if (nextRes?.id) {
        queryClient.prefetchQuery({
          queryKey: keys.reservaReceipt(nextRes.id),
          queryFn: () => api.getReservaReceipt(nextRes.id),
          staleTime: 1000 * 60 * 10,
        });
      }
    }

    // Pré-carrega o comprovante anterior
    if (currentIndex > 0) {
      const prevRes = listaComprovantes[currentIndex - 1];
      if (prevRes?.id) {
        queryClient.prefetchQuery({
          queryKey: keys.reservaReceipt(prevRes.id),
          queryFn: () => api.getReservaReceipt(prevRes.id),
          staleTime: 1000 * 60 * 10,
        });
      }
    }
  }, [open, currentIndex, listaComprovantes, queryClient]);

  // Identificação do ID para busca da imagem
  const targetId = open
    ? activeReservaId ||
      (receiptUrl &&
      receiptUrl !== "has_receipt" &&
      receiptUrl !== "empty" &&
      !receiptUrl.startsWith("data:") &&
      !receiptUrl.startsWith("http")
        ? receiptUrl
        : null)
    : null;

  const receiptQuery = useReservaReceipt(targetId);

  const displayUrl =
    receiptUrl &&
    receiptUrl !== "has_receipt" &&
    receiptUrl !== "empty" &&
    (receiptUrl.startsWith("data:") || receiptUrl.startsWith("http")) &&
    (!activeReservaId || activeReservaId === reservaId)
      ? receiptUrl
      : receiptQuery.data || null;

  const downloadFilename = useMemo(() => {
    const profSafe = (profObj?.nome ?? "reserva").replace(/\s+/g, "_").toLowerCase();
    const dataSafe = currentReserva?.data ?? "comprovante";
    return `comprovante_${profSafe}_${dataSafe}.png`;
  }, [profObj, currentReserva]);

  const handleOpenExternal = () => {
    if (!displayUrl) return;
    if (displayUrl.startsWith("data:")) {
      const win = window.open();
      win?.document.write(
        `<iframe src="${displayUrl}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`,
      );
    } else {
      window.open(displayUrl, "_blank");
    }
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl p-0 overflow-hidden bg-background border border-border shadow-2xl rounded-2xl flex flex-col max-h-[92vh]">
        {/* Cabeçalho */}
        <DialogHeader className="px-5 py-3.5 border-b border-border/80 flex flex-row items-center justify-between shrink-0 bg-muted/20">
          <div className="flex items-center gap-3">
            <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <FileText className="size-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <DialogTitle className="text-base font-semibold text-foreground">
                  {title}
                </DialogTitle>
                {hasNavigation && (
                  <Badge variant="secondary" className="text-xs font-semibold px-2 py-0.5">
                    {currentIndex + 1} de {listaComprovantes.length}
                  </Badge>
                )}
              </div>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                {hasNavigation
                  ? "Navegue usando as setas laterais ou as teclas ← e → do teclado"
                  : "Visualização do comprovante de pagamento anexado à reserva"}
              </DialogDescription>
            </div>
          </div>

          {/* Barra de Ferramentas */}
          <div className="flex items-center gap-1.5 mr-6">
            {displayUrl && (
              <>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setIsZoomed((prev) => !prev)}
                  title={isZoomed ? "Ajustar à tela" : "Ampliar imagem"}
                  className="size-8 p-0 text-muted-foreground hover:text-foreground"
                >
                  {isZoomed ? <ZoomOut className="size-4" /> : <ZoomIn className="size-4" />}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleOpenExternal}
                  title="Abrir em nova aba"
                  className="size-8 p-0 text-muted-foreground hover:text-foreground"
                >
                  <ExternalLink className="size-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDownloadReceipt(displayUrl, downloadFilename)}
                  className="gap-1.5 text-xs font-medium ml-1"
                >
                  <Download className="size-3.5" />
                  <span className="hidden sm:inline">Download</span>
                </Button>
              </>
            )}
          </div>
        </DialogHeader>

        {/* Área Central: Visualizador de Imagem com Setas Flutuantes */}
        <div className="relative flex-1 bg-black/95 overflow-hidden flex items-center justify-center min-h-[340px] max-h-[62vh]">
          {receiptQuery.isLoading ? (
            <div className="flex flex-col items-center gap-2 text-white/80 p-8">
              <Loader2 className="size-7 animate-spin text-primary" />
              <span className="text-xs">Carregando comprovante...</span>
            </div>
          ) : displayUrl ? (
            <div
              className={`w-full h-full flex items-center justify-center p-3 ${
                isZoomed ? "overflow-auto cursor-zoom-out" : "overflow-hidden cursor-zoom-in"
              }`}
              onClick={() => setIsZoomed((prev) => !prev)}
            >
              <img
                key={targetId || displayUrl}
                src={displayUrl}
                alt="Comprovante de pagamento"
                className={`transition-all duration-150 select-none ${
                  isZoomed
                    ? "max-w-none w-auto max-h-none shadow-2xl"
                    : "max-w-full max-h-[58vh] object-contain animate-fade-in"
                }`}
              />
            </div>
          ) : (
            <div className="text-white/50 text-sm flex flex-col items-center gap-2">
              <FileText className="size-8 opacity-30" />
              <span>Comprovante indisponível ou não encontrado.</span>
            </div>
          )}

          {/* Seta Esquerda (Anterior) */}
          {hasNavigation && currentIndex > 0 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handlePrev();
              }}
              title="Comprovante anterior (←)"
              aria-label="Comprovante anterior"
              className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/90 active:scale-95 text-white/90 hover:text-white p-2.5 rounded-full backdrop-blur-md border border-white/10 shadow-xl transition-all duration-150 group z-10"
            >
              <ChevronLeft className="size-5 group-hover:-translate-x-0.5 transition-transform" />
            </button>
          )}

          {/* Seta Direita (Próximo) */}
          {hasNavigation && currentIndex < listaComprovantes.length - 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleNext();
              }}
              title="Próximo comprovante (→)"
              aria-label="Próximo comprovante"
              className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/90 active:scale-95 text-white/90 hover:text-white p-2.5 rounded-full backdrop-blur-md border border-white/10 shadow-xl transition-all duration-150 group z-10"
            >
              <ChevronRight className="size-5 group-hover:translate-x-0.5 transition-transform" />
            </button>
          )}

          {/* Dica de Teclado no Rodapé da Imagem */}
          {hasNavigation && (
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/70 text-white/70 text-[11px] px-3 py-1 rounded-full backdrop-blur-xs border border-white/10 pointer-events-none select-none flex items-center gap-1.5 opacity-80 hover:opacity-100 transition-opacity">
              <span>Use as teclas</span>
              <kbd className="bg-white/20 px-1 py-0.2 rounded text-[10px] text-white">←</kbd>
              <kbd className="bg-white/20 px-1 py-0.2 rounded text-[10px] text-white">→</kbd>
              <span>para navegar</span>
            </div>
          )}
        </div>

        {/* Rodapé: Contexto da Reserva e Ações Rápidas */}
        {currentReserva && (
          <div className="p-4 bg-card border-t border-border shrink-0 flex flex-wrap items-center justify-between gap-4">
            {/* Informações do Profissional e da Reserva */}
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <Avatar className="size-10 border border-border shrink-0">
                <AvatarImage src={profObj?.foto} alt={profObj?.nome ?? "Profissional"} />
                <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs">
                  {getInitials(profObj?.nome)}
                </AvatarFallback>
              </Avatar>

              <div className="min-w-0 flex-1 space-y-0.5">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-card-foreground truncate">
                    {profObj?.nome ?? "Profissional"}
                  </p>
                  <StatusBadge status={currentReserva.status} />
                  {isReservaEspecial(currentReserva) && (
                    <Badge className="bg-[#78350f]/20 border border-[#78350f]/40 text-[#451a03] dark:text-[#fde68a] text-[10px] font-medium gap-1 hover:bg-[#78350f]/30">
                      <Sparkles className="size-2.5 text-amber-500" />
                      Reserva Especial
                    </Badge>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Building2 className="size-3 text-muted-foreground/70" />
                    {salaObj?.nome ?? "Sala"} · {unidadeObj?.nome ?? "Unidade"}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="size-3 text-muted-foreground/70" />
                    {formatarData(currentReserva.data)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="size-3 text-muted-foreground/70" />
                    {currentReserva.hora_inicio}–{currentReserva.hora_fim}
                  </span>
                  <span>· {formatRecorrencia(currentReserva.recorrencia)}</span>
                </div>

                {currentReserva.observacoes ? (
                  <p className="text-[11px] text-muted-foreground truncate max-w-md pt-0.5">
                    <span className="font-medium text-foreground">Obs:</span>{" "}
                    {currentReserva.observacoes}
                  </p>
                ) : null}
              </div>
            </div>

            {/* Ações de Aprovação ou Fechamento */}
            <div className="flex items-center gap-2 shrink-0">
              {currentReserva.status === "pendente" && isAdmin && (
                <AprovacaoActions
                  reserva={currentReserva}
                  reservas={reservas ?? []}
                  compact
                />
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
