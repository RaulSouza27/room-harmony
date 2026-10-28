import {DEFAULT_PASSWORD} from '@/config/api';
import * as api from '@/services/api';
import type {NovaReserva, Reserva, Sala, Unidade, User} from '@/types';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {toast} from 'sonner';

export const keys = {
  unidades: ['unidades'] as const,
  salas: ['salas'] as const,
  salaDetail: (id: string) => ['salaDetail', id] as const,
  usuarios: ['usuarios'] as const,
  reservas: (filters?: api.ReservaFilters) => ['reservas', filters ?? {}] as
      const,
  profissoes: ['profissoes'] as const,
  reservaReceipt: (id: string) => ['reservaReceipt', id] as const,
  holidays: (unitId?: string|number) => ['holidays', unitId ?? 'all'] as const,
  complaints: ['complaints'] as const,
  complaintsPaged:
      (params:
           {page: number; size: number; search?: string;
            solved?: boolean}) => ['complaints', 'paged', params] as const,
  complaintStats: ['complaintStats'] as const,
  myComplaints: ['myComplaints'] as const,
  myComplaintsPaged:
      (params: {page: number;
                size: number}) => ['myComplaints', 'paged', params] as const,
  complaintQuota: ['complaintQuota'] as const,
  myCreditPackages: ['creditPackages', 'my'] as const,
  allCreditPackages:
      (params?: {status?: string; unitId?: number;
                 userId?: number}) => ['creditPackages', 'all', params ?? {}] as
      const,
  creditPackageStats: ['creditPackageStats'] as const,
  myCreditTransactions: (params?: {
    unitId?: number;
    type?: string;
    startDate?: string;
    endDate?: string;
  }) => ['creditTransactions', 'my', params ?? {}] as const,
  allCreditTransactionsPaged: (params: {
    page: number; size: number;
    userId?: number;
    unitId?: number;
    type?: string;
    startDate?: string;
    endDate?: string;
  }) => ['creditTransactions', 'paged', params] as const,
};

export const useUnidades = () => useQuery({
  queryKey: keys.unidades,
  queryFn: api.listUnidades,
  staleTime: 1000 * 60 * 15,
});

export const useSalas = () => useQuery({
  queryKey: keys.salas,
  queryFn: api.listSalas,
  staleTime: 1000 * 60 * 15,
});

export const useSala = (id: string|null) => useQuery({
  queryKey: id ? keys.salaDetail(id) : ['salaDetail', null],
  queryFn: () => api.getSala(id!),
  enabled: !!id,
  staleTime: 1000 * 60 * 5,
});

export const useUsuarios = () => useQuery({
  queryKey: keys.usuarios,
  queryFn: api.listUsuarios,
  staleTime: 1000 * 60 * 15,
});

export const useReservas = (filters?: api.ReservaFilters) => useQuery({
  queryKey: keys.reservas(filters),
  queryFn: () => api.listReservas(filters),
  staleTime: 1000 * 60,
  placeholderData: (previousData) => previousData,
});

export const useProfessions = () => useQuery({
  queryKey: keys.profissoes,
  queryFn: api.listProfessions,
  staleTime: 1000 * 60 * 15,
});

export const useReservaReceipt = (id: string|null) => useQuery({
  queryKey: id ? keys.reservaReceipt(id) : ['reservaReceipt', null],
  queryFn: () => api.getReservaReceipt(id!),
  enabled: !!id && id !== 'empty' && id !== 'has_receipt',
  staleTime: 1000 * 60 * 10,
});

export const useUsuarioDetail = (id: string|null) => useQuery({
  queryKey: id ? ['usuarioDetail', id] : ['usuarioDetail', null],
  queryFn: () => api.getUsuarioDetail(id!),
  enabled: !!id,
  staleTime: 1000 * 60 * 10,
});

export const useReservasPendentesCount = () => {
  const {data} = useReservas();
  if (!data) return 0;
  return data
      .filter(
          (r) => r.status === 'pendente' ||
              r.status === 'solicitacao_cancelamento' ||
              r.status === 'reagendar',
          )
      .length;
};

