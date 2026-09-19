"use client";

import { useRef, type KeyboardEvent } from "react";
import { ArrowUp } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function MessageInput({
  value,
  onChange,
  onSubmit,
  disabled,
  placeholder = "Écris un message à BomaSchool...",
  autoFocus,
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (value.trim() && !disabled) onSubmit();
    }
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (value.trim() && !disabled) onSubmit();
      }}
      className={cn(
        "flex items-end gap-2 rounded-[28px] border border-border/60 bg-card p-2.5 pl-5 shadow-[0_2px_16px_-4px_rgba(0,0,0,0.08)] transition-shadow focus-within:border-border focus-within:shadow-[0_4px_24px_-4px_rgba(0,0,0,0.12)] dark:shadow-none",
      )}
    >
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        rows={1}
        autoFocus={autoFocus}
        className="max-h-52 min-h-7 flex-1 resize-none border-0 bg-transparent p-0 shadow-none focus-visible:ring-0 dark:bg-transparent"
      />
      <Button
        type="submit"
        size="icon"
        className="size-9 shrink-0 rounded-full"
        disabled={disabled || !value.trim()}
      >
        <ArrowUp className="size-4.5" />
      </Button>
    </form>
  );
}
