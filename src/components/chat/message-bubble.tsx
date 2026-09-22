"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { FileText, Copy, Check, RotateCcw, ThumbsUp, ThumbsDown } from "lucide-react";
import { Markdown } from "@/components/chat/markdown";
import { cn } from "@/lib/utils";
import type { ChatUIMessage } from "@/lib/chat/format";

export function MessageBubble({
  message,
  onRegenerate,
  onFeedback,
  onCitationClick,
}: {
  message: ChatUIMessage;
  onRegenerate?: (messageId: string) => void;
  onFeedback?: (messageId: string, feedback: "up" | "down") => void;
  onCitationClick?: (chunkIndex: number) => void;
}) {
  const isUser = message.role === "user";
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<"up" | "down" | null>(null);
  const text = message.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("");
  const citations = message.metadata?.citations ?? [];

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Impossible de copier.");
    }
  }

  function handleFeedback(value: "up" | "down") {
    setFeedback(value);
    onFeedback?.(message.id, value);
  }

  if (isUser) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="flex justify-end"
      >
        <p className="max-w-[85%] rounded-3xl bg-muted px-4 py-2.5 text-[15px] leading-relaxed whitespace-pre-wrap sm:max-w-[75%]">
          {text}
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="group w-full"
    >
      {text ? (
        <Markdown>{text}</Markdown>
      ) : (
        <span className="flex gap-1 py-1 text-muted-foreground">
          <span className="size-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.3s]" />
          <span className="size-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.15s]" />
          <span className="size-1.5 animate-bounce rounded-full bg-current" />
        </span>
      )}

      {citations.length > 0 && (
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {citations.map((c) =>
            onCitationClick ? (
              <button
                key={c.chunkIndex}
                type="button"
                title={c.excerpt}
                onClick={() => onCitationClick(c.chunkIndex)}
                className="inline-flex items-center gap-1 rounded-full border border-border/60 px-2 py-0.5 text-[11px] font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
              >
                <FileText className="size-3" />
                Extrait {c.chunkIndex + 1}
              </button>
            ) : (
              <span
                key={c.chunkIndex}
                title={c.excerpt}
                className="inline-flex items-center gap-1 rounded-full border border-border/60 px-2 py-0.5 text-[11px] font-medium text-muted-foreground"
              >
                <FileText className="size-3" />
                Extrait {c.chunkIndex + 1}
              </span>
            ),
          )}
        </div>
      )}

      {text && (
        <div className="mt-1.5 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
          <button
            type="button"
            onClick={handleCopy}
            aria-label="Copier la réponse"
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
          </button>
          {onRegenerate && (
            <button
              type="button"
              onClick={() => onRegenerate(message.id)}
              aria-label="Régénérer la réponse"
              className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <RotateCcw className="size-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={() => handleFeedback("up")}
            aria-label="Bonne réponse"
            aria-pressed={feedback === "up"}
            className={cn(
              "rounded-md p-1.5 hover:bg-muted",
              feedback === "up" ? "text-primary" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <ThumbsUp className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={() => handleFeedback("down")}
            aria-label="Mauvaise réponse"
            aria-pressed={feedback === "down"}
            className={cn(
              "rounded-md p-1.5 hover:bg-muted",
              feedback === "down" ? "text-destructive" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <ThumbsDown className="size-3.5" />
          </button>
        </div>
      )}
    </motion.div>
  );
}
