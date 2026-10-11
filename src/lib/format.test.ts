import { describe, it, expect } from 'vitest';
import {
  formatarData,
  formatarDataLonga,
  hojeISO,
  formatRecorrencia,
  formatarMesAno,
  formatarNomeMes,
  obterGradeDoMes,
  isReservaComMaisDe24h,
  isReservaEspecial,
} from './format';

describe('format.ts utilities', () => {
  it('formatarData converts YYYY-MM-DD to DD/MM/YYYY', () => {
    expect(formatarData('2026-09-28')).toBe('28/09/2026');
  });

  it('formatarDataLonga returns formatted long date in pt-BR', () => {
    const formatted = formatarDataLonga('2026-09-28');
    expect(formatted.toLowerCase()).toContain('setembro');
    expect(formatted).toContain('28');
  });

  it('hojeISO returns a valid ISO date string (YYYY-MM-DD)', () => {
    const today = hojeISO();
    expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('formatRecorrencia formats recurrence types correctly', () => {
    expect(formatRecorrencia('semanal_anual')).toBe('Turno (4h)');
    expect(formatRecorrencia('turno')).toBe('Turno (4h)');
    expect(formatRecorrencia('semanal_mensal')).toBe('Hora avulsa fixa');
    expect(formatRecorrencia('semanal')).toBe('Hora avulsa fixa');
    expect(formatRecorrencia('avulso')).toBe('Hora avulsa');
  });

  it('isReservaEspecial identifies special reservations correctly', () => {
    expect(isReservaEspecial({ comprovante: 'reserva_especial_admin' })).toBe(true);
    expect(isReservaEspecial({ observacoes: '[Reserva Especial Admin] Teste' })).toBe(true);
    expect(isReservaEspecial({ comprovante: 'outro', observacoes: 'Normal' })).toBe(false);
    expect(isReservaEspecial(null)).toBe(false);
    expect(isReservaEspecial(undefined)).toBe(false);
  });

  it('formatarMesAno returns capitalized Month Year string', () => {
    expect(formatarMesAno(2026, 9)).toBe('Setembro de 2026');
  });

  it('formatarNomeMes returns capitalized month name', () => {
    expect(formatarNomeMes(1)).toBe('Janeiro');
    expect(formatarNomeMes(12)).toBe('Dezembro');
  });

  it('obterGradeDoMes returns calendar grid with proper days and multiples of 7', () => {
    const grade = obterGradeDoMes(2026, 9);
    expect(grade.length % 7).toBe(0);
    const setDays = grade.filter((g) => g.eMesAtual);
    expect(setDays.length).toBe(30); // September has 30 days
  });

  it('isReservaComMaisDe24h returns true only if reservation is at least 24h away', () => {
    const baseNow = new Date(2026, 9, 10, 10, 0, 0); // 10/10/2026 10:00

    // Reserva 48h no futuro
    expect(isReservaComMaisDe24h('2026-10-12', '10:00', baseNow)).toBe(true);

    // Reserva exatamente 24h no futuro
    expect(isReservaComMaisDe24h('2026-10-11', '10:00', baseNow)).toBe(true);

    // Reserva em 23h (menos de 24h)
    expect(isReservaComMaisDe24h('2026-10-11', '09:00', baseNow)).toBe(false);

    // Reserva no mesmo dia (hoje às 14:00)
    expect(isReservaComMaisDe24h('2026-10-10', '14:00', baseNow)).toBe(false);

    // Reserva no passado (ontem)
    expect(isReservaComMaisDe24h('2026-10-09', '10:00', baseNow)).toBe(false);
  });
});
