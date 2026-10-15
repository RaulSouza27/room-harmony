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
import { useCreateReserva, useUpdateReserva, useHolidays, useSala } from "@/hooks/useApi";
import { findConflitos, getReservaReceipt } from "@/services/api";
import { HORARIOS, toMinutes } from "@/services/db";
import type { Reserva, Sala, Unidade, User, Recorrencia } from "@/types";
import { CalendarOff, Loader2, Sparkles } from "lucide-react";
import { isReservaEspecial } from "@/lib/format";
import { createAuditLog } from "@/services/auditService";
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
  type TipoReservaOpcao = "unica" | "semanal_mensal" | "semanal_anual" | "especial";
  const [tipoReserva, setTipoReserva] = useState<TipoReservaOpcao>("unica");
  const [comprovante, setComprovante] = useState("");
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);
  const [submittingLocal, setSubmittingLocal] = useState(false);

  const isEspecial = tipoReserva === "especial";

  useEffect(() => {
    if (!open) return;
    const base = reserva ?? preset;
    setUnidadeId(base?.unidade_id ?? unidadesDisponiveis[0]?.id ?? "");
    setSalaId(reserva?.sala_id ?? preset?.sala_id ?? "");
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
  }, [open, reserva, preset, unidadesDisponiveis, isAdmin, user]);

  // Enforce automatic reservation duration set: 1h for avulsa, 4h for shift (turno)
  useEffect(() => {
    if (tipoReserva === "especial") return;
    const startHour = Number(inicio.slice(0, 2));
    const duration = (tipoReserva === "semanal_anual") ? 4 : 1;
    const endHour = startHour + duration;
    setFim(`${String(endHour).padStart(2, "0")}:00`);
  }, [inicio, tipoReserva]);

  // Se especial estiver ativo e o horário de fim for menor ou igual ao de início, ajusta
  useEffect(() => {
    if (tipoReserva === "especial") {
      if (toMinutes(fim) <= toMinutes(inicio)) {
        const startHour = Number(inicio.slice(0, 2));
        const endHour = Math.min(startHour + 1, 22);
        setFim(`${String(endHour).padStart(2, "0")}:00`);
      }
      if (dataFim < data) {
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

  const comprovanteFaltando =
    !isAdmin &&
    !isEspecial &&
    (!comprovante || comprovante.trim() === "" || comprovante === "empty");

  const dataInvalida = isEspecial && dataFim < data;
  const isSubmitting = submittingLocal || criar.isPending || atualizar.isPending;

  const podeSalvar =
    !!unidadeId &&
    !!salaId &&
    !!profissionalId &&
    !horarioInvalido &&
    !dataInvalida &&
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

    const recorrenciaFinal: Recorrencia = isEspecial ? "unica" : (tipoReserva as Recorrencia);
    const comprovanteFinal = isEspecial ? "reserva_especial_admin" : comprovante;
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
            ...(comprovanteFinal !== "has_receipt" ? { comprovante: comprovanteFinal } : {}),
          },
        });

        if (isEspecial && dataFim > data) {
          const datas = gerarDatasIntervalo(data, dataFim).slice(1);
          for (const d of datas) {
            const res = await criar.mutateAsync({
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

            await createAuditLog({
              action: "RESERVA_ESPECIAL_CRIADA",
              targetType: "RESERVA",
              targetId: res.id,
              targetName: `Reserva Especial - ${salaObj?.nome ?? salaId}`,
              details: `Reserva Especial (Admin) criada pelo administrador ${user?.nome ?? "Admin"} em nome do profissional admin ${profObj?.nome ?? profissionalId}. Unidade: ${unidadeObj?.nome ?? unidadeId}, Sala: ${salaObj?.nome ?? salaId}, Data: ${d}, Horário: ${inicio} às ${fim}. Sem necessidade de aprovação ou comprovante.`,
            });
          }
        }
      } else if (isEspecial) {
        const datas = gerarDatasIntervalo(data, dataFim);
        for (const d of datas) {
          const res = await criar.mutateAsync({
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
          status: statusInicialNovaReserva(isAdmin),
          comprovante: comprovanteFinal,
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
            {reserva ? "Editar reserva" : isEspecial ? "Nova Reserva Especial (Admin)" : isAdmin ? "Nova reserva" : "Solicitar reserva"}
          </DialogTitle>
          <DialogDescription>
            {isEspecial
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
              <Select value={salaId} onValueChange={setSalaId} disabled={!unidadeId}>
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
              <Select value={profissionalId} onValueChange={setProfissionalId}>
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
            <Select value={tipoReserva} onValueChange={(v) => setTipoReserva(v as TipoReservaOpcao)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unica">Hora avulsa (1h)</SelectItem>
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
                <Select value={fim} onValueChange={setFim} disabled={true}>
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
          )}

          <div className="space-y-2">
            <Label htmlFor="obs">Observações</Label>
            <Textarea
              id="obs"
              value={observacoes}
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
              : reserva
                ? "Salvar alterações"
                : isAdmin
                  ? "Criar reserva"
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
