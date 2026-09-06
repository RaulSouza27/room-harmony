import { useState } from "react";
import {
  Calendar,
  Clock,
  DoorOpen,
  User,
  Mail,
  Phone,
  FileText,
  CreditCard,
  MapPin,
  ShieldCheck,
  ExternalLink,
  Loader2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/common";
import { ReceiptViewerDialog } from "@/components/ReceiptViewerDialog";
import { AprovacaoActions } from "@/components/ReservaActions";
import { useAuth } from "@/contexts/AuthContext";
import { useUsuarioDetail } from "@/hooks/useApi";
import { formatarDataLonga, formatRecorrencia } from "@/lib/format";
import type { Reserva, Sala, Unidade, User as UserType } from "@/types";

interface ReservaDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reserva: Reserva | null;
  sala?: Sala | null | undefined;
  unidade?: Unidade | null | undefined;
  usuario?: UserType | null | undefined;
}

function getInitials(name?: string) {
  if (!name) return "U";
  const parts = name.trim().split(" ");
  if (parts.length >= 2) {
    const firstWord = parts[0];
    const lastWord = parts[parts.length - 1];
    if (firstWord && lastWord) {
      return `${firstWord[0] || ""}${lastWord[0] || ""}`.toUpperCase();
    }
  }
  return name.slice(0, 2).toUpperCase();
}

