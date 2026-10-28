import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { useDeleteReserva, useUpdateReserva } from "@/hooks/useApi";
import { addNotification } from "@/services/notificationService";
import { findConflitos } from "@/services/api";
import { Loader2 } from "lucide-react";
import type { Reserva } from "@/types";
import { toast } from "sonner";
import { isReservaComMaisDe24h } from "@/lib/format";

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirmar",
  destructive,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  destructive?: boolean;
  onConfirm: () => any;
}) {
  const [loading, setLoading] = useState(false);

  const handleConfirm = async (e: React.MouseEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description ? <AlertDialogDescription>{description}</AlertDialogDescription> : null}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Voltar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={loading}
            className={destructive ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}
          >
            {loading ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
            {loading ? "Aguarde..." : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/** Ações administrativas de aprovação/negação com confirmação obrigatória. */
export function AprovacaoActions({
  reserva,
  reservas,
  compact,
}: {
  reserva: Reserva;
  reservas: Reserva[];
  compact?: boolean;
}) {
  const { user } = useAuth();
  const atualizar = useUpdateReserva();
  const [aprovar, setAprovar] = useState(false);
  const [negar, setNegar] = useState(false);
  const [motivo, setMotivo] = useState("");

  const conflitantes = findConflitos(reservas, {
    sala_id: reserva.sala_id,
    data: reserva.data,
    hora_inicio: reserva.hora_inicio,
    hora_fim: reserva.hora_fim,
    ignoreId: reserva.id,
  }).filter((r) => r.status === "pendente");

  const [isNegando, setIsNegando] = useState(false);

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Button size={compact ? "sm" : "default"} onClick={() => setAprovar(true)}>
          Aprovar
        </Button>
        <Button
          size={compact ? "sm" : "default"}
          variant="outline"
          onClick={() => {
            setMotivo("");
            setNegar(true);
          }}
        >
          Negar
        </Button>
      </div>

      <ConfirmDialog
        open={aprovar}
        onOpenChange={setAprovar}
        title="Aprovar esta reserva?"
        description={
          conflitantes.length
            ? `Atenção: existem ${conflitantes.length} outra(s) solicitação(ões) pendente(s) em conflito com este horário. Elas continuarão pendentes e poderão ser negadas.`
            : "A sala ficará bloqueada para este horário."
        }
        confirmLabel="Aprovar"
        onConfirm={async () => {
          await atualizar.mutateAsync({
            id: reserva.id,
            patch: { status: "aprovada", aprovado_por: user?.id, motivo_negacao: undefined },
          });
        }}
      />

      <AlertDialog open={negar} onOpenChange={setNegar}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Negar solicitação</AlertDialogTitle>
            <AlertDialogDescription>
              Informe o motivo — ele será exibido ao profissional.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label htmlFor="motivo">Motivo</Label>
            <Textarea
              id="motivo"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              maxLength={300}
              placeholder="Ex.: sala já comprometida com atividade interna."
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isNegando}>Voltar</AlertDialogCancel>
            <AlertDialogAction
              disabled={!motivo.trim() || isNegando}
              onClick={async (e) => {
                e.preventDefault();
                setIsNegando(true);
                try {
                  await atualizar.mutateAsync({
                    id: reserva.id,
                    patch: {
                      status: "negada",
                      motivo_negacao: motivo.trim(),
                      aprovado_por: user?.id,
                    },
                  });
                  setNegar(false);
                } finally {
                  setIsNegando(false);
                }
              }}
            >
              {isNegando ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              {isNegando ? "Negando..." : "Negar reserva"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export function CancelarReservaButton({
  reserva,
  label,
  size = "sm",
}: {
  reserva: Reserva;
  label?: string;
  size?: "sm" | "default";
}) {
  const { isAdmin } = useAuth();
  const atualizar = useUpdateReserva();
  const [open, setOpen] = useState(false);

  const isReservaCreditoLocatario = !isAdmin && Boolean(reserva.paid_with_credits);
  // Se for locatário (não-admin), reserva avulsa e APROVADA, solicita o cancelamento ao admin.
  // Se for reserva com crédito (com >= 24h), cancela diretamente e devolve os créditos ao pacote.
  const isSolicitacaoLocatario = !isAdmin && reserva.status === "aprovada" && !isReservaCreditoLocatario;
  const temMaisDe24h = isReservaComMaisDe24h(reserva.data, reserva.hora_inicio);
  const bloqueadoPor24h = (isSolicitacaoLocatario || isReservaCreditoLocatario) && !temMaisDe24h;

  const defaultLabel = label
    ? label
    : isReservaCreditoLocatario
      ? "Cancelar e estornar"
      : isSolicitacaoLocatario
        ? "Solicitar cancelamento"
        : "Cancelar";

  const handleConfirm = async () => {
    if (isSolicitacaoLocatario) {
      if (!isReservaComMaisDe24h(reserva.data, reserva.hora_inicio)) {
        toast.error(
          "Solicitações de cancelamento só podem ser feitas com no mínimo 24h de antecedência. Em caso de urgência, contate a administração."
        );
        setOpen(false);
        return;
      }

      // Registrar solicitação de cancelamento pelo profissional
      await atualizar.mutateAsync({
        id: reserva.id,
        patch: { status: "solicitacao_cancelamento" },
      });

      toast.success("Solicitação de cancelamento enviada aos administradores com sucesso.");
    } else if (isReservaCreditoLocatario) {
      if (!isReservaComMaisDe24h(reserva.data, reserva.hora_inicio)) {
        toast.error(
          "Reservas com menos de 24h de antecedência estão travadas para cancelamento pelo locatário. Contate a administração."
        );
        setOpen(false);
        return;
      }

      await atualizar.mutateAsync({
        id: reserva.id,
        patch: { status: "cancelada" },
      });

      toast.success(
        `Reserva cancelada com sucesso! ${reserva.credit_hours_used || 1} crédito(s) devolvido(s) ao pacote de origem.`
      );
    } else {
      // Efetivar cancelamento da reserva
      await atualizar.mutateAsync({
        id: reserva.id,
        patch: { status: "cancelada" },
      });

      // Notificar especificamente o usuário profissional proprietário da reserva
      addNotification(
        reserva.profissional_id,
        `O cancelamento solicitado para sua reserva no dia ${reserva.data} (${reserva.hora_inicio}-${reserva.hora_fim}) foi realizado com sucesso.`,
      );

      toast.success(
        reserva.paid_with_credits
          ? `Reserva cancelada e ${reserva.credit_hours_used || 1} crédito(s) devolvido(s) ao pacote do locatário!`
          : "Reserva cancelada com sucesso!"
      );
    }
  };

  return (
    <>
      <Button
        variant={isSolicitacaoLocatario ? "outline" : "destructive"}
        size={size}
        disabled={bloqueadoPor24h}
        onClick={() => setOpen(true)}
        title={
          bloqueadoPor24h
            ? "Com menos de 24h de antecedência a reserva fica travada. Apenas a administração pode alterá-la."
            : undefined
        }
      >
        {defaultLabel}
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={
          isSolicitacaoLocatario
            ? "Solicitar cancelamento ao administrador?"
            : isReservaCreditoLocatario
              ? "Cancelar reserva e estornar créditos?"
              : "Cancelar esta reserva?"
        }
        description={
          isSolicitacaoLocatario
            ? "Sua solicitação de cancelamento será encaminhada para a equipe de administração analisar e efetivar o cancelamento."
            : isReservaCreditoLocatario
              ? `A reserva será cancelada imediatamente e ${reserva.credit_hours_used || 1} crédito(s) retornarão ao seu pacote de origem.`
              : reserva.paid_with_credits
                ? `A reserva será cancelada e ${reserva.credit_hours_used || 1} crédito(s) retornarão automaticamente ao pacote de origem do locatário.`
                : "A reserva será cancelada, liberando a vaga na grade e notificando o profissional solicitante."
        }
        confirmLabel={
          isSolicitacaoLocatario
            ? "Solicitar cancelamento"
            : isReservaCreditoLocatario
              ? "Confirmar e estornar créditos"
              : "Efetivar cancelamento"
        }
        destructive={!isSolicitacaoLocatario}
        onConfirm={handleConfirm}
      />
    </>
  );
}

export function ExcluirReservaButton({ reserva }: { reserva: Reserva }) {
  const { user } = useAuth();
  const excluir = useDeleteReserva();
  const [open, setOpen] = useState(false);

  const handleExcluir = async () => {
    await excluir.mutateAsync(reserva.id);
  };

  return (
    <>
      <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setOpen(true)}>
        Excluir
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Excluir reserva definitivamente?"
        description="Esta ação não pode ser desfeita e o registro será permanentemente removido."
        confirmLabel="Excluir"
        destructive
        onConfirm={handleExcluir}
      />
    </>
  );
}
