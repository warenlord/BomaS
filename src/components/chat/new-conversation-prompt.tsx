"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MessageInput } from "@/components/chat/message-input";
import { SuggestionChips } from "@/components/chat/suggestion-chips";

/**
 * Écran "nouvelle discussion" affiché sur /chat en desktop (la sidebar
 * couvre déjà la navigation dans l'historique, donc /chat n'a pas besoin de
 * le réafficher). Contrairement à /chat/new, visiter cet écran ne crée
 * aucune ligne en base : la discussion n'est créée qu'au premier envoi, via
 * la redirection vers /chat/new qui porte le message en query param.
 */
export function NewConversationPrompt({ greeting }: { greeting?: string }) {
  const [input, setInput] = useState("");
  const [isNavigating, setIsNavigating] = useState(false);
  const router = useRouter();

  function handleSubmit() {
    const text = input.trim();
    if (!text || isNavigating) return;
    setIsNavigating(true);
    router.push(`/chat/new?prompt=${encodeURIComponent(text)}`);
  }

  return (
    <div className="mx-auto flex h-screen max-w-3xl flex-col justify-center px-4 pb-24">
      <div className="flex flex-col items-center gap-8">
        <h1 className="text-center text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
          {greeting ?? "Qu'est-ce qu'on révise aujourd'hui ?"}
        </h1>

        <div className="w-full max-w-2xl space-y-5">
          <MessageInput value={input} onChange={setInput} onSubmit={handleSubmit} disabled={isNavigating} autoFocus />
          <SuggestionChips onSelect={setInput} />
        </div>
      </div>
    </div>
  );
}
