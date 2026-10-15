import type { ReservaStatus } from "@/types";

/**
 * Status com que uma reserva NOVA é enviada ao backend.
 * Apenas administradores criam reservas já aprovadas; locatários sempre
 * enviam "pendente" e dependem da aprovação de um admin.
 * (O backend também força essa regra — isto apenas mantém o frontend coerente.)
 */
export function statusInicialNovaReserva(isAdmin: boolean): ReservaStatus {
  return isAdmin ? "aprovada" : "pendente";
}
