# Autera starter (Next.js + Supabase)

A starter scaffold for the Autera demo. It includes email sign-up/sign-in pages and a landing page. Booking and admin workflows are intentionally placeholders pending secure server-side implementation.

## Setup
1. Install Node.js LTS.
2. Copy `.env.example` to `.env.local`.
3. Fill in Supabase project URL and publishable key. Never use `sb_secret_*` or `service_role` in browser code.
4. `npm install`
5. `npm run dev`

The database SQL was run manually in the Supabase SQL Editor. Before production, review policies and implement privileged admin actions through server-side code only. Do not use client-editable profile role as the sole admin authorization method; the initial SQL profile update policy allows client role only, and a secure admin role provisioning path must be created server-side.
