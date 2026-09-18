"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CheckoutButton({
  kind,
  code,
  label,
  variant = "default",
}: {
  kind: "subscription" | "credit_pack";
  code: string;
  label: string;
  variant?: "default" | "outline";
}) {
  const [isLoading, setIsLoading] = useState(false);

  async function handleClick() {
    setIsLoading(true);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          kind === "subscription" ? { kind, planCode: code } : { kind, packCode: code },
        ),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error("Impossible de lancer le paiement pour le moment.");
        return;
      }

      if (data.configured === false) {
        toast.info(data.message);
        return;
      }

      window.location.href = data.checkoutUrl;
    } catch {
      toast.error("Erreur réseau, réessaie.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Button onClick={handleClick} disabled={isLoading} variant={variant} className="w-full">
      {isLoading && <Loader2 className="size-4 animate-spin" />}
      {label}
    </Button>
  );
}
