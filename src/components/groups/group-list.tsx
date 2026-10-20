"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Users, Plus, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { StudyGroupSummary } from "@/lib/groups/queries";

export function GroupList({ groups }: { groups: StudyGroupSummary[] }) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleCreate() {
    const trimmed = name.trim();
    if (!trimmed) return;
    setIsCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError("Impossible de créer le groupe. Réessaie.");
        return;
      }
      router.push(`/groups/${data.groupId}`);
    } catch {
      setError("Erreur réseau, réessaie.");
    } finally {
      setIsCreating(false);
    }
  }

  function handleJoin() {
    const trimmed = code.trim();
    if (!trimmed) return;
    router.push(`/groups/join/${encodeURIComponent(trimmed)}`);
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-border/60 bg-card p-4">
          <p className="mb-2 text-sm font-medium">Créer un groupe</p>
          <div className="flex gap-2">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nom du groupe"
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            />
            <Button onClick={handleCreate} disabled={!name.trim() || isCreating}>
              <Plus className="size-4" />
            </Button>
          </div>
        </div>

        <div className="rounded-2xl border border-border/60 bg-card p-4">
          <p className="mb-2 text-sm font-medium">Rejoindre via code</p>
          <div className="flex gap-2">
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="Code d'invitation"
              onKeyDown={(e) => e.key === "Enter" && handleJoin()}
            />
            <Button onClick={handleJoin} disabled={!code.trim()} variant="outline">
              <ArrowRight className="size-4" />
            </Button>
          </div>
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {groups.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border py-16 text-center text-muted-foreground">
          <Users className="size-8" />
          <p className="text-sm">Tu ne fais encore partie d&apos;aucun groupe.</p>
        </div>
      ) : (
        <div className="space-y-1 rounded-xl border border-border/60 bg-card p-1.5">
          {groups.map((group) => (
            <Link
              key={group.id}
              href={`/groups/${group.id}`}
              className="flex items-center justify-between rounded-lg px-3 py-2.5 text-sm hover:bg-muted/50"
            >
              <span className="font-medium">{group.name}</span>
              <span className="text-xs text-muted-foreground">
                {group.memberCount} membre{group.memberCount > 1 ? "s" : ""}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
