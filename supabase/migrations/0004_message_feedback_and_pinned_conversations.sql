-- Feedback (pouce haut/bas) sur les réponses de l'assistant.
alter table public.messages add column feedback text check (feedback in ('up', 'down'));

-- Les messages n'avaient qu'une politique RLS select/insert : il en manquait une
-- pour update (nécessaire pour laisser un étudiant enregistrer son feedback sur
-- une réponse de SA propre conversation).
create policy "messages_update_own" on public.messages for update
  using (exists (select 1 from public.conversations c where c.id = messages.conversation_id and c.user_id = auth.uid()));

-- Épinglage d'une conversation en haut de la sidebar.
alter table public.conversations add column pinned boolean not null default false;
