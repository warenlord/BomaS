-- BomaSchool — schema initial complet
-- A appliquer via `supabase db push` (CLI) ou en collant ce fichier dans
-- l'éditeur SQL du dashboard Supabase (Database > SQL Editor) d'un projet neuf.

-- ============================================================================
-- EXTENSIONS
-- ============================================================================
create extension if not exists pgcrypto;
create extension if not exists vector with schema extensions;

-- ============================================================================
-- FONCTIONS UTILITAIRES
-- ============================================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================================
-- TABLES DE REFERENCE (plans & packs)
-- ============================================================================
create table public.subscription_plans (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code in ('free', 'etudiant', 'premium', 'pro')),
  name text not null,
  price_fcfa integer not null default 0,
  monthly_credits integer not null,
  max_pdfs integer, -- null = illimité
  has_ads boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.credit_packs (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code in ('pack_s', 'pack_m', 'pack_l')),
  name text not null,
  credits integer not null,
  price_fcfa integer not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

insert into public.subscription_plans (code, name, price_fcfa, monthly_credits, max_pdfs, has_ads, sort_order) values
  ('free', 'Gratuit', 0, 50, 3, true, 0),
  ('etudiant', 'Étudiant', 3000, 1000, null, false, 1),
  ('premium', 'Premium', 6000, 3000, null, false, 2),
  ('pro', 'Pro', 10000, 10000, null, false, 3)
on conflict (code) do nothing;

insert into public.credit_packs (code, name, credits, price_fcfa, sort_order) values
  ('pack_s', 'Pack S', 500, 1500, 0),
  ('pack_m', 'Pack M', 1500, 4000, 1),
  ('pack_l', 'Pack L', 5000, 12000, 2)
on conflict (code) do nothing;

-- ============================================================================
-- PROFILS
-- ============================================================================
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ============================================================================
-- ABONNEMENTS
-- ============================================================================
create table public.user_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  plan_id uuid not null references public.subscription_plans (id),
  status text not null default 'active' check (status in ('active', 'past_due', 'canceled')),
  current_period_start timestamptz not null default now(),
  current_period_end timestamptz not null default (now() + interval '1 month'),
  cancel_at_period_end boolean not null default false,
  saspay_customer_ref text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_user_subscriptions_updated_at
  before update on public.user_subscriptions
  for each row execute function public.set_updated_at();

-- ============================================================================
-- CREDITS : portefeuille + grand livre (ledger)
-- ============================================================================
create table public.credit_wallets (
  user_id uuid primary key references auth.users (id) on delete cascade,
  balance integer not null default 0,
  monthly_allowance integer not null default 0,
  period_start timestamptz not null default now(),
  period_end timestamptz not null default (now() + interval '1 month'),
  updated_at timestamptz not null default now()
);

create trigger set_credit_wallets_updated_at
  before update on public.credit_wallets
  for each row execute function public.set_updated_at();

create table public.credit_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  amount integer not null, -- positif = crédit, négatif = débit
  balance_after integer not null,
  type text not null check (type in ('usage', 'purchase', 'subscription_renewal', 'bonus', 'refund')),
  feature text check (feature in ('chat', 'document_analysis', 'summary', 'qcm', 'revision_sheet', 'flashcards', 'exam', 'memoire_analysis')),
  reference_id uuid,
  description text,
  created_at timestamptz not null default now()
);

create index credit_transactions_user_created_idx on public.credit_transactions (user_id, created_at desc);

-- ============================================================================
-- DOCUMENTS + RAG
-- ============================================================================
create table public.documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  file_path text not null,
  file_type text not null check (file_type in ('pdf', 'docx')),
  status text not null default 'pending' check (status in ('pending', 'processing', 'ready', 'error')),
  error_message text,
  page_count integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_documents_updated_at
  before update on public.documents
  for each row execute function public.set_updated_at();

create index documents_user_idx on public.documents (user_id, created_at desc);

create table public.document_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents (id) on delete cascade,
  chunk_index integer not null,
  content text not null,
  embedding extensions.vector(1536),
  created_at timestamptz not null default now(),
  unique (document_id, chunk_index)
);

create index document_chunks_embedding_idx on public.document_chunks
  using ivfflat (embedding extensions.vector_cosine_ops) with (lists = 100);

-- ============================================================================
-- CONVERSATIONS + MESSAGES
-- ============================================================================
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  document_id uuid references public.documents (id) on delete set null,
  title text not null default 'Nouvelle conversation',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_conversations_updated_at
  before update on public.conversations
  for each row execute function public.set_updated_at();

create index conversations_user_idx on public.conversations (user_id, updated_at desc);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  citations jsonb,
  credits_used integer not null default 0,
  created_at timestamptz not null default now()
);

create index messages_conversation_idx on public.messages (conversation_id, created_at);

