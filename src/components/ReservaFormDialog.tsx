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
import type { Reserva, Sala, Unidade, User } from "@/types";

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
        (u) => u.status === "ativa" && (isAdmin || (user?.unidades ?? []).includes(u.id)),
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
  const [recorrencia, setRecorrencia] = useState<"unica" | "semanal">("unica");

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
    setRecorrencia(reserva?.recorrencia ?? "unica");
  }, [open, reserva, preset, unidadesDisponiveis, isAdmin, user]);

  const salasDaUnidade = salas.filter((s) => s.unidade_id === unidadeId && s.status === "ativa");
  const profissionais = usuarios.filter((u) => u.papel === "PSICOLOGO" && u.status === "ativo");

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

  const podeSalvar =
    !!unidadeId && !!salaId && !!profissionalId && !horarioInvalido && conflitos.length === 0;

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
                              onClick={() => window.open(foto, "_blank")}
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

          <div className="space-y-2">
            <Label>Recorrência</Label>
            <Select value={recorrencia} onValueChange={(v) => setRecorrencia(v as "unica")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unica">Única</SelectItem>
                <SelectItem value="semanal">Semanal</SelectItem>
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
    </Dialog>
  );
}
