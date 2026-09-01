import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatarMesAno, obterGradeDoMes, type DiaGrade } from "@/lib/format";
import type { Reserva, Sala, Unidade, User } from "@/types";

interface Props {
  ano: number;
  mes: number; // 1-indexed (1..12)
  salas: Sala[];
  unidades: Unidade[];
  reservas: Reserva[];
  usuarios: User[];
  onSelectDay: (dataISO: string) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onToday: () => void;
}

const DIAS_DA_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export function MonthlyCalendarView({
  ano,
  mes,
  salas,
  reservas,
  onSelectDay,
  onPrevMonth,
  onNextMonth,
  onToday,
}: Props) {
  const grade = obterGradeDoMes(ano, mes);
  const totalSalasAtivas = salas.filter((s) => s.status === "ativa").length;

  return (
    <div className="space-y-4">
      {/* Barra de Navegação do Mês */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-3 shadow-soft">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onPrevMonth} className="h-8 px-2.5">
            <ChevronLeft className="size-4" />
            <span className="sr-only sm:not-sr-only sm:ml-1">Anterior</span>
          </Button>
          <Button variant="outline" size="sm" onClick={onNextMonth} className="h-8 px-2.5">
            <span className="sr-only sm:not-sr-only sm:mr-1">Próximo</span>
            <ChevronRight className="size-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={onToday} className="h-8 px-2.5 text-xs">
            <CalendarIcon className="mr-1.5 size-3.5" />
            Hoje
          </Button>
        </div>

        <h3 className="text-base font-semibold text-card-foreground">
          {formatarMesAno(ano, mes)}
        </h3>

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-emerald-500" />
            Aprovada
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-amber-500" />
            Pendente
          </span>
        </div>
      </div>

      {/* Grade do Calendário */}
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-soft">
        {/* Cabeçalho dos Dias da Semana */}
        <div className="grid grid-cols-7 border-b border-border bg-muted/40 text-center text-xs font-semibold text-muted-foreground">
          {DIAS_DA_SEMANA.map((dia, idx) => (
            <div
              key={dia}
              className={cn(
                "py-2.5 border-r border-border/50 last:border-r-0",
                (idx === 0 || idx === 6) && "text-muted-foreground/75"
              )}
            >
              {dia}
            </div>
          ))}
        </div>

        {/* Células dos Dias */}
        <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-border/60 text-sm">
          {grade.map((diaInfo: DiaGrade) => {
            const reservasDia = reservas.filter((r) => r.data === diaInfo.dataISO);
            const aprovadas = reservasDia.filter((r) => r.status === "aprovada");
            const pendentes = reservasDia.filter((r) => r.status === "pendente");

            const temReservas = reservasDia.length > 0;

            return (
              <div
                key={diaInfo.dataISO}
                onClick={() => onSelectDay(diaInfo.dataISO)}
                className={cn(
                  "group relative min-h-[90px] sm:min-h-[110px] p-1.5 sm:p-2.5 transition-all cursor-pointer flex flex-col justify-between hover:bg-accent/40",
                  !diaInfo.eMesAtual && "bg-muted/20 opacity-45 hover:opacity-75",
                  diaInfo.eHoje && "bg-primary/5 font-semibold"
                )}
              >
                {/* Número do Dia */}
                <div className="flex items-center justify-between">
                  <span
                    className={cn(
                      "inline-flex size-6 sm:size-7 items-center justify-center rounded-full text-xs transition-colors",
                      diaInfo.eHoje
                        ? "bg-primary text-primary-foreground font-bold shadow-xs"
                        : "text-foreground group-hover:text-primary",
                      !diaInfo.eMesAtual && "text-muted-foreground"
                    )}
                  >
                    {diaInfo.dia}
                  </span>

                  {totalSalasAtivas > 0 && diaInfo.eMesAtual && (
                    <span className="hidden sm:inline text-[10px] font-normal text-muted-foreground/70">
                      {aprovadas.length} reserv.
                    </span>
                  )}
                </div>

                {/* Conteúdo / Indicadores de Reservas do Dia */}
                <div className="mt-1 flex flex-col gap-1">
                  {aprovadas.length > 0 && (
                    <div className="flex items-center justify-between rounded bg-emerald-500/10 px-1.5 py-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
                      <span className="truncate">Aprovadas</span>
                      <span className="font-bold">{aprovadas.length}</span>
                    </div>
                  )}

                  {pendentes.length > 0 && (
                    <div className="flex items-center justify-between rounded bg-amber-500/10 px-1.5 py-0.5 text-[11px] font-medium text-amber-700 dark:text-amber-300">
                      <span className="truncate">Pendentes</span>
                      <span className="font-bold">{pendentes.length}</span>
                    </div>
                  )}

                  {!temReservas && diaInfo.eMesAtual && (
                    <span className="hidden sm:block text-[10px] text-muted-foreground/50 italic">
                      Livre
                    </span>
                  )}
                </div>

                {/* Dica para o usuário */}
                <div className="mt-auto pt-1 text-[9px] text-primary opacity-0 transition-opacity group-hover:opacity-100 font-medium">
                  Ver detalhes →
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
