"use client";

import { Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function InviteCodeCard({ inviteCode }: { inviteCode: string }) {
  async function copyLink() {
    const url = `${window.location.origin}/groups/join/${inviteCode}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Lien d'invitation copié !");
    } catch {
      toast.error("Impossible de copier le lien.");
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={copyLink}>
      <Copy className="size-3.5" />
      Code : {inviteCode}
    </Button>
  );
}
