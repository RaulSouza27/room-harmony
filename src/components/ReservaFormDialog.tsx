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
import { useCreateReserva, useUpdateReserva } from "@/hooks/useApi";
import { findConflitos } from "@/services/api";
import { HORARIOS, toMinutes } from "@/services/db";
import type { Reserva, Sala, Unidade, User, Recorrencia } from "@/types";

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
  const [inicio, setInicio] = useState("08:00");
  const [fim, setFim] = useState("09:00");
  const [profissionalId, setProfissionalId] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [recorrencia, setRecorrencia] = useState<Recorrencia>("unica");
  const [comprovante, setComprovante] = useState("");
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!open) return;
    const base = reserva ?? preset;
    setUnidadeId(base?.unidade_id ?? unidadesDisponiveis[0]?.id ?? "");
    setSalaId(reserva?.sala_id ?? preset?.sala_id ?? "");
    setData(base?.data ?? hojeISO());
    setInicio(reserva?.hora_inicio ?? preset?.hora_inicio ?? "08:00");
    setFim(
      reserva?.hora_fim ??
        (preset?.hora_inicio
          ? `${String(Number(preset.hora_inicio.slice(0, 2)) + 1).padStart(2, "0")}:00`
          : "09:00"),
    );
    setProfissionalId(reserva?.profissional_id ?? (isAdmin ? "" : (user?.id ?? "")));
    setObservacoes(reserva?.observacoes ?? "");
    
    // Map legacy 'semanal' to 'semanal_mensal'
    const rec = (reserva?.recorrencia === "semanal") ? "semanal_mensal" : (reserva?.recorrencia ?? "unica");
    setRecorrencia(rec as Recorrencia);
    setComprovante(reserva?.comprovante ?? "");
  }, [open, reserva, preset, unidadesDisponiveis, isAdmin, user]);

  // Enforce automatic reservation duration set: 1h for avulsa, 4h for shift (turno)
  useEffect(() => {
    const startHour = Number(inicio.slice(0, 2));
    const duration = (recorrencia === "semanal_anual") ? 4 : 1;
    const endHour = startHour + duration;
    setFim(`${String(endHour).padStart(2, "0")}:00`);
  }, [inicio, recorrencia]);

  const salasDaUnidade = salas.filter((s) => s.unidade_id === unidadeId && s.status === "ativa");
  const profissionais = usuarios.filter((u) => u.status === "ativo");
  const selectedRoom = salas.find((x) => x.id === salaId);

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

  const maxHour = dayOfWeek === 6 ? 19 : 22;

  const foraDoHorario = useMemo(() => {
    if (dayOfWeek === 0) return true; // Sunday is closed
    const startHour = Number(inicio.slice(0, 2));
    const endHour = Number(fim.slice(0, 2));
    if (startHour < 7 || endHour > maxHour) return true;
    return false;
  }, [dayOfWeek, inicio, fim, maxHour]);

  const podeSalvar =
    !!unidadeId &&
    !!salaId &&
    !!profissionalId &&
    !horarioInvalido &&
    !foraDoHorario &&
    conflitos.length === 0;

  async function handleSubmit() {
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
          observacoes,
          recorrencia,
          comprovante,
        },
      });
    } else {
      await criar.mutateAsync({
        unidade_id: unidadeId,
        sala_id: salaId,
        data,
        hora_inicio: inicio,
        hora_fim: fim,
        profissional_id: profissionalId,
        observacoes,
        recorrencia,
        status: isAdmin ? "aprovada" : "pendente",
        comprovante,
      });
    }
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {reserva ? "Editar reserva" : isAdmin ? "Nova reserva" : "Solicitar reserva"}
          </DialogTitle>
          <DialogDescription>
            {isAdmin
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

          {salas.find((s) => s.id === salaId) ? (
            <div className="rounded-lg border border-border p-3 bg-muted/10 space-y-2">
              <p className="text-xs font-semibold text-foreground">Imagens e detalhes da sala:</p>
              {(() => {
                const s = salas.find((x) => x.id === salaId)!;
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
                  {HORARIOS.map((h) => (
                    <SelectItem key={h} value={h}>
                      {h}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Fim</Label>
              <Select value={fim} onValueChange={setFim} disabled>
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

          <div className="space-y-2">
            <Label>Recorrência</Label>
            <Select value={recorrencia} onValueChange={(v) => setRecorrencia(v as Recorrencia)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unica">Hora avulsa (1h)</SelectItem>
                <SelectItem value="semanal_mensal">Hora avulsa fixa (semanal até fim do mês)</SelectItem>
                <SelectItem value="semanal_anual">Turno (4h - semanal até fim do ano)</SelectItem>
              </SelectContent>
            </Select>
          </div>

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

          <div className="space-y-2">
            <Label>Comprovante de Pagamento</Label>
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
            )}
          </div>

          {dayOfWeek === 0 ? (
            <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              A clínica fica fechada aos domingos.
            </p>
          ) : foraDoHorario ? (
            <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              Horário de funcionamento: segunda a sexta (7h às 22h) e sábado (7h às 19h).
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
            </p>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!podeSalvar || criar.isPending || atualizar.isPending}
          >
            {reserva ? "Salvar alterações" : isAdmin ? "Criar reserva" : "Enviar solicitação"}
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
