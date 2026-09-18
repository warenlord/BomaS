"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  MessageSquare,
  Sparkles,
  ListChecks,
  Layers,
  NotebookPen,
  ClipboardCheck,
  MoreVertical,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function DocumentActions({ documentId, ready }: { documentId: string; ready: boolean }) {
  const router = useRouter();

  async function handleDelete() {
    const res = await fetch(`/api/documents/${documentId}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Document supprimé.");
      router.refresh();
    } else {
      toast.error("Impossible de supprimer ce document.");
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label="Actions" />}>
        <MoreVertical className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem
          disabled={!ready}
          render={
            <Link href={`/chat/new?documentId=${documentId}`}>
              <MessageSquare className="size-4" />
              Discuter du document
            </Link>
          }
        />
        <DropdownMenuItem
          disabled={!ready}
          render={
            <Link
              href={`/chat/new?documentId=${documentId}&prompt=${encodeURIComponent(
                "Explique-moi ce document de façon simple, comme si je découvrais le sujet.",
              )}`}
            >
              <Sparkles className="size-4" />
              Expliquer simplement
            </Link>
          }
        />
        <DropdownMenuSeparator />
        <DropdownMenuItem
          disabled={!ready}
          render={
            <Link href={`/tools/summary?documentId=${documentId}`}>
              <NotebookPen className="size-4" />
              Résumer
            </Link>
          }
        />
        <DropdownMenuItem
          disabled={!ready}
          render={
            <Link href={`/tools/qcm?documentId=${documentId}`}>
              <ListChecks className="size-4" />
              Créer un QCM
            </Link>
          }
        />
        <DropdownMenuItem
          disabled={!ready}
          render={
            <Link href={`/tools/flashcards?documentId=${documentId}`}>
              <Layers className="size-4" />
              Créer des flashcards
            </Link>
          }
        />
        <DropdownMenuItem
          disabled={!ready}
          render={
            <Link href={`/tools/exam?documentId=${documentId}`}>
              <ClipboardCheck className="size-4" />
              Préparer un examen
            </Link>
          }
        />
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" render={<button type="button" onClick={handleDelete} className="flex w-full items-center gap-1.5" />}>
          <Trash2 className="size-4" />
          Supprimer
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
