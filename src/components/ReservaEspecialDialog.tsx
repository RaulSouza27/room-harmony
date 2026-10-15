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
import { useCreateReserva, useHolidays, useReservas } from "@/hooks/useApi";
import { createAuditLog } from "@/services/auditService";
import { HORARIOS, toMinutes } from "@/services/db";
import type { Sala, Unidade, User } from "@/types";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Calendar as CalendarIcon,
  Clock,
  Loader2,
  ShieldAlert,
  Sparkles,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  unidades: Unidade[];
  salas: Sala[];
  usuarios: User[];
}

const hojeISO = () => new Date().toISOString().slice(0, 10);

// Nomes dos dias da semana
const DIAS_NOMES = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
];

const DIAS_CURTOS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

/**
 * Calcula os dias da semana (Segunda a Sábado ou Domingo a Sábado) para uma data de referência
 */
function getDiasDaSemana(dataRefStr: string) {
  const ref = new Date(dataRefStr + "T12:00:00");
  const diaSemana = ref.getDay(); // 0 = Domingo, 1 = Segunda, ..., 6 = Sábado

  // Início da semana: segunda-feira (ou domingo caso queira, mas comercialmente segunda a sábado)
  // Vamos calcular da Segunda (1) até o Sábado (6) ou Domingo (0)
  // Se diaSemana for 0 (Domingo), a segunda foi 6 dias atrás
  const diffParaSegunda = diaSemana === 0 ? -6 : 1 - diaSemana;
  const segunda = new Date(ref);
  segunda.setDate(ref.getDate() + diffParaSegunda);

  const dias: { dataISO: string; diaSemana: number; label: string; labelCurto: string }[] = [];
  // Pegamos de segunda (i=0) a sábado (i=5)
  for (let i = 0; i < 6; i++) {
    const d = new Date(segunda);
    d.setDate(segunda.getDate() + i);
    const iso = d.toISOString().slice(0, 10);
    const ds = d.getDay();
    dias.push({
      dataISO: iso,
      diaSemana: ds,
      label: DIAS_NOMES[ds] ?? "",
      labelCurto: DIAS_CURTOS[ds] ?? "",
    });
  }
  return dias;
}

