import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, FileText, Loader2 } from "lucide-react";
import { useReservaReceipt } from "@/hooks/useApi";

interface ReceiptViewerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  receiptUrl?: string | null;
  reservaId?: string | null;
  title?: string;
}

export function handleDownloadReceipt(url: string, filename = "comprovante.png") {
  if (!url || url === "empty" || url === "has_receipt") return;

  if (url.startsWith("data:")) {
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } else {
    fetch(url)
      .then((response) => response.blob())
      .then((blob) => {
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = blobUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(blobUrl);
      })
      .catch(() => {
        window.open(url, "_blank");
      });
  }
}

export function ReceiptViewerDialog({
  open,
  onOpenChange,
  receiptUrl,
  reservaId,
  title = "Comprovante de Pagamento",
}: ReceiptViewerDialogProps) {
  const targetId = open
    ? reservaId ||
      (receiptUrl &&
      receiptUrl !== "has_receipt" &&
      receiptUrl !== "empty" &&
      !receiptUrl.startsWith("data:") &&
      !receiptUrl.startsWith("http")
        ? receiptUrl
        : null)
    : null;

  const receiptQuery = useReservaReceipt(targetId);

  const displayUrl =
    receiptUrl &&
    receiptUrl !== "has_receipt" &&
    receiptUrl !== "empty" &&
    (receiptUrl.startsWith("data:") || receiptUrl.startsWith("http"))
      ? receiptUrl
      : receiptQuery.data || null;

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl p-4 flex flex-col items-center justify-center bg-background border border-border shadow-2xl rounded-xl">
        <DialogHeader className="w-full flex flex-row items-center justify-between border-b pb-3 mb-2">
          <DialogTitle className="text-base font-semibold flex items-center gap-2">
            <FileText className="size-4 text-primary" />
            {title}
          </DialogTitle>
          <div className="flex items-center gap-2">
            {displayUrl && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleDownloadReceipt(displayUrl)}
                className="gap-1.5 text-xs font-medium"
              >
                <Download className="size-3.5" />
                Baixar comprovante
              </Button>
            )}
          </div>
        </DialogHeader>

        <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-black/90 flex items-center justify-center min-h-[300px]">
          {receiptQuery.isLoading ? (
            <div className="flex flex-col items-center gap-2 text-white/70">
              <Loader2 className="size-6 animate-spin text-primary" />
              <span className="text-xs">Carregando comprovante...</span>
            </div>
          ) : displayUrl ? (
            <img
              src={displayUrl}
              alt="Comprovante de pagamento"
              className="max-w-full max-h-[70vh] object-contain animate-fade-in"
            />
          ) : (
            <div className="text-white/50 text-xs">Comprovante indisponível</div>
          )}
        </div>

        {displayUrl && (
          <div className="mt-3 w-full flex items-center justify-between text-xs text-muted-foreground">
            <span>Visualização do comprovante anexado</span>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => handleDownloadReceipt(displayUrl)}
              className="gap-1.5"
            >
              <Download className="size-3.5" />
              Download
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
