# TestMyWebsite - Security Scanner

Eine produktionsreife Web-Anwendung zur Sicherheitsprüfung von Websites.

## Features

- 🔐 Sichere Authentifizierung mit Supabase
- ✅ Domain-Verifizierung (DNS-TXT & HTML-Datei)
- 🔍 Umfassende Security-Scans
- 📊 Detaillierte Sicherheitsberichte
- 🎨 Modernes, benutzerfreundliches UI

## Tech Stack

- Next.js 14 (App Router)
- TypeScript
- Supabase (Auth & Database)
- Tailwind CSS
- Vercel Deployment

## Setup

1. Dependencies installieren:
```bash
npm install
```

2. Environment-Variablen konfigurieren:
```bash
cp .env.example .env.local
```

3. Supabase-Projekt erstellen und die Variablen in `.env.local` eintragen.

4. Development Server starten:
```bash
npm run dev
```

## Deployment

Die Anwendung ist für Vercel optimiert. Einfach mit Vercel CLI oder über das Dashboard deployen.
