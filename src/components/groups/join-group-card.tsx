"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Users } from "lucide-react";
import { Button } from "@/components/ui/button";

export function JoinGroupCard({
  inviteCode,
  groupName,
  memberCount,
}: {
  inviteCode: string;
  groupName: string;
  memberCount: number;
}) {
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleJoin() {
    setIsJoining(true);
    setError(null);
    try {
      const res = await fetch("/api/groups/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteCode }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error === "GROUP_FULL" ? "Ce groupe est déjà complet (30 membres)." : "Impossible de rejoindre ce groupe.");
        return;
      }
      router.push(`/groups/${data.groupId}`);
    } catch {
      setError("Erreur réseau, réessaie.");
    } finally {
      setIsJoining(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl border border-border/60 bg-card p-6 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Users className="size-6" />
      </span>
      <div>
        <h1 className="text-lg font-semibold">{groupName}</h1>
        <p className="text-sm text-muted-foreground">
          {memberCount} membre{memberCount > 1 ? "s" : ""}
        </p>
      </div>
      <Button onClick={handleJoin} disabled={isJoining} className="w-full">
        Rejoindre le groupe
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
