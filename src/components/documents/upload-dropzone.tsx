"use client";

import { useRef, useState, type DragEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { UploadCloud, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const ACCEPTED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

const ERROR_MESSAGES: Record<string, string> = {
  UNAUTHORIZED: "Tu dois être connecté pour importer un document.",
  INSUFFICIENT_CREDITS: "Crédits insuffisants pour analyser ce document (5 crédits requis).",
  UNSUPPORTED_FILE_TYPE: "Format non supporté. Utilise un PDF ou un fichier Word (.docx).",
  PDF_LIMIT_REACHED: "Tu as atteint la limite de documents de ton plan. Passe à un plan supérieur pour en ajouter davantage.",
  UPLOAD_FAILED: "L'envoi du fichier a échoué. Réessaie.",
  INGESTION_FAILED: "L'analyse du document a échoué. Réessaie avec un autre fichier.",
};

export function UploadDropzone({
  onUploaded,
  compact,
}: {
  /** Par défaut : rafraîchit la page (usage sur /documents). Fournir ce callback pour un usage inline (ex: générateurs). */
  onUploaded?: (document: { id: string; title: string }) => void;
  compact?: boolean;
}) {
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  async function uploadFile(file: File) {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast.error(ERROR_MESSAGES.UNSUPPORTED_FILE_TYPE);
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/documents/upload", { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok) {
        toast.error(ERROR_MESSAGES[data.error] ?? "Une erreur est survenue.");
        return;
      }

      if (onUploaded) {
        onUploaded({ id: data.document.id, title: data.document.title });
      } else {
        toast.success(`"${data.document.title}" a été analysé avec succès.`);
        router.refresh();
      }
    } catch {
      toast.error("Une erreur réseau est survenue. Réessaie.");
    } finally {
      setIsUploading(false);
    }
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void uploadFile(file);
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      onClick={() => !isUploading && inputRef.current?.click()}
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border/70 bg-muted/30 text-center transition-colors",
        compact ? "px-4 py-5" : "px-6 py-10",
        isDragging && "border-primary bg-primary/5",
        isUploading && "pointer-events-none opacity-70",
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void uploadFile(file);
          e.target.value = "";
        }}
      />

      {isUploading ? (
        <>
          <Loader2 className={cn("animate-spin text-primary", compact ? "size-5" : "size-6")} />
          <p className="text-sm font-medium">Analyse en cours...</p>
          {!compact && <p className="text-xs text-muted-foreground">Cela peut prendre jusqu&apos;à une minute.</p>}
        </>
      ) : (
        <>
          <UploadCloud className={cn("text-primary", compact ? "size-5" : "size-6")} />
          <p className="text-sm font-medium">Dépose un PDF ou un fichier Word</p>
          <p className="text-xs text-muted-foreground">ou clique pour choisir un fichier (5 crédits)</p>
        </>
      )}
    </div>
  );
}
