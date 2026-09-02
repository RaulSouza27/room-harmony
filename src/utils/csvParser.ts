import type { Profession, Role, User } from "@/types";

export interface ParsedUserRow {
  id: string;
  nome: string;
  email: string;
  telefone: string;
  cpf: string;
  boardNumber: string;
  papel: Role;
  professionId: number | null;
  professionName: string;
  cep: string;
  endereco: string;
  status: "ativo" | "inativo";
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Splits raw CSV/TSV text into array of rows handling quotes and line breaks
 */
function parseCsvRows(text: string, delimiter: string): string[][] {
  const lines: string[][] = [];
  let currentRow: string[] = [];
  let currentToken = "";
  let insideQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentToken += '"';
        i++;
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === delimiter && !insideQuotes) {
      currentRow.push(currentToken.trim());
      currentToken = "";
    } else if ((char === "\r" || char === "\n") && !insideQuotes) {
      if (char === "\r" && nextChar === "\n") {
        i++;
      }
      currentRow.push(currentToken.trim());
      if (currentRow.some((field) => field.length > 0)) {
        lines.push(currentRow);
      }
      currentRow = [];
      currentToken = "";
    } else {
      currentToken += char;
    }
  }

  if (currentToken.length > 0 || currentRow.length > 0) {
    currentRow.push(currentToken.trim());
    if (currentRow.some((field) => field.length > 0)) {
      lines.push(currentRow);
    }
  }

  return lines;
}

/**
 * Detects the delimiter used in the header line
 */
function detectDelimiter(headerLine: string): string {
  const semicolons = (headerLine.match(/;/g) || []).length;
  const commas = (headerLine.match(/,/g) || []).length;
  const tabs = (headerLine.match(/\t/g) || []).length;

  if (tabs > semicolons && tabs > commas) return "\t";
  if (semicolons >= commas) return ";";
  return ",";
}

/**
 * Normalizes header string to match user fields
 */
function normalizeHeaderKey(header: string): string {
  const cleaned = header
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");

  if (cleaned.includes("nome") || cleaned === "name") return "nome";
  if (cleaned.includes("email") || cleaned.includes("mail")) return "email";
  if (cleaned.includes("telef") || cleaned.includes("phone") || cleaned.includes("celular"))
    return "telefone";
  if (cleaned.includes("cpf")) return "cpf";
  if (
    cleaned.includes("conselho") ||
    cleaned.includes("crp") ||
    cleaned.includes("registro") ||
    cleaned.includes("board")
  )
    return "boardNumber";
  if (
    cleaned.includes("papel") ||
    cleaned.includes("role") ||
    cleaned.includes("cargo") ||
    cleaned.includes("tipo")
  )
    return "papel";
  if (
    cleaned.includes("profissao") ||
    cleaned.includes("profession") ||
    cleaned.includes("especialidade")
  )
    return "profissao";
  if (cleaned.includes("cep") || cleaned.includes("zip")) return "cep";
  if (cleaned.includes("end") || cleaned.includes("address")) return "endereco";

  return cleaned;
}

