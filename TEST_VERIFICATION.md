# Test & Verifikation - Scan-Debugging

## Schritt-für-Schritt Anleitung

### 1. Database Migration durchführen

Gehen Sie zu Supabase → SQL Editor und führen Sie aus:

```sql
-- Add progress tracking fields
ALTER TABLE scans
ADD COLUMN IF NOT EXISTS progress_message TEXT,
ADD COLUMN IF NOT EXISTS progress_details TEXT,
ADD COLUMN IF NOT EXISTS last_progress_at TIMESTAMPTZ;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_scans_last_progress_at 
ON scans(last_progress_at DESC);
```

### 2. Lokal testen

```bash
# App starten
npm run dev

# Terminal sollte zeigen:
# > next dev
# ▲ Next.js 14.0.0
# - Local: http://localhost:3000
```

### 3. Browser-Konsole vorbereiten

1. Öffnen Sie die App: `http://localhost:3000`
2. Drücken Sie `F12` um Developer Tools zu öffnen
3. Gehen Sie zum `Console` Tab
4. Sie sollten die Scanner-Logs sehen, wenn ein Scan läuft

### 4. Einen Test-Scan durchführen

1. Gehen Sie zum Dashboard
2. Wählen Sie eine bereits verifizierte Domain
3. Klicken Sie "Scan starten"
4. Sie sollten sofort sehen:
   - Progress-Box im UI
   - Logs in der Browser-Konsole
   - Server-Logs im Terminal

### 5. Logs prüfen

#### Im Terminal (Server-Logs):
```
[2025-02-03T10:30:45.123Z] SCAN abc-123: Starte Scan - Domain: example.com
[testReachability] Testing: https://example.com
[testReachability] Status 200 (1234ms)
[Reachability] Dauer: 1234ms
...
```

#### Im Browser (Console):
```
Polling scan data...
Fetched scan data
Progress: "Phase 1/6: Teste Erreichbarkeit"
Details: "https://example.com"
```

#### Im UI:
```
🔵 Scan läuft...
⚡ Phase 2/6: Analysiere Security-Headers
   Testing: https://example.com
```

### 6. Logs exportieren / speichern

#### Terminal-Logs speichern (Mac/Linux):
```bash
npm run dev > scan_logs.txt 2>&1
```

#### Browser-Logs exportieren:
1. F12 → Console
2. Rechtsklick → Save as...
3. Oder: `Ctrl+Shift+K` um zu kopieren

### 7. Datenbank prüfen

Gehen Sie zu Supabase → SQL Editor:

```sql
-- Aktiven Scan sehen
SELECT id, status, progress_message, progress_details, last_progress_at
FROM scans
ORDER BY created_at DESC
LIMIT 5;
```

Sie sollten sehen:
```
id                  | status  | progress_message          | last_progress_at
abc-123             | running | Phase 3/6: Crawle Website | 2025-02-03 10:30:50
```

## Erwartete Verhaltensweisen

### ✅ Wenn alles funktioniert

```
1. Terminal zeigt:
   [testReachability] Testing: https://...
   [crawlWebsite] Fetche: https://...
   [searchForSecrets] Durchsuche: https://...

2. Browser zeigt:
   🔵 Scan läuft...
   ⚡ Phase X/6: [aktuelle Phase]
   Details: [aktuelle URL oder Info]

3. Logs aktualisieren sich alle 2 Sekunden

4. Nach ~20 Sekunden: Status wird "completed"

5. Fehlschlag nach >25 Sekunden ist normal (Timeout)
```

### ❌ Wenn etwas falsch ist

| Problem | Ursache | Lösung |
|---------|--------|--------|
| Keine Logs | Scanner läuft nicht | Prüfen Sie `/api/scans/{id}/start` |
| Progress-Box erscheint nicht | DB nicht aktualisiert | Migration nicht gemacht? |
| Scan wird nie fertig | Timeout überschritten | Website zu langsam? |
| Fehlermeldung im UI | Scanner-Fehler | Prüfen Sie Terminal-Logs |

## Debugg-Befehle

### 1. Alle Scans sehen
```sql
SELECT id, domain_id, status, progress_message, created_at
FROM scans
ORDER BY created_at DESC;
```

### 2. Einen spezifischen Scan detailliert sehen
```sql
SELECT * FROM scans WHERE id = 'abc-123';
```

### 3. Vulnerabilities eines Scans
```sql
SELECT type, severity, title, affected_url
FROM vulnerabilities
WHERE scan_id = 'abc-123'
ORDER BY severity DESC;
```

### 4. Performance-Daten eines Scans
```sql
SELECT 
  id,
  status,
  progress_message,
  EXTRACT(EPOCH FROM (last_progress_at - created_at)) as elapsed_seconds,
  EXTRACT(EPOCH FROM (completed_at - started_at)) as total_duration_seconds
FROM scans
WHERE id = 'abc-123';
```

## Performance-Messung

### Erwartete Zeiten

```
Phase 1 (Erreichbarkeit):    1-2 Sekunden
Phase 2 (Security Headers):  1-2 Sekunden
Phase 3 (Crawl):             2-5 Sekunden
Phase 4 (Secrets):           2-4 Sekunden
Phase 5 (Vulnerabilities):   3-8 Sekunden
Phase 6 (Dateien):           1-3 Sekunden
─────────────────────────────────────────
TOTAL:                      10-24 Sekunden
```

### Wenn zu lange dauert

1. **Phase 3 dauert >10 Sekunden?**
   - Website ist langsam
   - Reduzieren Sie `maxPages` in `crawlWebsite()`

2. **Phase 5 dauert >10 Sekunden?**
   - SQL-Injection Tests sind langsam
   - Reduzieren Sie `testParams` Anzahl

3. **Phase 6 dauert >5 Sekunden?**
   - Reduzieren Sie Anzahl der `sensitiveFiles` zu prüfen

## Fehlerbehandlung prüfen

### Wenn Scan fehlschlägt

```sql
SELECT 
  id, 
  status, 
  error_message,
  EXTRACT(EPOCH FROM (completed_at - created_at)) as duration_seconds
FROM scans
WHERE status = 'failed'
ORDER BY created_at DESC;
```

Häufige Fehler:
- "Website nicht erreichbar" → Domain offline?
- "Scan-Timeout überschritten" → Timeout nach 25 Sekunden
- "Domain ist nicht verifiziert" → Domain nicht verifiziert

## Browser-Konsolen-Filter

Um nur Scanner-Logs zu sehen, geben Sie in der Konsole ein:

```javascript
// Nur Scanner-logs
document.querySelectorAll('*').forEach(el => {
  if(el.innerText.includes('[')) console.log(el.innerText);
});
```

Oder nutzen Sie den Browser-Filter:
```
Filter: [
```

## Nächste Schritte zur Optimierung

1. ✅ Logs prüfen und verstehen
2. ✅ Performance-Phasen identifizieren
3. ⏭️ Timeout-Werte anpassen (falls nötig)
4. ⏭️ Scanner für spezifische Websites optimieren

