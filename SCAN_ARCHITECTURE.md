# Architektur: Scan-Progress-Tracking

## Datenfluss

```
┌─────────────────────────────────────────────────────────────────┐
│                    SCAN-PROZESS (Backend)                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  runSecurityScan() [lib/scanner/index.ts]                       │
│  └─ updateScanProgress() ──┐                                    │
│     ├─ console.log() ──────┼──> KONSOLEN-LOGS                  │
│     └─ supabase.update() ──┼──> DATABASE UPDATES               │
│        └─> scans.progress_message                               │
│        └─> scans.progress_details                               │
│        └─> scans.last_progress_at                               │
│                             │                                    │
│  6 Phasen mit Logging:      │                                    │
│  1. testReachability()      │                                    │
│  2. analyzeSecurityHeaders()│                                    │
│  3. crawlWebsite()          │                                    │
│  4. searchForSecrets()      │                                    │
│  5. testCommonVulnerabilities()│                                 │
│  6. checkSensitiveFiles()   │                                    │
│                             │                                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
        ┌─────────────────────────────────────────┐
        │   Supabase Database (scans table)        │
        ├─────────────────────────────────────────┤
        │ - id                                     │
        │ - status (running, completed, failed)    │
        │ - progress_message (NEW)                 │
        │ - progress_details (NEW)                 │
        │ - last_progress_at (NEW)                 │
        │ - error_message                          │
        │ - completed_at                           │
        └─────────────────────────────────────────┘
                              │
                              ▼
        ┌─────────────────────────────────────────┐
        │   Frontend Polling (2 Sekunden)          │
        │   ScanReport.tsx                         │
        │   fetch(/api/scans/{id})                 │
        └─────────────────────────────────────────┘
                              │
                              ▼
        ┌─────────────────────────────────────────┐
        │   UI-Update in Echtzeit                  │
        │   ├─ Progress Message Box                │
        │   │  └─ "Phase X/6: ..."                │
        │   └─ Progress Details                    │
        │      └─ "Testing: https://..."          │
        └─────────────────────────────────────────┘
```

## Komponenten-Interaktion

### 1. Scanner (Backend)
```typescript
// lib/scanner/index.ts
updateScanProgress(supabase, scanId, "Phase 1/6", "Testing...")
  ↓
  ├─ console.log() → Server-Logs
  └─ supabase.from('scans').update({
       progress_message: "Phase 1/6",
       progress_details: "Testing...",
       last_progress_at: NOW()
     })
```

### 2. Database
```sql
-- Neue Spalten für Progress-Tracking
scans.progress_message       -- Aktuelle Phase-Beschreibung
scans.progress_details       -- Details (URLs, etc.)
scans.last_progress_at       -- Zeitstempel
```

### 3. Frontend Polling
```typescript
// components/dashboard/ScanReport.tsx
setInterval(async () => {
  const data = await fetch(`/api/scans/${scanId}`)
  
  // Update UI mit neuen Progress-Infos
  setProgressMessage(data.scan.progress_message)
  setProgressDetails(data.scan.progress_details)
}, 2000) // Alle 2 Sekunden
```

### 4. UI-Anzeige
```tsx
{isRunning && (progressMessage || progressDetails) && (
  <div className="bg-blue-50 border border-blue-200 p-4">
    <Activity className="animate-pulse" />
    <div>{progressMessage}</div>
    <div>{progressDetails}</div>
  </div>
)}
```

## Ablauf eines Scans

```
1. User klickt "Scan starten"
   ↓
2. /api/scans → Scan wird erstellt (status: pending)
   ↓
3. /api/scans/{id}/start → runSecurityScan() startet
   ↓
4. updateScanProgress() wird aufgerufen für jede Phase
   ├─ Logs in Console
   └─ Aktualisiert Datenbank
   ↓
5. Frontend pollt jede 2 Sekunden die DB
   ├─ Holt neue progress_message und details
   └─ Zeigt sie im UI an
   ↓
6. Nach ~20-30 Sekunden ist Scan fertig
   ├─ Status: completed
   ├─ Vulnerabilities gespeichert
   └─ Polling stoppt automatisch
```

## Debugging-Workflow

```
Problem: Scanner hängt bei 5+ Minuten

1. Schaue Console-Logs (Server & Browser)
   → Welche Phase ist zuletzt geloggt?
   
2. Sieh Progress-Box im UI
   → Was zeigt die aktuelle Phase?
   
3. Prüfe Datenbank direkt
   SELECT * FROM scans WHERE id = '...';
   → Schaut progress_message noch aktuell aus?
   
4. Überprüfe Netzwerk
   → Antwortet die Website schnell?
   
5. Analysiere Performance-Logs
   → [Phase X] Dauer: Xms
   → Welche Phase dauert am längsten?
```

## Logs-Orte

```
┌──────────────────────────────────────────┐
│      WHERE SIND DIE LOGS?                 │
├──────────────────────────────────────────┤
│                                           │
│ 1. Browser Console (F12)                 │
│    → Client-seitige Polling-Logs         │
│    → UI-Updates                          │
│                                           │
│ 2. Server-Konsole (Terminal)             │
│    → Scanner-Logs                        │
│    → Jede HTTP-Request/Response          │
│    → Fehler-Meldungen                    │
│                                           │
│ 3. Supabase Dashboard                    │
│    → scans.progress_message              │
│    → scans.last_progress_at              │
│    → Real-time Datenbank-Änderungen      │
│                                           │
│ 4. Vercel/Production Logs                │
│    → Falls auf Production deployed       │
│    → Über Vercel Dashboard sichtbar      │
│                                           │
└──────────────────────────────────────────┘
```

## Performance-Metriken

```
Erwartete Zeiten pro Phase:

Phase 1: Erreichbarkeit      ~1-2 Sekunden
Phase 2: Security Headers    ~1-2 Sekunden  
Phase 3: Website-Crawl       ~2-5 Sekunden
Phase 4: Secret-Suche        ~2-4 Sekunden
Phase 5: Vulnerabilities     ~3-8 Sekunden
Phase 6: Sensible Dateien    ~1-3 Sekunden

Total: 10-24 Sekunden (normal)
       25 Sekunden (Timeout)
```
