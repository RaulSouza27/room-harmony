import { AlertTriangle, CalendarPlus, Clock, MessageCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ExpiringReservationAlert } from "@/types";
import { openWhatsApp } from "@/utils/whatsapp";
import { cn } from "@/lib/utils";

interface Props {
  alerts: ExpiringReservationAlert[];
  isAdmin?: boolean;
  onRenew: (alert: ExpiringReservationAlert) => void;
}

export function ExpiringReservationsAlert({ alerts, isAdmin = false, onRenew }: Props) {
  if (!alerts || alerts.length === 0) return null;

  return (
    <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 shadow-soft space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <AlertTriangle className="size-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-semibold text-amber-900 dark:text-amber-200">
              {isAdmin
                ? `Reservas Recorrentes Próximas da Expiração (${alerts.length})`
                : `Atenção: Você possui ${alerts.length} reserva(s) recorrente(s) para renovar`}
            </h3>
            <p className="text-xs text-amber-800/90 dark:text-amber-300/90 mt-0.5">
              {isAdmin
                ? "Locatários com reservas de Hora Fixa ou Turno cujo ciclo se encerra em breve e ainda não possuem renovação registrada."
                : "Suas reservas de Hora Fixa (mensal) ou Turno (anual) listadas abaixo estão encerrando o período atual. Renove para garantir seu horário no próximo ciclo."}
            </p>
          </div>
        </div>
      </div>

      <ul className="space-y-2.5">
        {alerts.map((alert) => {
          const isCritical = alert.urgencyLevel === "critical";
          return (
            <li
              key={alert.seriesKey}
              className={cn(
                "rounded-lg border bg-card p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors",
                isCritical
                  ? "border-destructive/40 bg-destructive/5"
                  : "border-amber-500/30 bg-background/90",
              )}
            >
              <div className="space-y-1 min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold text-foreground">
                    {isAdmin ? `${alert.userName} · ${alert.roomName} (${alert.unitName})` : alert.alertTitle}
                  </span>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[10px] font-semibold",
                      isCritical
                        ? "border-destructive/40 text-destructive bg-destructive/10"
                        : "border-amber-500/40 text-amber-700 dark:text-amber-300 bg-amber-500/10",
                    )}
                  >
                    <Clock className="size-3 mr-1" />
                    Última data: {alert.lastDateFormatted}
                  </Badge>
                  <Badge variant="secondary" className="text-[10px]">
                    {alert.recorrenciaLabel}
                  </Badge>
                </div>

                <p className="text-xs text-muted-foreground leading-relaxed">
                  {isAdmin
                    ? `${alert.dayOfWeekLabel}, das ${alert.horaInicio} às ${alert.horaFim} — Próximo ciclo sugerido: ${alert.nextCycleLabel} (a partir de ${alert.nextStartDateFormatted}).`
                    : alert.alertMessage}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                {isAdmin && alert.userPhone ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => openWhatsApp(alert.userPhone, alert.whatsappMessage)}
                    className="h-8 gap-1.5 text-xs font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20 border-emerald-500/30"
                  >
                    <MessageCircle className="size-3.5" />
                    Avisar no WhatsApp
                  </Button>
                ) : null}

                <Button
                  type="button"
                  size="sm"
                  onClick={() => onRenew(alert)}
                  className="h-8 gap-1.5 text-xs font-medium bg-amber-600 hover:bg-amber-700 text-white"
                >
                  <CalendarPlus className="size-3.5" />
                  Renovar ({alert.nextCycleLabel})
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

