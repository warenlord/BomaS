"use client";

import { useEffect, useMemo, useState } from "react";
import type { DeepPartial } from "ai";
import { motion, AnimatePresence } from "framer-motion";
import { RotateCcw, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { FlashcardsContent } from "@/lib/ai/prompts";

type PartialFlashcards = DeepPartial<FlashcardsContent>;
type Card = { front: string; back: string };

function FlipCard({ front, back, flipped, onFlip }: { front: string; back: string; flipped: boolean; onFlip: () => void }) {
  return (
    <button type="button" onClick={onFlip} className="h-64 w-full [perspective:1200px] sm:h-72">
      <motion.div
        className="relative h-full w-full rounded-2xl [transform-style:preserve-3d]"
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="absolute inset-0 flex items-center justify-center rounded-2xl border border-border/60 bg-card p-6 text-center text-base font-medium [backface-visibility:hidden]">
          {front}
        </div>
        <div
          className="absolute inset-0 flex items-center justify-center rounded-2xl border border-primary/30 bg-primary/5 p-6 text-center text-sm [backface-visibility:hidden]"
          style={{ transform: "rotateY(180deg)" }}
        >
          {back}
        </div>
      </motion.div>
    </button>
  );
}

export function FlashcardsView({ object, savedId }: { object: PartialFlashcards | undefined; savedId: string | null }) {
  const allCards = useMemo(
    () => (object?.cards ?? []).filter((c): c is Card => Boolean(c?.front && c?.back)),
    [object],
  );

  const [deck, setDeck] = useState<Card[] | null>(null);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [known, setKnown] = useState<Card[]>([]);
  const [toReview, setToReview] = useState<Card[]>([]);

  // `savedId` n'est renseigné qu'une fois la génération terminée ET persistée
  // (voir generator-workspace.tsx) : on attend ce signal avant de figer le
  // paquet de la session, sinon les cartes qui arrivent en cours de streaming
  // après la première apparaîtraient manquantes (le deck n'était initialisé
  // qu'une fois, au premier rendu non vide).
  useEffect(() => {
    if (savedId && allCards.length > 0 && deck === null) setDeck(allCards);
  }, [savedId, allCards, deck]);

  const current = deck?.[index];
  const isFinished = deck !== null && index >= deck.length;

  function advance(result: "known" | "review") {
    if (!current) return;
    if (result === "known") setKnown((prev) => [...prev, current]);
    else setToReview((prev) => [...prev, current]);
    setFlipped(false);
    setIndex((i) => i + 1);
  }

  function restart(cards: Card[]) {
    setDeck(cards);
    setIndex(0);
    setFlipped(false);
    setKnown([]);
    setToReview([]);
  }

  useEffect(() => {
    if (!deck || isFinished) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.target instanceof HTMLElement && ["INPUT", "TEXTAREA"].includes(e.target.tagName)) return;
      if (e.key === " ") {
        e.preventDefault();
        setFlipped((f) => !f);
      } else if (e.key === "ArrowRight") {
        advance("known");
      } else if (e.key === "ArrowLeft") {
        advance("review");
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deck, index, isFinished, current]);

  if (allCards.length === 0) return null;

  if (!deck) {
    // Encore en cours de génération (streaming) : simple aperçu progressif,
    // la session interactive (flip, clavier, score) ne démarre qu'une fois
    // le paquet complet et sauvegardé.
    return (
      <div className="space-y-4">
        {object?.title && <h2 className="font-semibold">{object.title}</h2>}
        <p className="text-xs text-muted-foreground">
          Génération en cours... {allCards.length} carte{allCards.length > 1 ? "s" : ""} pour l&apos;instant.
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {allCards.map((card, i) => (
            <div key={i} className="rounded-2xl border border-border/60 bg-card p-4 text-sm">
              <p className="font-medium">{card.front}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (isFinished) {
    return (
      <div className="space-y-4">
        {object?.title && <h2 className="font-semibold">{object.title}</h2>}
        <div className="rounded-2xl border border-primary/30 bg-primary/5 p-6 text-center">
          <p className="text-2xl font-bold text-primary">
            {known.length} / {deck.length}
          </p>
          <p className="text-sm text-muted-foreground">Cartes maîtrisées</p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button onClick={() => restart(allCards)} variant="outline" className="flex-1">
            <RotateCcw className="size-4" />
            Recommencer tout le paquet
          </Button>
          {toReview.length > 0 && (
            <Button onClick={() => restart(toReview)} className="flex-1">
              Revoir les {toReview.length} carte{toReview.length > 1 ? "s" : ""} difficile{toReview.length > 1 ? "s" : ""}
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {object?.title && <h2 className="font-semibold">{object.title}</h2>}

      <div className="space-y-1.5">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <motion.div
            className="h-full rounded-full bg-primary"
            initial={false}
            animate={{ width: `${(index / deck.length) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          {index + 1} / {deck.length}
        </p>
      </div>

      <AnimatePresence mode="wait">
        {current && (
          <motion.div
            key={index}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            <FlipCard front={current.front} back={current.back} flipped={flipped} onFlip={() => setFlipped((f) => !f)} />
          </motion.div>
        )}
      </AnimatePresence>

      <p className="text-center text-xs text-muted-foreground">
        Espace pour retourner · ← À revoir · → Maîtrisé
      </p>

      <div className="flex gap-2">
        <Button onClick={() => advance("review")} variant="outline" className="flex-1">
          <X className="size-4" />
          À revoir
        </Button>
        <Button onClick={() => advance("known")} className="flex-1">
          <Check className="size-4" />
          Maîtrisé
        </Button>
      </div>
    </div>
  );
}
