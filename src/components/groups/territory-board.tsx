"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Countdown } from "@/components/groups/countdown";
import { cn } from "@/lib/utils";
import type { TerritoryBoardEntry } from "@/lib/groups/queries";

const ERROR_MESSAGES: Record<string, string> = {
  NOT_A_MEMBER: "Tu ne fais pas partie de ce groupe.",
  ALREADY_CLAIMED: "Quelqu'un vient de réclamer cette matière, réessaie-en une autre.",
};

export function TerritoryBoard({
  groupId,
  board,
  currentUserId,
  nameById,
}: {
  groupId: string;
  board: TerritoryBoardEntry[];
  currentUserId: string;
  nameById: Record<string, string | null>;
}) {
  const [claimingSubject, setClaimingSubject] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleClaim(subject: string) {
    setClaimingSubject(subject);
    setError(null);
    try {
      const res = await fetch("/api/territories/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupId, subject }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(ERROR_MESSAGES[data.error] ?? "Impossible de réclamer cette matière.");
        router.refresh();
        return;
      }
      router.push(`/groups/${groupId}/territory/${data.claimId}`);
    } catch {
      setError("Erreur réseau, réessaie.");
    } finally {
      setClaimingSubject(null);
    }
  }

  return (
    <div className="space-y-3">
      {error && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}

      <div className="grid gap-3 sm:grid-cols-2">
        {board.map(({ subject, claim }) => {
          const isMine = claim?.userId === currentUserId;
          const claimantName = claim ? (nameById[claim.userId] ?? "Un membre") : null;
          const available = !claim || claim.status === "expired";

          return (
            <div
              key={subject}
              className={cn(
                "rounded-2xl border p-4",
                claim?.status === "completed" ? "border-amber-400/40 bg-amber-400/5" : "border-border/60 bg-card",
              )}
            >
              <div className="mb-2 flex items-center justify-between">
                <p className="font-medium">{subject}</p>
                {claim?.status === "completed" && <CheckCircle2 className="size-4 text-amber-500" />}
                {claim?.status === "in_progress" && !isMine && <Lock className="size-4 text-muted-foreground" />}
              </div>

              {claim?.status === "completed" && (
                <div className="text-sm text-muted-foreground">
                  <p className="text-lg">{"⭐".repeat(claim.stars ?? 0)}</p>
                  <p>Conquis par {isMine ? "toi" : claimantName}</p>
                </div>
              )}

              {claim?.status === "in_progress" && (
                <div className="text-sm text-muted-foreground">
                  <p>{isMine ? "Réclamé par toi" : `Réclamé par ${claimantName}`}</p>
                  <Countdown deadlineAt={claim.deadlineAt} />
                  {isMine && (
                    <Button
                      size="sm"
                      className="mt-2 w-full"
                      onClick={() => router.push(`/groups/${groupId}/territory/${claim.id}`)}
                    >
                      Continuer
                    </Button>
                  )}
                </div>
              )}

              {available && (
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full"
                  disabled={claimingSubject === subject}
                  onClick={() => handleClaim(subject)}
                >
                  Réclamer (24h pour la conquérir)
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
