import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import * as api from "@/services/api";
import type { NovaReserva, Reserva, Sala, Unidade, User } from "@/types";

export const keys = {
  unidades: ["unidades"] as const,
  salas: ["salas"] as const,
  usuarios: ["usuarios"] as const,
  reservas: ["reservas"] as const,
  profissoes: ["profissoes"] as const,
};

export const useUnidades = () => useQuery({ queryKey: keys.unidades, queryFn: api.listUnidades });
export const useSalas = () => useQuery({ queryKey: keys.salas, queryFn: api.listSalas });
export const useUsuarios = () => useQuery({ queryKey: keys.usuarios, queryFn: api.listUsuarios });
export const useReservas = () => useQuery({ queryKey: keys.reservas, queryFn: api.listReservas });
export const useProfessions = () => useQuery({ queryKey: keys.profissoes, queryFn: api.listProfessions });

function useInvalidate(key: readonly unknown[]) {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: key });
}

export function useSaveUnidade() {
  const invalidate = useInvalidate(keys.unidades);
  return useMutation({
    mutationFn: (input: Omit<Unidade, "id"> & { id?: string }) => api.saveUnidade(input),
    onSuccess: () => {
      invalidate();
      toast.success("Unidade salva com sucesso.");
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
      toast.success("Unidade removida.");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useSaveSala() {
  const invalidate = useInvalidate(keys.salas);
  return useMutation({
    mutationFn: (input: Omit<Sala, "id"> & { id?: string }) => api.saveSala(input),
    onSuccess: () => {
      invalidate();
      toast.success("Sala salva com sucesso.");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteSala() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteSala(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.salas });
      qc.invalidateQueries({ queryKey: keys.reservas });
      toast.success("Sala removida.");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useSaveUsuario() {
  const invalidate = useInvalidate(keys.usuarios);
  return useMutation({
    mutationFn: (input: Partial<User> & { id?: string }) => api.saveUsuario(input),
    onSuccess: () => {
      invalidate();
      toast.success("Profissional salvo com sucesso.");
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
      toast.success("Senha resetada com sucesso para 'psi123'.");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useCreateReserva() {
  const invalidate = useInvalidate(keys.reservas);
  return useMutation({
    mutationFn: (input: NovaReserva) => api.createReserva(input),
    onSuccess: () => {
      invalidate();
      toast.success("Solicitação enviada. Aguardando aprovação.");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateReserva(successMessage = "Reserva atualizada.") {
  const invalidate = useInvalidate(keys.reservas);
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<Reserva> }) =>
      api.updateReserva(id, patch),
    onSuccess: () => {
      invalidate();
      toast.success(successMessage);
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteReserva() {
  const invalidate = useInvalidate(keys.reservas);
  return useMutation({
    mutationFn: (id: string) => api.deleteReserva(id),
    onSuccess: () => {
      invalidate();
      toast.success("Reserva excluída.");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useSaveProfession() {
  const invalidate = useInvalidate(keys.profissoes);
  return useMutation({
    mutationFn: (input: { id?: number; profission: string }) => api.saveProfession(input),
    onSuccess: () => {
      invalidate();
      toast.success("Profissão salva com sucesso.");
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
      toast.success("Profissão removida.");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
