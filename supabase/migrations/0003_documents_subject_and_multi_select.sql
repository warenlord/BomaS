-- Ajoute la matière sur les documents (classement/filtrage) et la capacité
-- de tracer plusieurs documents source sur un contenu généré (un examen ou
-- un QCM peut désormais couvrir plusieurs chapitres à la fois).

alter table public.documents add column subject text;

alter table public.generated_content add column document_ids uuid[] not null default '{}';

create index documents_subject_idx on public.documents (user_id, subject);