export function ReservaDetailDialog({
  open,
  onOpenChange,
  reserva,
  sala,
  unidade,
  usuario,
}: ReservaDetailDialogProps) {
  const { isAdmin } = useAuth();
  const [viewComprovanteOpen, setViewComprovanteOpen] = useState(false);

  const targetUserId = open && (usuario?.id || reserva?.profissional_id)
    ? (usuario?.id || reserva?.profissional_id)
    : null;

  const userQuery = useUsuarioDetail(targetUserId ?? null);
  const fullUser = userQuery.data || usuario;

  if (!reserva) return null;

  const userPhoto = fullUser?.foto && fullUser.foto !== "has_photo" ? fullUser.foto : undefined;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-2xl p-0 gap-0 overflow-hidden bg-background border border-border shadow-2xl rounded-2xl max-h-[90vh] flex flex-col">
          <DialogHeader className="p-5 border-b border-border/60 bg-muted/20 shrink-0">
            <DialogTitle className="text-lg font-semibold flex items-center gap-2">
              <FileText className="size-5 text-primary" />
              Detalhes da Reserva & Solicitante
            </DialogTitle>
          </DialogHeader>

          <div className="p-6 overflow-y-auto space-y-6 flex-1">
            {/* Seção 1: Perfil do Profissional Solicitante */}
            <div className="rounded-xl border border-border/80 bg-card p-5 shadow-xs">
              <div className="flex items-start justify-between border-b border-border/50 pb-3 mb-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <User className="size-3.5 text-primary" />
                  Perfil do Profissional
                </h3>
                {fullUser?.papel ? (
                  <Badge variant="outline" className="text-[10px] uppercase font-bold">
                    {fullUser.papel}
                  </Badge>
                ) : null}
              </div>

              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                <Avatar className="size-16 border-2 border-primary/20 shadow-sm shrink-0">
                  {userPhoto ? (
                    <AvatarImage src={userPhoto} alt={fullUser?.nome} />
                  ) : userQuery.isLoading ? (
                    <div className="size-full flex items-center justify-center bg-muted">
                      <Loader2 className="size-5 animate-spin text-primary" />
                    </div>
                  ) : null}
                  <AvatarFallback className="bg-primary/10 text-primary font-bold text-lg">
                    {getInitials(fullUser?.nome)}
                  </AvatarFallback>
                </Avatar>

                <div className="space-y-1 flex-1 min-w-0">
                  <h4 className="text-base font-bold text-foreground truncate">
                    {fullUser?.nome ?? "Profissional não identificado"}
                  </h4>
                  <p className="text-xs text-muted-foreground font-medium">
                    {fullUser?.especialidade || "Psicólogo(a)"}
                    {fullUser?.boardNumber ? ` • CRP / Registro: ${fullUser.boardNumber}` : ""}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 pt-3 border-t border-border/40 text-xs">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="size-3.5 shrink-0 text-primary/70" />
                  <span className="truncate">{fullUser?.email || "E-mail não informado"}</span>
                </div>

                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="size-3.5 shrink-0 text-primary/70" />
                  <span>{fullUser?.telefone || "Telefone não informado"}</span>
                </div>

                {fullUser?.cpf ? (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <CreditCard className="size-3.5 shrink-0 text-primary/70" />
                    <span>CPF: {fullUser.cpf}</span>
                  </div>
                ) : null}

                {fullUser?.endereco ? (
                  <div className="flex items-center gap-2 text-muted-foreground col-span-1 sm:col-span-2">
                    <MapPin className="size-3.5 shrink-0 text-primary/70" />
                    <span className="truncate">
                      {fullUser.endereco} {fullUser.cep ? `(CEP: ${fullUser.cep})` : ""}
                    </span>
                  </div>
                ) : null}
              </div>
            </div>

            {/* Seção 2: Dados da Reserva */}
            <div className="rounded-xl border border-border/80 bg-card p-5 shadow-xs">
              <div className="flex items-center justify-between border-b border-border/50 pb-3 mb-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Calendar className="size-3.5 text-primary" />
                  Informações da Reserva
                </h3>
                <StatusBadge status={reserva.status} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="space-y-1">
                  <span className="text-muted-foreground font-medium flex items-center gap-1">
                    <DoorOpen className="size-3.5 text-primary/70" /> Sala & Unidade
                  </span>
                  <p className="font-semibold text-foreground text-sm">
                    {sala?.nome ?? "Sala"} · {unidade?.nome ?? "Unidade"}
                  </p>
                </div>

                <div className="space-y-1">
                  <span className="text-muted-foreground font-medium flex items-center gap-1">
                    <Clock className="size-3.5 text-primary/70" /> Horário & Data
                  </span>
                  <p className="font-semibold text-foreground text-sm">
                    {formatarDataLonga(reserva.data)} ({reserva.hora_inicio} às {reserva.hora_fim})
                  </p>
                </div>

                <div className="space-y-1">
                  <span className="text-muted-foreground font-medium">Recorrência</span>
                  <p className="font-medium text-foreground">
                    {formatRecorrencia(reserva.recorrencia)}
                  </p>
                </div>

                {reserva.aprovado_por ? (
                  <div className="space-y-1">
                    <span className="text-muted-foreground font-medium flex items-center gap-1">
                      <ShieldCheck className="size-3.5 text-primary/70" /> Aprovado por
                    </span>
                    <p className="font-medium text-foreground">{reserva.aprovado_por}</p>
                  </div>
                ) : null}
              </div>

              {reserva.observacoes ? (
                <div className="mt-4 pt-3 border-t border-border/40">
                  <span className="text-xs font-semibold text-muted-foreground block mb-1">
                    Observações:
                  </span>
                  <p className="text-xs bg-muted/40 p-3 rounded-lg text-foreground leading-relaxed">
                    {reserva.observacoes}
                  </p>
                </div>
              ) : null}

              {reserva.status === "negada" && reserva.motivo_negacao ? (
                <div className="mt-4 pt-3 border-t border-border/40">
                  <span className="text-xs font-semibold text-destructive block mb-1">
                    Motivo da Negação:
                  </span>
                  <p className="text-xs bg-destructive/10 border border-destructive/20 p-3 rounded-lg text-destructive font-medium">
                    {reserva.motivo_negacao}
                  </p>
                </div>
              ) : null}

              {/* Botão de Comprovante */}
              {reserva.comprovante && reserva.comprovante !== "empty" ? (
                <div className="mt-4 pt-3 border-t border-border/40 flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">
                    Comprovante de pagamento anexado
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setViewComprovanteOpen(true)}
                    className="gap-1.5 text-xs font-medium text-primary border-primary/30 hover:bg-primary/10"
                  >
                    <ExternalLink className="size-3.5" />
                    Ver comprovante
                  </Button>
                </div>
              ) : null}
            </div>
          </div>

          {/* Rodapé com botões de ação de Aprovar / Negar */}
          {isAdmin && reserva.status === "pendente" ? (
            <div className="p-4 border-t border-border bg-muted/20 flex items-center justify-between gap-4 shrink-0">
              <span className="text-xs text-muted-foreground font-medium">
                Ação pendente de aprovação:
              </span>
              <AprovacaoActions reserva={reserva} reservas={[]} compact />
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <ReceiptViewerDialog
        open={viewComprovanteOpen}
        onOpenChange={setViewComprovanteOpen}
        reservaId={reserva.id}
      />
    </>
  );
}
