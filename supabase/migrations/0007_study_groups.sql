-- Révision collective : groupes d'étude fermés, pot commun de matières à
-- "conquérir" (délai de 24h, score en étoiles). Une seule table d'état
-- (territory_claims) sert de source de vérité pour le pot : il n'existe pas
-- de ligne pour une matière "non réclamée", son statut se déduit de la
-- dernière réclamation pour ce (group_id, subject) — cohérent avec la façon
-- dont le streak (getStreak) se déduit déjà de credit_transactions sans
-- table dédiée, plutôt que d'ajouter une table "pool" en plus de l'historique.

create table public.study_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid not null references auth.users (id) on delete cascade,
  invite_code text not null unique,
  created_at timestamptz not null default now()
);

create table public.group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.study_groups (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  joined_at timestamptz not null default now(),
  unique (group_id, user_id)
);

create index group_members_group_idx on public.group_members (group_id);
create index group_members_user_idx on public.group_members (user_id);

create table public.territory_claims (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.study_groups (id) on delete cascade,
  -- Une valeur de SUBJECTS (src/lib/documents/subjects.ts), validée côté
  -- app avant l'appel RPC, même convention que documents.subject.
  subject text not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  claimed_at timestamptz not null default now(),
  deadline_at timestamptz not null,
  status text not null default 'in_progress' check (status in ('in_progress', 'completed', 'expired')),
  -- Pas de generated_content_id ici : la relation est déjà portée par
  -- generated_content.territory_claim_id (ci-dessous), la retrouver se fait
  -- par une recherche inverse plutôt que de dupliquer le lien dans les deux sens.
  qcm_attempt_id uuid references public.qcm_attempts (id) on delete set null,
  score_percent numeric(5, 2),
  stars smallint check (stars between 1 and 3),
  completed_at timestamptz
);

create index territory_claims_group_subject_idx on public.territory_claims (group_id, subject, claimed_at desc);
create index territory_claims_user_idx on public.territory_claims (user_id, status);

-- Empêche deux réclamations actives simultanées sur la même matière d'un
-- même groupe, sans verrou manuel : la seconde insertion concurrente échoue
-- nativement sur cet index (gérée dans claim_territory via un catch sur
-- unique_violation).
create unique index territory_claims_one_active_per_subject
  on public.territory_claims (group_id, subject)
  where status = 'in_progress';

alter table public.generated_content
  add column territory_claim_id uuid references public.territory_claims (id) on delete set null;