function useInvalidate(key: readonly unknown[]) {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({queryKey: key});
}

export function useSaveUnidade() {
  const invalidate = useInvalidate(keys.unidades);
  return useMutation({
    mutationFn: (input: Omit<Unidade, 'id'>&{id?: string}) =>
        api.saveUnidade(input),
    onSuccess: () => {
      invalidate();
      toast.success('Unidade salva com sucesso.');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteUnidade() {
  const invalidate = useInvalidate(keys.unidades);
  return useMutation({
    mutationFn: (id: string) => api.deleteUnidade(id),
    onSuccess: () => {
      invalidate();
      toast.success('Unidade removida.');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useSaveSala() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Omit<Sala, 'id'>&{id?: string}) => api.saveSala(input),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({queryKey: keys.salas});
      if (variables.id) {
        qc.invalidateQueries({queryKey: keys.salaDetail(variables.id)});
      }
      toast.success('Sala salva com sucesso.');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteSala() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteSala(id),
    onSuccess: () => {
      qc.invalidateQueries({queryKey: keys.salas});
      qc.invalidateQueries({queryKey: ['reservas']});
      toast.success('Sala removida.');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useSaveUsuario() {
  const invalidate = useInvalidate(keys.usuarios);
  return useMutation({
    mutationFn: (input: Partial<User>&{id?: string}) => api.saveUsuario(input),
    onSuccess: () => {
      invalidate();
      toast.success('Profissional salvo com sucesso.');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useBulkSaveUsuarios() {
  const invalidate = useInvalidate(keys.usuarios);
  return useMutation({
    mutationFn: async ({
      users,
      onProgress,
    }: {
      users: Partial<User>[];
      onProgress?: (current: number, total: number, results: {
                  successCount: number; failCount: number;
                  errors: Array<{email: string; error: string}>
                }) => void;
    }) => {
      let successCount = 0;
      let failCount = 0;
      const errors: Array<{email: string; error: string}> = [];

      for (let i = 0; i < users.length; i++) {
        const u = users[i];
        try {
          await api.saveUsuario(u);
          successCount++;
        } catch (err: any) {
          failCount++;
          errors.push({
            email: u.email || `Item ${i + 1}`,
            error: err?.message || 'Erro desconhecido ao cadastrar',
          });
        }
        if (onProgress) {
          onProgress(i + 1, users.length, {successCount, failCount, errors});
        }
      }

      return {successCount, failCount, errors, total: users.length};
    },
    onSuccess: (data) => {
      invalidate();
      if (data.failCount === 0) {
        toast.success(
            `${data.successCount} profissional(is) cadastrado(s) com sucesso!`);
      } else {
        toast.warning(`${
            data.successCount} profissional(is) cadastrado(s) com sucesso e ${
            data.failCount} falha(s).`);
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useInactivateUsuario() {
  const invalidate = useInvalidate(keys.usuarios);
  return useMutation({
    mutationFn: ({
      id,
      status,
      usuario,
    }: {id: string; status: 'ativo' | 'inativo'; usuario?: User;}) =>
        api.softDeleteUsuario(id, status, usuario),
    onSuccess: (_, variables) => {
      invalidate();
      toast.success(`Profissional ${
          variables.status === 'inativo' ? 'inativado' :
                                           'ativado'} com sucesso.`);
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useResetPassword() {
  const invalidate = useInvalidate(keys.usuarios);
  return useMutation({
    mutationFn: (id: string) => api.resetPassword(id),
    onSuccess: () => {
      invalidate();
      toast.success(`Senha resetada com sucesso para '${DEFAULT_PASSWORD}'.`);
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: ({id, password}: {id: string; password: string}) =>
        api.changePassword(id, password),
    onSuccess: () => {
      toast.success('Senha alterada com sucesso.');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useCreateReserva() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: NovaReserva) => api.createReserva(input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({queryKey: ['reservas']});
      queryClient.invalidateQueries({queryKey: ['creditPackages']});
      queryClient.invalidateQueries({queryKey: ['creditTransactions']});
      if (variables.paid_with_credits) {
        toast.success(
            'Reserva aprovada na hora! Créditos descontados automaticamente.');
      } else {
        toast.success('Solicitação enviada. Aguardando aprovação.');
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateReserva(successMessage = 'Reserva atualizada.') {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({id, patch}: {id: string; patch: Partial<Reserva>}) =>
        api.updateReserva(id, patch),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['reservas']});
      queryClient.invalidateQueries({queryKey: ['creditPackages']});
      queryClient.invalidateQueries({queryKey: ['creditTransactions']});
      toast.success(successMessage);
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteReserva() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteReserva(id),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['reservas']});
      queryClient.invalidateQueries({queryKey: ['creditPackages']});
      queryClient.invalidateQueries({queryKey: ['creditTransactions']});
      toast.success('Reserva excluída.');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteReservasBatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => api.deleteReservasBatch(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['reservas']});
      queryClient.invalidateQueries({queryKey: ['creditPackages']});
      queryClient.invalidateQueries({queryKey: ['creditTransactions']});
      toast.success('Reservas excluídas com sucesso.');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useCancelReservasBatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => api.cancelReservasBatch(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['reservas']});
      queryClient.invalidateQueries({queryKey: ['creditPackages']});
      queryClient.invalidateQueries({queryKey: ['creditTransactions']});
      toast.success('Reservas canceladas com sucesso.');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useSaveProfession() {
  const invalidate = useInvalidate(keys.profissoes);
  return useMutation({
    mutationFn: (input: {id?: number; profission: string}) =>
        api.saveProfession(input),
    onSuccess: () => {
      invalidate();
      toast.success('Profissão salva com sucesso.');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteProfession() {
  const invalidate = useInvalidate(keys.profissoes);
  return useMutation({
    mutationFn: (id: number) => api.deleteProfession(id),
    onSuccess: () => {
      invalidate();
      toast.success('Profissão removida.');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useCompleteTour() {
  const invalidate = useInvalidate(keys.usuarios);
  return useMutation({
    mutationFn: (id: string) => api.completeTour(id),
    onSuccess: () => {
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useHolidays(unitId?: string|number) {
  return useQuery({
    queryKey: keys.holidays(unitId),
    queryFn: () => api.listHolidays(unitId),
    staleTime: 1000 * 60 * 5,
  });
}

export function useSaveHoliday() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      id?: number; name: string; startDate: string;
      endDate?: string;
      unitId?: number | null;
      description?: string;
      status?: boolean;
    }) => api.saveHoliday(input),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['holidays']});
      queryClient.invalidateQueries({queryKey: ['reservas']});
      toast.success('Feriado/bloqueio salvo com sucesso.');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteHoliday() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.deleteHoliday(id),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['holidays']});
      queryClient.invalidateQueries({queryKey: ['reservas']});
      toast.success('Feriado/bloqueio removido.');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useComplaintQuota(enabled = true) {
  return useQuery({
    queryKey: keys.complaintQuota,
    queryFn: api.getComplaintQuota,
    enabled,
    staleTime: 1000 * 30,
  });
}

export function useCreateComplaint() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {complaints: string; anonymous: boolean}) =>
        api.createComplaint(input),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: keys.complaintQuota});
      queryClient.invalidateQueries({queryKey: keys.myComplaints});
      toast.success('Manifestação enviada à Ouvidoria com sucesso!');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useMyComplaints(enabled = true) {
  return useQuery({
    queryKey: keys.myComplaints,
    queryFn: api.listMyComplaints,
    enabled,
    staleTime: 1000 * 30,
  });
}

export function useMyComplaintsPaged(
    params: {page: number; size: number}, enabled = true) {
  return useQuery({
    queryKey: keys.myComplaintsPaged(params),
    queryFn: () => api.listMyComplaintsPaged(params),
    enabled,
    staleTime: 1000 * 30,
    placeholderData: (previousData) => previousData,
  });
}

export function useComplaintStats(enabled = true) {
  return useQuery({
    queryKey: keys.complaintStats,
    queryFn: api.getComplaintStats,
    enabled,
    staleTime: 1000 * 30,
  });
}

export function useComplaints(enabled = true) {
  return useQuery({
    queryKey: keys.complaints,
    queryFn: api.listComplaints,
    enabled,
    staleTime: 1000 * 30,
  });
}

export function useComplaintsPaged(
    params: {page: number; size: number; search?: string; solved?: boolean},
    enabled = true) {
  return useQuery({
    queryKey: keys.complaintsPaged(params),
    queryFn: () => api.listComplaintsPaged(params),
    enabled,
    staleTime: 1000 * 30,
    placeholderData: (previousData) => previousData,
  });
}

export function useUpdateComplaintSolved() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      solved,
      resolutionNotes,
    }: {id: number; solved: boolean; resolutionNotes?: string;}) =>
        api.updateComplaintSolved(id, solved, resolutionNotes),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({queryKey: keys.complaints});
      queryClient.invalidateQueries({queryKey: keys.complaintStats});
      queryClient.invalidateQueries({queryKey: keys.myComplaints});
      toast.success(
          variables.solved ?
              'Manifestação marcada como resolvida com parecer registrado.' :
              'Manifestação reaberta como não resolvida.');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

/* ------------------------ Créditos (Pacotes 12h) -------------------- */
export function useMyCreditPackages(enabled = true) {
  return useQuery({
    queryKey: keys.myCreditPackages,
    queryFn: api.listMyCreditPackages,
    enabled,
    staleTime: 1000 * 30,
  });
}

export function useCreateCreditPackageRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {unitId: number; receiptImage: string}) =>
        api.createCreditPackageRequest(input),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['creditPackages']});
      queryClient.invalidateQueries({queryKey: keys.creditPackageStats});
      toast.success(
          'Solicitação de pacote de 12 créditos enviada para aprovação!');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useCreditPackageStats(enabled = true) {
  return useQuery({
    queryKey: keys.creditPackageStats,
    queryFn: api.getCreditPackageStats,
    enabled,
    staleTime: 1000 * 30,
  });
}

export function useAllCreditPackages(
    params?: {status?: string; unitId?: number; userId?: number},
    enabled = true) {
  return useQuery({
    queryKey: keys.allCreditPackages(params),
    queryFn: () => api.listAllCreditPackages(params),
    enabled,
    staleTime: 1000 * 30,
  });
}

export function useApproveCreditPackage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.approveCreditPackage(id),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['creditPackages']});
      queryClient.invalidateQueries({queryKey: keys.creditPackageStats});
      queryClient.invalidateQueries({queryKey: ['creditTransactions']});
      toast.success('Pacote aprovado! 12 créditos liberados por 30 dias.');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useRejectCreditPackage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn:
        ({id, rejectionReason}: {id: number; rejectionReason?: string}) =>
            api.rejectCreditPackage(id, rejectionReason),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['creditPackages']});
      queryClient.invalidateQueries({queryKey: keys.creditPackageStats});
      toast.success('Solicitação de pacote rejeitada.');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useMyCreditTransactions(
    params?:
        {unitId?: number; type?: string; startDate?: string; endDate?: string},
    enabled = true) {
  return useQuery({
    queryKey: keys.myCreditTransactions(params),
    queryFn: () => api.listMyCreditTransactions(params),
    enabled,
    staleTime: 1000 * 30,
  });
}

export function useAllCreditTransactionsPaged(
    params: {
      page: number; size: number;
      userId?: number;
      unitId?: number;
      type?: string;
      startDate?: string;
      endDate?: string;
    },
    enabled = true) {
  return useQuery({
    queryKey: keys.allCreditTransactionsPaged(params),
    queryFn: () => api.listAllCreditTransactionsPaged(params),
    enabled,
    staleTime: 1000 * 30,
    placeholderData: (previousData) => previousData,
  });
}
