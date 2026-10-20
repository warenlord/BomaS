import { MessageSquare, FileText, Sparkles, Users, CreditCard } from "lucide-react";

export const APP_NAV_ITEMS = [
  { href: "/chat", label: "Chat", icon: MessageSquare },
  { href: "/documents", label: "Documents", icon: FileText },
  { href: "/tools", label: "Outils", icon: Sparkles },
  { href: "/groups", label: "Groupes", icon: Users },
  { href: "/billing", label: "Crédits", icon: CreditCard },
] as const;
