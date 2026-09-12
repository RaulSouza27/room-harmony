import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatarNomeMes, obterGradeDoMes } from "@/lib/format";
import type { Reserva, Sala } from "@/types";

interface Props {
  ano: number;
  salas: Sala[];
  reservas: Reserva[];
  onSelectMonth: (mes: number) => void;
  onPrevYear: () => void;
  onNextYear: () => void;
  onCurrentYear: () => void;
}

const MESES = Array.from({ length: 12 }, (_, i) => i + 1);

export function YearlyCalendarView({
  ano,
  salas,
  reservas,
  onSelectMonth,
  onPrevYear,
  onNextYear,
  onCurrentYear,
}: Props) {
  const anoAtual = new Date().getFullYear();
  const mesAtual = new Date().getMonth() + 1;

  return (
    <div className="space-y-4">
      {/* Barra de Navegação do Ano */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-3 shadow-soft">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onPrevYear} className="h-8 px-2.5">
            <ChevronLeft className="size-4" />
            <span className="sr-only sm:not-sr-only sm:ml-1">Ano Anterior</span>
          </Button>
          <Button variant="outline" size="sm" onClick={onNextYear} className="h-8 px-2.5">
            <span className="sr-only sm:not-sr-only sm:mr-1">Próximo Ano</span>
            <ChevronRight className="size-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={onCurrentYear} className="h-8 px-2.5 text-xs">
            <CalendarIcon className="mr-1.5 size-3.5" />
            Ano Atual
          </Button>
        </div>

        <h3 className="text-lg font-bold tracking-tight text-card-foreground">
          Ano de {ano}
        </h3>

        <div className="text-xs text-muted-foreground">
          Clique em um mês para abrir a visão mensal
        </div>
      </div>

      {/* Grade de 12 Meses */}
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {MESES.map((mes) => {
          const eMesAtualDoAno = ano === anoAtual && mes === mesAtual;

          // Reservas do mês (formato data: yyyy-MM-dd)
          const prefixoMes = `${ano}-${String(mes).padStart(2, "0")}`;
          const reservasMes = reservas.filter((r) => r.data.startsWith(prefixoMes));
          const aprovadas = reservasMes.filter((r) => r.status === "aprovada");
          const pendentes = reservasMes.filter((r) => r.status === "pendente");

          const gradeMini = obterGradeDoMes(ano, mes);

          return (
            <div
              key={mes}
              onClick={() => onSelectMonth(mes)}
              className={cn(
                "group relative flex flex-col justify-between rounded-xl border border-border bg-card p-4 transition-all cursor-pointer shadow-soft hover:border-primary/50 hover:shadow-md hover:-translate-y-0.5",
                eMesAtualDoAno && "ring-2 ring-primary/40 bg-primary/5"
              )}
            >
              <div>
                {/* Título do Mês */}
                <div className="flex items-center justify-between pb-2 border-b border-border/60">
                  <h4
                    className={cn(
                      "font-semibold text-sm group-hover:text-primary transition-colors",
                      eMesAtualDoAno ? "text-primary font-bold" : "text-card-foreground"
                    )}
                  >
                    {formatarNomeMes(mes)}
                  </h4>
                  {eMesAtualDoAno && (
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                      Mês Atual
                    </span>
                  )}
                </div>

                {/* Mini Grade Visual */}
                <div className="my-3 grid grid-cols-7 gap-1 text-center text-[9px] text-muted-foreground/60">
                  {["D", "S", "T", "Q", "Q", "S", "S"].map((d, i) => (
                    <span key={i} className="font-semibold text-[8px]">
                      {d}
                    </span>
                  ))}
                  {gradeMini.slice(0, 35).map((dia, idx) => {
                    const temReserva = reservas.some((r) => r.data === dia.dataISO);
                    return (
                      <span
                        key={idx}
                        className={cn(
                          "flex h-4 w-4 items-center justify-center rounded-xs mx-auto",
                          !dia.eMesAtual && "opacity-20",
                          temReserva && dia.eMesAtual
                            ? "bg-primary text-primary-foreground font-bold"
                            : "hover:bg-muted"
                        )}
                      >
                        {dia.dia}
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* Estatísticas do Mês */}
              <div className="pt-2 border-t border-border/40 space-y-1.5 text-xs">
                <div className="flex justify-between items-center text-muted-foreground">
                  <span>Reservas Aprovadas</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    {aprovadas.length}
                  </span>
                </div>
                {pendentes.length > 0 && (
                  <div className="flex justify-between items-center text-muted-foreground">
                    <span>Solicitações Pendentes</span>
                    <span className="font-semibold text-amber-600 dark:text-amber-400">
                      {pendentes.length}
                    </span>
                  </div>
                )}

                <div className="pt-1 flex items-center justify-between text-[10px] font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                  <span>Explorar mês</span>
                  <span>→</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
