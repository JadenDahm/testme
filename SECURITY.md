# Security Considerations

## Implementierte Sicherheitsmaßnahmen

### 1. Domain-Verifizierung (Kritisch)
- **DNS TXT Record**: Benutzer müssen einen TXT-Record in ihrer DNS-Konfiguration hinzufügen
- **HTML File**: Alternative Methode über `.well-known/security-scanner-verification.txt`
- **Blockierung**: Scans werden nur auf verifizierte Domains durchgeführt
- **Ablauf**: Verifizierungstokens laufen nach 7 Tagen ab

### 2. Rate Limiting
- **Pro Stunde**: Standardmäßig 10 Scans pro Benutzer pro Stunde
- **Verifizierungen**: Begrenzte Anzahl von Verifizierungsversuchen
- **Tracking**: Alle Rate Limits werden in der Datenbank protokolliert

### 3. Scan-Sicherheit
- **Non-Destructive**: Alle Scans sind read-only
- **Keine Datenmodifikation**: Keine Payloads, die Daten ändern
- **Timeouts**: Alle Requests haben strikte Timeouts (5-10 Sekunden)
- **Rate Limiting**: Verzögerungen zwischen Requests

### 4. Authentifizierung & Autorisierung
- **Supabase Auth**: Sichere Email/Password Authentifizierung
- **Row Level Security (RLS)**: Datenbankebene Zugriffskontrolle
- **Session Management**: Automatische Session-Erneuerung

### 5. Audit Logging
- **Scan Logs**: Alle Scan-Ereignisse werden protokolliert
- **Rate Limit Tracking**: Überwachung von Rate Limit-Verstößen
- **Error Logging**: Fehler werden für Debugging gespeichert

### 6. Input Validation
- **Domain Validation**: Regex-basierte Domain-Validierung
- **Zod Schemas**: Type-safe Validierung für alle Inputs
- **SQL Injection Prevention**: Parameterized Queries (Supabase)

## Wichtige Sicherheitshinweise

### ⚠️ Produktions-Checkliste

1. **Environment Variables**
   - Service Role Key niemals im Client-Code
   - Alle Secrets in Environment Variables
   - Keine Hardcoded Credentials

2. **Database Security**
   - RLS Policies aktiviert und getestet
   - Service Role Key nur für Background Jobs
   - Regelmäßige Backups

3. **Scan Limits**
   - Rate Limits anpassen je nach Nutzung
   - Max Scan Duration überwachen
   - Kill-Switch für problematische Scans

4. **Monitoring**
   - Überwachung von Rate Limit-Verstößen
   - Alerting bei ungewöhnlichen Aktivitäten
   - Regelmäßige Security Audits

5. **Legal Compliance**
   - Terms of Service implementieren
   - User Consent für Scans
   - Datenschutzerklärung

## Bekannte Limitierungen

1. **DNS Verification**: Verwendet Google DNS API, könnte in manchen Umgebungen blockiert sein
2. **Background Jobs**: Aktuell inline, sollte für Produktion auf Queue-System umgestellt werden
3. **Scan Timeouts**: Könnten für sehr große Websites zu kurz sein

## Empfohlene Verbesserungen

1. **WAF Integration**: Web Application Firewall für zusätzlichen Schutz
2. **IP Whitelisting**: Optional für vertrauenswürdige Benutzer
3. **2FA**: Zwei-Faktor-Authentifizierung für kritische Operationen
4. **Scan Scheduling**: Geplante Scans mit Benachrichtigungen
5. **API Rate Limiting**: Zusätzliches Rate Limiting auf API-Ebene
