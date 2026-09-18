-- Corrige deux politiques RLS manquantes découvertes lors des premiers tests :
--
-- 1. document_chunks n'avait qu'une politique de lecture. L'ingestion d'un
--    document (route /api/documents/upload) insère les passages avec le
--    client authentifié de l'utilisateur (pas le service role), donc chaque
--    insertion était refusée silencieusement par Postgres RLS.
--
-- 2. payments n'avait qu'une politique de lecture. La route de checkout
--    (/api/billing/checkout) insère la ligne de paiement avec le client
--    authentifié de l'utilisateur avant même d'appeler Saspay, donc tout
--    achat de plan/pack aurait échoué de la même façon.

create policy "document_chunks_insert_own" on public.document_chunks for insert
  with check (exists (select 1 from public.documents d where d.id = document_chunks.document_id and d.user_id = auth.uid()));

create policy "payments_insert_own" on public.payments for insert
  with check (auth.uid() = user_id);
