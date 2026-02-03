# Security Scanner SaaS

Eine production-ready Security-Scanning-SaaS-Anwendung, die es Benutzern ermöglicht, ihre eigenen Websites auf Sicherheitslücken zu scannen.

## Tech Stack

- **Frontend**: Next.js 14 (App Router, TypeScript)
- **Styling**: Tailwind CSS
- **Backend**: Next.js Server Actions + API Routes
- **Database & Auth**: Supabase
- **Hosting**: Vercel

## Features

- ✅ Email/Password Authentication via Supabase
- ✅ Domain Ownership Verification (DNS TXT, HTML file)
- ✅ Modulares Scanning-System:
  - Discovery & Crawl
  - Passive Security Analysis
  - Active Vulnerability Scans
- ✅ Detaillierte Security Reports mit PDF-Export
- ✅ OWASP Top 10 Mapping
- ✅ Rate Limiting & Security Guards

## Setup

1. Installiere Dependencies:
```bash
npm install
```

2. Erstelle eine `.env.local` Datei:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

3. Führe die SQL-Migrationen in Supabase aus (siehe `supabase/migrations/`)

4. Starte den Development Server:
```bash
npm run dev
```

## Sicherheit

- Alle Scans erfordern Domain-Verifizierung
- Non-destructive Scanning-Techniken
- Rate Limiting pro Benutzer
- Audit Logging für alle Scans
- Explizite Benutzerzustimmung erforderlich

## Lizenz

Proprietär - Alle Rechte vorbehalten
