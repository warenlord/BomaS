"use client";

import { useEffect, useRef } from "react";
import { Command } from "cmdk";
import { Paperclip, FileText, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PickerDocument } from "@/components/tools/document-picker";

export function DocumentAttachMenu({
  documents,
  open,
  onOpenChange,
  onSelect,
  onImportClick,
}: {
  documents: PickerDocument[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (doc: PickerDocument) => void;
  onImportClick: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const setOpen = onOpenChange;

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open, setOpen]);

  return (
    <div ref={containerRef} className="relative">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-9 shrink-0 rounded-full"
        aria-label="Joindre un document"
        onClick={() => setOpen(!open)}
      >
        <Paperclip className="size-4.5" />
      </Button>

      {open && (
        <Command className="absolute bottom-full left-0 z-20 mb-2 w-72 overflow-hidden rounded-2xl border border-border/60 bg-popover text-popover-foreground shadow-xl">
          <Command.Input
            autoFocus
            placeholder="Chercher un document (@)..."
            className="w-full border-b border-border/60 bg-transparent px-3 py-2.5 text-sm outline-none placeholder:text-muted-foreground"
          />
          <Command.List className="max-h-60 overflow-y-auto p-1.5">
            <Command.Empty className="px-3 py-4 text-center text-xs text-muted-foreground">
              Aucun document trouvé.
            </Command.Empty>
            {documents.map((doc) => (
              <Command.Item
                key={doc.id}
                value={doc.title}
                onSelect={() => {
                  onSelect(doc);
                  setOpen(false);
                }}
                className="flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-sm data-[selected=true]:bg-muted"
              >
                <FileText className="size-3.5 shrink-0 text-primary" />
                <span className="truncate">{doc.title}</span>
              </Command.Item>
            ))}
            <Command.Item
              value="importer un nouveau fichier"
              onSelect={() => {
                setOpen(false);
                onImportClick();
              }}
              className="flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-primary data-[selected=true]:bg-muted"
            >
              <Upload className="size-3.5 shrink-0" />
              Importer un nouveau fichier
            </Command.Item>
          </Command.List>
        </Command>
      )}
    </div>
  );
}
