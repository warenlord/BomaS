"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { toast } from "sonner";
import {
  AlertCircle,
  BookOpen,
  Sparkles,
  ListChecks,
  Layers,
  NotebookPen,
  FileStack,
  ClipboardCheck,
  X,
  FileText,
  Loader2,
} from "lucide-react";
import { MessageBubble } from "@/components/chat/message-bubble";
import { MessageInput } from "@/components/chat/message-input";
import { SuggestionChips } from "@/components/chat/suggestion-chips";
import { DocumentPanel, type DocumentWithChunks } from "@/components/chat/document-panel";
import { DocumentAttachMenu } from "@/components/chat/document-attach-menu";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { createClient } from "@/lib/supabase/client";
import { isFileTooLarge, MAX_UPLOAD_FILE_SIZE_BYTES } from "@/lib/documents/limits";
import type { ChatUIMessage } from "@/lib/chat/format";
import type { PickerDocument } from "@/components/tools/document-picker";

const TOOLS_FROM_DISCUSSION = [
  { href: "qcm", icon: ListChecks, label: "Créer un QCM" },
  { href: "flashcards", icon: Layers, label: "Créer des flashcards" },
  { href: "summary", icon: FileStack, label: "Créer un résumé" },
  { href: "revision-sheet", icon: NotebookPen, label: "Créer une fiche de révision" },
  { href: "exam", icon: ClipboardCheck, label: "Préparer un examen" },
];

const ACCEPTED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

const MAX_SIZE_MB = Math.round(MAX_UPLOAD_FILE_SIZE_BYTES / (1024 * 1024));

const UPLOAD_ERROR_MESSAGES: Record<string, string> = {
  UNAUTHORIZED: "Tu dois être connecté pour importer un document.",
  INSUFFICIENT_CREDITS: "Crédits insuffisants pour analyser ce document.",
  UNSUPPORTED_FILE_TYPE: "Format non supporté. Utilise un PDF ou un fichier Word (.docx).",
  FILE_TOO_LARGE: `Ce fichier dépasse la taille maximale de ${MAX_SIZE_MB} Mo.`,
  PDF_LIMIT_REACHED: "Tu as atteint la limite de documents de ton plan. Passe à un plan supérieur pour en ajouter davantage.",
  SIGN_FAILED: "Impossible de préparer l'envoi. Réessaie.",
};

