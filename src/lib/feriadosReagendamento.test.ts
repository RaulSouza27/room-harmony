import {describe, expect, it} from 'vitest';

import type {Holiday, Reserva, Sala} from '../types';

import {aplicarTransicaoReagendarFeriado, calcularPendenciasAdmin, filtrarMinhasReservas, reservaColideComFeriado,} from './feriadosReagendamento';

describe('feriadosReagendamento', () => {
  const salasExemplo: Sala[] = [
    {
      id: '1',
      nome: 'Sala 01',
      unidade_id: '10',
      descricao: 'Sala Unidade Central',
      status: 'ativa',
      fotos: [],
    },
    {
      id: '2',
      nome: 'Sala 02',
      unidade_id: '20',
      descricao: 'Sala Unidade Sul',
      status: 'ativa',
      fotos: [],
    },
  ];

  const reservasExemplo: Reserva[] = [
    {
      id: 'r1',
      sala_id: '1',
      unidade_id: '10',
      profissional_id: 'userA',
      data: '2026-11-15',
      hora_inicio: '09:00',
      hora_fim: '10:00',
      status: 'aprovada',
      criado_em: '2026-10-01T10:00:00Z',
      recorrencia: 'unica',
    },
    {
      id: 'r2',
      sala_id: '1',
      unidade_id: '10',
      profissional_id: 'userB',
      data: '2026-11-15',
      hora_inicio: '14:00',
      hora_fim: '15:00',
      status: 'pendente',
      criado_em: '2026-10-01T11:00:00Z',
      recorrencia: 'unica',
    },
    {
      id: 'r3',
      sala_id: '2',
      unidade_id: '20',
      profissional_id: 'userA',
      data: '2026-11-15',
      hora_inicio: '10:00',
      hora_fim: '11:00',
      status: 'aprovada',
      criado_em: '2026-10-01T12:00:00Z',
      recorrencia: 'unica',
    },
    {
      id: 'r4',
      sala_id: '1',
      unidade_id: '10',
      profissional_id: 'userA',
      data: '2026-11-20',
      hora_inicio: '09:00',
      hora_fim: '10:00',
      status: 'aprovada',
      criado_em: '2026-10-01T10:00:00Z',
      recorrencia: 'unica',
    },
    {
      id: 'r5',
      sala_id: '1',
      unidade_id: '10',
      profissional_id: 'userB',
      data: '2026-11-15',
      hora_inicio: '16:00',
      hora_fim: '17:00',
      status: 'cancelada',
      criado_em: '2026-10-01T10:00:00Z',
      recorrencia: 'unica',
    },
  ];

  describe('reservaColideComFeriado', () => {
    it('deve detectar colisão para feriado na mesma unidade e data', () => {
      const feriado: Holiday = {
        id: 100,
        name: 'Feriado Local',
        startDate: '2026-11-15',
        endDate: '2026-11-15',
        unitId: 10,
        status: true,
      };

      const colide = reservaColideComFeriado(
          reservasExemplo[0]!,
          feriado,
          salasExemplo[0],
      );
      expect(colide).toBe(true);
    });

    it('não deve detectar colisão se a reserva for em outra unidade', () => {
      const feriado: Holiday = {
        id: 100,
        name: 'Feriado Local',
        startDate: '2026-11-15',
        endDate: '2026-11-15',
        unitId: 10,
        status: true,
      };

      const colide = reservaColideComFeriado(
          reservasExemplo[2]!,  // Unidade 20
          feriado,
          salasExemplo[1],  // Unidade 20
      );
      expect(colide).toBe(false);
    });

    it('deve detectar colisão para feriado global (unitId nulo) em qualquer sala',
       () => {
         const feriadoGlobal: Holiday = {
           id: 101,
           name: 'Feriado Nacional',
           startDate: '2026-11-15',
           endDate: '2026-11-15',
           unitId: null,
           status: true,
         };

         expect(reservaColideComFeriado(
                    reservasExemplo[0]!, feriadoGlobal, salasExemplo[0]))
             .toBe(true);
         expect(reservaColideComFeriado(
                    reservasExemplo[2]!, feriadoGlobal, salasExemplo[1]))
             .toBe(true);
       });

    it('não deve detectar colisão se a data for fora do período do feriado',
       () => {
         const feriado: Holiday = {
           id: 100,
           name: 'Feriado Local',
           startDate: '2026-11-15',
           endDate: '2026-11-15',
           unitId: 10,
           status: true,
         };

         expect(reservaColideComFeriado(
                    reservasExemplo[3]!, feriado, salasExemplo[0]))
             .toBe(false);
       });

    it('não deve detectar colisão se o feriado estiver inativo', () => {
      const feriadoInativo: Holiday = {
        id: 100,
        name: 'Feriado Inativo',
        startDate: '2026-11-15',
        endDate: '2026-11-15',
        unitId: 10,
        status: false,
      };

      expect(reservaColideComFeriado(
                 reservasExemplo[0]!, feriadoInativo, salasExemplo[0]))
          .toBe(false);
    });
  });

  describe('aplicarTransicaoReagendarFeriado', () => {
    it('deve transicionar reservas aprovadas e pendentes da unidade/data para \'reagendar\', mantendo as demais',
       () => {
         const feriado: Holiday = {
           id: 100,
           name: 'Feriado Local',
           startDate: '2026-11-15',
           endDate: '2026-11-15',
           unitId: 10,
           status: true,
         };

         const resultado = aplicarTransicaoReagendarFeriado(
             reservasExemplo, feriado, salasExemplo);

         const r1 = resultado.find((r) => r.id === 'r1');
         const r2 = resultado.find((r) => r.id === 'r2');
         const r3 = resultado.find((r) => r.id === 'r3');
         const r4 = resultado.find((r) => r.id === 'r4');
         const r5 = resultado.find((r) => r.id === 'r5');

         expect(r1?.status).toBe('reagendar');
         expect(r2?.status).toBe('reagendar');
         // r3 é de outra unidade -> mantido aprovada
         expect(r3?.status).toBe('aprovada');
         // r4 é de outro dia -> mantido aprovada
         expect(r4?.status).toBe('aprovada');
         // r5 já estava cancelada -> continua cancelada
         expect(r5?.status).toBe('cancelada');
       });
  });

  describe('filtrarMinhasReservas', () => {
    it('garante isolamento estrito: locatário A nunca visualiza reservas do locatário B',
       () => {
         const reservasUserA = filtrarMinhasReservas(reservasExemplo, 'userA');
         expect(reservasUserA.every((r) => r.profissional_id === 'userA'))
             .toBe(true);
         expect(reservasUserA.some((r) => r.profissional_id === 'userB'))
             .toBe(false);

         const reservasUserB = filtrarMinhasReservas(reservasExemplo, 'userB');
         expect(reservasUserB.every((r) => r.profissional_id === 'userB'))
             .toBe(true);
         expect(reservasUserB.some((r) => r.profissional_id === 'userA'))
             .toBe(false);
       });

    it('locatário visualiza suas reservas em status reagendar no filtro correspondente',
       () => {
         const reservasAtualizadas = aplicarTransicaoReagendarFeriado(
             reservasExemplo,
             {
               startDate: '2026-11-15',
               endDate: '2026-11-15',
               unitId: 10,
               status: true
             },
             salasExemplo,
         );

         const reagendarUserA =
             filtrarMinhasReservas(reservasAtualizadas, 'userA', 'reagendar');
         expect(reagendarUserA.length).toBe(1);
         expect(reagendarUserA[0]?.id).toBe('r1');

         const reagendarUserB =
             filtrarMinhasReservas(reservasAtualizadas, 'userB', 'reagendar');
         expect(reagendarUserB.length).toBe(1);
         expect(reagendarUserB[0]?.id).toBe('r2');
       });
  });

  describe('calcularPendenciasAdmin', () => {
    it('deve somar reservas pendentes, solicitações de cancelamento e reservas a reagendar',
       () => {
         const lista: Reserva[] = [
           {...reservasExemplo[0]!, status: 'pendente'},
           {...reservasExemplo[1]!, status: 'solicitacao_cancelamento'},
           {...reservasExemplo[2]!, status: 'reagendar'},
           {...reservasExemplo[3]!, status: 'aprovada'},
           {...reservasExemplo[4]!, status: 'cancelada'},
         ];

         const contagem = calcularPendenciasAdmin(lista);
         expect(contagem.reservasPendentes).toBe(1);
         expect(contagem.cancelamentosPendentes).toBe(1);
         expect(contagem.reagendamentosPendentes).toBe(1);
         expect(contagem.total).toBe(3);
       });
  });
});