function formatarDataBR(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function somarSemanas(dataISO: string, semanas: number): string {
  const d = new Date(dataISO + "T12:00:00");
  d.setDate(d.getDate() + semanas * 7);
  return d.toISOString().slice(0, 10);
}

export function ReservaEspecialDialog({
  open,
  onOpenChange,
  unidades,
  salas,
  usuarios,
}: Props) {
  const { user, isAdmin } = useAuth();
  const criar = useCreateReserva();
  const queryClient = useQueryClient();
  const { data: holidays = [] } = useHolidays();

  // Etapa do fluxo: 1 = Configuração base, 2 = Grade semanal e repetição
  const [etapa, setEtapa] = useState<1 | 2>(1);

  const unidadesAtivas = useMemo(
    () => unidades.filter((u) => u.status === "ativa"),
    [unidades],
  );

  const profissionaisAdmin = useMemo(
    () => usuarios.filter((u) => u.status === "ativo" && u.papel === "ADMINISTRADOR"),
    [usuarios],
  );

  // Campos do formulário
  const [unidadeId, setUnidadeId] = useState("");
  const [salaId, setSalaId] = useState("");
  const [profissionalId, setProfissionalId] = useState("");
  const [dataInicio, setDataInicio] = useState(hojeISO());
  const [observacoes, setObservacoes] = useState("");

  // Etapa 2: Seleção semanal de horários e semanas de repetição
  // slotsSelecionados: conjunto de strings "YYYY-MM-DD_HH:mm"
  const [slotsSelecionados, setSlotsSelecionados] = useState<Set<string>>(new Set());
  const [numSemanas, setNumSemanas] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [progressoEnvio, setProgressoEnvio] = useState<{ atual: number; total: number } | null>(null);

  // Reset ao abrir
  useEffect(() => {
    if (!open) return;
    setEtapa(1);
    setUnidadeId(unidadesAtivas[0]?.id ?? "");
    setSalaId("");
    setProfissionalId(user?.papel === "ADMINISTRADOR" ? user.id : profissionaisAdmin[0]?.id ?? "");
    setDataInicio(hojeISO());
    setObservacoes("");
    setSlotsSelecionados(new Set());
    setNumSemanas(1);
    setIsSubmitting(false);
    setProgressoEnvio(null);
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

  // Dias da semana correspondente à data de início escolhida (Segunda a Sábado)
  const diasDaSemana = useMemo(() => {
    if (!dataInicio) return [];
    return getDiasDaSemana(dataInicio);
  }, [dataInicio]);

  const semanaInicioISO = diasDaSemana[0]?.dataISO ?? dataInicio;
  const semanaFimISO = diasDaSemana[diasDaSemana.length - 1]?.dataISO ?? dataInicio;

  // Carregar reservas existentes para essa sala na semana de referência para identificar conflitos/ocupações
  const { data: reservasSemana = [], isLoading: isLoadingReservas } = useReservas(
    etapa === 2 && salaId
      ? {
          roomId: salaId,
          startDate: semanaInicioISO,
          endDate: semanaFimISO,
        }
      : undefined,
  );

  const unidadeAtual = useMemo(
    () => unidades.find((u) => u.id === unidadeId),
    [unidades, unidadeId],
  );

  const salaAtual = useMemo(
    () => salas.find((s) => s.id === salaId),
    [salas, salaId],
  );

  const profissionalAtual = useMemo(
    () => usuarios.find((u) => u.id === profissionalId),
    [usuarios, profissionalId],
  );

  // Validação da etapa 1
  const podeAvancarEtapa1 =
    isAdmin && !!unidadeId && !!salaId && !!profissionalId && !!dataInicio;

  // Verificar se um slot está dentro do horário de funcionamento
  const isSlotDisponivelFuncionamento = (dataISO: string, horaInicio: string) => {
    const feriado = holidays.find((h) => {
      if (!h.status) return false;
      const isGlobalOrUnit = !h.unitId || String(h.unitId) === String(unidadeId);
      if (!isGlobalOrUnit) return false;
      const start = h.startDate;
      const end = h.endDate || h.startDate;
      return dataISO >= start && dataISO <= end;
    });
    if (feriado) return false;

    const dateObj = new Date(dataISO + "T12:00:00");
    const dayOfWeek = dateObj.getDay();
    if (!unidadeAtual?.business_hours) return true;
    const bh = unidadeAtual.business_hours[String(dayOfWeek)];
    if (!bh || !bh.ativo || !bh.abertura || !bh.fechamento) return false;

    const hMin = toMinutes(horaInicio);
    return hMin >= toMinutes(bh.abertura) && hMin < toMinutes(bh.fechamento);
  };

  // Verificar se o slot já está reservado na semana base
  const getReservaNoSlot = (dataISO: string, horaInicio: string) => {
    return reservasSemana.find(
      (r) =>
        r.sala_id === salaId &&
        r.data === dataISO &&
        (r.status === "aprovada" || r.status === "pendente") &&
        toMinutes(r.hora_inicio) <= toMinutes(horaInicio) &&
        toMinutes(horaInicio) < toMinutes(r.hora_fim),
    );
  };

  const toggleSlot = (dataISO: string, horaInicio: string) => {
    const key = `${dataISO}_${horaInicio}`;
    setSlotsSelecionados((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  // Lista de horas possíveis (08:00 às 21:00)
  const horasDoDia = useMemo(() => {
    return HORARIOS.filter((h) => {
      const m = toMinutes(h);
      return m >= toMinutes("07:00") && m <= toMinutes("21:00");
    });
  }, []);

  const totalSlotsSelecionados = slotsSelecionados.size;
  const totalReservasACriar = totalSlotsSelecionados * numSemanas;

  // Submissão final
  async function handleSubmit() {
    if (totalReservasACriar === 0 || isSubmitting) return;

    setIsSubmitting(true);
    setProgressoEnvio({ atual: 0, total: totalReservasACriar });

    try {
      // Decompor os slots selecionados
      const slotsArray: { dataBase: string; horaInicio: string; horaFim: string }[] = [];
      for (const key of slotsSelecionados) {
        const parts = key.split("_");
        const data = parts[0] || "";
        const horaInicio = parts[1] || "";
        if (!data || !horaInicio) continue;

        const timeParts = horaInicio.split(":").map(Number);
        const h = timeParts[0] ?? 0;
        const m = timeParts[1] ?? 0;
        const fimH = String(h + 1).padStart(2, "0");
        const fimM = String(m).padStart(2, "0");

        slotsArray.push({
          dataBase: data,
          horaInicio,
          horaFim: `${fimH}:${fimM}`,
        });
      }

      let criadasCount = 0;
      const erros: string[] = [];

      for (let w = 0; w < numSemanas; w++) {
        for (const slot of slotsArray) {
          const dataEfetiva = somarSemanas(slot.dataBase, w);

          try {
            const res = await criar.mutateAsync({
              unidade_id: unidadeId,
              sala_id: salaId,
              data: dataEfetiva,
              hora_inicio: slot.horaInicio,
              hora_fim: slot.horaFim,
              profissional_id: profissionalId,
              observacoes: observacoes
                ? `[Reserva Especial Admin] ${observacoes}`
                : "[Reserva Especial Admin]",
              recorrencia: "unica",
              status: "aprovada",
              comprovante: "reserva_especial_admin",
            });

            // Registrar log de auditoria
            await createAuditLog({
              action: "RESERVA_ESPECIAL_CRIADA",
              targetType: "RESERVA",
              targetId: res.id,
              targetName: `Reserva Especial - ${salaAtual?.nome ?? salaId}`,
              details: `Reserva Especial (Admin) criada pelo administrador ${user?.nome ?? "Admin"} em nome do profissional admin ${profissionalAtual?.nome ?? profissionalId}. Unidade: ${unidadeAtual?.nome ?? unidadeId}, Sala: ${salaAtual?.nome ?? salaId}, Data: ${formatarDataBR(dataEfetiva)}, Horário: ${slot.horaInicio} às ${slot.horaFim} (Semana ${w + 1}/${numSemanas}).`,
            });

            criadasCount++;
            setProgressoEnvio({ atual: criadasCount, total: totalReservasACriar });
          } catch (err: any) {
            console.error(`Erro ao criar reserva para ${dataEfetiva} ${slot.horaInicio}:`, err);
            erros.push(`${formatarDataBR(dataEfetiva)} ${slot.horaInicio}: ${err.message || "Erro"}`);
          }
        }
      }

      await queryClient.invalidateQueries({ queryKey: ["reservas"] });

      if (erros.length === 0) {
        toast.success(
          criadasCount > 1
            ? `${criadasCount} Reservas Especiais criadas com sucesso por ${numSemanas} semana(s)!`
            : "Reserva Especial criada com sucesso!",
        );
        onOpenChange(false);
      } else {
        toast.warning(
          `${criadasCount} reservas criadas. ${erros.length} falharam por conflitos de horário.`,
        );
        onOpenChange(false);
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Erro inesperado ao criar reservas especiais.");
    } finally {
      setIsSubmitting(false);
      setProgressoEnvio(null);
    }
  }

  if (!isAdmin) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "max-h-[92vh] overflow-y-auto border-amber-500/30 transition-all duration-300",
          etapa === 1 ? "sm:max-w-lg" : "sm:max-w-4xl",
        )}
      >
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="size-5 text-amber-500" />
            <DialogTitle className="text-amber-700 dark:text-amber-400">
              Reserva Especial (Exclusivo Administradores)
            </DialogTitle>
          </div>
          <DialogDescription>
            {etapa === 1
              ? "Passo 1 de 2: Selecione a unidade, sala, profissional admin e a data de início da semana."
              : "Passo 2 de 2: Selecione os horários disponíveis da semana e informe a repetição em semanas."}
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300 border border-amber-500/30 flex items-start gap-2">
          <ShieldAlert className="size-4 shrink-0 mt-0.5" />
          <span>
            Esta ação registrará log de auditoria especial (<strong>RESERVA_ESPECIAL_CRIADA</strong>)
            associado ao seu usuário administrador. Reservas com aprovação imediata e isentas de comprovante.
          </span>
        </div>

        {/* ETAPA 1: Configuração Base */}
        {etapa === 1 && (
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

            <div className="space-y-2">
              <Label htmlFor="dataInicio">Data de Início da Semana</Label>
              <Input
                id="dataInicio"
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
              />
              <p className="text-[11px] text-muted-foreground">
                A grade da semana (Segunda a Sábado) que engloba esta data será carregada no próximo passo.
              </p>
            </div>

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
          </div>
        )}

        {/* ETAPA 2: Grade Semanal e Repetição */}
        {etapa === 2 && (
          <div className="space-y-4 py-2">
            {/* Informações da Sala e Período */}
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-muted/40 p-3 text-xs">
              <div className="flex items-center gap-2">
                <CalendarIcon className="size-4 text-amber-600" />
                <span>
                  <strong>Semana de:</strong> {formatarDataBR(semanaInicioISO)} a {formatarDataBR(semanaFimISO)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Unidade:</span>
                <strong>{unidadeAtual?.nome}</strong>
                <span className="text-muted-foreground ml-2">Sala:</span>
                <strong>{salaAtual?.nome}</strong>
              </div>
            </div>

            {/* Repetição em Semanas */}
            <div className="rounded-lg border border-amber-500/20 bg-amber-50/50 dark:bg-amber-950/20 p-3.5 space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <Label htmlFor="numSemanas" className="text-sm font-semibold flex items-center gap-1.5">
                    <Clock className="size-4 text-amber-600" />
                    Repetir este comportamento por quantas semanas?
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Define por quantas semanas consecutivas os mesmos horários serão reservados (máximo 52 semanas / 1 ano).
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Input
                    id="numSemanas"
                    type="number"
                    min={1}
                    max={52}
                    value={numSemanas}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      if (isNaN(val)) setNumSemanas(1);
                      else setNumSemanas(Math.min(52, Math.max(1, val)));
                    }}
                    className="w-24 font-bold text-center"
                    disabled={isSubmitting}
                  />
                  <span className="text-xs font-medium text-muted-foreground">semana(s)</span>
                </div>
              </div>

              {totalSlotsSelecionados > 0 && (
                <div className="flex items-center gap-2 text-xs font-medium text-amber-700 dark:text-amber-400 pt-1">
                  <Info className="size-3.5 shrink-0" />
                  <span>
                    <strong>{totalSlotsSelecionados}</strong> horário(s) selecionado(s) × <strong>{numSemanas}</strong> semana(s) = <strong>{totalReservasACriar}</strong> reservas a serem criadas.
                  </span>
                </div>
              )}
            </div>

            {/* Grade Semanal de Horários */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Clique nos horários disponíveis que deseja reservar:
                </Label>
                {isLoadingReservas && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Loader2 className="size-3 animate-spin" /> Verificando horários...
                  </span>
                )}
              </div>

              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-center border-collapse min-w-[550px]">
                  <thead>
                    <tr className="bg-muted/60 border-b border-border">
                      <th className="p-2 text-xs font-semibold text-muted-foreground w-16">Hora</th>
                      {diasDaSemana.map((d) => (
                        <th key={d.dataISO} className="p-2 text-xs font-semibold border-l border-border">
                          <div>{d.labelCurto}</div>
                          <div className="text-[10px] font-normal text-muted-foreground">{formatarDataBR(d.dataISO).slice(0, 5)}</div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {horasDoDia.map((hora) => (
                      <tr key={hora} className="border-b border-border/50 hover:bg-muted/20">
                        <td className="p-1.5 text-xs font-medium text-muted-foreground bg-muted/30">
                          {hora}
                        </td>
                        {diasDaSemana.map((dia) => {
                          const indisponivelFuncionamento = !isSlotDisponivelFuncionamento(dia.dataISO, hora);
                          const reservaExistente = getReservaNoSlot(dia.dataISO, hora);
                          const ocupado = !!reservaExistente;
                          const key = `${dia.dataISO}_${hora}`;
                          const isSelecionado = slotsSelecionados.has(key);

                          if (indisponivelFuncionamento) {
                            return (
                              <td
                                key={dia.dataISO}
                                className="p-1 border-l border-border/50 bg-muted/40 text-[10px] text-muted-foreground select-none"
                              >
                                <span className="opacity-40">—</span>
                              </td>
                            );
                          }

                          if (ocupado) {
                            return (
                              <td
                                key={dia.dataISO}
                                className="p-1 border-l border-border/50 bg-destructive/10 text-destructive text-[11px] font-medium select-none"
                                title={`Ocupado: ${reservaExistente.status}`}
                              >
                                <span className="line-through opacity-70">Ocupado</span>
                              </td>
                            );
                          }

                          return (
                            <td key={dia.dataISO} className="p-1 border-l border-border/50">
                              <button
                                type="button"
                                disabled={isSubmitting}
                                onClick={() => toggleSlot(dia.dataISO, hora)}
                                className={cn(
                                  "w-full py-1.5 px-1 rounded text-xs font-medium transition-all flex items-center justify-center gap-1",
                                  isSelecionado
                                    ? "bg-amber-600 text-white shadow-sm ring-1 ring-amber-700"
                                    : "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-500/30",
                                )}
                              >
                                {isSelecionado ? (
                                  <>
                                    <Check className="size-3" />
                                    <span>{hora}</span>
                                  </>
                                ) : (
                                  <span>Livre</span>
                                )}
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Barra de Progresso durante a Submissão */}
            {isSubmitting && progressoEnvio && (
              <div className="rounded-lg bg-amber-500/15 p-3 text-sm text-amber-800 dark:text-amber-200 border border-amber-500/30 space-y-2">
                <div className="flex items-center justify-between font-medium">
                  <span className="flex items-center gap-2">
                    <Loader2 className="size-4 animate-spin shrink-0 text-amber-600" />
                    Criando reservas especiais ({progressoEnvio.atual} de {progressoEnvio.total})...
                  </span>
                  <span>{Math.round((progressoEnvio.atual / progressoEnvio.total) * 100)}%</span>
                </div>
                <div className="w-full bg-amber-200/50 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-amber-600 h-2 transition-all duration-200"
                    style={{ width: `${(progressoEnvio.atual / progressoEnvio.total) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-between sm:items-center gap-2 pt-2">
          {etapa === 1 ? (
            <>
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button
                onClick={() => setEtapa(2)}
                disabled={!podeAvancarEtapa1}
                className="bg-amber-600 hover:bg-amber-700 text-white gap-2"
              >
                <span>Avançar para Horários da Semana</span>
                <ArrowRight className="size-4" />
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => setEtapa(1)}
                disabled={isSubmitting}
                className="gap-1.5"
              >
                <ArrowLeft className="size-4" />
                <span>Voltar</span>
              </Button>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  onClick={() => onOpenChange(false)}
                  disabled={isSubmitting}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={totalReservasACriar === 0 || isSubmitting}
                  className="bg-amber-600 hover:bg-amber-700 text-white gap-2"
                >
                  {isSubmitting ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Sparkles className="size-4" />
                  )}
                  {isSubmitting
                    ? `Criando reservas (${progressoEnvio?.atual ?? 0}/${progressoEnvio?.total ?? totalReservasACriar})...`
                    : `Confirmar e Criar ${totalReservasACriar} Reserva(s)`}
                </Button>
              </div>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
