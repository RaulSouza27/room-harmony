import { useEffect, useMemo, useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { useCreateReserva } from "@/hooks/useApi";
import { createAuditLog } from "@/services/auditService";
import { HORARIOS, toMinutes } from "@/services/db";
import type { Sala, Unidade, User } from "@/types";
import { Loader2, ShieldAlert, Sparkles } from "lucide-react";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  unidades: Unidade[];
  salas: Sala[];
  usuarios: User[];
}

const hojeISO = () => new Date().toISOString().slice(0, 10);

export function ReservaEspecialDialog({
  open,
  onOpenChange,
  unidades,
  salas,
  usuarios,
}: Props) {
  const { user, isAdmin } = useAuth();
  const criar = useCreateReserva();

  const unidadesAtivas = useMemo(
    () => unidades.filter((u) => u.status === "ativa"),
    [unidades],
  );

  // Apenas usuários com papel ADMINISTRADOR podem ser selecionados
  const profissionaisAdmin = useMemo(
    () => usuarios.filter((u) => u.status === "ativo" && u.papel === "ADMINISTRADOR"),
    [usuarios],
  );

  const [unidadeId, setUnidadeId] = useState("");
  const [salaId, setSalaId] = useState("");
  const [profissionalId, setProfissionalId] = useState("");
  const [dataInicio, setDataInicio] = useState(hojeISO());
  const [dataFim, setDataFim] = useState(hojeISO());
  const [inicio, setInicio] = useState("08:00");
  const [fim, setFim] = useState("18:00");
  const [observacoes, setObservacoes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setUnidadeId(unidadesAtivas[0]?.id ?? "");
    setSalaId("");
    setProfissionalId(user?.papel === "ADMINISTRADOR" ? user.id : profissionaisAdmin[0]?.id ?? "");
    setDataInicio(hojeISO());
    setDataFim(hojeISO());
    setInicio("08:00");
    setFim("18:00");
    setObservacoes("");
  }, [open, unidadesAtivas, profissionaisAdmin, user]);

  const salasDaUnidade = useMemo(
    () => salas.filter((s) => s.unidade_id === unidadeId && s.status === "ativa"),
    [salas, unidadeId],
  );

  useEffect(() => {
    if (salasDaUnidade.length > 0 && !salasDaUnidade.some((s) => s.id === salaId)) {
      const first = salasDaUnidade[0];
      if (first) setSalaId(first.id);
    }
  }, [salasDaUnidade, salaId]);

  const horarioInvalido = toMinutes(fim) <= toMinutes(inicio);
  const dataInvalida = dataFim < dataInicio;

  const podeSalvar =
    isAdmin &&
    !!unidadeId &&
    !!salaId &&
    !!profissionalId &&
    !horarioInvalido &&
    !dataInvalida;

  const gerarDatasIntervalo = (startStr: string, endStr: string): string[] => {
    const list: string[] = [];
    let current = new Date(startStr + "T00:00:00");
    const end = new Date(endStr + "T00:00:00");
    while (current <= end) {
      list.push(current.toISOString().slice(0, 10));
      current.setDate(current.getDate() + 1);
    }
    return list;
  };

  async function handleSubmit() {
    if (!podeSalvar || isSubmitting) return;
    setIsSubmitting(true);

    try {
      const datas = gerarDatasIntervalo(dataInicio, dataFim);
      const unidadeObj = unidades.find((u) => u.id === unidadeId);
      const salaObj = salas.find((s) => s.id === salaId);
      const profObj = usuarios.find((u) => u.id === profissionalId);

      for (const d of datas) {
        const res = await criar.mutateAsync({
          unidade_id: unidadeId,
          sala_id: salaId,
          data: d,
          hora_inicio: inicio,
          hora_fim: fim,
          profissional_id: profissionalId,
          observacoes: observacoes
            ? `[Reserva Especial Admin] ${observacoes}`
            : "[Reserva Especial Admin]",
          recorrencia: "unica",
          status: "aprovada",
          comprovante: "reserva_especial_admin",
        });

        // Registrar auditoria especial
        await createAuditLog({
          action: "RESERVA_ESPECIAL_CRIADA",
          targetType: "RESERVA",
          targetId: res.id,
          targetName: `Reserva Especial - ${salaObj?.nome ?? salaId}`,
          details: `Reserva Especial (Admin) criada pelo administrador ${user?.nome ?? "Admin"} em nome do profissional admin ${profObj?.nome ?? profissionalId}. Unidade: ${unidadeObj?.nome ?? unidadeId}, Sala: ${salaObj?.nome ?? salaId}, Data: ${d}, Horário: ${inicio} às ${fim}. Sem necessidade de aprovação ou comprovante.`,
        });
      }

      toast.success(
        datas.length > 1
          ? `${datas.length} Reservas Especiais criadas com sucesso!`
          : "Reserva Especial criada com sucesso!",
      );
      onOpenChange(false);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Erro ao criar reserva especial.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!isAdmin) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg border-amber-500/30">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="size-5 text-amber-500" />
            <DialogTitle className="text-amber-700 dark:text-amber-400">
              Reserva Especial (Exclusivo Administradores)
            </DialogTitle>
          </div>
          <DialogDescription>
            Permite a criação flexível de reservas por administradores em nome de profissionais
            ADMIN. Isenta de comprovante de pagamento e de fluxo de aprovação.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300 border border-amber-500/30 flex items-start gap-2">
          <ShieldAlert className="size-4 shrink-0 mt-0.5" />
          <span>
            Esta ação registrará um log de auditoria especial (<strong>RESERVA_ESPECIAL_CRIADA</strong>)
            associado ao seu usuário administrador.
          </span>
        </div>

        <div className="space-y-4 py-2">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Unidade</Label>
              <Select value={unidadeId} onValueChange={setUnidadeId}>
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
            </div>

            <div className="space-y-2">
              <Label>Sala</Label>
              <Select value={salaId} onValueChange={setSalaId} disabled={!unidadeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a sala" />
                </SelectTrigger>
                <SelectContent>
                  {salasDaUnidade.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center justify-between">
              <span>Profissional ADMIN</span>
              <span className="text-[11px] text-muted-foreground font-normal">
                (Apenas usuários com papel ADMINISTRADOR)
              </span>
            </Label>
            <Select value={profissionalId} onValueChange={setProfissionalId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o profissional admin" />
              </SelectTrigger>
              <SelectContent>
                {profissionaisAdmin.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.nome} ({p.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="dataInicio">Data de Início</Label>
              <Input
                id="dataInicio"
                type="date"
                value={dataInicio}
                onChange={(e) => {
                  setDataInicio(e.target.value);
                  if (e.target.value > dataFim) setDataFim(e.target.value);
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dataFim">Data de Fim</Label>
              <Input
                id="dataFim"
                type="date"
                min={dataInicio}
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Hora Início</Label>
              <Select value={inicio} onValueChange={setInicio}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {HORARIOS.map((h) => (
                    <SelectItem key={h} value={h}>
                      {h}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Hora Fim</Label>
              <Select value={fim} onValueChange={setFim}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[...HORARIOS.slice(1), "22:00"].map((h) => (
                    <SelectItem key={h} value={h}>
                      {h}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {horarioInvalido && (
            <p className="text-xs font-semibold text-destructive">
              A hora final deve ser posterior à hora inicial.
            </p>
          )}

          <div className="space-y-2">
            <Label htmlFor="obsEspecial">Observações / Justificativa</Label>
            <Textarea
              id="obsEspecial"
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Descreva o propósito ou detalhes desta reserva especial..."
              maxLength={500}
            />
          </div>

          {isSubmitting ? (
            <div className="flex items-center justify-center gap-2 rounded-lg bg-amber-500/15 p-3 text-sm text-amber-800 dark:text-amber-200 font-medium border border-amber-500/30 animate-pulse">
              <Loader2 className="size-4 animate-spin shrink-0 text-amber-600" />
              <span>Criando reserva especial e gerando auditoria, por favor aguarde...</span>
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!podeSalvar || isSubmitting}
            className="bg-amber-600 hover:bg-amber-700 text-white gap-2"
          >
            {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            {isSubmitting ? "Criando reserva..." : "Criar Reserva Especial"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
