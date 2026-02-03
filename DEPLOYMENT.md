# Deployment Guide

## Voraussetzungen

1. **Supabase Account**: Erstellen Sie ein Supabase-Projekt
2. **Vercel Account**: Für das Hosting (oder alternativ andere Plattformen)

## Setup-Schritte

### 1. Supabase Setup

1. Erstellen Sie ein neues Supabase-Projekt
2. Gehen Sie zu SQL Editor und führen Sie das Schema aus: `supabase/schema.sql`
3. Kopieren Sie die folgenden Werte aus den Project Settings:
   - Project URL
   - Anon/Public Key
   - Service Role Key (geheim halten!)

### 2. Environment Variables

Erstellen Sie eine `.env.local` Datei (oder setzen Sie diese in Vercel):

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
NEXT_PUBLIC_APP_URL=https://your-domain.com
SCAN_RATE_LIMIT_PER_HOUR=10
MAX_SCAN_DURATION_MINUTES=30
```

### 3. Vercel Deployment

1. Verbinden Sie Ihr GitHub Repository mit Vercel
2. Fügen Sie die Environment Variables hinzu
3. Deploy!

### 4. Background Jobs (Optional, aber empfohlen)

Für Produktionsumgebungen sollten Scans über einen Background Job Processor laufen:

**Option A: Vercel Cron**
Erstellen Sie `vercel.json`:
```json
{
  "crons": [{
    "path": "/api/scans/process",
    "schedule": "*/5 * * * *"
  }]
}
```

**Option B: Inngest**
- Installieren Sie Inngest
- Erstellen Sie eine Funktion, die regelmäßig `/api/scans/process` aufruft

**Option C: Externe Queue**
- Verwenden Sie eine Queue-Service wie BullMQ, AWS SQS, etc.

## Sicherheitshinweise

1. **Service Role Key**: Niemals im Client-Code verwenden, nur auf dem Server
2. **Rate Limiting**: Anpassen je nach Nutzung
3. **Domain Verification**: Kritisch - nur verifizierte Domains scannen
4. **Scan Timeouts**: Sicherstellen, dass Scans nicht zu lange laufen

## Monitoring

- Überwachen Sie die `scan_queue` Tabelle für hängende Scans
- Überwachen Sie die `rate_limits` Tabelle für Missbrauch
- Logs sind in der `scan_logs` Tabelle gespeichert

## Skalierung

- Für hohe Last: Verwenden Sie eine externe Queue
- Database: Supabase Auto-Scaling aktivieren
- Scans: Können parallelisiert werden (vorsichtig mit Rate Limits)