-- ============================================================================
-- CONTENUS GENERES (QCM, flashcards, résumés, examens, mémoires)
-- ============================================================================
create table public.generated_content (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  document_id uuid references public.documents (id) on delete set null,
  type text not null check (type in ('qcm', 'flashcards', 'summary', 'revision_sheet', 'exam', 'memoire_analysis')),
  title text not null,
  content jsonb not null,
  credits_used integer not null default 0,
  created_at timestamptz not null default now()
);

create index generated_content_user_idx on public.generated_content (user_id, created_at desc);

create table public.qcm_attempts (
  id uuid primary key default gen_random_uuid(),
  generated_content_id uuid not null references public.generated_content (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  score integer not null,
  total integer not null,
  answers jsonb not null,
  completed_at timestamptz not null default now()
);

-- ============================================================================
-- PAIEMENTS (Saspay)
-- ============================================================================
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  provider text not null default 'saspay',
  kind text not null check (kind in ('subscription', 'credit_pack')),
  plan_id uuid references public.subscription_plans (id),
  credit_pack_id uuid references public.credit_packs (id),
  reference text not null unique,
  provider_transaction_id text,
  amount_fcfa integer not null,
  status text not null default 'pending' check (status in ('pending', 'success', 'failed', 'canceled')),
  raw_payload jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_payments_updated_at
  before update on public.payments
  for each row execute function public.set_updated_at();

create index payments_user_idx on public.payments (user_id, created_at desc);

-- ============================================================================
-- TRIGGER : création automatique profil + abonnement Free + wallet à l'inscription
-- ============================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_free_plan_id uuid;
  v_free_credits integer;
begin
  select id, monthly_credits into v_free_plan_id, v_free_credits
  from public.subscription_plans
  where code = 'free';

  insert into public.profiles (id, full_name, avatar_url)
  values (new.id, new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'avatar_url');

  insert into public.user_subscriptions (user_id, plan_id, status, current_period_start, current_period_end)
  values (new.id, v_free_plan_id, 'active', now(), now() + interval '1 month');

  insert into public.credit_wallets (user_id, balance, monthly_allowance, period_start, period_end)
  values (new.id, v_free_credits, v_free_credits, now(), now() + interval '1 month');

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- RPC : débit de crédits atomique (verrou de ligne pour éviter les races)
-- ============================================================================
create or replace function public.deduct_credits(
  p_user_id uuid,
  p_amount integer,
  p_feature text,
  p_reference_id uuid default null,
  p_description text default null
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance integer;
begin
  if p_amount <= 0 then
    raise exception 'INVALID_AMOUNT';
  end if;

  select balance into v_balance
  from public.credit_wallets
  where user_id = p_user_id
  for update;

  if v_balance is null then
    raise exception 'WALLET_NOT_FOUND';
  end if;

  if v_balance < p_amount then
    raise exception 'INSUFFICIENT_CREDITS';
  end if;

  v_balance := v_balance - p_amount;

  update public.credit_wallets
  set balance = v_balance
  where user_id = p_user_id;

  insert into public.credit_transactions (user_id, amount, balance_after, type, feature, reference_id, description)
  values (p_user_id, -p_amount, v_balance, 'usage', p_feature, p_reference_id, p_description);

  return v_balance;
end;
$$;

-- ============================================================================
-- RPC : crédit de crédits (achats, bonus, remboursements)
-- ============================================================================
create or replace function public.add_credits(
  p_user_id uuid,
  p_amount integer,
  p_type text,
  p_reference_id uuid default null,
  p_description text default null
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance integer;
begin
  if p_amount <= 0 then
    raise exception 'INVALID_AMOUNT';
  end if;

  if p_type not in ('purchase', 'bonus', 'refund', 'subscription_renewal') then
    raise exception 'INVALID_TYPE';
  end if;

  select balance into v_balance
  from public.credit_wallets
  where user_id = p_user_id
  for update;

  if v_balance is null then
    raise exception 'WALLET_NOT_FOUND';
  end if;

  v_balance := v_balance + p_amount;

  update public.credit_wallets
  set balance = v_balance
  where user_id = p_user_id;

  insert into public.credit_transactions (user_id, amount, balance_after, type, feature, reference_id, description)
  values (p_user_id, p_amount, v_balance, p_type, null, p_reference_id, p_description);

  return v_balance;
end;
$$;

-- ============================================================================
-- RPC : renouvellement mensuel des wallets échus (appelé par le cron quotidien)
-- ============================================================================
create or replace function public.reset_due_credit_wallets()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row record;
  v_count integer := 0;
begin
  for v_row in
    select cw.user_id, sp.monthly_credits
    from public.credit_wallets cw
    join public.user_subscriptions us on us.user_id = cw.user_id
    join public.subscription_plans sp on sp.id = us.plan_id
    where cw.period_end <= now()
      and us.status = 'active'
    for update of cw
  loop
    update public.credit_wallets
    set balance = v_row.monthly_credits,
        monthly_allowance = v_row.monthly_credits,
        period_start = now(),
        period_end = now() + interval '1 month'
    where user_id = v_row.user_id;

    insert into public.credit_transactions (user_id, amount, balance_after, type, description)
    values (v_row.user_id, v_row.monthly_credits, v_row.monthly_credits, 'subscription_renewal', 'Renouvellement mensuel du quota de crédits');

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

-- ============================================================================
-- RPC : recherche de similarité pour le RAG documentaire
-- ============================================================================
create or replace function public.match_document_chunks(
  p_document_id uuid,
  p_query_embedding extensions.vector(1536),
  p_match_count integer default 6
)
returns table (
  id uuid,
  chunk_index integer,
  content text,
  similarity float
)
language sql
stable
as $$
  select
    dc.id,
    dc.chunk_index,
    dc.content,
    1 - (dc.embedding <=> p_query_embedding) as similarity
  from public.document_chunks dc
  where dc.document_id = p_document_id
  order by dc.embedding <=> p_query_embedding
  limit p_match_count;
$$;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
alter table public.subscription_plans enable row level security;
alter table public.credit_packs enable row level security;
alter table public.profiles enable row level security;
alter table public.user_subscriptions enable row level security;
alter table public.credit_wallets enable row level security;
alter table public.credit_transactions enable row level security;
alter table public.documents enable row level security;
alter table public.document_chunks enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.generated_content enable row level security;
alter table public.qcm_attempts enable row level security;
alter table public.payments enable row level security;

-- Référentiel public (lecture seule pour tout le monde, y compris visiteurs anonymes)
create policy "subscription_plans_public_read" on public.subscription_plans for select using (true);
create policy "credit_packs_public_read" on public.credit_packs for select using (true);

-- Profils
create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);

-- Abonnements (lecture seule côté client ; les écritures passent par le service role)
create policy "user_subscriptions_select_own" on public.user_subscriptions for select using (auth.uid() = user_id);

-- Wallet de crédits (lecture seule côté client ; les écritures passent par les RPC security definer)
create policy "credit_wallets_select_own" on public.credit_wallets for select using (auth.uid() = user_id);

-- Historique des transactions
create policy "credit_transactions_select_own" on public.credit_transactions for select using (auth.uid() = user_id);

-- Documents
create policy "documents_select_own" on public.documents for select using (auth.uid() = user_id);
create policy "documents_insert_own" on public.documents for insert with check (auth.uid() = user_id);
create policy "documents_update_own" on public.documents for update using (auth.uid() = user_id);
create policy "documents_delete_own" on public.documents for delete using (auth.uid() = user_id);

-- Chunks de documents (accès via la propriété du document parent)
create policy "document_chunks_select_own" on public.document_chunks for select
  using (exists (select 1 from public.documents d where d.id = document_chunks.document_id and d.user_id = auth.uid()));

-- Conversations
create policy "conversations_select_own" on public.conversations for select using (auth.uid() = user_id);
create policy "conversations_insert_own" on public.conversations for insert with check (auth.uid() = user_id);
create policy "conversations_update_own" on public.conversations for update using (auth.uid() = user_id);
create policy "conversations_delete_own" on public.conversations for delete using (auth.uid() = user_id);

-- Messages (accès via la propriété de la conversation parente)
create policy "messages_select_own" on public.messages for select
  using (exists (select 1 from public.conversations c where c.id = messages.conversation_id and c.user_id = auth.uid()));
create policy "messages_insert_own" on public.messages for insert
  with check (exists (select 1 from public.conversations c where c.id = messages.conversation_id and c.user_id = auth.uid()));

-- Contenus générés
create policy "generated_content_select_own" on public.generated_content for select using (auth.uid() = user_id);
create policy "generated_content_insert_own" on public.generated_content for insert with check (auth.uid() = user_id);

-- Tentatives de QCM
create policy "qcm_attempts_select_own" on public.qcm_attempts for select using (auth.uid() = user_id);
create policy "qcm_attempts_insert_own" on public.qcm_attempts for insert with check (auth.uid() = user_id);

-- Paiements (lecture seule côté client ; les écritures passent par le service role)
create policy "payments_select_own" on public.payments for select using (auth.uid() = user_id);

-- ============================================================================
-- STORAGE : bucket "documents" (PDF/Word uploadés par les utilisateurs)
-- ============================================================================
insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

create policy "documents_storage_select_own" on storage.objects for select
  using (bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "documents_storage_insert_own" on storage.objects for insert
  with check (bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "documents_storage_delete_own" on storage.objects for delete
  using (bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text);
