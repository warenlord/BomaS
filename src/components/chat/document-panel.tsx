"use client";

import { cn } from "@/lib/utils";

export interface DocumentChunk {
  chunk_index: number;
  content: string;
}

export function DocumentPanel({
  title,
  chunks,
  highlightedChunk,
}: {
  title: string;
  chunks: DocumentChunk[];
  highlightedChunk: number | null;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border/60 px-4 py-3">
        <p className="truncate text-sm font-semibold">{title}</p>
      </div>
      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4 text-sm leading-relaxed">
        {chunks.map((chunk) => (
          <p
            key={chunk.chunk_index}
            id={`chunk-${chunk.chunk_index}`}
            className={cn(
              "scroll-mt-4 rounded-lg p-2 whitespace-pre-wrap transition-colors",
              highlightedChunk === chunk.chunk_index && "bg-primary/10 ring-1 ring-primary/30",
            )}
          >
            {chunk.content}
          </p>
        ))}
      </div>
    </div>
  );
}