-- Au plus une génération par réclamation : un index unique (les NULL sont
-- exemptés nativement) plutôt qu'un simple SELECT avant insert, pour fermer
-- la vraie course entre deux générations concurrentes sur la même
-- réclamation (sinon les deux passent le contrôle d'existence avant que
-- l'une des deux n'ait eu le temps d'insérer sa ligne).
create unique index generated_content_one_per_territory_claim
  on public.generated_content (territory_claim_id)
  where territory_claim_id is not null;

-- RLS : lecture seule pour le client (réservée aux membres du groupe),
-- toutes les écritures passent par les RPC security definer ci-dessous —
-- même convention que credit_wallets/credit_transactions.

alter table public.study_groups enable row level security;
alter table public.group_members enable row level security;
alter table public.territory_claims enable row level security;

create policy "study_groups_select_member" on public.study_groups
  for select
  using (
    exists (
      select 1 from public.group_members gm
      where gm.group_id = study_groups.id and gm.user_id = auth.uid()
    )
  );

create policy "group_members_select_fellow" on public.group_members
  for select
  using (
    exists (
      select 1 from public.group_members gm
      where gm.group_id = group_members.group_id and gm.user_id = auth.uid()
    )
  );

create policy "territory_claims_select_member" on public.territory_claims
  for select
  using (
    exists (
      select 1 from public.group_members gm
      where gm.group_id = territory_claims.group_id and gm.user_id = auth.uid()
    )
  );

-- RPCs. Contrairement à deduct_credits/add_credits (qui acceptent un
-- p_user_id en paramètre), ces fonctions utilisent auth.uid() directement :
-- rien à falsifier même en cas d'appel RPC direct hors des routes API.

create or replace function public.create_study_group(p_name text)
returns table (group_id uuid, invite_code text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_group_id uuid;
  v_code text;
  v_attempt integer := 0;
begin
  loop
    v_code := upper(substr(encode(gen_random_bytes(5), 'hex'), 1, 8));
    begin
      insert into public.study_groups (name, owner_id, invite_code)
      values (p_name, auth.uid(), v_code)
      returning id into v_group_id;
      exit;
    exception when unique_violation then
      v_attempt := v_attempt + 1;
      if v_attempt >= 5 then
        raise exception 'INVITE_CODE_COLLISION';
      end if;
    end;
  end loop;

  insert into public.group_members (group_id, user_id) values (v_group_id, auth.uid());

  return query select v_group_id, v_code;
end;
$$;

-- Lookup public (page de pré-jointure, avant que l'utilisateur soit membre) :
-- expose seulement le nom et le nombre de membres, jamais le contenu du groupe.
create or replace function public.get_group_preview(p_invite_code text)
returns table (group_id uuid, name text, member_count integer)
language sql
stable
security definer
set search_path = public
as $$
  select
    sg.id,
    sg.name,
    (select count(*)::integer from public.group_members gm where gm.group_id = sg.id)
  from public.study_groups sg
  where sg.invite_code = upper(p_invite_code);
$$;

create or replace function public.join_group(p_invite_code text)
returns table (group_id uuid, reason text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_group record;
  v_member_count integer;
begin
  select * into v_group
  from public.study_groups
  where invite_code = upper(p_invite_code)
  for update;

  if v_group is null then
    return query select null::uuid, 'NOT_FOUND';
    return;
  end if;

  if exists (select 1 from public.group_members where group_id = v_group.id and user_id = auth.uid()) then
    return query select v_group.id, 'ALREADY_MEMBER';
    return;
  end if;

  select count(*) into v_member_count from public.group_members where group_id = v_group.id;
  if v_member_count >= 30 then
    return query select null::uuid, 'GROUP_FULL';
    return;
  end if;

  insert into public.group_members (group_id, user_id) values (v_group.id, auth.uid());

  return query select v_group.id, 'OK';
end;
$$;

create or replace function public.claim_territory(
  p_group_id uuid,
  p_subject text,
  p_deadline_hours integer default 24
)
returns table (claim_id uuid, deadline_at timestamptz, reason text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_claim_id uuid;
  v_deadline timestamptz;
begin
  if not exists (
    select 1 from public.group_members gm
    where gm.group_id = p_group_id and gm.user_id = auth.uid()
  ) then
    return query select null::uuid, null::timestamptz, 'NOT_A_MEMBER';
    return;
  end if;

  if p_deadline_hours < 1 or p_deadline_hours > 168 then
    raise exception 'INVALID_DEADLINE_HOURS';
  end if;

  v_deadline := now() + (p_deadline_hours || ' hours')::interval;

  begin
    insert into public.territory_claims (group_id, subject, user_id, deadline_at, status)
    values (p_group_id, p_subject, auth.uid(), v_deadline, 'in_progress')
    returning id into v_claim_id;
  exception when unique_violation then
    return query select null::uuid, null::timestamptz, 'ALREADY_CLAIMED';
    return;
  end;

  return query select v_claim_id, v_deadline, 'OK';
end;
$$;

-- Appelée depuis /api/qcm-attempts une fois le score calculé. Revérifie le
-- délai côté serveur indépendamment du cron d'expiration (ferme la course
-- entre une soumission in-extremis et le cron), et verrouille la ligne pour
-- empêcher qu'une double soumission ne compte deux fois.
create or replace function public.complete_territory_claim(
  p_claim_id uuid,
  p_qcm_attempt_id uuid,
  p_score_percent numeric
)
returns table (counted boolean, reason text, stars integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_claim record;
  v_stars integer;
begin
  select * into v_claim from public.territory_claims where id = p_claim_id for update;

  if v_claim is null or v_claim.user_id <> auth.uid() then
    return query select false, 'NOT_FOUND', null::integer;
    return;
  end if;

  if v_claim.status <> 'in_progress' then
    return query select false, 'ALREADY_RESOLVED', null::integer;
    return;
  end if;

  if now() > v_claim.deadline_at then
    update public.territory_claims set status = 'expired' where id = p_claim_id;
    return query select false, 'DEADLINE_PASSED', null::integer;
    return;
  end if;

  v_stars := case
    when p_score_percent >= 90 then 3
    when p_score_percent >= 70 then 2
    else 1
  end;

  update public.territory_claims
  set
    status = 'completed',
    qcm_attempt_id = p_qcm_attempt_id,
    score_percent = p_score_percent,
    stars = v_stars,
    completed_at = now()
  where id = p_claim_id;

  return query select true, 'OK', v_stars;
end;
$$;