export function parseCsvUserImport(
  rawText: string,
  existingUsers: User[] = [],
  existingProfessions: Profession[] = []
): ParsedUserRow[] {
  if (!rawText || !rawText.trim()) return [];

  const firstLine = rawText.split("\n")[0] || "";
  const delimiter = detectDelimiter(firstLine);
  const rawRows = parseCsvRows(rawText, delimiter);

  if (rawRows.length < 2) return [];

  const headerRow = rawRows[0];
  const headerKeys = headerRow.map(normalizeHeaderKey);

  const seenEmailsInFile = new Set<string>();
  const existingEmails = new Set(
    existingUsers.map((u) => u.email.toLowerCase().trim())
  );

  const results: ParsedUserRow[] = [];

  for (let rowIndex = 1; rowIndex < rawRows.length; rowIndex++) {
    const row = rawRows[rowIndex];
    if (!row || row.every((val) => !val)) continue;

    const rawData: Record<string, string> = {};
    headerKeys.forEach((key, colIdx) => {
      rawData[key] = row[colIdx] || "";
    });

    const nome = rawData.nome || "";
    const email = (rawData.email || "").toLowerCase().trim();
    const telefone = rawData.telefone || "";
    const rawCpf = rawData.cpf || "";
    const cleanCpf = rawCpf.replace(/\D/g, "");
    const boardNumber = rawData.boardNumber || "";
    const rawPapel = rawData.papel || "";
    const rawProfissao = rawData.profissao || "";
    const rawCep = rawData.cep || "";
    const cleanCep = rawCep.replace(/\D/g, "");
    const endereco = rawData.endereco || "";

    const papel: Role =
      rawPapel.toLowerCase().includes("admin") ? "ADMINISTRADOR" : "PSICOLOGO";

    let professionId: number | null = null;
    let professionName = rawProfissao;

    if (rawProfissao && existingProfessions.length > 0) {
      const match = existingProfessions.find(
        (p) => p.profission.toLowerCase().trim() === rawProfissao.toLowerCase().trim()
      );
      if (match) {
        professionId = match.id;
        professionName = match.profission;
      }
    }

    const errors: string[] = [];
    const warnings: string[] = [];

    // Validation checks
    if (!nome || nome.trim().length <= 2) {
      errors.push("Nome inválido (deve ter mais que 2 caracteres)");
    }

    if (!email) {
      errors.push("E-mail é obrigatório");
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      errors.push("Formato de e-mail inválido");
    } else if (seenEmailsInFile.has(email)) {
      errors.push("E-mail duplicado neste arquivo");
    } else if (existingEmails.has(email)) {
      warnings.push("E-mail já cadastrado no sistema (será mantido/atualizado)");
    }

    if (email) {
      seenEmailsInFile.add(email);
    }

    if (cleanCpf && cleanCpf.length !== 11) {
      errors.push("CPF deve conter exatamente 11 dígitos");
    }

    if (cleanCep && cleanCep.length !== 8) {
      errors.push("CEP deve conter exatamente 8 dígitos");
    }

    if (papel === "PSICOLOGO" && rawProfissao && !professionId) {
      warnings.push(`Profissão "${rawProfissao}" não encontrada no sistema`);
    }

    results.push({
      id: `row-${rowIndex}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      nome: nome.trim(),
      email,
      telefone: telefone.trim(),
      cpf: cleanCpf ? cleanCpf : rawCpf.trim(),
      boardNumber: boardNumber.trim(),
      papel,
      professionId,
      professionName,
      cep: cleanCep ? cleanCep : rawCep.trim(),
      endereco: endereco.trim(),
      status: "ativo",
      isValid: errors.length === 0,
      errors,
      warnings,
    });
  }

  return results;
}

export function generateCsvTemplate(): string {
  const headers = [
    "Nome",
    "E-mail",
    "Telefone",
    "CPF",
    "Registro Conselho",
    "Papel",
    "Profissão",
    "CEP",
    "Endereço",
  ];

  const sampleRows = [
    [
      "Dra. Mariana Souza",
      "mariana.souza@clinica.com",
      "(11) 98765-4321",
      "123.456.789-00",
      "CRP-06/12345",
      "Psicólogo(a)",
      "Psicologia",
      "01001-000",
      "Rua das Flores, 123 - Ap 42",
    ],
    [
      "Dr. Roberto Fonseca",
      "roberto.fonseca@clinica.com",
      "(21) 99876-5432",
      "987.654.321-11",
      "CRP-05/54321",
      "Psicólogo(a)",
      "Psicologia",
      "20000-000",
      "Av. Paulista, 1000",
    ],
    [
      "Carla Oliveira",
      "carla.admin@clinica.com",
      "(31) 97654-3210",
      "456.789.012-33",
      "",
      "Administrador",
      "",
      "30100-000",
      "Praça da Liberdade, 50",
    ],
  ];

  const bom = "\uFEFF";
  const csvContent =
    headers.join(";") +
    "\n" +
    sampleRows.map((row) => row.map((field) => `"${field}"`).join(";")).join("\n");

  return bom + csvContent;
}
