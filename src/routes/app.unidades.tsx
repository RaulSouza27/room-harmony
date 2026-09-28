import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { EmptyState, ErrorState, LoadingState } from "@/components/common";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
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
import { useDeleteUnidade, useSalas, useSaveUnidade, useUnidades } from "@/hooks/useApi";
import { defaultBusinessHours } from "@/services/api";
import type { BusinessHours, Unidade } from "@/types";
import { Clock } from "lucide-react";

export const Route = createFileRoute("/app/unidades")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Unidades — Clínica Escuta" },
      {
        name: "description",
        content: "Cadastro das unidades da clínica: endereço, status e salas vinculadas.",
      },
      { property: "og:title", content: "Unidades — Clínica Escuta" },
      { property: "og:description", content: "Gerencie as unidades onde as salas estão alocadas." },
    ],
  }),
  component: UnidadesPage,
});

const DIAS_DA_SEMANA = [
  { key: "1", label: "Segunda-feira" },
  { key: "2", label: "Terça-feira" },
  { key: "3", label: "Quarta-feira" },
  { key: "4", label: "Quinta-feira" },
  { key: "5", label: "Sexta-feira" },
  { key: "6", label: "Sábado" },
  { key: "0", label: "Domingo" },
];

const OPCOES_HORARIOS_ABERTURA = Array.from(
  { length: 15 },
  (_, i) => `${String(7 + i).padStart(2, "0")}:00`,
);

const OPCOES_HORARIOS_FECHAMENTO = Array.from(
  { length: 15 },
  (_, i) => `${String(8 + i).padStart(2, "0")}:00`,
);

