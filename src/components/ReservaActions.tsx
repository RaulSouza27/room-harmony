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
import { findConflitos } from "@/services/api";
import type { Reserva } from "@/types";

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
  onConfirm: () => void;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description ? <AlertDialogDescription>{description}</AlertDialogDescription> : null}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Voltar</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className={destructive ? "bg-destructive text-destructive-foreground" : ""}
          >
            {confirmLabel}
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
        onConfirm={() =>
          atualizar.mutate({
            id: reserva.id,
            patch: { status: "aprovada", aprovado_por: user?.id, motivo_negacao: undefined },
          })
        }
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
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction
              disabled={!motivo.trim()}
              onClick={() =>
                atualizar.mutate({
                  id: reserva.id,
                  patch: {
                    status: "negada",
                    motivo_negacao: motivo.trim(),
                    aprovado_por: user?.id,
                  },
                })
              }
            >
              Negar reserva
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export function CancelarReservaButton({
  reserva,
  label = "Cancelar",
  size = "sm",
}: {
  reserva: Reserva;
  label?: string;
  size?: "sm" | "default";
}) {
  const atualizar = useUpdateReserva("Reserva cancelada.");
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="outline" size={size} onClick={() => setOpen(true)}>
        {label}
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Cancelar esta reserva?"
        description="O horário voltará a ficar livre na grade de disponibilidade."
        confirmLabel="Cancelar reserva"
        destructive
        onConfirm={() => atualizar.mutate({ id: reserva.id, patch: { status: "cancelada" } })}
      />
    </>
  );
}

export function ExcluirReservaButton({ reserva }: { reserva: Reserva }) {
  const excluir = useDeleteReserva();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setOpen(true)}>
        Excluir
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Excluir reserva definitivamente?"
        description="Esta ação não pode ser desfeita."
        confirmLabel="Excluir"
        destructive
        onConfirm={() => excluir.mutate(reserva.id)}
      />
    </>
  );
}
