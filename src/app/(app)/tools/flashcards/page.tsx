import { createClient } from "@/lib/supabase/server";
import { getDocument } from "@/lib/documents/queries";
import { FlashcardsTool } from "@/components/tools/flashcards-tool";

export default async function FlashcardsPage({
  searchParams,
}: {
  searchParams: Promise<{ documentId?: string }>;
}) {
  const { documentId } = await searchParams;
  const supabase = await createClient();
  const document = documentId ? await getDocument(supabase, documentId) : null;

  return <FlashcardsTool documentId={documentId} documentTitle={document?.title} />;
}
