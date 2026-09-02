import { useState, useTransition } from "react";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  FileText,
  Trash2,
  Upload,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useBulkSaveUsuarios, useProfessions, useUsuarios } from "@/hooks/useApi";
import type { User } from "@/types";
import {
  generateCsvTemplate,
  parseCsvUserImport,
  type ParsedUserRow,
} from "@/utils/csvParser";

interface BulkUserImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BulkUserImportDialog({
  open,
  onOpenChange,
}: BulkUserImportDialogProps) {
  const usuariosQ = useUsuarios();
  const profissoesQ = useProfessions();
  const bulkSave = useBulkSaveUsuarios();

  const [activeTab, setActiveTab] = useState<"file" | "paste">("file");
  const [pasteText, setPasteText] = useState("");
  const [parsedRows, setParsedRows] = useState<ParsedUserRow[]>([]);
  const [filter, setFilter] = useState<"all" | "valid" | "issues">("all");
  
  // Progress & Execution states
  const [isImporting, setIsImporting] = useState(false);
  const [progressCurrent, setProgressCurrent] = useState(0);
  const [progressTotal, setProgressTotal] = useState(0);
  const [importSummary, setImportSummary] = useState<{
    successCount: number;
    failCount: number;
    errors: Array<{ email: string; error: string }>;
  } | null>(null);

  const [, startTransition] = useTransition();

  const existingUsers = usuariosQ.data ?? [];
  const existingProfessions = profissoesQ.data ?? [];

  const handleDownloadTemplate = () => {
    const csvData = generateCsvTemplate();
    const blob = new Blob([csvData], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "modelo_cadastro_profissionais.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const processText = (text: string) => {
    const rows = parseCsvUserImport(text, existingUsers, existingProfessions);
    setParsedRows(rows);
    setImportSummary(null);
  };

  const handleFileUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (content) {
        processText(content);
      }
    };
    reader.readAsText(file, "UTF-8");
  };

  const handlePasteChange = (val: string) => {
    setPasteText(val);
    processText(val);
  };

  const handleRemoveRow = (id: string) => {
    setParsedRows((prev) => prev.filter((r) => r.id !== id));
  };

  const validRows = parsedRows.filter((r) => r.isValid);
  const invalidRows = parsedRows.filter((r) => !r.isValid);
  const rowsWithWarnings = parsedRows.filter((r) => r.warnings.length > 0);

  const filteredRows = parsedRows.filter((r) => {
    if (filter === "valid") return r.isValid;
    if (filter === "issues") return !r.isValid || r.warnings.length > 0;
    return true;
  });

  const handleStartImport = async () => {
    if (validRows.length === 0) return;

    setIsImporting(true);
    setProgressCurrent(0);
    setProgressTotal(validRows.length);
    setImportSummary(null);

    const usersToSave: Partial<User>[] = validRows.map((r) => ({
      nome: r.nome,
      email: r.email,
      telefone: r.telefone,
      cpf: r.cpf,
      boardNumber: r.boardNumber,
      papel: r.papel,
      status: r.status,
      professionId: r.professionId,
      cep: r.cep,
      endereco: r.endereco,
      unidades: [],
    }));

    try {
      const result = await bulkSave.mutateAsync({
        users: usersToSave,
        onProgress: (current, total, summary) => {
          setProgressCurrent(current);
          setProgressTotal(total);
          setImportSummary(summary);
        },
      });

      setImportSummary(result);
    } catch (error) {
      console.error("Erro na importação em massa:", error);
    } finally {
      setIsImporting(false);
    }
  };

  const resetDialog = () => {
    setParsedRows([]);
    setPasteText("");
    setImportSummary(null);
    setIsImporting(false);
    setProgressCurrent(0);
    setProgressTotal(0);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetDialog();
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-6 gap-4">
        <DialogHeader className="px-1 pt-1">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Users className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold">
                Cadastro em Massa de Profissionais
              </DialogTitle>
              <DialogDescription className="text-xs">
                Importe múltiplos profissionais a partir de um arquivo CSV ou colando dados de uma planilha.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {isImporting || importSummary ? (
          <div className="py-6 space-y-6">
            <div className="rounded-xl border border-border bg-card p-6 shadow-soft space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-sm">
                    {isImporting
                      ? "Cadastrando profissionais..."
                      : "Processo de importação concluído!"}
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {isImporting
                      ? `Processando ${progressCurrent} de ${progressTotal} registros...`
                      : `${importSummary?.successCount} criado(s) com sucesso. ${importSummary?.failCount} falha(s).`}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-lg font-bold text-primary">
                    {progressTotal > 0
                      ? Math.round((progressCurrent / progressTotal) * 100)
                      : 0}
                    %
                  </span>
                </div>
              </div>

              <Progress
                value={
                  progressTotal > 0
                    ? (progressCurrent / progressTotal) * 100
                    : 0
                }
                className="h-2.5"
              />

              {importSummary && (
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="p-3 rounded-lg bg-success/10 border border-success/20 flex items-center gap-3">
                    <CheckCircle2 className="size-5 text-success shrink-0" />
                    <div>
                      <div className="text-xs text-muted-foreground">Sucessos</div>
                      <div className="text-lg font-bold text-foreground">
                        {importSummary.successCount}
                      </div>
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 flex items-center gap-3">
                    <AlertCircle className="size-5 text-destructive shrink-0" />
                    <div>
                      <div className="text-xs text-muted-foreground">Falhas</div>
                      <div className="text-lg font-bold text-foreground">
                        {importSummary.failCount}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {importSummary && importSummary.errors.length > 0 && (
              <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 max-h-48 overflow-y-auto space-y-2">
                <h5 className="text-xs font-semibold text-destructive flex items-center gap-1.5">
                  <AlertCircle className="size-4" /> Detalhes dos erros encontrados
                </h5>
                <ul className="text-xs space-y-1 divide-y divide-border/40">
                  {importSummary.errors.map((err, idx) => (
                    <li key={idx} className="pt-1.5 flex justify-between gap-2">
                      <span className="font-medium text-foreground">{err.email}</span>
                      <span className="text-destructive">{err.error}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            <Tabs
              value={activeTab}
              onValueChange={(v) => {
                setActiveTab(v as "file" | "paste");
                setParsedRows([]);
              }}
              className="w-full"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <TabsList className="grid grid-cols-2 w-full sm:w-auto">
                  <TabsTrigger value="file" className="text-xs gap-1.5">
                    <Upload className="size-3.5" /> Arquivo CSV / TSV
                  </TabsTrigger>
                  <TabsTrigger value="paste" className="text-xs gap-1.5">
                    <FileText className="size-3.5" /> Colar Tabela
                  </TabsTrigger>
                </TabsList>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadTemplate}
                  className="text-xs gap-1.5 h-8 border-dashed"
                >
                  <Download className="size-3.5 text-primary" />
                  Baixar Modelo CSV
                </Button>
              </div>

              <TabsContent value="file" className="mt-0">
                <div
                  className="border-2 border-dashed border-border hover:border-primary/50 bg-muted/20 hover:bg-muted/40 transition-colors rounded-xl p-6 flex flex-col items-center justify-center gap-3 text-center cursor-pointer relative"
                >
                  <input
                    type="file"
                    accept=".csv, .tsv, .txt"
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file);
                    }}
                  />
                  <div className="size-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                    <FileSpreadsheet className="size-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      Clique para selecionar ou arraste o arquivo CSV
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Suporta arquivos codificados em UTF-8 (.csv, .tsv, .txt)
                    </p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="paste" className="mt-0 space-y-2">
                <Textarea
                  placeholder="Cole aqui os dados copiados do Excel ou Google Sheets (com cabeçalho: Nome, E-mail, Telefone, CPF, Conselho...)"
                  className="font-mono text-xs min-h-[120px] resize-y"
                  value={pasteText}
                  onChange={(e) => handlePasteChange(e.target.value)}
                />
                <p className="text-[11px] text-muted-foreground">
                  Separação por tabulação ou vírgula/ponto e vírgula detectada automaticamente.
                </p>
              </TabsContent>
            </Tabs>

            {parsedRows.length > 0 && (
              <div className="space-y-3 pt-2 border-t border-border">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-semibold text-muted-foreground">
                      Resumo da leitura:
                    </span>
                    <Badge variant="outline" className="font-medium">
                      Total: {parsedRows.length}
                    </Badge>
                    <Badge variant="secondary" className="bg-success/15 text-success-foreground border-success/30">
                      Válidos: {validRows.length}
                    </Badge>
                    {invalidRows.length > 0 && (
                      <Badge variant="destructive">
                        Erros: {invalidRows.length}
                      </Badge>
                    )}
                    {rowsWithWarnings.length > 0 && (
                      <Badge variant="outline" className="border-warning/50 text-warning">
                        Avisos: {rowsWithWarnings.length}
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      variant={filter === "all" ? "default" : "outline"}
                      size="sm"
                      className="h-7 text-[11px] px-2.5"
                      onClick={() => setFilter("all")}
                    >
                      Todos ({parsedRows.length})
                    </Button>
                    <Button
                      variant={filter === "valid" ? "default" : "outline"}
                      size="sm"
                      className="h-7 text-[11px] px-2.5"
                      onClick={() => setFilter("valid")}
                    >
                      Válidos ({validRows.length})
                    </Button>
                    <Button
                      variant={filter === "issues" ? "default" : "outline"}
                      size="sm"
                      className="h-7 text-[11px] px-2.5 text-destructive"
                      onClick={() => setFilter("issues")}
                    >
                      Problemas ({invalidRows.length + rowsWithWarnings.length})
                    </Button>
                  </div>
                </div>

                <div className="border border-border rounded-xl overflow-hidden max-h-64 overflow-y-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-muted/50 text-muted-foreground sticky top-0 border-b border-border font-semibold">
                      <tr>
                        <th className="p-2.5 w-24">Status</th>
                        <th className="p-2.5">Nome</th>
                        <th className="p-2.5">E-mail</th>
                        <th className="p-2.5">Telefone</th>
                        <th className="p-2.5">Conselho</th>
                        <th className="p-2.5">Papel</th>
                        <th className="p-2.5">Profissão</th>
                        <th className="p-2.5 text-right w-12">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40 bg-card">
                      {filteredRows.map((row) => (
                        <tr
                          key={row.id}
                          className={
                            !row.isValid
                              ? "bg-destructive/5 hover:bg-destructive/10"
                              : row.warnings.length > 0
                              ? "bg-warning/5 hover:bg-warning/10"
                              : "hover:bg-muted/30"
                          }
                        >
                          <td className="p-2.5">
                            {row.isValid ? (
                              row.warnings.length > 0 ? (
                                <Badge
                                  variant="outline"
                                  className="text-[10px] gap-1 border-amber-500/40 text-amber-600 bg-amber-50 dark:bg-amber-950/20"
                                >
                                  <AlertTriangle className="size-3" /> Atenção
                                </Badge>
                              ) : (
                                <Badge
                                  variant="outline"
                                  className="text-[10px] gap-1 border-success/40 text-success bg-success/10"
                                >
                                  <CheckCircle2 className="size-3" /> Válido
                                </Badge>
                              )
                            ) : (
                              <Badge
                                variant="destructive"
                                className="text-[10px] gap-1"
                              >
                                <AlertCircle className="size-3" /> Inválido
                              </Badge>
                            )}
                          </td>
                          <td className="p-2.5 font-medium text-foreground truncate max-w-[140px]">
                            {row.nome || <span className="text-muted-foreground italic">Vazio</span>}
                          </td>
                          <td className="p-2.5 text-muted-foreground truncate max-w-[160px]">
                            {row.email || <span className="text-muted-foreground italic">Vazio</span>}
                          </td>
                          <td className="p-2.5 text-muted-foreground whitespace-nowrap">
                            {row.telefone || "-"}
                          </td>
                          <td className="p-2.5 text-muted-foreground whitespace-nowrap">
                            {row.boardNumber || "-"}
                          </td>
                          <td className="p-2.5 text-muted-foreground">
                            {row.papel === "ADMINISTRADOR" ? "Admin" : "Psicólogo(a)"}
                          </td>
                          <td className="p-2.5 text-muted-foreground truncate max-w-[110px]">
                            {row.professionName || "-"}
                          </td>
                          <td className="p-2.5 text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-6 text-muted-foreground hover:text-destructive"
                              onClick={() => handleRemoveRow(row.id)}
                              title="Remover linha da importação"
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {(invalidRows.length > 0 || rowsWithWarnings.length > 0) && (
                  <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-300 space-y-1">
                    <p className="font-semibold flex items-center gap-1.5">
                      <AlertTriangle className="size-4 shrink-0 text-amber-500" />
                      Observações de validação:
                    </p>
                    <ul className="list-disc list-inside space-y-0.5 text-[11px] pl-1">
                      {invalidRows.slice(0, 3).map((r, i) => (
                        <li key={i}>
                          <strong>{r.nome || r.email || `Linha`}:</strong> {r.errors.join("; ")}
                        </li>
                      ))}
                      {invalidRows.length > 3 && (
                        <li>E mais {invalidRows.length - 3} linha(s) com erros...</li>
                      )}
                      {rowsWithWarnings.slice(0, 2).map((r, i) => (
                        <li key={`w-${i}`}>
                          <strong>{r.nome || r.email}:</strong> {r.warnings.join("; ")}
                        </li>
                      ))}
                    </ul>
                    <p className="text-[10px] text-muted-foreground pt-1">
                      * Linhas marcadas como "Inválido" não serão cadastradas. Você pode removê-las da lista acima.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <DialogFooter className="border-t border-border pt-3 flex flex-row items-center justify-between sm:justify-end gap-2">
          {importSummary ? (
            <Button onClick={() => handleOpenChange(false)}>
              Concluir
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                disabled={isImporting}
                onClick={() => handleOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button
                disabled={validRows.length === 0 || isImporting}
                onClick={handleStartImport}
                className="gap-2"
              >
                <Users className="size-4" />
                Cadastrar {validRows.length} Profissional(is)
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
