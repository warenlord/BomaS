"use client";

import { useRef, useState, type DragEvent, type KeyboardEvent, type ReactNode } from "react";
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
  attachMenu,
  chips,
  onDropFiles,
  onAtKey,
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
  placeholder?: string;
  autoFocus?: boolean;
  attachMenu?: ReactNode;
  chips?: ReactNode;
  onDropFiles?: (files: FileList) => void;
  onAtKey?: () => void;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (value.trim() && !disabled) onSubmit();
      return;
    }
    if (e.key === "@" && onAtKey) {
      const el = e.currentTarget;
      const before = el.value.slice(0, el.selectionStart ?? 0);
      if (before.length === 0 || /\s$/.test(before)) onAtKey();
    }
  }

  function handleDrop(e: DragEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsDragging(false);
    if (onDropFiles && e.dataTransfer.files.length > 0) onDropFiles(e.dataTransfer.files);
  }

  return (
    <div>
      {chips}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (value.trim() && !disabled) onSubmit();
        }}
        onDragOver={(e) => {
          e.preventDefault();
          if (onDropFiles) setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={cn(
          "flex items-end gap-1 rounded-[28px] border border-border/60 bg-card p-2.5 pl-2 shadow-[0_2px_16px_-4px_rgba(0,0,0,0.08)] transition-shadow focus-within:border-border focus-within:shadow-[0_4px_24px_-4px_rgba(0,0,0,0.12)] dark:shadow-none",
          isDragging && "border-primary bg-primary/5",
        )}
      >
        {attachMenu}
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isDragging ? "Dépose le fichier ici..." : placeholder}
          rows={1}
          autoFocus={autoFocus}
          className="max-h-52 min-h-7 flex-1 resize-none border-0 bg-transparent p-0 py-1.5 shadow-none focus-visible:ring-0 dark:bg-transparent"
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
    </div>
  );
}
