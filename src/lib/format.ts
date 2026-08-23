export function formatarData(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export function formatarDataLonga(iso: string) {
  const date = new Date(`${iso}T12:00:00`);
  return date.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });
}

export function hojeISO() {
  return new Date().toISOString().slice(0, 10);
}

export function formatRecorrencia(rec: string) {
  if (rec === "semanal_anual" || rec === "turno") return "Turno (4h)";
  if (rec === "semanal_mensal" || rec === "semanal") return "Hora avulsa fixa";
  return "Hora avulsa";
}
