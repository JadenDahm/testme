# Scan-Debugging und Progress-Tracking

## Was wurde hinzugefügt?

Wenn der Scanner über 5 Minuten läuft, können Sie jetzt sehen, wo es steckenbleibt:

### 1. **Echtzeit-Progress-Anzeige im Dashboard**
   - Während ein Scan läuft, sehen Sie eine blaue Info-Box mit:
     - Aktuelle Phase (z.B. "Phase 2/6: Analysiere Security-Headers")
     - Details zu dem, was gerade gemacht wird (z.B. spezifische URLs)

### 2. **Detailliertes Logging in der Konsole**
   - Der Scanner loggt jetzt jedes Schritt mit Zeitstempel:
   ```
   [HH:MM:SS.mmm] SCAN {scanId}: Phase 1/6: Teste Erreichbarkeit
   [testReachability] Testing: https://example.com
   [testReachability] Status 200 (1234ms)
   [crawlWebsite] Starte Crawl von https://example.com
   [crawlWebsite] Fetche: https://example.com (1/3)
   [crawlWebsite] OK (2567ms)
   ```

### 3. **Performance-Zeitmessung pro Phase**
   ```
   [Reachability] Dauer: 1234ms
   [Security Headers] Dauer: 2345ms
   [Crawl] Dauer: 3456ms, Seiten gescannt: 3
   [Secrets] Dauer: 4567ms
   [Vulnerabilities] Dauer: 5678ms
   [Sensitive Files] Dauer: 6789ms
   [SCAN COMPLETE] Scan {scanId} abgeschlossen in 25000ms
   ```

## So finden Sie die Logs

### In der Browser-Konsole (Frontend):
1. Öffnen Sie den Browser (F12 oder Ctrl+Shift+I)
2. Gehen Sie zu "Console"
3. Starten Sie einen Scan und sehen Sie die Messages

### In der Server-Konsole (Backend):
1. Der Server (Next.js) gibt die Logs aus
2. Wenn lokal: Schauen Sie in Ihr Terminal, wo der Dev-Server läuft
3. Auf Production (z.B. Vercel): Überprüfen Sie die Logs über das Dashboard

## Was die Phasen machen

| Phase | Was passiert | Typische Dauer |
|-------|-------------|-----------------|
| 1/6 | Teste Erreichbarkeit | 1-3 Sekunden |
| 2/6 | Analysiere Security-Headers | 1-3 Sekunden |
| 3/6 | Crawle Website | 2-8 Sekunden |
| 4/6 | Suche nach sensiblen Daten | 2-6 Sekunden |
| 5/6 | Teste auf Schwachstellen (SQL Injection, XSS) | 2-10 Sekunden |
| 6/6 | Prüfe sensible Dateien | 1-5 Sekunden |

**Gesamtdauer:** 9-35 Sekunden (abhängig von Website-Größe und Netzwerkgeschwindigkeit)

## Wenn ein Scan hängenbleibt

1. **Schauen Sie die Logs an** - Welche Phase ist zuletzt geloggt worden?
2. **Network-Probleme?** - Wenn die Website sehr langsam antwortet
3. **Große Website?** - Der Crawler prüft die ersten 3 Seiten
4. **Timeout?** - Nach 25 Sekunden wird der Scan automatisch abgebrochen

## Database Migration

Um das Progress-Tracking zu aktivieren, führen Sie diese Migration aus:

```sql
ALTER TABLE scans
ADD COLUMN IF NOT EXISTS progress_message TEXT,
ADD COLUMN IF NOT EXISTS progress_details TEXT,
ADD COLUMN IF NOT EXISTS last_progress_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_scans_last_progress_at 
ON scans(last_progress_at DESC);
```

Datei: `supabase/migrations/add_scan_progress_fields.sql`
