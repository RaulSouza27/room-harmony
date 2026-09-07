import { createFileRoute } from "@tanstack/react-router";
import {
  CalendarOff,
  Building2,
  Plus,
  Pencil,
  Trash2,
  Search,
  AlertCircle,
  Calendar as CalendarIcon,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { useState, useMemo } from "react";
import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useHolidays, useSaveHoliday, useDeleteHoliday, useUnidades } from "@/hooks/useApi";
import type { Holiday } from "@/types";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/app/feriados")({
  component: FeriadosPage,
});

function FeriadosPage() {
  const { data: holidays = [], isLoading } = useHolidays();
  const { data: unidades = [] } = useUnidades();
  const saveHoliday = useSaveHoliday();
  const deleteHoliday = useDeleteHoliday();

  const [searchTerm, setSearchTerm] = useState("");
  const [unitFilter, setUnitFilter] = useState<string>("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const [editingHoliday, setEditingHoliday] = useState<Holiday | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    startDate: "",
    endDate: "",
    unitId: "global", // "global" or unit id
    description: "",
    status: true,
  });

  const handleOpenCreate = () => {
    setEditingHoliday(null);
    setFormData({
      name: "",
      startDate: new Date().toISOString().slice(0, 10),
      endDate: new Date().toISOString().slice(0, 10),
      unitId: "global",
      description: "",
      status: true,
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (holiday: Holiday) => {
    setEditingHoliday(holiday);
    setFormData({
      name: holiday.name,
      startDate: holiday.startDate,
      endDate: holiday.endDate || holiday.startDate,
      unitId: holiday.unitId ? String(holiday.unitId) : "global",
      description: holiday.description || "",
      status: holiday.status !== undefined ? holiday.status : true,
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.startDate) return;

    try {
      await saveHoliday.mutateAsync({
        ...(editingHoliday?.id ? { id: editingHoliday.id } : {}),
        name: formData.name.trim(),
        startDate: formData.startDate,
        endDate: formData.endDate || formData.startDate,
        unitId: formData.unitId === "global" ? null : Number(formData.unitId),
        description: formData.description.trim(),
        status: formData.status,
      });
      setModalOpen(false);
    } catch {
      // Error handled by useSaveHoliday toast
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteHoliday.mutateAsync(deleteId);
      setDeleteId(null);
    } catch {
      // Error handled by toast
    }
  };

  const filteredHolidays = useMemo(() => {
    return holidays.filter((h) => {
      const matchesSearch =
        h.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (h.description && h.description.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesUnit =
        unitFilter === "all"
          ? true
          : unitFilter === "global"
            ? !h.unitId
            : String(h.unitId) === unitFilter;

      return matchesSearch && matchesUnit;
    });
  }, [holidays, searchTerm, unitFilter]);

  const formatDateRange = (startStr: string, endStr?: string) => {
    try {
      const start = parseISO(startStr);
      const formattedStart = format(start, "dd/MM/yyyy", { locale: ptBR });
      if (!endStr || endStr === startStr) {
        return formattedStart;
      }
      const end = parseISO(endStr);
      const formattedEnd = format(end, "dd/MM/yyyy", { locale: ptBR });
      return `${formattedStart} até ${formattedEnd}`;
    } catch {
      return startStr;
    }
  };

  return (
    <AppShell
      title="Feriados e Bloqueios"
      description="Cadastre feriados e dias de fechamento especial para evitar agendamentos em datas indisponíveis."
      actions={
        <Button onClick={handleOpenCreate} className="gap-2">
          <Plus className="size-4" /> Novo Feriado / Bloqueio
        </Button>
      }
    >
      <div className="space-y-6">
        {/* Filtros e Busca */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou descrição..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="flex items-center gap-3">
            <Select value={unitFilter} onValueChange={setUnitFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filtrar por unidade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Unidades</SelectItem>
                <SelectItem value="global">Somente Feriados Globais</SelectItem>
                {unidades.map((u) => (
                  <SelectItem key={u.id} value={String(u.id)}>
                    {u.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Tabela de Feriados */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <CalendarOff className="size-5 text-primary" /> Feriados e Bloqueios Cadastrados
            </CardTitle>
            <CardDescription>
              {filteredHolidays.length} registro(s) encontrado(s).
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                Carregando feriados e bloqueios...
              </div>
            ) : filteredHolidays.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <CalendarOff className="size-12 text-muted-foreground/40 mb-3" />
                <p className="font-medium text-muted-foreground">Nenhum feriado ou bloqueio encontrado</p>
                <p className="text-xs text-muted-foreground/80 mt-1">
                  Clique no botão &quot;Novo Feriado / Bloqueio&quot; para cadastrar.
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Feriado / Motivo</TableHead>
                    <TableHead>Período</TableHead>
                    <TableHead>Unidades Afetadas</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredHolidays.map((holiday) => {
                    const unitObj = unidades.find((u) => String(u.id) === String(holiday.unitId));
                    return (
                      <TableRow key={holiday.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <CalendarIcon className="size-4 text-primary shrink-0" />
                            <span>{holiday.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {formatDateRange(holiday.startDate, holiday.endDate)}
                        </TableCell>
                        <TableCell>
                          {!holiday.unitId ? (
                            <Badge variant="secondary" className="gap-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 border-amber-500/20">
                              <Building2 className="size-3" /> Todas as Unidades (Global)
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="gap-1">
                              <Building2 className="size-3" /> {unitObj?.nome || holiday.unitName || `Unidade ${holiday.unitId}`}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="max-w-xs truncate text-muted-foreground">
                          {holiday.description || "—"}
                        </TableCell>
                        <TableCell>
                          {holiday.status ? (
                            <Badge variant="outline" className="gap-1 border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                              <CheckCircle2 className="size-3" /> Ativo
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="gap-1 border-muted text-muted-foreground">
                              <XCircle className="size-3" /> Inativo
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenEdit(holiday)}
                              title="Editar"
                            >
                              <Pencil className="size-4 text-muted-foreground" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeleteId(holiday.id)}
                              title="Excluir"
                              className="hover:text-destructive"
                            >
                              <Trash2 className="size-4 text-muted-foreground hover:text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modal de Criação / Edição */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>
                {editingHoliday ? "Editar Feriado / Bloqueio" : "Novo Feriado ou Bloqueio de Unidade"}
              </DialogTitle>
              <DialogDescription>
                Informe o nome e o período em que a unidade estará fechada.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Título / Motivo do Bloqueio *</Label>
                <Input
                  id="name"
                  placeholder="Ex: Feriado de Independência, Manutenção Predial, Falta de Energia"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Data Início *</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">Data Fim *</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="unitId">Unidade Afetada</Label>
                <Select
                  value={formData.unitId}
                  onValueChange={(val) => setFormData({ ...formData, unitId: val })}
                >
                  <SelectTrigger id="unitId">
                    <SelectValue placeholder="Selecione o escopo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="global">Todas as Unidades (Feriado Nacional/Global)</SelectItem>
                    {unidades.map((u) => (
                      <SelectItem key={u.id} value={String(u.id)}>
                        Unidade: {u.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição / Observações (Opcional)</Label>
                <Input
                  id="description"
                  placeholder="Ex: Manutenção no sistema elétrico do 2º andar"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saveHoliday.isPending}>
                {saveHoliday.isPending ? "Salvar..." : editingHoliday ? "Atualizar" : "Cadastrar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal de Confirmação de Exclusão */}
      <Dialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="size-5" /> Confirmar Exclusão
            </DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir este feriado/bloqueio? Essa ação permitirá que reservas sejam feitas novamente na data informada.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteHoliday.isPending}>
              {deleteHoliday.isPending ? "Excluindo..." : "Excluir Feriado"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
