import { describe, it, expect } from 'vitest';
import { parseCsvUserImport, generateCsvTemplate } from './csvParser';
import type { Profession, User } from '@/types';

describe('csvParser utility', () => {
  it('generateCsvTemplate returns string with BOM and sample data', () => {
    const template = generateCsvTemplate();
    expect(template).toContain('\uFEFF');
    expect(template).toContain('Nome;E-mail;Telefone');
    expect(template).toContain('Dra. Mariana Souza');
  });

  it('returns empty array when raw text is empty', () => {
    expect(parseCsvUserImport('')).toEqual([]);
    expect(parseCsvUserImport('   ')).toEqual([]);
  });

  it('parses valid CSV user rows correctly', () => {
    const csvContent = `Nome;E-mail;Telefone;CPF;Registro Conselho;Papel;Profissão;CEP;Endereço
João Silva;joao@teste.com;(11) 99999-8888;123.456.789-00;CRP 123;Psicólogo;Psicologia;01001-000;Rua A`;

    const professions: Profession[] = [
      { id: 1, profission: 'Psicologia', status: 'ativo' },
    ];

    const results = parseCsvUserImport(csvContent, [], professions);
    expect(results).toHaveLength(1);
    const row = results[0]!;
    expect(row.nome).toBe('João Silva');
    expect(row.email).toBe('joao@teste.com');
    expect(row.cpf).toBe('12345678900');
    expect(row.professionId).toBe(1);
    expect(row.isValid).toBe(true);
    expect(row.errors).toHaveLength(0);
  });

  it('flags invalid email and short names with errors', () => {
    const csvContent = `Nome;E-mail;Telefone;CPF;Registro Conselho;Papel;Profissão;CEP;Endereço
J;email-invalido;11999998888;123;CRP 123;Locador;Psicologia;01001;Rua A`;

    const results = parseCsvUserImport(csvContent);
    expect(results).toHaveLength(1);
    const row = results[0]!;
    expect(row.isValid).toBe(false);
    expect(row.errors).toContain('Nome inválido (deve ter mais que 2 caracteres)');
    expect(row.errors).toContain('Formato de e-mail inválido');
    expect(row.errors).toContain('CPF deve conter exatamente 11 dígitos');
    expect(row.errors).toContain('CEP deve conter exatamente 8 dígitos');
  });

  it('flags duplicate email in file', () => {
    const csvContent = `Nome;E-mail;Telefone
Maria Silva;maria@teste.com;11999998888
Maria Souza;maria@teste.com;11988887777`;

    const results = parseCsvUserImport(csvContent);
    expect(results).toHaveLength(2);
    expect(results[1]!.errors).toContain('E-mail duplicado neste arquivo');
  });
});
