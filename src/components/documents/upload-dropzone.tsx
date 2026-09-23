"use client";

import { useRef, useState, type DragEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { UploadCloud, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { isFileTooLarge, MAX_UPLOAD_FILE_SIZE_BYTES } from "@/lib/documents/limits";

const ACCEPTED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

const MAX_SIZE_MB = Math.round(MAX_UPLOAD_FILE_SIZE_BYTES / (1024 * 1024));

const ERROR_MESSAGES: Record<string, string> = {
  UNAUTHORIZED: "Tu dois être connecté pour importer un document.",
  INSUFFICIENT_CREDITS: "Crédits insuffisants pour analyser ce document.",
  UNSUPPORTED_FILE_TYPE: "Format non supporté. Utilise un PDF ou un fichier Word (.docx).",
  FILE_TOO_LARGE: `Ce fichier dépasse la taille maximale de ${MAX_SIZE_MB} Mo.`,
  PDF_LIMIT_REACHED: "Tu as atteint la limite de documents de ton plan. Passe à un plan supérieur pour en ajouter davantage.",
  SIGN_FAILED: "Impossible de préparer l'envoi. Réessaie.",
  DOWNLOAD_FAILED: "L'envoi du fichier a échoué. Réessaie.",
  NO_EXTRACTABLE_TEXT: "Aucun texte exploitable n'a été trouvé dans ce fichier.",
  INGESTION_FAILED: "L'analyse du document a échoué. Réessaie avec un autre fichier.",
};

/**
 * Import en 3 temps pour ne pas être limité par la taille de requête des
 * fonctions serverless Vercel (~4,5 Mo) :
 * 1. Le serveur prépare une URL signée Supabase Storage (vérifie crédits/quota).
 * 2. Le navigateur envoie le fichier DIRECTEMENT à Supabase Storage.
 * 3. Le serveur télécharge le fichier depuis le stockage et lance l'analyse.
 */
export function UploadDropzone({
  onUploaded,
  compact,
  subject,
}: {
  /** Par défaut : rafraîchit la page (usage sur /documents). Fournir ce callback pour un usage inline (ex: générateurs). */
  onUploaded?: (document: { id: string; title: string }) => void;
  compact?: boolean;
  subject?: string | null;
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
    if (isFileTooLarge(file.size)) {
      toast.error(ERROR_MESSAGES.FILE_TOO_LARGE);
      return;
    }

    setIsUploading(true);
    try {
      const urlRes = await fetch("/api/documents/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName: file.name, mimeType: file.type, fileSize: file.size }),
      });
      const urlData = await urlRes.json();
      if (!urlRes.ok) {
        toast.error(ERROR_MESSAGES[urlData.error] ?? "Une erreur est survenue.");
        return;
      }

      const supabase = createClient();
      const { error: uploadError } = await supabase.storage
        .from("documents")
        .uploadToSignedUrl(urlData.path, urlData.token, file);
      if (uploadError) {
        toast.error(ERROR_MESSAGES.DOWNLOAD_FAILED);
        return;
      }

      const processRes = await fetch("/api/documents/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: urlData.path,
          title: urlData.title,
          fileType: urlData.fileType,
          subject: subject ?? null,
        }),
      });
      const processData = await processRes.json();
      if (!processRes.ok) {
        toast.error(processData.message ?? ERROR_MESSAGES[processData.error] ?? "Une erreur est survenue.");
        return;
      }

      if (onUploaded) {
        onUploaded({ id: processData.document.id, title: processData.document.title });
      } else {
        toast.success(
          `"${processData.document.title}" a été analysé avec succès (${processData.creditsCharged} crédits).`,
        );
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
      role="button"
      tabIndex={0}
      aria-label="Importer un document"
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      onClick={() => !isUploading && inputRef.current?.click()}
      onKeyDown={(e) => {
        if ((e.key === "Enter" || e.key === " ") && !isUploading) {
          e.preventDefault();
          inputRef.current?.click();
        }
      }}
      className={cn(
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
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
          {!compact && (
            <p className="text-xs text-muted-foreground">
              Quelques secondes pour un petit document, plusieurs minutes pour un gros.
            </p>
          )}
        </>
      ) : (
        <>
          <UploadCloud className={cn("text-primary", compact ? "size-5" : "size-6")} />
          <p className="text-sm font-medium">Dépose un PDF ou un fichier Word</p>
          <p className="text-xs text-muted-foreground">
            ou clique pour choisir un fichier (à partir de 5 crédits, max {MAX_SIZE_MB} Mo)
          </p>
        </>
      )}
    </div>
  );
}
