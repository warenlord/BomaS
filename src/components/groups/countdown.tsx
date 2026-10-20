"use client";

import { useEffect, useState } from "react";

/**
 * Compte à rebours dérivé entièrement de `deadlineAt`, sans aucun stockage
 * supplémentaire — même logique que le streak (dérivé à la volée plutôt que
 * stocké). Rafraîchi toutes les 30s, suffisant pour un délai de 24h.
 */
export function Countdown({ deadlineAt, className }: { deadlineAt: string; className?: string }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  const remainingMs = new Date(deadlineAt).getTime() - now;
  if (remainingMs <= 0) {
    return <span className={className}>Délai dépassé</span>;
  }

  const hours = Math.floor(remainingMs / (1000 * 60 * 60));
  const minutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));

  return (
    <span className={className}>
      {hours}h {minutes}min restantes
    </span>
  );
}
