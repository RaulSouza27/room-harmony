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

export function formatarMesAno(ano: number, mes: number) {
  // mes is 1-indexed (1..12)
  const date = new Date(ano, mes - 1, 1);
  const nomeMes = date.toLocaleDateString("pt-BR", { month: "long" });
  return `${nomeMes.charAt(0).toUpperCase() + nomeMes.slice(1)} de ${ano}`;
}

export function formatarNomeMes(mes: number) {
  // mes is 1-indexed (1..12)
  const date = new Date(2026, mes - 1, 1);
  const nomeMes = date.toLocaleDateString("pt-BR", { month: "long" });
  return nomeMes.charAt(0).toUpperCase() + nomeMes.slice(1);
}

export interface DiaGrade {
  dataISO: string;
  dia: number;
  mes: number;
  ano: number;
  eMesAtual: boolean;
  eHoje: boolean;
}

export function obterGradeDoMes(ano: number, mes: number): DiaGrade[] {
  const hoje = hojeISO();
  const primeiroDiaDoMes = new Date(ano, mes - 1, 1);
  const ultimoDiaDoMes = new Date(ano, mes, 0);

  const diaDaSemanaInicio = primeiroDiaDoMes.getDay(); // 0 = Domingo
  const totalDiasMes = ultimoDiaDoMes.getDate();

  const grade: DiaGrade[] = [];

  // Dias do mês anterior para preenchimento (padding)
  const ultimoDiaMesAnterior = new Date(ano, mes - 1, 0).getDate();
  for (let i = diaDaSemanaInicio - 1; i >= 0; i--) {
    const d = ultimoDiaMesAnterior - i;
    const dateObj = new Date(ano, mes - 2, d);
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, "0");
    const dayStr = String(d).padStart(2, "0");
    const dataISO = `${y}-${m}-${dayStr}`;
    grade.push({
      dataISO,
      dia: d,
      mes: dateObj.getMonth() + 1,
      ano: y,
      eMesAtual: false,
      eHoje: dataISO === hoje,
    });
  }

  // Dias do mês atual
  for (let d = 1; d <= totalDiasMes; d++) {
    const m = String(mes).padStart(2, "0");
    const dayStr = String(d).padStart(2, "0");
    const dataISO = `${ano}-${m}-${dayStr}`;
    grade.push({
      dataISO,
      dia: d,
      mes,
      ano,
      eMesAtual: true,
      eHoje: dataISO === hoje,
    });
  }

  // Dias do próximo mês para fechar a grade (múltiplo de 7)
  const sobra = grade.length % 7;
  if (sobra !== 0) {
    const faltam = 7 - sobra;
    for (let d = 1; d <= faltam; d++) {
      const dateObj = new Date(ano, mes, d);
      const y = dateObj.getFullYear();
      const m = String(dateObj.getMonth() + 1).padStart(2, "0");
      const dayStr = String(d).padStart(2, "0");
      const dataISO = `${y}-${m}-${dayStr}`;
      grade.push({
        dataISO,
        dia: d,
        mes: dateObj.getMonth() + 1,
        ano: y,
        eMesAtual: false,
        eHoje: dataISO === hoje,
      });
    }
  }

  return grade;
}

