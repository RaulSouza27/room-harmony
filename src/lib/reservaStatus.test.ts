import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { statusInicialNovaReserva } from "./reservaStatus";

describe("statusInicialNovaReserva", () => {
  it("locatário sempre cria reserva pendente", () => {
    expect(statusInicialNovaReserva(false)).toBe("pendente");
  });

  it("admin cria reserva já aprovada", () => {
    expect(statusInicialNovaReserva(true)).toBe("aprovada");
  });
});

describe("ReservaFormDialog (regressão)", () => {
  const source = readFileSync(
    resolve(__dirname, "../components/ReservaFormDialog.tsx"),
    "utf8",
  );

  it("o fluxo de reserva comum usa statusInicialNovaReserva(isAdmin)", () => {
    expect(source).toContain("status: statusInicialNovaReserva(isAdmin)");
  });

  it('status "aprovada" fixo só aparece nos fluxos de Reserva Especial (admin)', () => {
    // Os 2 únicos usos legítimos estão nos blocos de Reserva Especial.
    const hardcoded = source.match(/status:\s*"aprovada"/g) ?? [];
    expect(hardcoded.length).toBe(2);
  });
});
