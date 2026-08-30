import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { ReservaFormDialog } from "@/components/ReservaFormDialog";
import { ErrorState, LoadingState, SectionCard } from "@/components/common";
import { Button } from "@/components/ui/button";
import { useReservas, useSalas, useUnidades, useUsuarios } from "@/hooks/useApi";

export const Route = createFileRoute("/app/solicitar")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Solicitar reserva de sala — Clínica Escuta" },
      {
        name: "description",
        content: "Escolha unidade, sala, data e horário para solicitar o uso de uma sala.",
      },
      { property: "og:title", content: "Solicitar reserva de sala — Clínica Escuta" },
      {
        property: "og:description",
        content: "Solicitação com validação imediata de conflito de horário.",
      },
    ],
  }),
  component: SolicitarPage,
});

function SolicitarPage() {
  const unidadesQ = useUnidades();
  const salasQ = useSalas();
  const reservasQ = useReservas();
  const usuariosQ = useUsuarios();
  const [open, setOpen] = useState(true);

  const loading = unidadesQ.isLoading || salasQ.isLoading || reservasQ.isLoading;
  const error = unidadesQ.error ?? salasQ.error ?? reservasQ.error;

  return (
    <AppShell title="Solicitar reserva" description="Sua solicitação passa por aprovação">
      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error.message} />
      ) : (
        <SectionCard
          title="Nova solicitação"
          description="Preencha os dados da reserva desejada"
          actions={<Button onClick={() => setOpen(true)}>Abrir formulário</Button>}
        >
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>• Você só visualiza salas das unidades às quais tem acesso.</li>
            <li>• Horários com solicitação pendente já aparecem bloqueados na grade.</li>
            <li>• Conflitos são detectados antes do envio.</li>
            <li className="text-amber-600 dark:text-amber-400 font-semibold">• Atenção: A reserva só é feita mediante a apresentação do comprovante de pagamento.</li>
          </ul>
        </SectionCard>
      )}

      <ReservaFormDialog
        open={open}
        onOpenChange={setOpen}
        unidades={unidadesQ.data ?? []}
        salas={salasQ.data ?? []}
        usuarios={usuariosQ.data ?? []}
        reservas={reservasQ.data ?? []}
      />
    </AppShell>
  );
}
