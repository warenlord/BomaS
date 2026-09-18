"use client";

import { useRef, type KeyboardEvent } from "react";
import { ArrowUp } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

export function MessageInput({
  value,
  onChange,
  onSubmit,
  disabled,
  placeholder = "Écris ta question...",
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
  placeholder?: string;
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
      className="flex items-end gap-2 rounded-2xl border border-border/60 bg-card p-2 shadow-sm"
    >
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        rows={1}
        className="max-h-40 min-h-10 flex-1 resize-none border-0 shadow-none focus-visible:ring-0"
      />
      <Button type="submit" size="icon" disabled={disabled || !value.trim()}>
        <ArrowUp className="size-4" />
      </Button>
    </form>
  );
}
