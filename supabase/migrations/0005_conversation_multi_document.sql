-- Permet d'attacher plusieurs documents à une conversation de chat (menu
-- pièce-jointe / @mention / glisser-déposer), en plus du document_id unique
-- historique conservé pour compatibilité (affichage du badge "À propos de").
alter table public.conversations add column document_ids uuid[] not null default '{}';
