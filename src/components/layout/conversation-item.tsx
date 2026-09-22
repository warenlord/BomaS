"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { toast } from "sonner";
import { FileText, MessageSquare, MoreHorizontal, Pencil, Pin, PinOff, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { SidebarConversation } from "@/components/layout/app-sidebar";

export function ConversationItem({ conversation }: { conversation: SidebarConversation }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(conversation.title);
  const active = pathname === `/chat/${conversation.id}`;
  const Icon = conversation.document_id ? FileText : MessageSquare;

  async function saveTitle() {
    setIsEditing(false);
    const trimmed = title.trim();
    if (!trimmed || trimmed === conversation.title) {
      setTitle(conversation.title);
      return;
    }
    const res = await fetch(`/api/conversations/${conversation.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: trimmed }),
    });
    if (res.ok) router.refresh();
    else toast.error("Impossible de renommer la conversation.");
  }

  async function togglePin() {
    const res = await fetch(`/api/conversations/${conversation.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pinned: !conversation.pinned }),
    });
    if (res.ok) router.refresh();
    else toast.error("Action impossible.");
  }

  async function handleDelete() {
    const res = await fetch(`/api/conversations/${conversation.id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Conversation supprimée.");
      if (active) router.push("/chat/new");
      router.refresh();
    } else {
      toast.error("Impossible de supprimer cette conversation.");
    }
  }

  if (isEditing) {
    return (
      <input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={saveTitle}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
          if (e.key === "Escape") {
            setTitle(conversation.title);
            setIsEditing(false);
          }
        }}
        className="w-full rounded-lg border border-sidebar-ring bg-sidebar px-3 py-2 text-sm text-sidebar-foreground outline-none"
      />
    );
  }

  return (
    <div
      className={cn(
        "group/item flex items-center rounded-lg pr-1 text-sm transition-colors",
        active ? "bg-sidebar-accent text-sidebar-accent-foreground" : "hover:bg-sidebar-accent",
      )}
    >
      <Link href={`/chat/${conversation.id}`} className="flex min-w-0 flex-1 items-center gap-2.5 py-2 pl-3">
        <Icon
          className={cn(
            "size-3.5 shrink-0 opacity-70",
            active ? "text-sidebar-accent-foreground" : "text-sidebar-foreground/70",
          )}
        />
        <span className={cn("truncate", active ? "text-sidebar-accent-foreground" : "text-sidebar-foreground/70")}>
          {conversation.title}
        </span>
        {conversation.pinned && <Pin className="size-3 shrink-0 text-sidebar-foreground/40" />}
      </Link>

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <button
              type="button"
              aria-label="Actions sur la conversation"
              className="shrink-0 rounded-md p-1 text-sidebar-foreground/50 opacity-0 hover:bg-sidebar-accent hover:text-sidebar-foreground group-hover/item:opacity-100 data-[popup-open]:opacity-100"
            />
          }
        >
          <MoreHorizontal className="size-3.5" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem
            render={
              <button type="button" onClick={() => setIsEditing(true)} className="flex w-full items-center gap-1.5" />
            }
          >
            <Pencil className="size-4" />
            Renommer
          </DropdownMenuItem>
          <DropdownMenuItem
            render={<button type="button" onClick={togglePin} className="flex w-full items-center gap-1.5" />}
          >
            {conversation.pinned ? <PinOff className="size-4" /> : <Pin className="size-4" />}
            {conversation.pinned ? "Désépingler" : "Épingler"}
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            render={<button type="button" onClick={handleDelete} className="flex w-full items-center gap-1.5" />}
          >
            <Trash2 className="size-4" />
            Supprimer
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
