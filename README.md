# 🏋️ Ultrahuman MCP Server – Multi-User

Multi-user MCP server pre Ultrahuman Ring na Vercel. Umožňuje viacerým používateľom pripojiť ich Ultrahuman prsteň k Claude cez osobnú MCP URL.

## Funkcie

- **Passwordless autentifikácia** — prihlásenie cez magic link v emaile, žiadne heslá
- **Registrácia s GDPR súhlasom** — používateľ musí schváliť GDPR a Podmienky
- **Per-user MCP endpoint** — každý používateľ dostane unikátnu MCP URL
- **Šifrované tokeny** — Ultrahuman Auth Token je uložený šifrovane (AES-256-GCM)
- **Dve úrovne prístupu:**
  - **Správca** — vidí zoznam emailov, môže (de)aktivovať účty, nevidí tokeny
  - **Používateľ** — spravuje výhradne svoj Ultrahuman Auth Token
- **Verejné stránky** — GDPR a Podmienky sú viditeľné bez prihlásenia
- **Responzívny design** — funkčné na mobile, tablete aj desktope
- **Integrovaná dokumentácia** — sekcia Dokumentácia s príkladmi otázok, popisom MCP nástrojov a inštalačným návodom pre Skill
- **Skill pre Claude** — `ultrahuman-interpretation.skill` pripravený na stiahnutie priamo z dokumentácie

## Architektúra

```
┌──────────────────────────────────────────────────┐
│                   Claude.ai                       │
│         (Connector: /api/mcp/{mcpToken})          │
└──────────────┬───────────────────────────────────┘
               │ MCP Protocol (Streamable HTTP)
               ▼
┌──────────────────────────────────────────────────┐
│            Vercel Serverless Functions             │
│                                                    │
│  /api/mcp/[token] → lookup user → decrypt token   │
│  /api/auth/*      → magic link auth               │
│  /api/user/token  → manage Ultrahuman token        │
│  /api/admin/*     → user management                │
└──────────────┬───────────────────────────────────┘
               │
    ┌──────────┴──────────┐
    ▼                     ▼
┌────────┐        ┌─────────────┐
│Vercel KV│        │Ultrahuman   │
│(Redis)  │        │Partner API  │
└────────┘        └─────────────┘
```

## Predpoklady

1. **Vercel účet** (free tier stačí na začiatok)
2. **Resend.com účet** pre odosielanie emailov (free: 100 emailov/deň)
3. **Každý používateľ** si individuálne obstará Ultrahuman API token

---

## Deploy na Vercel

### Krok 1: Vytvor Vercel KV store

1. V [Vercel dashboard](https://vercel.com/dashboard) → tvoj projekt → **Storage**
2. Klikni **Create** → **KV** (Upstash Redis)
3. Pomenuj napr. `ultrahuman-kv` → **Create**
4. Vercel automaticky nastaví `KV_REST_API_URL` a `KV_REST_API_TOKEN`

### Krok 2: Nastav Resend

1. Zaregistruj sa na [resend.com](https://resend.com)
2. Vytvor API key
3. (Voliteľné) Pridaj vlastnú doménu pre email

### Krok 3: Environment Variables

V Vercel dashboard → Settings → Environment Variables pridaj:

| Variable | Hodnota |
|----------|---------|
| `RESEND_API_KEY` | `re_xxxxxxxx` |
| `FROM_EMAIL` | `Ultrahuman MCP <noreply@vasadomena.sk>` |
| `APP_URL` | `https://tvoja-url.vercel.app` |
| `JWT_SECRET` | Náhodný 32+ znakový reťazec |
| `ENCRYPTION_KEY` | Náhodný 32+ znakový reťazec |
| `ADMIN_EMAILS` | `tvoj@email.com` |

### Krok 4: Deploy

```bash
# Push na GitHub → Vercel auto-deploy
# ALEBO manuálne:
npm install
vercel --prod
```

### Krok 5: Prvé prihlásenie

1. Otvor `https://tvoja-url.vercel.app`
2. Klikni **Registrácia**
3. Zadaj email → schváľ GDPR + Podmienky → odošli
4. Skontroluj email → klikni **Potvrdiť registráciu**
5. Prvý registrovaný používateľ je automaticky admin

---

## Používanie

### Pre používateľa:

1. Zaregistruj sa na webe
2. Potvrď email kliknutím na link
3. V dashboarde zadaj svoj Ultrahuman Auth Token
4. Skopíruj svoju osobnú **MCP URL**
5. V Claude.ai: Settings → Connectors → Add custom connector → vlož URL

### Pre správcu:

1. V sekcii **Správca** vidíš zoznam všetkých používateľov
2. Môžeš (de)aktivovať účty (Storno / Aktivovať)
3. Nevidíš Ultrahuman tokeny iných používateľov

---

## Štruktúra projektu

```
ultrahuman-mcp-app/
├── api/
│   ├── auth/
│   │   ├── register.ts    # Registrácia (POST)
│   │   ├── login.ts       # Prihlásenie magic link (POST)
│   │   ├── verify.ts      # Overenie magic link (GET)
│   │   └── me.ts          # Session check (GET) + logout (DELETE)
│   ├── user/
│   │   └── token.ts       # CRUD Ultrahuman token (GET/PUT/DELETE)
│   ├── admin/
│   │   ├── users.ts       # Zoznam používateľov (GET)
│   │   └── deactivate.ts  # (De)aktivácia účtu (POST)
│   ├── mcp/
│   │   └── [token].ts     # Per-user MCP endpoint
│   └── health.ts          # Health check
├── lib/
│   ├── db.ts              # Vercel KV databáza
│   ├── auth.ts            # JWT session management
│   ├── email.ts           # Resend email service
│   ├── crypto.ts          # AES-256-GCM šifrovanie
│   ├── mcp-server.ts      # MCP server factory (11 tools)
│   └── ultrahuman-api.ts  # Ultrahuman Partner API client
├── public/
│   ├── index.html                       # SPA frontend (responzívny) + Dokumentácia
│   └── ultrahuman-interpretation.skill  # Stiahnuteľný skill pre Claude.ai
├── vercel.json
├── package.json
├── tsconfig.json
└── README.md
```

## Bezpečnosť

- Autentifikácia len cez magic linky (žiadne heslá)
- Magic linky sú jednorazové, platné 30 minút
- Ultrahuman tokeny šifrované AES-256-GCM
- JWT session cookies (HttpOnly, SameSite)
- Admin nemá prístup k tokenom používateľov
- MCP URL je unikátna per-user (48-znakový náhodný token)

## Licencia

MIT
