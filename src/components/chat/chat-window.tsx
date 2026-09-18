"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { AlertCircle, MessageSquare } from "lucide-react";
import { MessageBubble } from "@/components/chat/message-bubble";
import { MessageInput } from "@/components/chat/message-input";
import type { ChatUIMessage } from "@/lib/chat/format";

export function ChatWindow({
  conversationId,
  documentId,
  documentTitle,
  initialMessages,
  autoSendText,
}: {
  conversationId: string;
  documentId?: string | null;
  documentTitle?: string | null;
  initialMessages: ChatUIMessage[];
  autoSendText?: string;
}) {
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const autoSentRef = useRef(false);

  const { messages, sendMessage, status, error } = useChat<ChatUIMessage>({
    id: conversationId,
    messages: initialMessages,
    transport: new DefaultChatTransport({
      api: "/api/chat",
      body: { conversationId, documentId: documentId ?? undefined },
    }),
  });

  const isBusy = status === "submitted" || status === "streaming";

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

  return (
    <div className="mx-auto flex h-[calc(100vh-3.5rem)] max-w-3xl flex-col px-4 md:h-[calc(100vh-4rem)]">
      {documentTitle && (
        <div className="flex items-center gap-2 border-b border-border/60 py-3 text-sm text-muted-foreground">
          <MessageSquare className="size-4" />
          Discussion à propos de <span className="font-medium text-foreground">{documentTitle}</span>
        </div>
      )}

      <div className="flex-1 space-y-4 overflow-y-auto py-4">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-muted-foreground">
            <MessageSquare className="size-8" />
            <p className="text-sm">Pose ta première question pour commencer.</p>
          </div>
        )}

        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
        <div ref={bottomRef} />
      </div>

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

      <div className="pb-4">
        <MessageInput value={input} onChange={setInput} onSubmit={handleSubmit} disabled={isBusy} />
      </div>
    </div>
  );
}
