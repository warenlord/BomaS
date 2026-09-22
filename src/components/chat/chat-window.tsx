"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { AlertCircle, FileText, Sparkles, ListChecks, Layers, NotebookPen, FileStack, ClipboardCheck } from "lucide-react";
import { MessageBubble } from "@/components/chat/message-bubble";
import { MessageInput } from "@/components/chat/message-input";
import { SuggestionChips } from "@/components/chat/suggestion-chips";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ChatUIMessage } from "@/lib/chat/format";

const TOOLS_FROM_DISCUSSION = [
  { href: "qcm", icon: ListChecks, label: "Créer un QCM" },
  { href: "flashcards", icon: Layers, label: "Créer des flashcards" },
  { href: "summary", icon: FileStack, label: "Créer un résumé" },
  { href: "revision-sheet", icon: NotebookPen, label: "Créer une fiche de révision" },
  { href: "exam", icon: ClipboardCheck, label: "Préparer un examen" },
];

export function ChatWindow({
  conversationId,
  documentId,
  documentTitle,
  initialMessages,
  autoSendText,
  greeting,
}: {
  conversationId: string;
  documentId?: string | null;
  documentTitle?: string | null;
  initialMessages: ChatUIMessage[];
  autoSendText?: string;
  greeting?: string;
}) {
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const autoSentRef = useRef(false);
  const router = useRouter();

  const { messages, sendMessage, status, error } = useChat<ChatUIMessage>({
    id: conversationId,
    messages: initialMessages,
    transport: new DefaultChatTransport({
      api: "/api/chat",
      body: { conversationId, documentId: documentId ?? undefined },
    }),
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
      sendMessage({ text: autoSendText });
    }
  }, [autoSendText, sendMessage]);

  function handleSubmit() {
    const text = input;
    setInput("");
    sendMessage({ text });
  }

  if (isEmpty) {
    return (
      <div className="mx-auto flex h-[calc(100vh-3.5rem)] max-w-3xl flex-col justify-center px-4 pb-24 md:h-screen">
        <div className="flex flex-col items-center gap-8">
          <h1 className="text-center text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
            {greeting ?? "Qu'est-ce qu'on révise aujourd'hui ?"}
          </h1>

          <div className="w-full max-w-2xl space-y-5">
            <MessageInput value={input} onChange={setInput} onSubmit={handleSubmit} disabled={isBusy} autoFocus />
            {!documentId && <SuggestionChips onSelect={setInput} />}
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
        {documentTitle ? (
          <span className="flex min-w-0 items-center gap-2 truncate">
            <FileText className="size-4 shrink-0 text-primary" />
            À propos de <span className="font-medium text-foreground">{documentTitle}</span>
          </span>
        ) : (
          <span />
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

      <div className="flex-1 space-y-6 overflow-y-auto px-4 py-6">
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
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
        <MessageInput value={input} onChange={setInput} onSubmit={handleSubmit} disabled={isBusy} />
        <p className="mt-2 text-center text-[11px] text-muted-foreground">
          BomaSchool peut faire des erreurs. Vérifie les informations importantes.
        </p>
      </div>
    </div>
  );
}