export function ChatWindow({
  conversationId,
  initialAttachedDocuments,
  documentsWithChunks,
  availableDocuments,
  initialMessages,
  autoSendText,
  greeting,
}: {
  conversationId: string;
  initialAttachedDocuments: PickerDocument[];
  documentsWithChunks: DocumentWithChunks[];
  availableDocuments: PickerDocument[];
  initialMessages: ChatUIMessage[];
  autoSendText?: string;
  greeting?: string;
}) {
  const [input, setInput] = useState("");
  const [attachedDocuments, setAttachedDocuments] = useState<PickerDocument[]>(initialAttachedDocuments);
  const [attachMenuOpen, setAttachMenuOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [highlighted, setHighlighted] = useState<{ documentId: string; chunkIndex: number } | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const autoSentRef = useRef(false);
  const router = useRouter();

  const documentIds = attachedDocuments.map((d) => d.id);
  const attachableDocuments = availableDocuments.filter((d) => !documentIds.includes(d.id));

  function openDocumentAt(documentId: string, chunkIndex: number) {
    setHighlighted({ documentId, chunkIndex });
    setPanelOpen(true);
  }

  useEffect(() => {
    if (!panelOpen || !highlighted) return;
    // Petit délai pour laisser le panneau (Sheet) finir son animation
    // d'ouverture avant de calculer la position de scroll.
    const timeout = setTimeout(() => {
      document
        .getElementById(`chunk-${highlighted.documentId}-${highlighted.chunkIndex}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 200);
    return () => clearTimeout(timeout);
  }, [panelOpen, highlighted]);

  async function persistAttachedDocuments(next: PickerDocument[], previous: PickerDocument[]) {
    try {
      const res = await fetch(`/api/conversations/${conversationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentIds: next.map((d) => d.id) }),
      });
      if (!res.ok) {
        // On revient à l'état précédent : sans ça, les étiquettes affichées
        // pouvaient rester désynchronisées de ce qui est vraiment persisté
        // (document_ids) jusqu'à un rechargement complet de la page.
        setAttachedDocuments(previous);
        toast.error("Impossible de mettre à jour les documents attachés. Réessaie.");
        return;
      }
      router.refresh();
    } catch {
      setAttachedDocuments(previous);
      toast.error("Erreur réseau, réessaie.");
    }
  }

  function attachDocument(doc: PickerDocument) {
    if (documentIds.includes(doc.id)) return;
    const previous = attachedDocuments;
    const next = [...attachedDocuments, doc];
    setAttachedDocuments(next);
    void persistAttachedDocuments(next, previous);
  }

  function detachDocument(id: string) {
    const previous = attachedDocuments;
    const next = attachedDocuments.filter((d) => d.id !== id);
    setAttachedDocuments(next);
    void persistAttachedDocuments(next, previous);
  }

  async function uploadAndAttach(file: File) {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast.error("Format non supporté. Utilise un PDF ou un fichier Word (.docx).");
      return;
    }
    if (isFileTooLarge(file.size)) {
      toast.error(`Ce fichier dépasse la taille maximale de ${MAX_SIZE_MB} Mo.`);
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
        toast.error(UPLOAD_ERROR_MESSAGES[urlData.error] ?? "Une erreur est survenue.");
        return;
      }

      const supabase = createClient();
      const { error: uploadError } = await supabase.storage
        .from("documents")
        .uploadToSignedUrl(urlData.path, urlData.token, file);
      if (uploadError) {
        toast.error("L'envoi du fichier a échoué. Réessaie.");
        return;
      }

      const processRes = await fetch("/api/documents/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: urlData.path, title: urlData.title, fileType: urlData.fileType, subject: null }),
      });
      const processData = await processRes.json();
      if (!processRes.ok) {
        toast.error(processData.message ?? "L'analyse du document a échoué. Réessaie avec un autre fichier.");
        return;
      }

      toast.success(`"${processData.document.title}" a été importé et attaché à la discussion.`);
      attachDocument({ id: processData.document.id, title: processData.document.title, subject: null });
    } catch {
      toast.error("Une erreur réseau est survenue. Réessaie.");
    } finally {
      setIsUploading(false);
    }
  }

  const { messages, sendMessage, regenerate, status, error } = useChat<ChatUIMessage>({
    id: conversationId,
    messages: initialMessages,
    transport: new DefaultChatTransport({ api: "/api/chat", body: { conversationId } }),
    onFinish: () => {
      // Le crédit vient d'être débité côté serveur : on rafraîchit les
      // données serveur (jauge de crédits dans la sidebar, historique...)
      // sans perdre l'état de streaming déjà affiché côté client.
      router.refresh();
    },
  });

  const isBusy = status === "submitted" || status === "streaming";
  const isEmpty = messages.length === 0;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, status]);

  useEffect(() => {
    if (autoSendText && !autoSentRef.current) {
      autoSentRef.current = true;
      sendMessage({ text: autoSendText }, { body: { documentIds } });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoSendText, sendMessage]);

  function handleSubmit() {
    const text = input;
    setInput("");
    sendMessage({ text }, { body: { documentIds } });
  }

  async function handleFeedback(messageId: string, feedback: "up" | "down") {
    try {
      await fetch(`/api/messages/${messageId}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feedback }),
      });
    } catch {
      // Silencieux : le retour visuel local (icône active) suffit même si
      // l'enregistrement échoue, ce n'est pas une action critique.
    }
  }

  const attachMenu = (
    <DocumentAttachMenu
      documents={attachableDocuments}
      open={attachMenuOpen}
      onOpenChange={setAttachMenuOpen}
      onSelect={attachDocument}
      onImportClick={() => fileInputRef.current?.click()}
    />
  );

  const chips = attachedDocuments.length > 0 && (
    <div className="mb-2 flex flex-wrap gap-1.5">
      {attachedDocuments.map((doc) => (
        <span
          key={doc.id}
          className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-muted px-2.5 py-1 text-xs font-medium"
        >
          <FileText className="size-3 text-primary" />
          <span className="max-w-40 truncate">{doc.title}</span>
          <button
            type="button"
            onClick={() => detachDocument(doc.id)}
            aria-label={`Détacher ${doc.title}`}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="size-3" />
          </button>
        </span>
      ))}
      {isUploading && (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
          <Loader2 className="size-3 animate-spin" />
          Import en cours...
        </span>
      )}
    </div>
  );

  const hiddenFileInput = (
    <input
      ref={fileInputRef}
      type="file"
      accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      className="hidden"
      onChange={(e) => {
        const file = e.target.files?.[0];
        if (file) void uploadAndAttach(file);
        e.target.value = "";
      }}
    />
  );

  if (isEmpty) {
    return (
      <div className="mx-auto flex h-[calc(100vh-3.5rem)] max-w-3xl flex-col justify-center px-4 pb-24 md:h-screen">
        <div className="flex flex-col items-center gap-8">
          <h1 className="text-center text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
            {greeting ?? "Qu'est-ce qu'on révise aujourd'hui ?"}
          </h1>

          <div className="w-full max-w-2xl space-y-5">
            {hiddenFileInput}
            <MessageInput
              value={input}
              onChange={setInput}
              onSubmit={handleSubmit}
              disabled={isBusy}
              autoFocus
              attachMenu={attachMenu}
              chips={chips}
              onDropFiles={(files) => void uploadAndAttach(files[0])}
              onAtKey={() => setAttachMenuOpen(true)}
            />
            {attachedDocuments.length === 0 && <SuggestionChips onSelect={setInput} />}
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <AlertCircle className="size-4 shrink-0" />
              <span>
                Une erreur est survenue. Vérifie ton solde de crédits dans{" "}
                <Link href="/billing" className="underline">
                  Crédits
                </Link>
                .
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-3.5rem)] max-w-3xl flex-col md:h-screen">
      <div className="flex items-center justify-between gap-2 border-b border-border/60 px-4 py-3 text-sm text-muted-foreground">
        {attachedDocuments.length > 0 ? (
          <span className="flex min-w-0 items-center gap-2 truncate">
            <FileText className="size-4 shrink-0 text-primary" />
            {attachedDocuments.length === 1 ? (
              <>
                À propos de <span className="font-medium text-foreground">{attachedDocuments[0].title}</span>
              </>
            ) : (
              <span className="font-medium text-foreground">{attachedDocuments.length} documents attachés</span>
            )}
          </span>
        ) : (
          <span />
        )}

        <div className="flex items-center gap-2">
          {documentsWithChunks.length > 0 && (
            <Button variant="outline" size="sm" onClick={() => setPanelOpen(true)}>
              <BookOpen className="size-3.5" />
              Voir le{documentsWithChunks.length > 1 ? "s documents" : " document"}
            </Button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="outline" size="sm" />}>
              <Sparkles className="size-3.5" />
              Créer avec cette discussion
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              {TOOLS_FROM_DISCUSSION.map((tool) => (
                <DropdownMenuItem
                  key={tool.href}
                  render={
                    <Link href={`/tools/${tool.href}?conversationId=${conversationId}`}>
                      <tool.icon className="size-4" />
                      {tool.label}
                    </Link>
                  }
                />
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {documentsWithChunks.length > 0 && (
        <Sheet open={panelOpen} onOpenChange={setPanelOpen}>
          <SheetContent side="right" className="w-full p-0 sm:max-w-md lg:max-w-lg">
            <DocumentPanel documents={documentsWithChunks} highlighted={highlighted} />
          </SheetContent>
        </Sheet>
      )}

      <div className="flex-1 space-y-6 overflow-y-auto px-4 py-6">
        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            onRegenerate={(id) => regenerate({ messageId: id, body: { documentIds } })}
            onFeedback={handleFeedback}
            onCitationClick={documentsWithChunks.length > 0 ? openDocumentAt : undefined}
          />
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="px-4 pb-4">
        {error && (
          <div className="mb-3 flex items-center gap-2 rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <AlertCircle className="size-4 shrink-0" />
            <span>
              Une erreur est survenue. Vérifie ton solde de crédits dans{" "}
              <Link href="/billing" className="underline">
                Crédits
              </Link>{" "}
              ou réessaie.
            </span>
          </div>
        )}
        {hiddenFileInput}
        <MessageInput
          value={input}
          onChange={setInput}
          onSubmit={handleSubmit}
          disabled={isBusy}
          attachMenu={attachMenu}
          chips={chips}
          onDropFiles={(files) => void uploadAndAttach(files[0])}
          onAtKey={() => setAttachMenuOpen(true)}
        />
        <p className="mt-2 text-center text-[11px] text-muted-foreground">
          BomaSchool peut faire des erreurs. Vérifie les informations importantes.
        </p>
      </div>
    </div>
  );
}
