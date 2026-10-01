"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MessageInput } from "@/components/chat/message-input";
import { SuggestionChips } from "@/components/chat/suggestion-chips";
import { DocumentAttachMenu } from "@/components/chat/document-attach-menu";
import type { PickerDocument } from "@/components/tools/document-picker";

/**
 * Écran "nouvelle discussion" affiché sur /chat en desktop (la sidebar
 * couvre déjà la navigation dans l'historique, donc /chat n'a pas besoin de
 * le réafficher). Contrairement à /chat/new, visiter cet écran ne crée
 * aucune ligne en base : la discussion n'est créée qu'à la première action
 * réelle (document choisi, import, ou envoi d'un message), via /chat/new
 * qui porte le document et/ou le message en query params.
 */
export function NewConversationPrompt({
  greeting,
  documents,
}: {
  greeting?: string;
  documents: PickerDocument[];
}) {
  const [input, setInput] = useState("");
  const [attachMenuOpen, setAttachMenuOpen] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const router = useRouter();

  function goToNewConversation(params: { documentId?: string; prompt?: string }) {
    if (isNavigating) return;
    setIsNavigating(true);
    const qs = new URLSearchParams();
    if (params.documentId) qs.set("documentId", params.documentId);
    if (params.prompt) qs.set("prompt", params.prompt);
    const query = qs.toString();
    router.push(`/chat/new${query ? `?${query}` : ""}`);
  }

  function handleSubmit() {
    const text = input.trim();
    if (!text || isNavigating) return;
    goToNewConversation({ prompt: text });
  }

  return (
    <div className="mx-auto flex h-screen max-w-3xl flex-col justify-center px-4 pb-24">
      <div className="flex flex-col items-center gap-8">
        <h1 className="text-center text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
          {greeting ?? "Qu'est-ce qu'on révise aujourd'hui ?"}
        </h1>

        <div className="w-full max-w-2xl space-y-5">
          <MessageInput
            value={input}
            onChange={setInput}
            onSubmit={handleSubmit}
            disabled={isNavigating}
            autoFocus
            attachMenu={
              <DocumentAttachMenu
                documents={documents}
                open={attachMenuOpen}
                onOpenChange={setAttachMenuOpen}
                onSelect={(doc) => goToNewConversation({ documentId: doc.id, prompt: input.trim() || undefined })}
                onImportClick={() => goToNewConversation({ prompt: input.trim() || undefined })}
              />
            }
            onAtKey={() => setAttachMenuOpen(true)}
          />
          <SuggestionChips onSelect={setInput} />
        </div>
      </div>
    </div>
  );
}
