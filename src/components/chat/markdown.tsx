import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

const components: Components = {
  p: ({ className, ...props }) => <p className={cn("mb-3 last:mb-0", className)} {...props} />,
  ul: ({ className, ...props }) => <ul className={cn("mb-3 list-disc space-y-1 pl-5", className)} {...props} />,
  ol: ({ className, ...props }) => <ol className={cn("mb-3 list-decimal space-y-1 pl-5", className)} {...props} />,
  li: ({ className, ...props }) => <li className={className} {...props} />,
  strong: ({ className, ...props }) => <strong className={cn("font-semibold", className)} {...props} />,
  a: ({ className, ...props }) => (
    <a className={cn("text-primary underline underline-offset-2", className)} target="_blank" rel="noreferrer" {...props} />
  ),
  h1: ({ className, ...props }) => <h1 className={cn("mb-2 text-lg font-semibold", className)} {...props} />,
  h2: ({ className, ...props }) => <h2 className={cn("mb-2 text-base font-semibold", className)} {...props} />,
  h3: ({ className, ...props }) => <h3 className={cn("mb-1.5 text-sm font-semibold", className)} {...props} />,
  code: ({ className, ...props }) => (
    <code className={cn("rounded bg-muted px-1 py-0.5 font-mono text-[0.85em]", className)} {...props} />
  ),
  pre: ({ className, ...props }) => (
    <pre className={cn("mb-3 overflow-x-auto rounded-lg bg-muted p-3 text-sm", className)} {...props} />
  ),
};

export function Markdown({ children }: { children: string }) {
  return (
    <div className="text-sm leading-relaxed">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {children}
      </ReactMarkdown>
    </div>
  );
}
