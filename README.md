# BomaSchool

Assistant IA d'étude pour étudiants gabonais : chat façon ChatGPT, analyse de cours PDF/Word avec citations
(RAG), génération de QCM/flashcards/résumés/fiches de révision/examens blancs, système de crédits mensuels
renouvelables, abonnements et packs de crédits via Saspay.

## Stack

- Next.js 15 (App Router) + TypeScript + Tailwind CSS + shadcn/ui (Base UI) + Framer Motion
- Supabase (Postgres + pgvector, Auth, Storage)
- Vercel AI SDK (`ai` + `@ai-sdk/openai`) pour le chat en streaming et les embeddings
- Saspay pour les paiements Mobile Money / carte (Gabon)

## 1. Configuration Supabase

1. Crée un projet sur [supabase.com](https://supabase.com).
2. Dans **SQL Editor**, colle et exécute le contenu de [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql).
   Cela crée le schéma complet (tables, RLS, fonctions RPC, trigger d'inscription) ainsi que le bucket de
   stockage `documents`. Si tu utilises la CLI Supabase, `supabase db push` fonctionne aussi.
3. Dans **Authentication > Providers**, active **Email** et **Google** (renseigne le Client ID / Secret Google
   OAuth ; l'URL de callback à déclarer côté Google Cloud Console est
   `https://<ton-projet>.supabase.co/auth/v1/callback`).
4. Récupère dans **Project Settings > API** : `Project URL`, `anon public key` et `service_role key`.

## 2. Variables d'environnement

Copie `.env.example` vers `.env.local` et renseigne :

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY` (+ `OPENAI_CHAT_MODEL` / `OPENAI_EMBEDDING_MODEL` si tu veux changer les modèles par défaut)
- `SASPAY_API_BASE_URL`, `SASPAY_MERCHANT_ID`, `SASPAY_API_KEY`, `SASPAY_WEBHOOK_SECRET` (voir section Saspay)
- `NEXT_PUBLIC_APP_URL` (URL publique de l'app, utilisée pour les redirections de paiement)
- `CRON_SECRET` (chaîne aléatoire, protège l'endpoint de renouvellement des crédits)

## 3. Lancer en local

```bash
npm install
npm run dev
```

Ouvre [http://localhost:3000](http://localhost:3000).

## 4. Intégration Saspay

`src/lib/billing/saspay.ts` implémente l'intégration Saspay derrière l'interface `PaymentProvider`
(`src/lib/billing/provider.ts`). Les endpoints exacts, le format du payload et l'en-tête de signature du
webhook **n'étaient pas disponibles au moment de l'implémentation** et suivent le schéma standard d'un
agrégateur Mobile Money/carte ouest-africain — ils sont marqués `TODO` dans le fichier et doivent être
ajustés dès que la documentation marchande Saspay réelle est fournie. Tant que les variables d'environnement
Saspay ne sont pas renseignées, l'application reste fonctionnelle : les boutons de paiement affichent un
message indiquant que le paiement n'est pas encore configuré, sans bloquer le reste du produit.

Le webhook Saspay doit pointer vers `${NEXT_PUBLIC_APP_URL}/api/billing/webhook`.

## 5. Renouvellement mensuel des crédits

`vercel.json` déclare un cron quotidien vers `/api/cron/reset-credits`, qui renouvelle les portefeuilles de
crédits dont la période est échue. Cette route vérifie l'en-tête `Authorization: Bearer ${CRON_SECRET}`.
En local, tu peux la déclencher manuellement :

```bash
curl -H "Authorization: Bearer <CRON_SECRET>" http://localhost:3000/api/cron/reset-credits
```

## 6. Déploiement sur Vercel

1. Importe le repo sur [vercel.com/new](https://vercel.com/new).
2. Renseigne les mêmes variables d'environnement que `.env.example` dans les Project Settings Vercel.
3. Le cron `vercel.json` est activé automatiquement au déploiement.

## Limites connues de cette première version

- L'intégration Saspay est un squelette fonctionnel (voir section 4) : à finaliser avec la vraie documentation
  marchande avant mise en production.
- L'ingestion de documents (extraction + embeddings) est synchrone dans la requête d'upload ; pour des PDF
  très volumineux, envisager une file de traitement en arrière-plan.
- Aucun test automatisé n'est encore en place.
