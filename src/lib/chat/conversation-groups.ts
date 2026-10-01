export interface SidebarConversation {
  id: string;
  title: string;
  document_id: string | null;
  pinned: boolean;
  updated_at: string;
}

export interface ConversationGroup {
  label: string;
  items: SidebarConversation[];
}

/** Regroupe les conversations par ancienneté — utilisé par la sidebar ET la page /chat. */
export function groupConversationsByDate(conversations: SidebarConversation[]): ConversationGroup[] {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const sevenDaysAgo = new Date(startOfToday.getTime() - 7 * 24 * 60 * 60 * 1000);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const groups: ConversationGroup[] = [
    { label: "Aujourd'hui", items: [] },
    { label: "7 derniers jours", items: [] },
    { label: "Ce mois-ci", items: [] },
    { label: "Plus ancien", items: [] },
  ];

  for (const c of conversations) {
    const updatedAt = new Date(c.updated_at);
    if (updatedAt >= startOfToday) groups[0].items.push(c);
    else if (updatedAt >= sevenDaysAgo) groups[1].items.push(c);
    else if (updatedAt >= startOfMonth) groups[2].items.push(c);
    else groups[3].items.push(c);
  }

  return groups.filter((g) => g.items.length > 0);
}
