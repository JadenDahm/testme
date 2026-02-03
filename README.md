# Security Scanner SaaS

Eine produktionsreife Security-Scanning SaaS-Anwendung, die es Benutzern ermöglicht, ihre eigenen Websites auf Sicherheitslücken zu scannen.

## Tech Stack

- **Frontend**: Next.js 14 (App Router, TypeScript)
- **Styling**: Tailwind CSS
- **Backend**: Next.js Server Actions + API Routes
- **Database & Auth**: Supabase
- **Hosting**: Vercel

## Features

- ✅ Supabase Email/Password Authentifizierung
- ✅ Domain Ownership Verification (DNS TXT + HTML)
- ✅ Modulares Scanning System (Discovery, Passive, Active)
- ✅ Detaillierte Security Reports mit PDF Export
- ✅ Rate Limiting & Audit Logs
- ✅ Modernes SaaS UI

## Setup

1. Installiere Dependencies:
```bash
npm install
```

2. Erstelle `.env.local` mit deinen Supabase Credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=your_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

3. Führe die SQL-Migrationen in Supabase aus (siehe `supabase/schema.sql`)

4. Starte den Development Server:
```bash
npm run dev
```

## Sicherheitshinweise

- Scans werden nur auf verifizierte Domains durchgeführt
- Keine destruktiven Payloads werden verwendet
- Alle Scans werden protokolliert
- Rate Limiting schützt vor Missbrauch
