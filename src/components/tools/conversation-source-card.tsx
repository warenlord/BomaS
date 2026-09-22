"use client";

import { MessageSquare } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

export interface ConversationSource {
  id: string;
  title: string;
}

export function ConversationSourceCard({
  title,
  checked,
  onChange,
}: {
  title: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="mb-3 flex cursor-pointer items-center gap-2.5 rounded-xl border border-border/60 bg-card px-3 py-2.5 text-sm hover:bg-muted/40">
      <Checkbox checked={checked} onCheckedChange={(value) => onChange(Boolean(value))} />
      <MessageSquare className="size-4 shrink-0 text-primary" />
      <span className="truncate">
        Discussion : <span className="font-medium">{title}</span>
      </span>
    </label>
  );
}
