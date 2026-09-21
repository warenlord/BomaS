"use client";

import { Checkbox } from "@/components/ui/checkbox";

export interface PickerDocument {
  id: string;
  title: string;
  subject: string | null;
}

export function DocumentPicker({
  documents,
  selectedIds,
  onChange,
}: {
  documents: PickerDocument[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}) {
  if (documents.length === 0) return null;

  const groups = new Map<string, PickerDocument[]>();
  for (const doc of documents) {
    const key = doc.subject || "Non classé";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(doc);
  }

  function toggle(id: string) {
    onChange(selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id]);
  }

  return (
    <div className="mb-4 max-h-64 space-y-3 overflow-y-auto rounded-xl border border-border/60 bg-card p-3">
      {[...groups.entries()].map(([subject, docs]) => (
        <div key={subject}>
          <p className="mb-1.5 px-2 text-xs font-semibold text-muted-foreground">{subject}</p>
          <div className="space-y-0.5">
            {docs.map((doc) => (
              <label
                key={doc.id}
                className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm hover:bg-muted/50"
              >
                <Checkbox checked={selectedIds.includes(doc.id)} onCheckedChange={() => toggle(doc.id)} />
                <span className="truncate">{doc.title}</span>
              </label>
            ))}
          </div>
        </div>
      ))}
      {selectedIds.length > 0 && (
        <p className="px-2 text-xs font-medium text-primary">
          {selectedIds.length} document{selectedIds.length > 1 ? "s" : ""} sélectionné{selectedIds.length > 1 ? "s" : ""}
        </p>
      )}
    </div>
  );
}
