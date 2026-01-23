# Supabase News (Option 2: Frontend with Supabase)

Webiste url: https://development-platforms-ca-simon.netlify.app/


A responsive React + Vite + Tailwind frontend using Supabase for authentication (with email confirmation) and a simple articles database. Includes conditional navigation based on auth and Row Level Security (RLS) policies.

## Installation

1. Clone and install dependencies

```bash
git clone <your-fork-or-repo-url>
cd supabaseNews
npm install
```

2. Create a Supabase project

- Go to https://supabase.com/ and create a project.
- In Project Settings → API, copy the Project URL and anon public key.

3. Configure environment variables

Create a `.env` file in the project root:

```bash
VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_ANON_KEY=your-anon-key
# Optional: email redirect after confirmation (defaults to window origin)
VITE_EMAIL_REDIRECT_TO=http://localhost:5173
# Optional: customize storage bucket name (case-sensitive; defaults to "Images")
VITE_STORAGE_BUCKET=Images
```

4. Database schema

the following SQL was used in Supabase SQL Editor to create the `posts` table and enable RLS:

```sql
create extension if not exists pgcrypto;

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.posts enable row level security;

-- Allow anyone to read posts (browsing open to all)
create policy if not exists "Read posts for all"
  on public.posts for select
  using (true);

-- Allow authenticated users to insert posts for themselves
create policy if not exists "Insert own posts"
  on public.posts for insert
  with check (auth.uid() = user_id);

-- (Optional) Only allow owners to update/delete their posts
create policy if not exists "Update own posts"
  on public.posts for update
  using (auth.uid() = user_id);

create policy if not exists "Delete own posts"
  on public.posts for delete
  using (auth.uid() = user_id);
```

5. Email confirmations

In Authentication → URL Configuration:
- Set Site URL to `http://localhost:5173` during development.
- Ensure email confirmations are enabled.
- The app calls signUp with `emailRedirectTo` (configurable via `VITE_EMAIL_REDIRECT_TO`).

## Run

```bash
npm run dev
```

Then open the printed local URL (typically http://localhost:5173).

## Dev Dependencies

Install all development tools used in this project:

```powershell
npm i -D @eslint/js@^9.39.1 @types/node@^24.10.1 @types/react@^19.2.5 @types/react-dom@^19.2.3 @vitejs/plugin-react@^5.1.1 eslint@^9.39.1 eslint-plugin-react-hooks@^7.0.1 eslint-plugin-react-refresh@^0.4.24 globals@^16.5.0 typescript@~5.9.3 typescript-eslint@^8.46.4 vite@^7.2.4
```

## Features

- Authentication with email confirmation (register/login/logout)
- Responsive navigation:
  - Login/Register hidden when logged in
  - Create Article visible only when logged in
- Article browsing for all users
- Article creation for authenticated users (RLS enforced)
- Image upload to Supabase Storage with public URLs
- Delete own posts (requires RLS delete policy)
- Clear error messages and basic success feedback

## Notes on Implementation

- Supabase client configuration: see [src/utils/supabase.ts](src/utils/supabase.ts)
- Auth helpers: see [src/utils/auth.ts](src/utils/auth.ts)
- Posts API: see [src/utils/posts.ts](src/utils/posts.ts)
- Image upload helper: see [src/utils/storage.ts](src/utils/storage.ts)
- Main UI: see [src/App.tsx](src/App.tsx)
- Tailwind v4 via `@tailwindcss/vite` with `@import "tailwindcss";` in [src/index.css](src/index.css)

## Storage: Images

1. Create a bucket named `Images` (or your preferred name) in Supabase Storage and make it public (or keep private and adjust code to use signed URLs). Bucket names are case-sensitive.
2. Optional: Add Storage policies (if not making the bucket public) to allow `select` for all and `insert` for authenticated users.
3. Add a new column to `posts` to store image URLs:

```sql
alter table public.posts add column if not exists image_url text;
```

If uploads fail with "Bucket not found", ensure the bucket exists and the name matches `VITE_STORAGE_BUCKET` exactly (case-sensitive).

Example Storage policies (if keeping the bucket private):

```sql
-- Replace 'Images' with your exact bucket name
create policy if not exists "Public read images"
  on storage.objects for select
  using (bucket_id = 'Images');

create policy if not exists "Authenticated upload images"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'Images');
```

## Posts: Delete Policy

To allow users to delete their own posts, add this policy:

```sql
create policy if not exists "Delete own posts"
  on public.posts for delete
  using (auth.uid() = user_id);
```

## Motivation

- Why Option 2: Enjoyed building a full-stack experience quickly using Supabase’s hosted auth and database, it help focusing on UX and product flow as a front-end developer instead of server plumbling.
- What I liked: Rapid iteration, integrated auth, and straightforward client API. Tailwind improved iteration speed on responsive UI. Overall just a cool project.
- What I didn’t enjoy: RLS can be tricky to get exactly right; email confirmation flows require environment configuration to test locally.
- What was difficult: Balancing minimal UI with sufficient feedback and guarding create routes by auth while keeping the code simple. I also spent alot of time trying to learn React this time for future projects.
- Custom API vs Supabase: A custom API offers full control and flexibility at the cost of maintenance and security burdens. Supabase accelerates development with managed auth, storage, and SQL access, ideal for prototypes and small/medium apps, while still allowing SQL-level control via RLS.


