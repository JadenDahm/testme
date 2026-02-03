# Testing-Guide: Funktioniert die Website wirklich?

## ✅ Checkliste zum Testen

### 1. Lokale Entwicklungsumgebung testen

#### Schritt 1: Dependencies installieren
```bash
npm install
```

#### Schritt 2: Supabase einrichten
- Supabase-Projekt erstellen
- Schema ausführen (`supabase/schema.sql`)
- Keys in `.env.local` eintragen

#### Schritt 3: Server starten
```bash
npm run dev
```

#### Schritt 4: Basis-Funktionen testen
- [ ] Landing Page lädt (http://localhost:3000)
- [ ] Registrierung funktioniert
- [ ] Login funktioniert
- [ ] Dashboard ist nach Login sichtbar

### 2. Domain-Verifizierung testen

#### Test 1: HTML-Datei-Verifizierung (Einfachste Methode)

1. **Domain hinzufügen:**
   - Gehen Sie zum Dashboard
   - Klicken Sie auf "Domain hinzufügen"
   - Geben Sie eine Test-Domain ein (z.B. `example.com`)
   - Wählen Sie "HTML-Datei" als Verifizierungsmethode

2. **Datei erstellen:**
   - Erstellen Sie auf Ihrem Server: `/.well-known/testmywebsite-verification.html`
   - Inhalt: Nur der angezeigte Token (z.B. `abc123xyz789`)
   - Stellen Sie sicher, dass die Datei öffentlich erreichbar ist

3. **Verifizierung testen:**
   - Klicken Sie auf "Jetzt verifizieren"
   - Sollte sofort funktionieren (keine DNS-Propagierung nötig)

#### Test 2: DNS-TXT-Verifizierung

1. **Domain hinzufügen:**
   - Wählen Sie "DNS-TXT-Eintrag" als Verifizierungsmethode
   - Notieren Sie sich den Token

2. **DNS-Eintrag hinzufügen:**
   ```
   Typ: TXT
   Name: @ (oder Ihre Domain)
   Wert: testmywebsite-verification=<token>
   ```

3. **DNS prüfen (vor Verifizierung):**
   ```bash
   # Windows PowerShell
   nslookup -type=TXT example.com
   
   # Oder online: https://mxtoolbox.com/TXTLookup.aspx
   ```

4. **Verifizierung testen:**
   - Warten Sie 5-30 Minuten (DNS-Propagierung)
   - Klicken Sie auf "Jetzt verifizieren"
   - Sollte funktionieren, wenn DNS-Eintrag sichtbar ist

### 3. Security-Scan testen

#### Voraussetzungen
- Domain muss verifiziert sein
- Domain muss erreichbar sein (HTTP oder HTTPS)

#### Scan starten
1. Gehen Sie zur Domain-Detail-Seite
2. Klicken Sie auf "Scan starten"
3. Warten Sie auf den Abschluss (kann einige Minuten dauern)

#### Erwartete Ergebnisse
- Scan-Status ändert sich: `pending` → `running` → `completed`
- Vulnerabilities werden gefunden (abhängig von der Website)
- Security-Score wird berechnet
- Report wird angezeigt

### 4. Bekannte Probleme und Lösungen

#### Problem: "Nicht autorisiert" Fehler
**Ursache:** Supabase-Keys falsch oder RLS-Policies nicht eingerichtet

**Lösung:**
- Überprüfen Sie `.env.local`
- Führen Sie `supabase/schema.sql` erneut aus
- Prüfen Sie Supabase Dashboard → Authentication → Policies

#### Problem: DNS-Verifizierung schlägt fehl
**Ursache:** DNS-Propagierung noch nicht abgeschlossen oder falscher Eintrag

**Lösung:**
- Warten Sie länger (bis zu 48h)
- Prüfen Sie den DNS-Eintrag mit `nslookup`
- Verwenden Sie stattdessen HTML-Datei-Methode

#### Problem: Scan schlägt fehl
**Ursache:** Domain nicht erreichbar oder Timeout

**Lösung:**
- Überprüfen Sie, ob die Domain erreichbar ist
- Prüfen Sie Firewall-Einstellungen
- Überprüfen Sie Server-Logs

#### Problem: "Module not found" Fehler
**Ursache:** Dependencies nicht installiert

**Lösung:**
```bash
rm -rf node_modules package-lock.json
npm install
```

### 5. Deployment auf Vercel testen

#### Schritt 1: Repository verbinden
- Vercel Dashboard → New Project
- GitHub-Repository auswählen

#### Schritt 2: Environment-Variablen setzen
- Settings → Environment Variables
- Alle drei Supabase-Keys hinzufügen

#### Schritt 3: Deployen
- Klicken Sie auf "Deploy"
- Warten Sie auf Abschluss

#### Schritt 4: Testen
- Öffnen Sie die bereitgestellte URL
- Testen Sie alle Funktionen wie lokal

### 6. DNS-TXT: Wie genau funktioniert es?

#### Technischer Ablauf:

1. **Token-Generierung:**
   ```typescript
   // In app/api/domains/route.ts
   const verificationToken = crypto.randomBytes(32).toString('hex');
   // Beispiel: "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6"
   ```

2. **DNS-Eintrag erstellen:**
   ```
   Typ: TXT
   Name: @ (Root-Domain) oder subdomain
   Wert: testmywebsite-verification=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6
   TTL: 3600 (1 Stunde)
   ```

3. **DNS-Abfrage durch die App:**
   ```typescript
   // In app/api/domains/[id]/verify/route.ts
   const txtRecords = await resolveTxt('example.com');
   // Ergebnis: [
   //   ['v=spf1 include:_spf.google.com ~all'],
   //   ['testmywebsite-verification=a1b2c3d4e5f6...']
   // ]
   ```

4. **Vergleich:**
   ```typescript
   const expectedValue = `testmywebsite-verification=${domain.verification_token}`;
   const found = txtRecords.some(record => 
     record.join('').includes(expectedValue)
   );
   ```

#### Warum ist das sicher?

✅ **Nur Domain-Besitzer können DNS ändern**
- DNS-Einträge können nur vom Domain-Besitzer geändert werden
- Erfordert Zugriff auf DNS-Provider oder Nameserver

✅ **Token ist zufällig und einzigartig**
- 64 Zeichen Hex-String (256 Bit Entropie)
- Praktisch unmöglich zu erraten

✅ **Öffentlich verifizierbar**
- Jeder kann die DNS-Einträge sehen
- Aber nur der Besitzer kann sie ändern

#### Mögliche Probleme:

**Problem 1: DNS-Propagierung**
- DNS-Änderungen brauchen Zeit
- Lösung: Warten (5-30 Min, max. 48h)

**Problem 2: Serverless-Umgebung**
- `resolveTxt` funktioniert auf Vercel
- Falls Probleme: Alternative DNS-Resolver verwenden

**Problem 3: Falscher Eintrag**
- Format muss exakt sein: `testmywebsite-verification=<token>`
- Keine Leerzeichen, keine Anführungszeichen

### 7. Debugging-Tipps

#### DNS-Einträge prüfen:
```bash
# Windows
nslookup -type=TXT example.com

# Linux/Mac
dig TXT example.com

# Online
https://mxtoolbox.com/TXTLookup.aspx
```

#### Logs prüfen:
- Vercel: Dashboard → Deployments → Logs
- Lokal: Terminal-Ausgabe
- Supabase: Dashboard → Logs

#### Browser-Console:
- F12 → Console
- Netzwerk-Tab für API-Requests

### 8. Erwartete Funktionalität

✅ **Funktioniert:**
- Registrierung und Login
- Domain hinzufügen
- Domain verifizieren (beide Methoden)
- Scans starten
- Reports anzeigen
- Security-Score berechnen

⚠️ **Einschränkungen:**
- Scans sind nicht-destruktiv (keine echten Angriffe)
- Crawling limitiert auf 10 Seiten (Demo)
- Rate-Limits für API-Calls
- DNS-Propagierung kann dauern

### 9. Performance-Tests

#### Lokal:
- Server-Start: ~2-5 Sekunden
- Scan-Dauer: 1-5 Minuten (abhängig von Website-Größe)
- Verifizierung: < 5 Sekunden

#### Vercel:
- Cold Start: ~1-3 Sekunden
- Warm: < 500ms
- Scan: Wie lokal (abhängig von Website)

### 10. Sicherheitstests

✅ **Getestet:**
- RLS-Policies funktionieren
- Nur eigene Domains sichtbar
- Nur verifizierte Domains scannbar
- Keine destruktiven Tests

⚠️ **Zu beachten:**
- Service Role Key nie im Client-Code
- Environment-Variablen nicht committen
- Rate-Limits respektieren
