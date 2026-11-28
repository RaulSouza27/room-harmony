import { useEffect, useMemo, useState } from "react";
import {
  ArrowRightLeft,
  Check,
  ChevronDown,
  Clock,
  Loader2,
  Search,
  UserRoundCheck,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useTransferReservaHours } from "@/hooks/useApi";
import { formatarDataLonga } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Reserva, Sala, Unidade, User } from "@/types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reserva: Reserva | null;
  initialSlotHora?: string | null;
  sala?: Sala;
  unidade?: Unidade;
  usuarios: User[];
}

function gerarSlotsDeUmaHora(horaInicio: string, horaFim: string): Array<{ inicio: string; fim: string }> {
  const startH = Number(horaInicio.slice(0, 2));
  const endH = Number(horaFim.slice(0, 2));
  if (Number.isNaN(startH) || Number.isNaN(endH) || endH <= startH) return [];
  const list: Array<{ inicio: string; fim: string }> = [];
  for (let h = startH; h < endH; h++) {
    list.push({
      inicio: `${String(h).padStart(2, "0")}:00`,
      fim: `${String(h + 1).padStart(2, "0")}:00`,
    });
  }
  return list;
}

export function TransferirHorarioDialog({
  open,
  onOpenChange,
  reserva,
  initialSlotHora,
  sala,
  unidade,
  usuarios,
}: Props) {
  const transferir = useTransferReservaHours();

  const [selectedSlots, setSelectedSlots] = useState<string[]>([]);
  const [targetUserId, setTargetUserId] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [profBusca, setProfBusca] = useState("");
  const [profDropdownOpen, setProfDropdownOpen] = useState(false);

  const slotsDoTurno = useMemo(() => {
    if (!reserva) return [];
    return gerarSlotsDeUmaHora(reserva.hora_inicio, reserva.hora_fim);
  }, [reserva]);

  useEffect(() => {
    if (!open || !reserva) return;
    const validSlots = gerarSlotsDeUmaHora(reserva.hora_inicio, reserva.hora_fim);
    if (initialSlotHora && validSlots.some((s) => s.inicio === initialSlotHora)) {
      setSelectedSlots([initialSlotHora]);
    } else if (validSlots.length === 1 && validSlots[0]) {
      setSelectedSlots([validSlots[0].inicio]);
    } else {
      setSelectedSlots([]);
    }
    setTargetUserId("");
    setObservacoes("");
    setProfBusca("");
    setProfDropdownOpen(false);
  }, [open, reserva, initialSlotHora]);

  const titularAtual = useMemo(
    () => usuarios.find((u) => u.id === reserva?.profissional_id),
    [usuarios, reserva?.profissional_id],
  );

  const profissionaisDisponiveis = useMemo(
    () =>
      usuarios.filter(
        (u) => u.status === "ativo" && u.id !== reserva?.profissional_id,
      ),
    [usuarios, reserva?.profissional_id],
  );

  const profissionaisFiltrados = useMemo(() => {
    const q = profBusca
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    if (!q) return profissionaisDisponiveis;
    return profissionaisDisponiveis.filter((p) =>
      (p.nome || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .includes(q),
    );
  }, [profissionaisDisponiveis, profBusca]);

  const profissionalDestinatario = useMemo(
    () => profissionaisDisponiveis.find((p) => p.id === targetUserId),
    [profissionaisDisponiveis, targetUserId],
  );

  if (!reserva) return null;

  const toggleSlot = (horaInicio: string) => {
    setSelectedSlots((prev) =>
      prev.includes(horaInicio)
        ? prev.filter((h) => h !== horaInicio)
        : [...prev, horaInicio].sort(),
    );
  };

  const podeConfirmar =
    selectedSlots.length > 0 &&
    !!targetUserId &&
    !transferir.isPending;

  const handleConfirm = async () => {
    if (!podeConfirmar) return;
    await transferir.mutateAsync({
      reservaId: reserva.id,
      targetUserId,
      slots: selectedSlots,
      observacoes: observacoes.trim() || undefined,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeft className="size-5 text-primary" />
            Transferir Horário(s) para Outro Profissional
          </DialogTitle>
          <DialogDescription>
            Selecione quais horas deste período deseja ceder para outro profissional. Os horários não marcados permanecerão com{" "}
            <strong>{titularAtual?.nome ?? "o titular atual"}</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {/* Resumo da Reserva Original */}
          <div className="rounded-xl border border-border bg-muted/30 p-3.5 text-xs space-y-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-semibold text-foreground">
                {sala?.nome ?? `Sala #${reserva.sala_id}`} · {unidade?.nome ?? "Unidade"}
              </span>
              <Badge variant="outline" className="text-[10px]">
                {reserva.hora_inicio} às {reserva.hora_fim} ({slotsDoTurno.length}h)
              </Badge>
            </div>
            <p className="text-muted-foreground">
              {formatarDataLonga(reserva.data)} · Titular atual:{" "}
              <strong className="text-foreground">{titularAtual?.nome ?? "Administrador"}</strong>
            </p>
          </div>

          {/* Seletor de Profissional Destinatário com Busca por Nome */}
          <div className="space-y-2 relative">
            <Label>
              Transferir para o profissional <span className="text-destructive">*</span>
            </Label>
            <button
              type="button"
              onClick={() => setProfDropdownOpen((prev) => !prev)}
              className={cn(
                "flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs ring-offset-background focus:outline-none focus:ring-1 focus:ring-ring",
                !profissionalDestinatario && "text-muted-foreground",
              )}
            >
              <span className="truncate">
                {profissionalDestinatario
                  ? `${profissionalDestinatario.nome} (${profissionalDestinatario.papel === "ADMINISTRADOR" ? "Admin" : "Locatário"})`
                  : "Pesquisar e selecionar profissional..."}
              </span>
              <ChevronDown className="size-4 opacity-50 shrink-0 ml-2" />
            </button>

            {profDropdownOpen && (
              <div className="z-50 mt-1 w-full rounded-md border border-border bg-popover text-popover-foreground shadow-md p-2 space-y-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                  <Input
                    autoFocus
                    placeholder="Pesquisar profissional pelo nome..."
                    value={profBusca}
                    onChange={(e) => setProfBusca(e.target.value)}
                    className="h-8 pl-8 pr-7 text-xs"
                  />
                  {profBusca && (
                    <button
                      type="button"
                      onClick={() => setProfBusca("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="size-3.5" />
                    </button>
                  )}
                </div>

                <div className="max-h-48 overflow-y-auto divide-y divide-border/40">
                  {profissionaisFiltrados.length === 0 ? (
                    <p className="py-3 text-center text-xs text-muted-foreground">
                      Nenhum profissional encontrado.
                    </p>
                  ) : (
                    profissionaisFiltrados.map((p) => {
                      const selected = p.id === targetUserId;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            setTargetUserId(p.id);
                            setProfDropdownOpen(false);
                            setProfBusca("");
                          }}
                          className={cn(
                            "flex w-full items-center justify-between rounded-sm px-2.5 py-1.5 text-left text-xs transition-colors hover:bg-accent hover:text-accent-foreground",
                            selected && "bg-accent/60 font-medium",
                          )}
                        >
                          <span className="truncate">
                            {p.nome}{" "}
                            <span className="text-[10px] text-muted-foreground">
                              ({p.papel === "ADMINISTRADOR" ? "Admin" : "Locatário"})
                            </span>
                          </span>
                          {selected && <Check className="size-3.5 text-primary shrink-0 ml-2" />}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Seleção dos Horários de 1h dentro do Turno + Preview Antes/Depois */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-1.5">
                <Clock className="size-3.5 text-primary" />
                Marque os horários que deseja transferir <span className="text-destructive">*</span>
              </Label>
              <button
                type="button"
                onClick={() => {
                  if (selectedSlots.length === slotsDoTurno.length) {
                    setSelectedSlots([]);
                  } else {
                    setSelectedSlots(slotsDoTurno.map((s) => s.inicio));
                  }
                }}
                className="text-xs font-medium text-primary hover:underline"
              >
                {selectedSlots.length === slotsDoTurno.length
                  ? "Desmarcar todos"
                  : "Selecionar todos"}
              </button>
            </div>

            <div className="divide-y divide-border rounded-xl border border-border bg-card overflow-hidden">
              {slotsDoTurno.map((slot) => {
                const isTransferindo = selectedSlots.includes(slot.inicio);
                return (
                  <label
                    key={slot.inicio}
                    className={cn(
                      "flex items-center justify-between gap-3 px-3.5 py-2.5 cursor-pointer transition-colors text-xs",
                      isTransferindo
                        ? "bg-primary/10 hover:bg-primary/15"
                        : "hover:bg-muted/40",
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={isTransferindo}
                        onCheckedChange={() => toggleSlot(slot.inicio)}
                      />
                      <span className="font-mono font-semibold text-foreground">
                        {slot.inicio} às {slot.fim}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 truncate">
                      {isTransferindo ? (
                        <Badge className="bg-primary text-primary-foreground text-[10px] gap-1">
                          <UserRoundCheck className="size-3" />
                          {profissionalDestinatario
                            ? `Vai para: ${profissionalDestinatario.nome.split(" ")[0]}`
                            : "Será transferido"}
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[10px]">
                          Mantido: {titularAtual?.nome.split(" ")[0] ?? "Titular"}
                        </Badge>
                      )}
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="obs-transferencia">Observação (opcional)</Label>
            <Textarea
              id="obs-transferencia"
              rows={2}
              maxLength={200}
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Ex: Horário cedido para atendimento avulso..."
              className="resize-none text-xs"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={transferir.isPending}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!podeConfirmar}
            className="gap-1.5"
          >
            {transferir.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <ArrowRightLeft className="size-4" />
            )}
            {transferir.isPending
              ? "Transferindo..."
              : `Confirmar Transferência (${selectedSlots.length}h)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
