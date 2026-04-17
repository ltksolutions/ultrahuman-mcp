# 🏋️ Ultrahuman MCP Server (Vercel)

Remote MCP server pre Ultrahuman Ring, deploynutý na Vercel ako serverless function.
Pripojí Claude.ai k tvojim zdravotným dátam z prsteňa.

## Dostupné nástroje (11 tools)

| Tool | Popis |
|------|-------|
| `get_all_metrics` | Všetky metriky za daný dátum |
| `get_sleep` | Spánok (fázy, trvanie, skóre) |
| `get_heart_rate` | Tepová frekvencia |
| `get_hrv` | Heart Rate Variability |
| `get_steps` | Kroky |
| `get_temperature` | Teplota kože |
| `get_recovery` | Recovery index |
| `get_movement` | Movement index, kalórie |
| `get_vo2max` | VO2 Max |
| `get_profile` | Profil používateľa |
| `get_date_range` | Metriky za rozsah dátumov (max 30 dní) |

---

## Krok 1: Získaj Ultrahuman API prístup

1. Napíš na **support@ultrahuman.com** alebo cez chat v Ultrahuman appke
2. Požiadaj o **API Auth Token** a **Partner ID**
3. Uveď svoj Ultrahuman email pre rýchlejšiu odpoveď
4. Partner ID zadaj v appke: **Profile → Settings → Partner ID**

## Krok 2: Deploy na Vercel

### Variant A — Cez GitHub (odporúčané)

1. Vytvor nový GitHub repo a pushni tento projekt
2. Choď na [vercel.com](https://vercel.com) → **Add New Project**
3. Importuj svoj GitHub repo
4. V **Environment Variables** pridaj:
   - `ULTRAHUMAN_AUTH_TOKEN` = tvoj token
   - `ULTRAHUMAN_USER_EMAIL` = tvoj email
5. Klikni **Deploy**

### Variant B — Cez Vercel CLI

```bash
# Inštalácia Vercel CLI (ak nemáš)
npm i -g vercel

# V adresári projektu
cd ultrahuman-mcp-vercel

# Inštalácia závislostí
npm install

# Deploy
vercel

# Pri prvom spustení ťa Vercel opýta na projekt,
# môžeš priradiť k existujúcemu alebo vytvoriť nový

# Nastav env vars
vercel env add ULTRAHUMAN_AUTH_TOKEN
vercel env add ULTRAHUMAN_USER_EMAIL

# Production deploy
vercel --prod
```

Po deployi dostaneš URL, napr.: `https://ultrahuman-mcp.vercel.app`

### Overenie

Otvor v prehliadači:
```
https://tvoja-url.vercel.app/api/health
```
Mal by si vidieť `{"status":"ok","server":"ultrahuman-mcp",...}`

## Krok 3: Pripoj do Claude.ai

1. Otvor **[claude.ai](https://claude.ai)** → klikni na ikonu profilu → **Settings**
2. V ľavom sidebar klikni na **Connectors**
3. Scroll dole → klikni **Add custom connector**
4. Zadaj URL:
   ```
   https://tvoja-url.vercel.app/mcp
   ```
   (alebo `/api/mcp` — obe fungujú vďaka rewrite pravidlu)
5. Klikni **Add**
6. V novom chate: klikni **"+"** dole vľavo → **Connectors** → zapni **ultrahuman**

## Používanie v Claude

Teraz môžeš priamo v Claude písať:

- *„Ako som dnes spal?"*
- *„Aký bol môj HRV včera?"*
- *„Ukáž mi trend recovery za posledný týždeň"*
- *„Porovnaj moju tepovú frekvenciu za posledných 7 dní"*
- *„Koľko krokov som urobil v pondelok?"*

Claude automaticky zavolá príslušný tool z tvojho Ultrahuman MCP servera.

## Štruktúra projektu

```
ultrahuman-mcp-vercel/
├── api/
│   ├── mcp.ts              # MCP endpoint (serverless function)
│   └── health.ts           # Health check
├── lib/
│   ├── mcp-server.ts       # MCP server + tools registrácia
│   └── ultrahuman-api.ts   # Ultrahuman Partner API client
├── vercel.json             # Vercel config (rewrites, CORS, timeout)
├── package.json
├── tsconfig.json
└── .env.example
```

## Troubleshooting

**Claude nevidí connector:**
- Over, že URL je správna a končí na `/mcp`
- Skontroluj `/api/health` endpoint, či server beží

**API vracia 401:**
- Token expiroval (platí ~1 týždeň) — kontaktuj Ultrahuman pre refresh
- Over env variables vo Vercel dashboard → Settings → Environment Variables

**Timeout pri `get_date_range`:**
- Vercel free tier má 10s timeout, Pro tier 60s
- Pre 30-dňový rozsah potrebuješ Pro tier
- Alternatíva: volaj `get_all_metrics` po jednom dni

## Licencia

MIT
