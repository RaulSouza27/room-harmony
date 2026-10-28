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
import { statusInicialNovaReserva } from "@/lib/reservaStatus";
import { useCreateReserva, useUpdateReserva, useHolidays, useSala, useMyCreditPackages } from "@/hooks/useApi";
import { findConflitos, getReservaReceipt } from "@/services/api";
import { HORARIOS, toMinutes } from "@/services/db";
import type { Reserva, Sala, Unidade, User, Recorrencia, ReservaStatus } from "@/types";
import { CalendarOff, Coins, Loader2, Sparkles } from "lucide-react";
import { formatarData, isReservaEspecial } from "@/lib/format";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  unidades: Unidade[];
  salas: Sala[];
  usuarios: User[];
  reservas: Reserva[];
  reserva?: Reserva | null;
  preset?: { unidade_id?: string; sala_id?: string; data?: string; hora_inicio?: string };
  modoReagendamento?: boolean;
}

const hojeISO = () => new Date().toISOString().slice(0, 10);

export function ReservaFormDialog({
  open,
  onOpenChange,
  unidades,
  salas,
  usuarios,
  reservas,
  reserva,
  preset,
  modoReagendamento = false,
}: Props) {
  const { user, isAdmin } = useAuth();
  const criar = useCreateReserva();
  const atualizar = useUpdateReserva("Reserva atualizada com sucesso.");

  const unidadesDisponiveis = useMemo(
    () =>
      unidades.filter(
        (u) =>
          u.status === "ativa" &&
          (isAdmin ||
            !user?.unidades ||
            user.unidades.length === 0 ||
            user.unidades.includes(u.id)),
      ),
    [unidades, isAdmin, user],
  );

  const [unidadeId, setUnidadeId] = useState("");
  const [salaId, setSalaId] = useState("");
  const [data, setData] = useState(hojeISO());
  const [dataFim, setDataFim] = useState(hojeISO());
  const [inicio, setInicio] = useState("08:00");
  const [fim, setFim] = useState("09:00");
  const [profissionalId, setProfissionalId] = useState("");
  const [observacoes, setObservacoes] = useState("");
  type TipoReservaOpcao = "unica" | "credito" | "semanal_mensal" | "semanal_anual" | "especial";
  const [tipoReserva, setTipoReserva] = useState<TipoReservaOpcao>("unica");
  const [comprovante, setComprovante] = useState("");
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);
  const [submittingLocal, setSubmittingLocal] = useState(false);

  const isEspecial = tipoReserva === "especial";
  const isCredito = tipoReserva === "credito" || Boolean(reserva?.paid_with_credits);
  const { data: myCreditPackages = [] } = useMyCreditPackages(open && !isAdmin);

  useEffect(() => {
    if (!open) return;
    const base = reserva ?? preset;
    const targetSalaId = reserva?.sala_id ?? preset?.sala_id ?? "";
    const salaObj = salas.find((s) => s.id === targetSalaId);
    const resolvedUnidadeId = base?.unidade_id || salaObj?.unidade_id || unidadesDisponiveis[0]?.id || "";

    setUnidadeId(resolvedUnidadeId);
    setSalaId(targetSalaId);
    setData(base?.data ?? hojeISO());
    setDataFim(base?.data ?? hojeISO());
    setInicio(reserva?.hora_inicio ?? preset?.hora_inicio ?? "08:00");
    setFim(
      reserva?.hora_fim ??
        (preset?.hora_inicio
          ? `${String(Number(preset.hora_inicio.slice(0, 2)) + 1).padStart(2, "0")}:00`
          : "09:00"),
    );
    setProfissionalId(reserva?.profissional_id ?? (isAdmin ? (user?.id ?? "") : (user?.id ?? "")));
    setObservacoes(reserva?.observacoes ?? "");
    
    if (reserva && isReservaEspecial(reserva)) {
      setTipoReserva("especial");
    } else if (reserva?.paid_with_credits) {
      setTipoReserva("credito");
    } else {
      // Map legacy 'semanal' to 'semanal_mensal'
      const rec = (reserva?.recorrencia === "semanal") ? "semanal_mensal" : (reserva?.recorrencia ?? "unica");
      setTipoReserva(rec as TipoReservaOpcao);
    }
    if (reserva?.comprovante === "has_receipt" && reserva?.id) {
      getReservaReceipt(reserva.id).then((img: string) => {
        if (img && img !== "empty") {
          setComprovante(img);
        }
      }).catch(() => {});
    } else {
      setComprovante(reserva?.comprovante ?? "");
    }
  }, [open, reserva, preset, unidadesDisponiveis, salas, isAdmin, user]);

  // Enforce automatic reservation duration set: 1h for avulsa, 4h for shift (turno)
  useEffect(() => {
    if (tipoReserva === "especial" || tipoReserva === "credito") return;
    const startHour = Number(inicio.slice(0, 2));
    const duration = (tipoReserva === "semanal_anual") ? 4 : 1;
    const endHour = startHour + duration;
    setFim(`${String(endHour).padStart(2, "0")}:00`);
  }, [inicio, tipoReserva]);

  // Se especial ou crédito estiver ativo e o horário de fim for menor ou igual ao de início, ajusta
  useEffect(() => {
    if (tipoReserva === "especial" || tipoReserva === "credito") {
      if (toMinutes(fim) <= toMinutes(inicio)) {
        const startHour = Number(inicio.slice(0, 2));
        const endHour = Math.min(startHour + 1, 22);
        setFim(`${String(endHour).padStart(2, "0")}:00`);
      }
      if (tipoReserva === "especial" && dataFim < data) {
        setDataFim(data);
      }
    }
  }, [tipoReserva, inicio, fim, data, dataFim]);

  const salasDaUnidade = salas.filter((s) => s.unidade_id === unidadeId && s.status === "ativa");
  const profissionais = useMemo(() => {
    if (isEspecial) {
      return usuarios.filter((u) => u.status === "ativo" && u.papel === "ADMINISTRADOR");
    }
    return usuarios.filter((u) => u.status === "ativo");
  }, [usuarios, isEspecial]);

  useEffect(() => {
    if (isEspecial && profissionais.length > 0) {
      const isProfAdmin = profissionais.some((p) => p.id === profissionalId);
      if (!isProfAdmin) {
        setProfissionalId(user?.papel === "ADMINISTRADOR" ? (user?.id ?? "") : (profissionais[0]?.id ?? ""));
      }
    }
  }, [isEspecial, profissionais, profissionalId, user]);
  const { data: fullSelectedRoom } = useSala(open && salaId ? salaId : null);
  const selectedRoom = fullSelectedRoom ?? salas.find((x) => x.id === salaId);

  const horarioInvalido = toMinutes(fim) <= toMinutes(inicio);
  const conflitos =
    salaId && !horarioInvalido
      ? findConflitos(reservas, {
          sala_id: salaId,
          data,
          hora_inicio: inicio,
          hora_fim: fim,
          ...(reserva ? { ignoreId: reserva.id } : {}),
        })
      : [];

  const dayOfWeek = useMemo(() => {
    if (!data) return -1;
    const dateObj = new Date(data + "T00:00:00");
    return dateObj.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  }, [data]);

  const unidadeObj = useMemo(() => unidades.find((u) => u.id === unidadeId), [unidades, unidadeId]);

  const daySchedule = useMemo(() => {
    if (!unidadeObj?.business_hours || dayOfWeek < 0) return null;
    return unidadeObj.business_hours[String(dayOfWeek)] ?? null;
  }, [unidadeObj, dayOfWeek]);

  const foraDoHorario = useMemo(() => {
    if (!daySchedule || !daySchedule.ativo || !daySchedule.abertura || !daySchedule.fechamento) {
      return true;
    }
    const startMin = toMinutes(inicio);
    const endMin = toMinutes(fim);
    const abertMin = toMinutes(daySchedule.abertura);
    const fechMin = toMinutes(daySchedule.fechamento);
    return startMin < abertMin || endMin > fechMin;
  }, [daySchedule, inicio, fim]);

  const horariosInicioDisponiveis = useMemo(() => {
    if (!daySchedule || !daySchedule.ativo || !daySchedule.abertura || !daySchedule.fechamento) return HORARIOS;
    const abertMin = toMinutes(daySchedule.abertura);
    const fechMin = toMinutes(daySchedule.fechamento);
    return HORARIOS.filter((h) => {
      const hMin = toMinutes(h);
      return hMin >= abertMin && hMin < fechMin;
    });
  }, [daySchedule]);

  const { data: holidays = [] } = useHolidays(unidadeId);

  const feriadoDaData = useMemo(() => {
    if (!data) return null;
    return holidays.find((h) => {
      if (!h.status) return false;
      const isGlobalOrUnit = !h.unitId || String(h.unitId) === String(unidadeId);
      if (!isGlobalOrUnit) return false;
      const startDate = h.startDate;
      const endDate = h.endDate || h.startDate;
      return data >= startDate && data <= endDate;
    });
  }, [data, holidays, unidadeId]);

  const horasSelecionadas = useMemo(() => {
    const diff = (toMinutes(fim) - toMinutes(inicio)) / 60;
    return diff > 0 ? Math.round(diff) : 0;
  }, [inicio, fim]);

  // Pacotes ativos na unidade selecionada (hoje) vs. pacotes válidos até a data da reserva
  const { creditosAtivosUnidadeHoje, creditosValidosNaData, maxValidadePacoteUnidade } = useMemo(() => {
    if (!unidadeId) {
      return { creditosAtivosUnidadeHoje: 0, creditosValidosNaData: 0, maxValidadePacoteUnidade: null as string | null };
    }
    const now = new Date();
    let ativosHoje = 0;
    let validosData = 0;
    let maxExpiry: string | null = null;

    for (const p of myCreditPackages) {
      if (
        p.status === "APPROVED" &&
        String(p.unitId) === String(unidadeId) &&
        p.remainingCredits > 0 &&
        (!p.expiresAt || new Date(p.expiresAt) >= now)
      ) {
        ativosHoje += p.remainingCredits;
        const expDateStr = p.expiresAt ? p.expiresAt.slice(0, 10) : null;
        if (expDateStr && (!maxExpiry || expDateStr > maxExpiry)) {
          maxExpiry = expDateStr;
        }
        if (!expDateStr || !data || expDateStr >= data) {
          validosData += p.remainingCredits;
        }
      }
    }
    return {
      creditosAtivosUnidadeHoje: ativosHoje,
      creditosValidosNaData: validosData,
      maxValidadePacoteUnidade: maxExpiry,
    };
  }, [myCreditPackages, unidadeId, data]);

  const horasExtrasNecessarias = useMemo(() => {
    if (!isCredito) return 0;
    if (reserva?.paid_with_credits) {
      const jaUsadas = reserva.credit_hours_used || 1;
      return Math.max(0, horasSelecionadas - jaUsadas);
    }
    return horasSelecionadas;
  }, [isCredito, reserva, horasSelecionadas]);

  const dataAposVencimentoPacote =
    isCredito &&
    !isAdmin &&
    creditosAtivosUnidadeHoje > 0 &&
    creditosValidosNaData < horasExtrasNecessarias &&
    Boolean(maxValidadePacoteUnidade && data > maxValidadePacoteUnidade);

  const saldoCreditoInsuficiente =
    isCredito && !isAdmin && creditosValidosNaData < horasExtrasNecessarias;

  const comprovanteFaltando =
    !isAdmin &&
    !isEspecial &&
    !isCredito &&
    !modoReagendamento &&
    !reserva &&
    (!comprovante || comprovante.trim() === "" || comprovante === "empty");

  const dataInvalida = isEspecial && dataFim < data;
  const isSubmitting = submittingLocal || criar.isPending || atualizar.isPending;

  const podeSalvar =
    !!unidadeId &&
    !!salaId &&
    !!profissionalId &&
    !horarioInvalido &&
    !dataInvalida &&
    !saldoCreditoInsuficiente &&
    (isEspecial || (!foraDoHorario && !feriadoDaData && conflitos.length === 0)) &&
    !comprovanteFaltando &&
    !isSubmitting;

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

    const recorrenciaFinal: Recorrencia =
      isEspecial || isCredito ? "unica" : (tipoReserva as Recorrencia);
    const comprovanteFinal = isEspecial
      ? "reserva_especial_admin"
      : isCredito
        ? "credito_pacote"
        : comprovante;
    const observacoesFinal = isEspecial
      ? (observacoes.includes("[Reserva Especial Admin]")
          ? observacoes
          : (observacoes ? `[Reserva Especial Admin] ${observacoes}` : "[Reserva Especial Admin]"))
      : observacoes.replace("[Reserva Especial Admin]", "").trim();

    const unidadeObj = unidades.find((u) => u.id === unidadeId);
    const salaObj = salas.find((s) => s.id === salaId);
    const profObj = usuarios.find((u) => u.id === profissionalId);

    try {
      setSubmittingLocal(true);

      if (reserva) {
        // Para admins editando, define explicitamente status ("aprovada" se reagendando).
        // Para locatários reagendando, o status NÃO deve ser enviado no payload:
        // o backend automaticamente detecta a alteração de data/horário feita pelo locatário
        // e transiciona a reserva para "pendente" (evitando erro 403 de locatário alterando status).
        const statusAposEdicao: ReservaStatus | undefined =
          isAdmin && (modoReagendamento || reserva.status === "reagendar")
            ? "aprovada"
            : undefined;

        await atualizar.mutateAsync({
          id: reserva.id,
          patch: {
            unidade_id: unidadeId,
            sala_id: salaId,
            data,
            hora_inicio: inicio,
            hora_fim: fim,
            profissional_id: profissionalId,
            observacoes: observacoesFinal,
            recorrencia: recorrenciaFinal,
            ...(statusAposEdicao ? { status: statusAposEdicao } : {}),
            ...(comprovanteFinal !== "has_receipt" ? { comprovante: comprovanteFinal } : {}),
          },
        });

        if (isEspecial && dataFim > data) {
          const datas = gerarDatasIntervalo(data, dataFim).slice(1);
          for (const d of datas) {
            await criar.mutateAsync({
              unidade_id: unidadeId,
              sala_id: salaId,
              data: d,
              hora_inicio: inicio,
              hora_fim: fim,
              profissional_id: profissionalId,
              observacoes: observacoesFinal,
              recorrencia: "unica",
              status: "aprovada",
              comprovante: comprovanteFinal,
            });
          }
        }
      } else if (isEspecial) {
        const datas = gerarDatasIntervalo(data, dataFim);
        for (const d of datas) {
          await criar.mutateAsync({
            unidade_id: unidadeId,
            sala_id: salaId,
            data: d,
            hora_inicio: inicio,
            hora_fim: fim,
            profissional_id: profissionalId,
            observacoes: observacoesFinal,
            recorrencia: "unica",
            status: "aprovada",
            comprovante: comprovanteFinal,
          });
        }

        toast.success(
          datas.length > 1
            ? `${datas.length} Reservas Especiais criadas com sucesso!`
            : "Reserva Especial criada com sucesso!",
        );
      } else {
        await criar.mutateAsync({
          unidade_id: unidadeId,
          sala_id: salaId,
          data,
          hora_inicio: inicio,
          hora_fim: fim,
          profissional_id: profissionalId,
          observacoes: observacoesFinal,
          recorrencia: recorrenciaFinal,
          status: statusInicialNovaReserva(isAdmin, isCredito),
          comprovante: comprovanteFinal,
          paid_with_credits: isCredito,
        });
      }
      onOpenChange(false);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Erro ao salvar reserva.");
    } finally {
      setSubmittingLocal(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isEspecial && <Sparkles className="size-5 text-amber-500" />}
            {modoReagendamento
              ? "Reagendar reserva"
              : reserva
                ? "Editar reserva"
                : isEspecial
                  ? "Nova Reserva Especial (Admin)"
                  : isAdmin
                    ? "Nova reserva"
                    : "Solicitar reserva"}
          </DialogTitle>
          <DialogDescription>
            {modoReagendamento
              ? "Escolha a nova data e horário para reagendamento. A solicitação será enviada para aprovação do administrador."
              : isEspecial
                ? "Reserva especial administrativa aprovada de forma imediata e auditada."
                : isAdmin
                  ? "Reservas criadas pelo administrador já entram como aprovadas."
                  : "Sua solicitação ficará pendente até a aprovação da coordenação."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Unidade</Label>
              <Select
                value={unidadeId}
                disabled={modoReagendamento || Boolean(reserva?.paid_with_credits)}
                onValueChange={(v) => {
                  setUnidadeId(v);
                  setSalaId("");
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {unidadesDisponiveis.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Sala</Label>
              <Select value={salaId} onValueChange={setSalaId} disabled={!unidadeId || modoReagendamento}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
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

          {selectedRoom ? (
            <div className="rounded-lg border border-border p-3 bg-muted/10 space-y-2">
              <p className="text-xs font-semibold text-foreground">Imagens e detalhes da sala:</p>
              {(() => {
                const s = selectedRoom;
                return (
                  <>
                    {s.descricao ? (
                      <p className="text-xs text-muted-foreground leading-relaxed">{s.descricao}</p>
                    ) : null}
                    {s.fotos && s.fotos.length > 0 ? (
                      <div className="grid grid-cols-4 gap-2 mt-1">
                        {s.fotos.map((foto, index) => (
                          <div
                            key={index}
                            className="aspect-square rounded border border-border overflow-hidden bg-muted"
                          >
                            <img
                              src={foto}
                              alt={`Foto ${index + 1}`}
                              className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform"
                              onClick={() => setSelectedPhotoIndex(index)}
                            />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[10px] text-muted-foreground/60 italic">
                        Nenhuma foto cadastrada para esta sala.
                      </p>
                    )}
                  </>
                );
              })()}
            </div>
          ) : null}

          {isAdmin ? (
            <div className="space-y-2">
              <Label>Profissional</Label>
              <Select value={profissionalId} onValueChange={setProfissionalId} disabled={modoReagendamento}>
                <SelectTrigger>
                  <SelectValue placeholder="Em nome de..." />
                </SelectTrigger>
                <SelectContent>
                  {profissionais.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          <div className="space-y-2">
            <Label>Tipo / Recorrência</Label>
            <Select
              value={tipoReserva}
              onValueChange={(v) => setTipoReserva(v as TipoReservaOpcao)}
              disabled={modoReagendamento || Boolean(reserva?.paid_with_credits)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unica">Hora avulsa (1h)</SelectItem>
                {(!isAdmin || Boolean(reserva?.paid_with_credits)) && (
                  <SelectItem value="credito" className="font-semibold text-emerald-700 dark:text-emerald-300">
                    💳 Usar Créditos do Pacote ({creditosValidosNaData}h disponíveis na data)
                  </SelectItem>
                )}
                <SelectItem value="semanal_mensal">Hora avulsa fixa (semanal até fim do mês)</SelectItem>
                <SelectItem value="semanal_anual">Turno (4h - semanal até fim do ano)</SelectItem>
                {isAdmin && (
                  <SelectItem value="especial" className="font-semibold text-amber-800 dark:text-amber-300">
                    ✨ Reserva Especial (Admin)
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          {isCredito && (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-800 dark:text-emerald-200 flex items-start gap-2.5">
              <Coins className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div className="space-y-1 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold">Reserva com Pacote de Créditos (Aprovação Imediata)</p>
                  <span className="font-bold bg-emerald-500/20 px-2 py-0.5 rounded border border-emerald-500/30">
                    Duração: {horasSelecionadas}h ({horasSelecionadas} crédito{horasSelecionadas > 1 ? "s" : ""})
                  </span>
                </div>
                <p className="opacity-90">
                  Saldo válido nesta unidade para a data <strong>{formatarData(data)}</strong>:{" "}
                  <strong>{creditosValidosNaData}h</strong>. Você pode escolher 1h ou mais horas inteiras no campo Fim.
                </p>
                {dataAposVencimentoPacote && maxValidadePacoteUnidade && (
                  <p className="text-destructive font-semibold mt-1">
                    ⚠️ A data selecionada ({formatarData(data)}) ultrapassa o vencimento de 30 dias do seu pacote ativo ({formatarData(maxValidadePacoteUnidade)}). A reserva precisa acontecer dentro da validade do pacote.
                  </p>
                )}
                {!dataAposVencimentoPacote && saldoCreditoInsuficiente && (
                  <p className="text-destructive font-semibold mt-1">
                    ⚠️ Saldo de créditos insuficiente nesta unidade para cobrir {horasExtrasNecessarias}h. Solicite um pacote na aba &ldquo;Meus créditos&rdquo;.
                  </p>
                )}
              </div>
            </div>
          )}

          {isEspecial && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-200 flex items-start gap-2">
              <Sparkles className="size-4 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Modo Reserva Especial (Exclusivo Administradores)</p>
                <p className="opacity-90">
                  Período flexível com data de início e fim, horários customizados, sem necessidade de comprovante e com auditoria registrada.
                </p>
              </div>
            </div>
          )}

          {isEspecial ? (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="dataInicio">Data de Início</Label>
                  <Input
                    id="dataInicio"
                    type="date"
                    value={data}
                    onChange={(e) => {
                      setData(e.target.value);
                      if (e.target.value > dataFim) setDataFim(e.target.value);
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dataFim">Data de Fim</Label>
                  <Input
                    id="dataFim"
                    type="date"
                    min={data}
                    value={dataFim}
                    onChange={(e) => setDataFim(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Início</Label>
                  <Select value={inicio} onValueChange={setInicio}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {horariosInicioDisponiveis.map((h) => (
                        <SelectItem key={h} value={h}>
                          {h}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Fim</Label>
                  <Select value={fim} onValueChange={setFim}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[...HORARIOS.slice(1), "22:00"].map((h) => (
                        <SelectItem
                          key={h}
                          value={h}
                          disabled={toMinutes(h) <= toMinutes(inicio)}
                        >
                          {h}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="data">Data</Label>
                <Input id="data" type="date" value={data} onChange={(e) => setData(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Início</Label>
                <Select value={inicio} onValueChange={setInicio}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {horariosInicioDisponiveis.map((h) => (
                      <SelectItem key={h} value={h}>
                        {h}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Fim</Label>
                <Select value={fim} onValueChange={setFim} disabled={!isCredito}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[...HORARIOS.slice(1), "22:00"].map((h) => (
                      <SelectItem
                        key={h}
                        value={h}
                        disabled={toMinutes(h) <= toMinutes(inicio)}
                      >
                        {h}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="obs">Observações</Label>
            <Textarea
              id="obs"
              value={observacoes}
              disabled={modoReagendamento}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Informações adicionais (opcional)"
              maxLength={500}
            />
          </div>

          {isEspecial ? (
            <div className="rounded-lg border border-border/60 bg-muted/20 p-3 text-xs text-muted-foreground flex items-center justify-between">
              <span>Comprovante de pagamento dispensado para Reserva Especial.</span>
              <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                Dispensado
              </span>
            </div>
          ) : isCredito ? (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-700 dark:text-emerald-300 flex items-center justify-between">
              <span>Pagamento realizado via Pacote de Créditos (comprovante já aprovado no pacote).</span>
              <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded border border-emerald-500/30">
                Usando Créditos
              </span>
            </div>
          ) : modoReagendamento ? (
            <div className="rounded-lg border border-purple-500/30 bg-purple-500/10 p-3 text-xs text-purple-700 dark:text-purple-300 flex items-center justify-between">
              <span>Comprovante original de pagamento mantido para esta reserva.</span>
              <span className="text-[10px] font-semibold text-purple-700 dark:text-purple-300 bg-purple-500/20 px-2 py-0.5 rounded border border-purple-500/30">
                Mantido
              </span>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-1">
                  Comprovante de Pagamento
                  {!isAdmin && <span className="text-destructive font-bold">*</span>}
                </Label>
              </div>

              <p className="text-xs text-amber-700 bg-amber-50 dark:text-amber-300 dark:bg-amber-950/40 p-2.5 rounded-lg border border-amber-200/50 dark:border-amber-900/50">
                ⚠️ A reserva só é feita mediante a apresentação do comprovante de pagamento.
              </p>

              {comprovante ? (
                <div className="relative border border-border rounded-lg p-2 bg-muted/10">
                  <div className="relative aspect-video rounded overflow-hidden bg-black flex items-center justify-center h-40">
                    <img
                      src={comprovante}
                      alt="Comprovante"
                      className="max-w-full max-h-full object-contain"
                    />
                    <button
                      type="button"
                      onClick={() => setComprovante("")}
                      className="absolute top-1 right-1 bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-full p-1 text-[10px]"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="flex flex-col items-center justify-center cursor-pointer border border-dashed border-border rounded-lg p-4 h-24 bg-muted/20 hover:bg-muted/30 transition-colors">
                    <span className="text-sm font-medium text-foreground">Anexar Comprovante</span>
                    <span className="text-xs text-muted-foreground mt-1">Upload de imagem</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          try {
                            const base64 = await fileToBase64Helper(file);
                            setComprovante(base64);
                          } catch (err) {
                            console.error(err);
                          }
                        }
                      }}
                    />
                  </label>
                  {comprovanteFaltando && (
                    <p className="text-xs font-semibold text-destructive animate-pulse">
                      * Campo obrigatório: Por favor, anexe o comprovante de pagamento.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {dataInvalida ? (
            <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              A data de término deve ser igual ou posterior à data de início.
            </p>
          ) : null}
          {feriadoDaData && !isEspecial ? (
            <div className="flex items-center gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-300">
              <CalendarOff className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <span>
                {feriadoDaData.unitId
                  ? `A unidade (${unidades.find((u) => String(u.id) === String(unidadeId))?.nome || feriadoDaData.unitName || "selecionada"}) estará fechada nesta data devido ao bloqueio: `
                  : "Todas as unidades estarão fechadas nesta data devido ao feriado: "}
                <strong>{feriadoDaData.name}</strong>.
              </span>
            </div>
          ) : null}
          {foraDoHorario && !isEspecial ? (
            <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {!daySchedule || !daySchedule.ativo
                ? "A unidade selecionada está fechada neste dia da semana."
                : `A unidade funciona apenas das ${daySchedule.abertura} às ${daySchedule.fechamento} neste dia.`}
            </p>
          ) : null}
          {horarioInvalido ? (
            <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              O horário final deve ser depois do horário inicial.
            </p>
          ) : null}
          {conflitos.length ? (
            <p className="rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-warning-foreground">
              Conflito: já existe reserva {conflitos[0]!.status} nesta sala das{" "}
              {conflitos[0]!.hora_inicio} às {conflitos[0]!.hora_fim}.
              {isEspecial ? " (Como Administrador em Reserva Especial, você pode prosseguir mesmo com conflito)." : ""}
            </p>
          ) : null}
          {isSubmitting ? (
            <div className="flex items-center justify-center gap-2 rounded-lg bg-primary/10 p-3 text-sm text-primary font-medium border border-primary/20 animate-pulse">
              <Loader2 className="size-4 animate-spin shrink-0" />
              <span>{reserva ? "Salvando alterações da reserva..." : "Processando reserva, por favor aguarde..."}</span>
            </div>
          ) : null}
          {!podeSalvar && !isSubmitting ? (
            <div className="rounded-md border border-destructive/20 bg-destructive/5 p-3 text-xs text-destructive space-y-1">
              <span className="font-semibold block">Para habilitar o envio, verifique:</span>
              <ul className="list-disc pl-4 space-y-0.5">
                {!unidadeId && <li>Unidade não informada.</li>}
                {!salaId && <li>Sala não informada.</li>}
                {!profissionalId && <li>Profissional não informado.</li>}
                {horarioInvalido && <li>Horário final deve ser maior que o inicial.</li>}
                {dataInvalida && <li>Data final inválida.</li>}
                {foraDoHorario && !isEspecial && <li>Horário selecionado está fora do funcionamento da unidade ou dia fechado.</li>}
                {feriadoDaData && !isEspecial && <li>A data selecionada coincide com um feriado/bloqueio ({feriadoDaData.name}).</li>}
                {conflitos.length > 0 && !isEspecial && <li>Conflito: já existe reserva no mesmo horário nesta sala.</li>}
                {comprovanteFaltando && <li>Comprovante de pagamento obrigatório.</li>}
                {saldoCreditoInsuficiente && (
                  <li>
                    {dataAposVencimentoPacote
                      ? "A data escolhida ultrapassa o vencimento de 30 dias do seu pacote de créditos."
                      : `Saldo de créditos insuficiente nesta unidade para a data (${creditosValidosNaData}h disponíveis, ${horasExtrasNecessarias}h necessárias).`}
                  </li>
                )}
              </ul>
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!podeSalvar}
            className="gap-2"
          >
            {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
            {isSubmitting
              ? reserva
                ? "Salvando..."
                : "Processando..."
              : modoReagendamento
                ? "Enviar solicitação de reagendamento"
                : reserva
                  ? "Salvar alterações"
                  : isAdmin
                    ? "Criar reserva"
                    : isCredito
                      ? `Confirmar com ${horasSelecionadas} crédito(s)`
                      : "Enviar solicitação"}
          </Button>
        </DialogFooter>
      </DialogContent>
      {selectedPhotoIndex !== null &&
      selectedRoom &&
      selectedRoom.fotos &&
      selectedRoom.fotos.length > 0 ? (
        <Dialog open={selectedPhotoIndex !== null} onOpenChange={() => setSelectedPhotoIndex(null)}>
          <DialogContent className="sm:max-w-xl p-3 flex flex-col items-center justify-center bg-background/95 border-none shadow-2xl">
            <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-black flex items-center justify-center">
              <img
                src={selectedRoom.fotos[selectedPhotoIndex]}
                alt={`Foto ${selectedPhotoIndex + 1}`}
                className="max-w-full max-h-full object-contain"
              />
              {selectedRoom.fotos.length > 1 ? (
                <>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedPhotoIndex((prev) =>
                        prev! === 0 ? selectedRoom.fotos.length - 1 : prev! - 1,
                      );
                    }}
                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/60 text-white rounded-full p-2 text-sm hover:bg-black/80 font-bold"
                  >
                    ◀
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedPhotoIndex((prev) =>
                        prev! === selectedRoom.fotos.length - 1 ? 0 : prev! + 1,
                      );
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/60 text-white rounded-full p-2 text-sm hover:bg-black/80 font-bold"
                  >
                    ▶
                  </button>
                </>
              ) : null}
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              Foto {selectedPhotoIndex + 1} de {selectedRoom.fotos.length}
            </div>
          </DialogContent>
        </Dialog>
      ) : null}
    </Dialog>
  );
}

function fileToBase64Helper(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
}
