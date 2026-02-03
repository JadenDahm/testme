# Projektstruktur

## Übersicht

Dieses Projekt ist eine vollständige Web-Sicherheits-Scanning-Anwendung, die mit Next.js 14, TypeScript, Supabase und Tailwind CSS erstellt wurde.

## Verzeichnisstruktur

```
testme/
├── app/                          # Next.js App Router
│   ├── api/                      # API Routes
│   │   ├── domains/              # Domain-Management API
│   │   │   ├── [id]/
│   │   │   │   └── verify/       # Domain-Verifizierung
│   │   │   └── route.ts          # Domain CRUD
│   │   └── scans/                # Scan-Management API
│   │       ├── [id]/
│   │       │   ├── start/        # Scan starten
│   │       │   └── route.ts      # Scan-Details abrufen
│   │       └── route.ts          # Scan erstellen
│   ├── auth/                     # Authentifizierung
│   │   ├── login/                # Login-Seite
│   │   └── register/             # Registrierungs-Seite
│   ├── dashboard/                # Dashboard (geschützt)
│   │   ├── domains/
│   │   │   └── [id]/             # Domain-Details
│   │   ├── scans/
│   │   │   └── [id]/             # Scan-Report
│   │   ├── layout.tsx            # Dashboard-Layout mit Nav
│   │   └── page.tsx               # Dashboard-Hauptseite
│   ├── globals.css                # Globale Styles
│   ├── layout.tsx                 # Root-Layout
│   └── page.tsx                   # Landing Page
├── components/                   # React-Komponenten
│   ├── auth/
│   │   ├── LoginForm.tsx
│   │   └── RegisterForm.tsx
│   └── dashboard/
│       ├── AddDomainButton.tsx
│       ├── AddDomainModal.tsx
│       ├── DashboardNav.tsx
│       ├── DomainDetails.tsx
│       ├── DomainsList.tsx
│       └── ScanReport.tsx
├── lib/                          # Utility-Funktionen
│   ├── scanner/
│   │   └── index.ts              # Security-Scanner-Logik
│   ├── supabase/
│   │   ├── client.ts             # Browser-Client
│   │   ├── middleware.ts         # Middleware-Helper
│   │   └── server.ts             # Server-Client
│   ├── types.ts                  # TypeScript-Typen
│   └── utils.ts                  # Utility-Funktionen
├── supabase/
│   └── schema.sql                # Datenbankschema
├── middleware.ts                 # Next.js Middleware
├── package.json                  # Dependencies
├── tsconfig.json                 # TypeScript-Konfiguration
├── tailwind.config.ts            # Tailwind-Konfiguration
├── next.config.js                # Next.js-Konfiguration
├── README.md                     # Projekt-README
├── SETUP.md                      # Setup-Anleitung
└── PROJECT_STRUCTURE.md          # Diese Datei
```

## Hauptfunktionen

### 1. Authentifizierung
- Registrierung und Login über Supabase Auth
- Session-Management mit Middleware
- Geschützte Routen

### 2. Domain-Verwaltung
- Domain hinzufügen
- Zwei Verifizierungsmethoden:
  - DNS-TXT-Eintrag
  - HTML-Datei unter /.well-known/
- Verifizierungsstatus-Tracking

### 3. Security-Scanner
- Automatisches Crawling der Website
- Analyse von HTTP-Security-Headers
- Erkennung von API-Keys und Secrets im Code
- Tests auf SQL-Injection und XSS
- Prüfung auf öffentliche sensible Dateien
- Nicht-destruktive Tests mit Rate-Limits

### 4. Reporting
- Detaillierte Berichte mit Schweregraden
- Security-Score-Berechnung
- Filterbare Vulnerabilities
- Konkrete Handlungsempfehlungen

## Technische Details

### Datenbank-Schema
- `domains`: Verwaltung der Domains und Verifizierungsstatus
- `scans`: Scan-Historie und Status
- `vulnerabilities`: Gefundene Schwachstellen

### Sicherheit
- Row Level Security (RLS) in Supabase
- Domain-Verifizierung vor Scans
- Nur nicht-destruktive Tests
- Rate-Limits und Timeouts

### Deployment
- Optimiert für Vercel
- Serverless-Funktionen
- Environment-Variablen für Supabase-Keys

## Nächste Schritte

1. Supabase-Projekt erstellen
2. Datenbankschema einrichten (siehe `supabase/schema.sql`)
3. Environment-Variablen konfigurieren
4. `npm install` ausführen
5. `npm run dev` starten

Siehe `SETUP.md` für detaillierte Anweisungen.
