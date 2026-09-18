"use client";

import { useMemo, useState } from "react";
import type { DeepPartial } from "ai";
import { motion } from "framer-motion";
import type { FlashcardsContent } from "@/lib/ai/prompts";

type PartialFlashcards = DeepPartial<FlashcardsContent>;

function Flashcard({ front, back }: { front: string; back: string }) {
  const [flipped, setFlipped] = useState(false);

  return (
    <button
      type="button"
      onClick={() => setFlipped((f) => !f)}
      className="h-40 w-full [perspective:1000px]"
    >
      <motion.div
        className="relative h-full w-full rounded-2xl [transform-style:preserve-3d]"
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="absolute inset-0 flex items-center justify-center rounded-2xl border border-border/60 bg-card p-4 text-center text-sm font-medium [backface-visibility:hidden]">
          {front}
        </div>
        <div
          className="absolute inset-0 flex items-center justify-center rounded-2xl border border-primary/30 bg-primary/5 p-4 text-center text-sm [backface-visibility:hidden]"
          style={{ transform: "rotateY(180deg)" }}
        >
          {back}
        </div>
      </motion.div>
    </button>
  );
}

export function FlashcardsView({ object }: { object: PartialFlashcards | undefined }) {
  const cards = useMemo(
    () => (object?.cards ?? []).filter((c): c is { front: string; back: string } => Boolean(c?.front && c?.back)),
    [object],
  );

  if (cards.length === 0) return null;

  return (
    <div className="space-y-4">
      {object?.title && <h2 className="font-semibold">{object.title}</h2>}
      <p className="text-xs text-muted-foreground">Clique sur une carte pour voir la réponse.</p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {cards.map((card, i) => (
          <Flashcard key={i} front={card.front} back={card.back} />
        ))}
      </div>
    </div>
  );
}
