# Nächste Schritte nach Git-Push

## ✅ Checkliste

### 1. Dependencies installieren
```bash
npm install
```

### 2. Supabase-Projekt einrichten

#### 2.1 Supabase-Konto erstellen
- Gehen Sie zu https://supabase.com
- Erstellen Sie ein kostenloses Konto
- Erstellen Sie ein neues Projekt

#### 2.2 Supabase-Keys notieren
Nach der Projekterstellung finden Sie die Keys unter:
- **Project Settings** > **API**
- Notieren Sie sich:
  - `Project URL` (z.B. `https://xxxxx.supabase.co`)
  - `anon` `public` Key
  - `service_role` `secret` Key (⚠️ WICHTIG: Geheim halten!)

#### 2.3 Datenbankschema einrichten
1. Öffnen Sie im Supabase-Dashboard: **SQL Editor**
2. Öffnen Sie die Datei `supabase/schema.sql` in diesem Projekt
3. Kopieren Sie den gesamten Inhalt
4. Fügen Sie ihn in den SQL Editor ein
5. Klicken Sie auf **Run** (oder F5)

### 3. Environment-Variablen konfigurieren

Erstellen Sie eine `.env.local` Datei im Projektroot:

```env
NEXT_PUBLIC_SUPABASE_URL=https://ihr-projekt.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=ihr_anon_key_hier
SUPABASE_SERVICE_ROLE_KEY=ihr_service_role_key_hier
```

**Wichtig:**
- `.env.local` ist bereits in `.gitignore` und wird NICHT auf Git gepusht
- Ersetzen Sie die Platzhalter mit Ihren echten Supabase-Keys

### 4. Development-Server starten

```bash
npm run dev
```

Öffnen Sie dann http://localhost:3000 im Browser.

### 5. Erste Schritte testen

1. **Registrierung testen:**
   - Gehen Sie zu http://localhost:3000/auth/register
   - Erstellen Sie ein Test-Konto

2. **Domain hinzufügen:**
   - Nach dem Login gelangen Sie zum Dashboard
   - Klicken Sie auf "Domain hinzufügen"
   - Geben Sie eine Test-Domain ein (z.B. `example.com`)

3. **Domain verifizieren:**
   - Wählen Sie eine Verifizierungsmethode (DNS-TXT oder HTML-Datei)
   - Folgen Sie den Anweisungen im Dashboard
   - Klicken Sie auf "Jetzt verifizieren"

4. **Scan starten:**
   - Nach erfolgreicher Verifizierung können Sie einen Scan starten
   - Der Scan läuft im Hintergrund
   - Ergebnisse werden automatisch angezeigt

## 🚀 Optional: Deployment auf Vercel

### Schritt 1: Vercel-Konto erstellen
- Gehen Sie zu https://vercel.com
- Melden Sie sich mit GitHub an
- Verbinden Sie Ihr Repository `JadenDahm/testme`

### Schritt 2: Projekt importieren
- Vercel erkennt automatisch Next.js-Projekte
- Klicken Sie auf **Import**

### Schritt 3: Environment-Variablen hinzufügen
Im Vercel-Dashboard unter **Settings** > **Environment Variables**:

```
NEXT_PUBLIC_SUPABASE_URL=https://ihr-projekt.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=ihr_anon_key
SUPABASE_SERVICE_ROLE_KEY=ihr_service_role_key
```

### Schritt 4: Deployen
- Klicken Sie auf **Deploy**
- Warten Sie auf den Abschluss des Deployments
- Ihre App ist jetzt live! 🎉

## ⚠️ Wichtige Hinweise

1. **Service Role Key:**
   - Dieser Key hat Admin-Rechte
   - NUR auf dem Server verwenden (nie im Client-Code)
   - Nicht in Git committen

2. **Domain-Verifizierung:**
   - DNS-TXT: Kann bis zu 48 Stunden dauern (meist 5-30 Minuten)
   - HTML-Datei: Sofort verfügbar, wenn die Datei korrekt hochgeladen wurde

3. **Scans:**
   - Nur auf verifizierten Domains möglich
   - Alle Tests sind nicht-destruktiv
   - Scans können einige Minuten dauern

## 🐛 Troubleshooting

### "Module not found" Fehler
```bash
# Lösche node_modules und installiere neu
rm -rf node_modules package-lock.json
npm install
```

### "Nicht autorisiert" Fehler
- Überprüfen Sie die Supabase-Keys in `.env.local`
- Stellen Sie sicher, dass das Datenbankschema korrekt eingerichtet ist
- Prüfen Sie die RLS-Policies in Supabase

### Domain-Verifizierung funktioniert nicht
- **DNS-TXT:** Warten Sie länger (bis zu 48h), prüfen Sie mit `nslookup -type=TXT domain.com`
- **HTML-Datei:** Überprüfen Sie, ob die Datei öffentlich erreichbar ist: `https://domain.com/.well-known/testmywebsite-verification.html`

### Build-Fehler auf Vercel
- Überprüfen Sie, ob alle Environment-Variablen in Vercel gesetzt sind
- Prüfen Sie die Build-Logs in Vercel für Details

## 📚 Weitere Ressourcen

- **Supabase Docs:** https://supabase.com/docs
- **Next.js Docs:** https://nextjs.org/docs
- **Vercel Docs:** https://vercel.com/docs
