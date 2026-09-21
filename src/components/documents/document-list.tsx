"use client";

import { useMemo, useState } from "react";
import { FileText } from "lucide-react";
import { DocumentStatusBadge } from "@/components/documents/status-badge";
import { DocumentActions } from "@/components/documents/document-actions";
import { formatDateShort } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Database } from "@/lib/types/database.types";

type DocumentRow = Database["public"]["Tables"]["documents"]["Row"];

export function DocumentList({ documents }: { documents: DocumentRow[] }) {
  const [activeSubject, setActiveSubject] = useState<string | null>(null);

  const subjects = useMemo(() => {
    const set = new Set<string>();
    for (const doc of documents) {
      if (doc.subject) set.add(doc.subject);
    }
    return [...set];
  }, [documents]);

  const filtered = activeSubject ? documents.filter((d) => d.subject === activeSubject) : documents;

  if (documents.length === 0) {
    return (
      <div className="mt-8 flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border py-16 text-center text-muted-foreground">
        <FileText className="size-8" />
        <p className="text-sm">Importe ton premier cours en PDF ou Word.</p>
      </div>
    );
  }

  return (
    <div className="mt-6">
      {subjects.length > 1 && (
        <div className="mb-4 flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setActiveSubject(null)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              activeSubject === null ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-muted",
            )}
          >
            Tout
          </button>
          {subjects.map((subject) => (
            <button
              key={subject}
              type="button"
              onClick={() => setActiveSubject(subject)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                activeSubject === subject
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border hover:bg-muted",
              )}
            >
              {subject}
            </button>
          ))}
        </div>
      )}

      <ul className="space-y-2">
        {filtered.map((doc) => (
          <li
            key={doc.id}
            className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-card px-4 py-3"
          >
            <div className="flex min-w-0 items-center gap-3">
              <FileText className="size-5 shrink-0 text-primary" />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{doc.title}</p>
                <p className="text-xs text-muted-foreground">
                  {doc.subject && <span className="font-medium text-foreground/70">{doc.subject} · </span>}
                  {formatDateShort(doc.created_at)}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <DocumentStatusBadge status={doc.status} />
              <DocumentActions documentId={doc.id} ready={doc.status === "ready"} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
