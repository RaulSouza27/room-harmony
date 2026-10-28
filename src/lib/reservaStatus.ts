import type { ReservaStatus } from "@/types";

/**
 * Status com que uma reserva NOVA é enviada ao backend.
 * Administradores ou reservas pagas com pacote de créditos já nascem aprovadas;
 * reservas avulsas de locatários enviam "pendente" e dependem da aprovação de um admin.
 * (O backend também força essa regra — isto apenas mantém o frontend coerente.)
 */
export function statusInicialNovaReserva(isAdmin: boolean, paidWithCredits = false): ReservaStatus {
  return isAdmin || paidWithCredits ? "aprovada" : "pendente";
}