function UnidadesPage() {
  const unidadesQ = useUnidades();
  const { data: salas } = useSalas();
  const [open, setOpen] = useState(false);
  const [editando, setEditando] = useState<Unidade | null>(null);

  const unidades = unidadesQ.data ?? [];

  return (
    <AppShell
      title="Unidades"
      description={`${unidades.length} unidade(s)`}
      actions={
        <Button
          size="sm"
          onClick={() => {
            setEditando(null);
            setOpen(true);
          }}
        >
          Nova unidade
        </Button>
      }
    >
      {unidadesQ.isLoading ? (
        <LoadingState />
      ) : unidadesQ.error ? (
        <ErrorState message={unidadesQ.error.message} />
      ) : unidades.length === 0 ? (
        <EmptyState title="Nenhuma unidade cadastrada" />
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {unidades.map((u) => (
            <li key={u.id} className="rounded-xl border border-border bg-card p-4 shadow-soft">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-card-foreground">{u.nome}</p>
                  <p className="text-xs text-muted-foreground">{u.endereco}</p>
                  <p className="mt-2 text-xs font-medium text-muted-foreground">
                    {(salas ?? []).filter((s) => s.unidade_id === u.id).length} sala(s) vinculada(s)
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className={
                    u.status === "ativa"
                      ? "border-success/40 bg-success/15 text-success-foreground"
                      : "text-muted-foreground"
                  }
                >
                  {u.status === "ativa" ? "Ativa" : "Inativa"}
                </Badge>
              </div>

              {/* Horários de funcionamento no Card */}
              <div className="mt-3 rounded-lg border border-border/50 bg-muted/30 p-2.5 text-xs">
                <div className="flex items-center gap-1.5 font-medium text-foreground mb-1.5">
                  <Clock className="h-3.5 w-3.5 text-primary" />
                  <span>Horário de Funcionamento</span>
                </div>
                <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-muted-foreground">
                  {DIAS_DA_SEMANA.map((dia) => {
                    const info = u.business_hours?.[dia.key];
                    return (
                      <div key={dia.key} className="flex justify-between">
                        <span>{dia.label.slice(0, 3)}:</span>
                        <span className="font-mono">
                          {info && info.ativo && info.abertura && info.fechamento
                            ? `${info.abertura} às ${info.fechamento}`
                            : "Fechado"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="mt-4 flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setEditando(u);
                    setOpen(true);
                  }}
                >
                  Editar unidade e horários
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <UnidadeDialog open={open} onOpenChange={setOpen} unidade={editando} />
    </AppShell>
  );
}

function UnidadeDialog({
  open,
  onOpenChange,
  unidade,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  unidade: Unidade | null;
}) {
  const salvar = useSaveUnidade();
  const [nome, setNome] = useState("");
  const [endereco, setEndereco] = useState("");
  const [status, setStatus] = useState<"ativa" | "inativa">("ativa");
  const [businessHours, setBusinessHours] = useState<BusinessHours>(defaultBusinessHours());

  useEffect(() => {
    if (!open) return;
    setNome(unidade?.nome ?? "");
    setEndereco(unidade?.endereco ?? "");
    setStatus(unidade?.status ?? "ativa");
    setBusinessHours(unidade?.business_hours ?? defaultBusinessHours());
  }, [open, unidade]);

  const handleDayChange = (
    key: string,
    field: "ativo" | "abertura" | "fechamento",
    value: any,
  ) => {
    setBusinessHours((prev) => {
      const current = prev[key] || { ativo: true, abertura: "08:00", fechamento: "18:00" };
      return {
        ...prev,
        [key]: {
          ...current,
          [field]: value,
          ...(field === "ativo" && value === false ? { abertura: null, fechamento: null } : {}),
          ...(field === "ativo" && value === true && !current.abertura
            ? { abertura: "08:00", fechamento: "18:00" }
            : {}),
        },
      };
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{unidade ? "Editar unidade" : "Nova unidade"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome</Label>
              <Input
                id="nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                maxLength={80}
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as "ativa")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ativa">Ativa</SelectItem>
                  <SelectItem value="inativa">Inativa</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="end">Endereço</Label>
            <Input
              id="end"
              value={endereco}
              onChange={(e) => setEndereco(e.target.value)}
              maxLength={160}
            />
          </div>

          {/* Configuração do Horário Semanal */}
          <div className="space-y-3 rounded-lg border border-border bg-muted/20 p-3.5">
            <div className="flex items-center gap-2 font-medium text-sm">
              <Clock className="h-4 w-4 text-primary" />
              <span>Horários de Funcionamento por Dia da Semana</span>
            </div>
            <div className="space-y-2 text-xs">
              {DIAS_DA_SEMANA.map((dia) => {
                const info = businessHours[dia.key] || {
                  ativo: false,
                  abertura: null,
                  fechamento: null,
                };
                return (
                  <div
                    key={dia.key}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border/40 bg-background p-2"
                  >
                    <div className="flex items-center gap-2 w-32">
                      <Checkbox
                        id={`dia-${dia.key}`}
                        checked={info.ativo}
                        onCheckedChange={(checked) =>
                          handleDayChange(dia.key, "ativo", Boolean(checked))
                        }
                      />
                      <Label htmlFor={`dia-${dia.key}`} className="cursor-pointer text-xs font-medium">
                        {dia.label}
                      </Label>
                    </div>

                    {info.ativo ? (
                      <div className="flex items-center gap-2">
                        <Select
                          value={info.abertura || "08:00"}
                          onValueChange={(v) => handleDayChange(dia.key, "abertura", v)}
                        >
                          <SelectTrigger className="h-8 w-24 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {OPCOES_HORARIOS_ABERTURA.map((h) => (
                              <SelectItem key={h} value={h}>
                                {h}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <span className="text-muted-foreground">até</span>
                        <Select
                          value={info.fechamento || "18:00"}
                          onValueChange={(v) => handleDayChange(dia.key, "fechamento", v)}
                        >
                          <SelectTrigger className="h-8 w-24 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {OPCOES_HORARIOS_FECHAMENTO.map((h) => (
                              <SelectItem key={h} value={h}>
                                {h}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ) : (
                      <span className="text-xs italic text-muted-foreground pr-2">Fechado</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            disabled={!nome.trim() || !endereco.trim() || salvar.isPending}
            onClick={async () => {
              await salvar.mutateAsync({
                ...(unidade ? { id: unidade.id } : {}),
                nome: nome.trim(),
                endereco: endereco.trim(),
                status,
                business_hours: businessHours,
              });
              onOpenChange(false);
            }}
          >
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
