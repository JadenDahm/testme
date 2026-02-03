# Setup-Anleitung für TestMyWebsite

## Voraussetzungen

- Node.js 18+ installiert
- Ein Supabase-Konto (kostenlos verfügbar unter https://supabase.com)

## Schritt 1: Supabase-Projekt erstellen

1. Gehen Sie zu https://supabase.com und erstellen Sie ein neues Projekt
2. Notieren Sie sich die folgenden Werte:
   - Project URL (z.B. `https://xxxxx.supabase.co`)
   - Anon/Public Key
   - Service Role Key (unter Project Settings > API)

## Schritt 2: Datenbankschema einrichten

1. Öffnen Sie das SQL Editor in Ihrem Supabase-Dashboard
2. Kopieren Sie den Inhalt von `supabase/schema.sql`
3. Führen Sie das SQL-Script aus

## Schritt 3: Lokale Entwicklungsumgebung

1. Klonen Sie das Repository oder navigieren Sie zum Projektordner
2. Installieren Sie die Dependencies:
```bash
npm install
```

3. Erstellen Sie eine `.env.local` Datei im Projektroot:
```env
NEXT_PUBLIC_SUPABASE_URL=ihre_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=ihr_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=ihr_supabase_service_role_key
```

4. Starten Sie den Development-Server:
```bash
npm run dev
```

5. Öffnen Sie http://localhost:3000 im Browser

## Schritt 4: Deployment auf Vercel

1. Erstellen Sie ein Vercel-Konto (falls noch nicht vorhanden)
2. Verbinden Sie Ihr GitHub-Repository mit Vercel
3. Fügen Sie die Environment-Variablen in den Vercel-Projekt-Einstellungen hinzu:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
4. Deployen Sie das Projekt

## Domain-Verifizierung

### DNS-TXT-Methode

1. Fügen Sie einen TXT-Eintrag zu Ihrer DNS-Konfiguration hinzu
2. Format: `testmywebsite-verification=<token>`
3. Warten Sie auf die DNS-Propagierung (kann einige Minuten bis Stunden dauern)
4. Klicken Sie auf "Jetzt verifizieren" im Dashboard

### HTML-Datei-Methode

1. Erstellen Sie eine Datei unter `/.well-known/testmywebsite-verification.html`
2. Der Inhalt der Datei muss exakt dem Verifizierungs-Token entsprechen
3. Stellen Sie sicher, dass die Datei öffentlich über HTTP/HTTPS erreichbar ist
4. Klicken Sie auf "Jetzt verifizieren" im Dashboard

## Sicherheitshinweise

- Die Service Role Key sollte NIE im Client-Code verwendet werden
- Verwenden Sie Row Level Security (RLS) in Supabase (bereits im Schema enthalten)
- Scans sind nur auf verifizierten Domains möglich
- Alle Tests sind nicht-destruktiv

## Troubleshooting

### "Nicht autorisiert" Fehler
- Überprüfen Sie, ob die Supabase-Keys korrekt in `.env.local` eingetragen sind
- Stellen Sie sicher, dass RLS-Policies korrekt eingerichtet sind

### Domain-Verifizierung schlägt fehl
- DNS-TXT: Warten Sie länger auf die DNS-Propagierung (bis zu 48 Stunden)
- HTML-Datei: Überprüfen Sie, ob die Datei öffentlich erreichbar ist und der Inhalt exakt dem Token entspricht

### Scans schlagen fehl
- Überprüfen Sie, ob die Domain erreichbar ist
- Stellen Sie sicher, dass die Domain verifiziert ist
- Prüfen Sie die Server-Logs für detaillierte Fehlermeldungen
