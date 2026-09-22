"use client";

import { cn } from "@/lib/utils";

export interface DocumentChunk {
  chunk_index: number;
  content: string;
}

export interface DocumentWithChunks {
  id: string;
  title: string;
  chunks: DocumentChunk[];
}

export function DocumentPanel({
  documents,
  highlighted,
}: {
  documents: DocumentWithChunks[];
  highlighted: { documentId: string; chunkIndex: number } | null;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border/60 px-4 py-3">
        <p className="truncate text-sm font-semibold">
          {documents.length === 1 ? documents[0].title : `${documents.length} documents`}
        </p>
      </div>
      <div className="flex-1 space-y-6 overflow-y-auto px-4 py-4 text-sm leading-relaxed">
        {documents.map((doc) => (
          <div key={doc.id}>
            {documents.length > 1 && (
              <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">{doc.title}</p>
            )}
            <div className="space-y-4">
              {doc.chunks.map((chunk) => (
                <p
                  key={chunk.chunk_index}
                  id={`chunk-${doc.id}-${chunk.chunk_index}`}
                  className={cn(
                    "scroll-mt-4 rounded-lg p-2 whitespace-pre-wrap transition-colors",
                    highlighted?.documentId === doc.id &&
                      highlighted.chunkIndex === chunk.chunk_index &&
                      "bg-primary/10 ring-1 ring-primary/30",
                  )}
                >
                  {chunk.content}
                </p>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
