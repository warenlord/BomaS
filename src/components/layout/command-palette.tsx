"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import {
  SquarePen,
  FileText,
  ListChecks,
  CreditCard,
  MessageSquare,
  Layers,
  NotebookPen,
  FileStack,
  ClipboardCheck,
} from "lucide-react";

const QUICK_ACTIONS = [
  { href: "/chat/new", label: "Nouvelle conversation", icon: SquarePen },
  { href: "/documents", label: "Documents", icon: FileText },
  { href: "/tools", label: "Outils", icon: ListChecks },
  { href: "/billing", label: "Crédits", icon: CreditCard },
];

const TOOLS = [
  { href: "/tools/qcm", label: "Créer un QCM", icon: ListChecks },
  { href: "/tools/flashcards", label: "Créer des flashcards", icon: Layers },
  { href: "/tools/summary", label: "Créer un résumé", icon: FileStack },
  { href: "/tools/revision-sheet", label: "Créer une fiche de révision", icon: NotebookPen },
  { href: "/tools/exam", label: "Préparer un examen", icon: ClipboardCheck },
];

export function CommandPalette({ conversations }: { conversations: { id: string; title: string }[] }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  function go(href: string) {
    setOpen(false);
    router.push(href);
  }

  return (
    <Command.Dialog
      open={open}
      onOpenChange={setOpen}
      label="Palette de commandes"
      overlayClassName="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px]"
      contentClassName="fixed top-[15%] left-1/2 z-50 w-full max-w-lg -translate-x-1/2 overflow-hidden rounded-2xl border border-border/60 bg-popover text-popover-foreground shadow-2xl"
    >
      <Command.Input
        placeholder="Rechercher une conversation, un outil..."
        className="w-full border-b border-border/60 bg-transparent px-4 py-3 text-sm outline-none placeholder:text-muted-foreground"
      />
      <Command.List className="max-h-80 overflow-y-auto p-2">
        <Command.Empty className="px-3 py-6 text-center text-sm text-muted-foreground">
          Aucun résultat.
        </Command.Empty>

        <Command.Group heading="Actions" className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
          {QUICK_ACTIONS.map((item) => (
            <Command.Item
              key={item.href}
              onSelect={() => go(item.href)}
              className="flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-foreground data-[selected=true]:bg-muted"
            >
              <item.icon className="size-4 text-muted-foreground" />
              {item.label}
            </Command.Item>
          ))}
        </Command.Group>

        <Command.Group heading="Outils" className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
          {TOOLS.map((item) => (
            <Command.Item
              key={item.href}
              onSelect={() => go(item.href)}
              className="flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-foreground data-[selected=true]:bg-muted"
            >
              <item.icon className="size-4 text-muted-foreground" />
              {item.label}
            </Command.Item>
          ))}
        </Command.Group>

        {conversations.length > 0 && (
          <Command.Group heading="Conversations récentes" className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
            {conversations.map((c) => (
              <Command.Item
                key={c.id}
                onSelect={() => go(`/chat/${c.id}`)}
                className="flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-foreground data-[selected=true]:bg-muted"
              >
                <MessageSquare className="size-4 text-muted-foreground" />
                <span className="truncate">{c.title}</span>
              </Command.Item>
            ))}
          </Command.Group>
        )}
      </Command.List>
    </Command.Dialog>
  );
}
