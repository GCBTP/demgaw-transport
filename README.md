# DemGaw — Transport interurbain (Sénégal)

Application **React (Vite)** + **Tailwind CSS v4** + **Supabase** (Auth, PostgreSQL, RLS, RPC, Edge Functions).

## Démarrage local

```bash
npm install
cp .env.example .env   # puis renseignez l’URL et la clé anon / publishable
npm run dev
```

- Build : `npm run build` (sortie dans `dist/`)
- Prévisualisation locale : `npm run preview`

Variables Vite (fichier **`.env`** à la racine du projet, jamais commité) :

```env
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=...
```

Voir **`.env.example`**.

---

## Base Supabase (obligatoire avant prod)

### Option A — Une seule exécution (recommandé pour un nouveau projet)

1. **SQL Editor** (Supabase) → ouvrir **`supabase/all_in_one.sql`** → tout coller → **Run**.  
   Cela crée schéma, RLS, RPC (réservation, paiement simulé, admin, chauffeur, billets QR), trajets démo, tables `regions` / `bus_stations` et leur seed.

2. **Secret billet QR (production)** : remplacer le placeholder dans `ticket_qr_secrets` par une valeur longue et aléatoire (minimum 10 caractères, idéalement 32+).

   ```sql
   update public.ticket_qr_secrets
   set secret = 'VOTRE_SECRET_LONG_ET_UNIQUE'
   where id = 1;
   ```

   Sans cela, paiement, QR et validations chauffeur renverront `TICKET_QR_SECRET_NOT_SET`.

3. **Extension** : `pgcrypto` est requise pour les signatures QR. `all_in_one.sql` et plusieurs migrations l’activent ; si besoin : `create extension if not exists pgcrypto with schema extensions;` (selon votre projet Supabase, le schéma peut être `extensions` ou `public` — en cas d’erreur, suivez le message Postgres).

### Option B — Migrations numérotées (`supabase db push` ou exécution fichier par fichier)

Ordre à respecter :

| Fichier | Rôle |
| ------- | ---- |
| `001_demgaw_schema.sql` | Tables, RLS de base, `create_booking` |
| `002_payment_simulation.sql` | `pay_booking`, etc. |
| `004_profiles_roles.sql` | `profiles`, rôles, trigger inscription |
| `005_ticket_qr_security.sql` | Secrets + RPC QR |
| `006_ticket_transport_details.sql` | Détails transport sur réservations |
| `007_booking_qr_payload.sql` | `qr_payload` au paiement |
| `008_admin_tools.sql` | RPC admin (trajets, réservations, rôles) |
| `009_three_roles_driver_access.sql` | Rôle `driver`, RLS / RPC associés |
| `010_admin_list_drivers.sql` | Liste chauffeurs |
| `011_driver_manifest_rpc.sql` | Manifeste chauffeur |
| `012_driver_ticket_use.sql` | Validation / usage billet QR |
| `013_driver_manual_ticket_validate.sql` | Validation manuelle |
| `014_admin_rpc_backfill.sql` | `is_admin`, `admin_pay_booking` alignés QR |
| `015_regions_bus_stations_seed.sql` | Régions + gares |
| `016_fix_admin_list_bookings_ambiguous_id.sql` | Correctif `admin_list_bookings` |

Fichiers utilitaires : `complete_setup.sql`, `schema_transport_booking.sql` (référence / variantes).

### Script SQL local

```bash
SUPABASE_DATABASE_URL=postgresql://postgres.VOTRE_REF:...@aws-0-REGION.pooler.supabase.com:5432/postgres
npm run db:run -- supabase/all_in_one.sql
```

(Détails : **Project Settings → Database** — URI pooler ; ne pas mettre ce mot de passe dans les variables `VITE_*`.)

---

## Edge Function `admin-create-driver`

La création de comptes chauffeurs depuis l’admin appelle cette fonction (JWT utilisateur requis, rôle admin).

```bash
cd demgaw-transport   # racine du repo front
supabase link --project-ref VOTRE_REF
supabase functions deploy admin-create-driver
```

`SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY` sont fournis automatiquement par Supabase sur les fonctions déployées.  
Réglage : `supabase/config.toml` → `verify_jwt = true` pour cette fonction.

---

## Déploiement du front (Vite)

1. Build : `npm run build`
2. Publier le contenu de **`dist/`** sur votre hébergeur statique.
3. **Variables d’environnement** côté CI / hébergeur : `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (mêmes noms qu’en local). Sous Vercel / Netlify / Cloudflare Pages : les définir dans le tableau « Environment variables » puis relancer un build.

### Routage SPA (React Router)

Sans règle de fallback, un refresh sur `/trips` ou `/chauffeur` renvoie une 404.

- **Vercel** : `vercel.json` à la racine du projet (déjà présent) — rewrites vers `index.html`.
- **Netlify / Cloudflare Pages** : `public/_redirects` (copié dans `dist` au build) — règle `/* → /index.html` en 200.

### Auth Supabase après mise en ligne

Dans **Authentication → URL configuration** :

- **Site URL** : URL publique de l’app (ex. `https://demgaw.vercel.app`).
- **Redirect URLs** : la même URL + `http://localhost:5173` pour le dev.

### Activer Google OAuth

Dans **Authentication → Providers → Google** (Supabase) :

- activer le provider Google ;
- renseigner le **Client ID** et le **Client Secret** (Google Cloud Console) ;
- dans Google Cloud OAuth, ajouter les URI de redirection Supabase indiquées par le dashboard Supabase.

Le front utilise `signInWithOAuth({ provider: 'google' })` et redirige vers `/compte` après authentification.

### Temps réel (optionnel)

**Database → Publications** → publication `supabase_realtime` → ajouter la table **`trips`** pour rafraîchir le catalogue sans recharger.

### E-mail (optionnel en test)

**Authentication → Providers → Email** : vous pouvez désactiver temporairement la confirmation e-mail pour tester plus vite ; en production, gardez la confirmation activée.

---

## Schéma données (résumé)

- **`trips`** : catalogue (villes, date, heure, prix, sièges, opérateur, …).
- **`bookings`** : réservations ; création via **`create_booking`**, paiement simulé via **`pay_booking`** ou actions admin.
- **`profiles`** : `role` (`admin` | `client` | `driver`), `driver_operator` pour les chauffeurs.
- **RLS** : lecture trajets pour tous ; écriture trajets si authentifié ; réservations visibles par leur propriétaire ; RPC `security definer` pour admin / chauffeur.

Promouvoir un admin (SQL) :

```sql
update public.profiles set role = 'admin' where id = '<uuid auth.users>';
```

---

## Fonctionnalités

- Auth e-mail / mot de passe.
- Catalogue trajets, réservation, confirmation, espace **Compte** (billets, QR).
- **Admin** : `/dashboard` — trajets, réservations, utilisateurs, chauffeurs (`/dashboard/drivers`).
- **Chauffeur** : `/chauffeur` — accueil, gestion / manifeste, scan QR, badge.

---

## Structure (extrait)

```
src/
  supabase/     client, trips, bookings, tickets, adminDrivers, driverManifest, …
  context/      AuthProvider
  pages/        Book, Admin*, Driver*, …
public/
  _redirects    fallback SPA (Netlify / Pages)
supabase/
  all_in_one.sql
  migrations/
  functions/admin-create-driver/
vercel.json     fallback SPA (Vercel)
```

---

## Routes principales

| Route | Description |
| ----- | ----------- |
| `/` | Accueil |
| `/login`, `/register` | Auth |
| `/trips` | Catalogue |
| `/book/:tripId` | Réservation (connecté) |
| `/booking/confirmation/:id` | Confirmation (connecté) |
| `/compte` | Espace voyageur (connecté) |
| `/dashboard`, `/dashboard/*` | Admin |
| `/chauffeur`, `/chauffeur/*` | Chauffeur |

---

## Sécurité

- Ne jamais commiter **`.env`** ni le **mot de passe base de données** ni la **service role key** dans le front.
- Si des clés ont fuité : les régénérer dans le dashboard Supabase.
