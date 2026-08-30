import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { ConfirmDialog } from "@/components/ReservaActions";
import { EmptyState, ErrorState, LoadingState } from "@/components/common";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDeleteSala, useSalas, useSaveSala, useUnidades } from "@/hooks/useApi";
import type { Sala, SalaStatus } from "@/types";

export const Route = createFileRoute("/app/salas")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Salas — Clínica Escuta" },
      {
        name: "description",
        content: "Cadastro de salas por unidade e status operacional.",
      },
      { property: "og:title", content: "Salas — Clínica Escuta" },
      { property: "og:description", content: "Crie e edite salas e disponibilidade." },
    ],
  }),
  component: SalasPage,
});

const statusLabel: Record<SalaStatus, string> = {
  ativa: "Ativa",
  inativa: "Inativa",
};

function SalasPage() {
  const salasQ = useSalas();
  const { data: unidades } = useUnidades();
  // const excluir = useDeleteSala();
  const [open, setOpen] = useState(false);
  const [editando, setEditando] = useState<Sala | null>(null);
  const [alvo, setAlvo] = useState<Sala | null>(null);
  const [alvoVisualizacao, setAlvoVisualizacao] = useState<Sala | null>(null);
  const [photoIndexVisualizacao, setPhotoIndexVisualizacao] = useState<number>(0);

  const salas = salasQ.data ?? [];

  return (
    <AppShell
      title="Salas"
      description={`${salas.length} sala(s) cadastrada(s)`}
      actions={
        <Button
          size="sm"
          onClick={() => {
            setEditando(null);
            setOpen(true);
          }}
        >
          Nova sala
        </Button>
      }
    >
      {salasQ.isLoading ? (
        <LoadingState />
      ) : salasQ.error ? (
        <ErrorState message={salasQ.error.message} />
      ) : salas.length === 0 ? (
        <EmptyState title="Nenhuma sala cadastrada" description="Crie a primeira sala." />
      ) : (
        <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {salas.map((s) => (
            <li
              key={s.id}
              className="rounded-xl border border-border bg-card overflow-hidden shadow-soft flex flex-col justify-between"
            >
              <div>
                {s.fotos && s.fotos.length > 0 ? (
                  <div
                    className="w-full h-40 bg-muted overflow-hidden cursor-pointer animate-fade-in"
                    onClick={() => {
                      setAlvoVisualizacao(s);
                      setPhotoIndexVisualizacao(0);
                    }}
                  >
                    <img
                      src={s.fotos[0]}
                      alt={s.nome}
                      className="w-full h-full object-cover transition-transform hover:scale-105 duration-300"
                    />
                  </div>
                ) : null}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-card-foreground truncate">
                        {s.nome}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Unidade: {unidades?.find((u) => u.id === s.unidade_id)?.nome ?? "—"}
                      </p>
                      {s.descricao ? (
                        <p className="mt-2 text-xs text-muted-foreground leading-relaxed break-words">
                          {s.descricao}
                        </p>
                      ) : null}
                    </div>
                    <Badge
                      variant="outline"
                      className={
                        s.status === "ativa"
                          ? "border-success/40 bg-success/15 text-success-foreground shrink-0"
                          : "text-muted-foreground shrink-0"
                      }
                    >
                      {statusLabel[s.status]}
                    </Badge>
                  </div>
                </div>
              </div>
              <div className="p-4 pt-0 flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setEditando(s);
                    setOpen(true);
                  }}
                >
                  Editar
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <SalaDialog open={open} onOpenChange={setOpen} sala={editando} unidades={unidades ?? []} />

      {/* <ConfirmDialog
        open={!!alvo}
        onOpenChange={(v) => !v && setAlvo(null)}
        title="Excluir esta sala?"
        description="As reservas vinculadas também serão removidas."
        confirmLabel="Excluir"
        destructive
        onConfirm={() => alvo && excluir.mutate(alvo.id)}
       >*/}

      {alvoVisualizacao !== null && alvoVisualizacao.fotos && alvoVisualizacao.fotos.length > 0 ? (
        <Dialog open={alvoVisualizacao !== null} onOpenChange={() => setAlvoVisualizacao(null)}>
          <DialogContent className="sm:max-w-xl p-3 flex flex-col items-center justify-center bg-background/95 border-none shadow-2xl">
            <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-black flex items-center justify-center">
              <img
                src={alvoVisualizacao.fotos[photoIndexVisualizacao]}
                alt={`Foto ${photoIndexVisualizacao + 1}`}
                className="max-w-full max-h-full object-contain animate-fade-in"
              />
              {alvoVisualizacao.fotos.length > 1 ? (
                <>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setPhotoIndexVisualizacao((prev) =>
                        prev === 0 ? alvoVisualizacao.fotos.length - 1 : prev - 1,
                      );
                    }}
                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/60 text-white rounded-full p-2 text-sm hover:bg-black/80 font-bold transition-transform active:scale-95"
                  >
                    ◀
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setPhotoIndexVisualizacao((prev) =>
                        prev === alvoVisualizacao.fotos.length - 1 ? 0 : prev + 1,
                      );
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/60 text-white rounded-full p-2 text-sm hover:bg-black/80 font-bold transition-transform active:scale-95"
                  >
                    ▶
                  </button>
                </>
              ) : null}
            </div>
            <div className="mt-2 text-xs text-muted-foreground font-medium">
              Foto {photoIndexVisualizacao + 1} de {alvoVisualizacao.fotos.length}
            </div>
          </DialogContent>
        </Dialog>
      ) : null}
    </AppShell>
  );
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
}

function SalaDialog({
  open,
  onOpenChange,
  sala,
  unidades,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  sala: Sala | null;
  unidades: { id: string; nome: string }[];
}) {
  const salvar = useSaveSala();
  const [nome, setNome] = useState("");
  const [unidadeId, setUnidadeId] = useState("");
  const [descricao, setDescricao] = useState("");
  const [status, setStatus] = useState<SalaStatus>("ativa");
  const [fotos, setFotos] = useState<string[]>(["", "", "", ""]);

  useEffect(() => {
    if (!open) return;
    setNome(sala?.nome ?? "");
    setUnidadeId(sala?.unidade_id ?? unidades[0]?.id ?? "");
    setDescricao(sala?.descricao ?? "");
    setStatus(sala?.status ?? "ativa");

    const existingFotos = sala?.fotos ?? [];
    setFotos([
      existingFotos[0] ?? "",
      existingFotos[1] ?? "",
      existingFotos[2] ?? "",
      existingFotos[3] ?? "",
    ]);
  }, [open, sala, unidades]);

  const valido = nome.trim().length > 0 && unidadeId !== "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{sala ? "Editar sala" : "Nova sala"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nome">Nome / número da sala</Label>
            <Input
              id="nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              maxLength={50}
              placeholder="Ex: Sala 01, Consultório A..."
            />
          </div>
          <div className="space-y-2">
            <Label>Unidade</Label>
            <Select value={unidadeId} onValueChange={setUnidadeId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a unidade" />
              </SelectTrigger>
              <SelectContent>
                {unidades.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="desc">Descrição / Observações</Label>
            <Input
              id="desc"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Ex: Sala com divã, ar-condicionado..."
              maxLength={255}
            />
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as SalaStatus)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ativa">Ativa</SelectItem>
                <SelectItem value="inativa">Inativa</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Imagens da sala (máx. 4)</Label>
            <div className="grid grid-cols-2 gap-3">
              {Array.from({ length: 4 }).map((_, index) => {
                const foto = fotos[index];
                return (
                  <div
                    key={index}
                    className="relative flex flex-col items-center justify-center border border-dashed border-border rounded-lg p-2 h-28 bg-muted/20"
                  >
                    {foto ? (
                      <>
                        <img
                          src={foto}
                          alt={`Foto ${index + 1}`}
                          className="w-full h-full object-cover rounded"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setFotos((prev) => {
                              const copy = [...prev];
                              copy[index] = "";
                              return copy;
                            });
                          }}
                          className="absolute top-1 right-1 bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-full p-1 text-[10px]"
                        >
                          ✕
                        </button>
                      </>
                    ) : (
                      <label className="flex flex-col items-center justify-center cursor-pointer w-full h-full text-muted-foreground text-xs hover:text-foreground">
                        <span>Foto {index + 1}</span>
                        <span className="text-[10px] text-muted-foreground/70 mt-1">Upload</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              try {
                                const base64 = await fileToBase64(file);
                                setFotos((prev) => {
                                  const copy = [...prev];
                                  copy[index] = base64;
                                  return copy;
                                });
                              } catch (err) {
                                console.error(err);
                              }
                            }
                          }}
                        />
                      </label>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            disabled={!valido || salvar.isPending}
            onClick={async () => {
              await salvar.mutateAsync({
                ...(sala ? { id: sala.id } : {}),
                nome: nome.trim(),
                unidade_id: unidadeId,
                descricao: descricao.trim(),
                status,
                fotos: fotos.filter((f) => f !== ""),
              });
              onOpenChange(false);
            }}
          >
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
