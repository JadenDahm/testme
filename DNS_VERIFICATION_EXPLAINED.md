# DNS-TXT-Verifizierung - Detaillierte Erklärung

## Wie funktioniert DNS-TXT-Verifizierung?

### Grundprinzip

DNS-TXT-Einträge sind Text-Einträge im DNS-System, die für verschiedene Zwecke verwendet werden können (z.B. SPF, DKIM, Domain-Verifizierung).

### Ablauf der Verifizierung

1. **Token-Generierung:**
   - Wenn Sie eine Domain hinzufügen, wird ein zufälliger Token generiert (z.B. `a1b2c3d4e5f6...`)
   - Dieser Token wird in der Datenbank gespeichert

2. **DNS-Eintrag erstellen:**
   - Sie müssen einen TXT-Eintrag in Ihrer DNS-Konfiguration hinzufügen
   - Format: `testmywebsite-verification=<token>`
   - Beispiel: `testmywebsite-verification=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6`

3. **DNS-Propagierung:**
   - DNS-Änderungen brauchen Zeit, um sich weltweit zu verbreiten
   - Normalerweise: 5-30 Minuten
   - Kann bis zu 48 Stunden dauern (selten)

4. **Verifizierung durch die App:**
   - Die App fragt die DNS-Server nach TXT-Einträgen für Ihre Domain
   - Sie sucht nach einem Eintrag, der `testmywebsite-verification=<token>` enthält
   - Wenn gefunden → Domain ist verifiziert ✅

### Technische Details

#### Wie die App prüft:

```typescript
// 1. DNS-Abfrage für TXT-Einträge
const txtRecords = await resolveTxt(domain.domain);
// Beispiel-Ergebnis: [
//   ['v=spf1 include:_spf.google.com ~all'],
//   ['testmywebsite-verification=a1b2c3d4e5f6...']
// ]

// 2. Suche nach dem erwarteten Wert
const expectedValue = `testmywebsite-verification=${domain.verification_token}`;
const found = txtRecords.some((record) => {
  const combined = Array.isArray(record) ? record.join('') : record;
  return combined.includes(expectedValue);
});
```

#### Warum funktioniert das?

- **DNS ist öffentlich:** Jeder kann die DNS-Einträge einer Domain abfragen
- **TXT-Einträge sind sichtbar:** TXT-Einträge sind öffentlich einsehbar
- **Nur Domain-Besitzer können ändern:** Nur Sie haben Zugriff auf Ihre DNS-Konfiguration
- **Sicherheit:** Der Token ist zufällig und einzigartig → schwer zu erraten

### Beispiel: Schritt für Schritt

**Schritt 1: Domain hinzufügen**
```
Domain: example.com
Token generiert: abc123xyz789
```

**Schritt 2: DNS-Eintrag hinzufügen**
In Ihrem DNS-Provider (z.B. Cloudflare, Namecheap, GoDaddy):
```
Typ: TXT
Name: @ (oder example.com)
Wert: testmywebsite-verification=abc123xyz789
TTL: 3600 (oder Standard)
```

**Schritt 3: Warten auf Propagierung**
- Warten Sie 5-30 Minuten
- Prüfen Sie mit: `nslookup -type=TXT example.com`

**Schritt 4: Verifizierung starten**
- Klicken Sie auf "Jetzt verifizieren"
- Die App fragt DNS ab
- Wenn der Eintrag gefunden wird → ✅ Verifiziert

### Mögliche Probleme

#### Problem 1: DNS-Propagierung noch nicht abgeschlossen
**Symptom:** Verifizierung schlägt fehl, obwohl Eintrag hinzugefügt wurde

**Lösung:**
- Warten Sie länger (bis zu 48 Stunden)
- Prüfen Sie mit: `nslookup -type=TXT example.com`
- Verwenden Sie verschiedene DNS-Server zum Testen

#### Problem 2: Falscher Eintrag
**Symptom:** Token stimmt nicht überein

**Lösung:**
- Überprüfen Sie, ob der Eintrag exakt so lautet: `testmywebsite-verification=<token>`
- Keine zusätzlichen Leerzeichen
- Groß-/Kleinschreibung beachten (Token ist case-sensitive)

#### Problem 3: Serverless-Umgebung (Vercel)
**Symptom:** DNS-Abfrage schlägt fehl

**Lösung:**
- Node.js `dns/promises` funktioniert auf Vercel
- Falls Probleme: Alternative DNS-Resolver verwenden (z.B. Cloudflare DNS API)

### Alternative: HTML-Datei-Verifizierung

Falls DNS-TXT Probleme macht, können Sie die HTML-Datei-Methode verwenden:

1. Erstellen Sie: `/.well-known/testmywebsite-verification.html`
2. Inhalt: Nur der Token (z.B. `abc123xyz789`)
3. Sofort verfügbar (keine DNS-Propagierung nötig)

### Sicherheit

✅ **Sicher, weil:**
- Nur Domain-Besitzer können DNS-Einträge ändern
- Token ist zufällig und einzigartig
- TXT-Einträge sind öffentlich, aber der Token ist geheim

⚠️ **Wichtig:**
- Der Token sollte geheim bleiben (nicht öffentlich teilen)
- Nach Verifizierung kann der TXT-Eintrag gelöscht werden (optional)
- Die Verifizierung bleibt bestehen, auch wenn der Eintrag gelöscht wird
