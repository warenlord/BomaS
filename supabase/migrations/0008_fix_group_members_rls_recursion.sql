-- La policy group_members_select_fellow (0007) interroge group_members depuis
-- sa propre clause USING sur group_members : Postgres doit ré-évaluer cette
-- même policy pour répondre à la sous-requête, d'où une récursion infinie
-- (42P17) dès qu'on lit /groups. Fix standard : déplacer le test
-- d'appartenance dans une fonction security definer, qui s'exécute avec les
-- privilèges du propriétaire de la table et contourne donc RLS en interne —
-- la policy appelle la fonction au lieu de s'auto-interroger.

create or replace function public.is_group_member(p_group_id uuid, p_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.group_members
    where group_id = p_group_id and user_id = p_user_id
  );
$$;

drop policy "group_members_select_fellow" on public.group_members;

create policy "group_members_select_fellow" on public.group_members
  for select
  using (public.is_group_member(group_members.group_id, auth.uid()));
