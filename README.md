# OBSIDIAN — Luxury Store (v3)

Black & white 3D luxury e-commerce. Orders go via WhatsApp. No payment gateway.

---

## 📁 Structure

```
luxe-v3/
├── index.html              ← Storefront
├── css/style.css           ← All styles
├── js/
│   ├── config.js           ← ★ Set WhatsApp number + API URL here
│   ├── api.js              ← All HTTP calls (application → backend)
│   ├── cart.js             ← Cart + WhatsApp order builder
│   └── main.js             ← Products, modal, contact form, canvas
├── admin/
│   ├── login.html          ← Admin login (wired to backend)
│   ├── dashboard.html      ← Admin panel
│   ├── admin.css           ← Admin styles
│   └── dashboard.js        ← CRUD wired to backend API
└── backend/
    ├── server.js           ← Express + all security middleware
    ├── db.js               ← SQLite schema (database layer)
    ├── auth.js             ← HMAC token sign/verify
    ├── seed.js             ← Load default 12 products
    ├── package.json
    ├── .env.example        ← ★ Copy to .env and fill in
    └── .gitignore
```

---

## 🚀 Quick Start

### 1. Configure the frontend

Open `js/config.js` and set:
- `WHATSAPP_NUMBER` — your number in international format, no `+` or spaces (e.g. `254712345678`)
- `API_BASE` — your backend URL (default `http://localhost:3000`)

### 2. Set up the backend

```bash
cd backend
npm install

# Copy and edit environment file
cp .env.example .env
# Edit .env: set FRONTEND_URL, ADMIN_INITIAL_PASSWORD, TOKEN_SECRET

# Seed the database with 12 default products
node seed.js

# Start the server
npm run dev        # development (auto-reload)
npm start          # production
```

### 3. Open the frontend

Use a local server (not `file://`). Options:
```bash
# VS Code Live Server (right-click index.html → Open with Live Server)
# or Python
python -m http.server 5500
# then open http://127.0.0.1:5500
```

---

## 🔐 Admin Access

URL: `/admin/login.html`

Default password: set in `.env` as `ADMIN_INITIAL_PASSWORD` (default: `obsidian2025!`)

**Change it immediately** via Admin → Security after first login.

Password rules: min 8 chars, 1 uppercase, 1 number.

After 5 failed login attempts the browser locks for 60 seconds.

---

## 🛍️ How Orders Work

1. Customer browses products → adds to cart (or clicks product)
2. Clicks **Order via WhatsApp**
3. Enters their name
4. WhatsApp opens with a pre-filled message including all product details, quantities, and total
5. Client receives the message and processes the order manually

---

## 🔒 Security Features

| Layer | What's protected |
|---|---|
| **Helmet** | 14 HTTP security headers (XSS, clickjacking, MIME sniffing, etc.) |
| **CORS** | Only your frontend origin can call the API |
| **Rate limiting** | 150 req/15min global; 10 req/15min on login (failed only) |
| **Input validation** | All fields validated and length-capped server-side (express-validator) |
| **Parameterised queries** | SQLite prepared statements — no SQL injection possible |
| **Bcrypt** | Admin password is hashed (cost 12) — never stored in plaintext |
| **HMAC tokens** | Admin session tokens are signed — cannot be forged |
| **Token expiry** | Admin tokens expire after 8 hours |
| **Timing-safe compare** | Token comparison uses `crypto.timingSafeEqual` |
| **Body size limit** | 32 KB max — prevents large payload DoS |
| **Localhost bind** | Server binds to 127.0.0.1 — not exposed to external network by default |
| **No stack traces** | Errors return generic messages; details logged server-side only |
| **XSS-safe rendering** | Frontend uses `textContent` / DOM API — no raw innerHTML for user data |
| **sessionStorage** | Admin token cleared on tab close, not persisted in localStorage |

---

## 🌐 Production Checklist

- [ ] Set `NODE_ENV=production` in `.env`
- [ ] Use a strong `TOKEN_SECRET` (64+ random chars)
- [ ] Change `ADMIN_INITIAL_PASSWORD` before first run
- [ ] Put backend behind **nginx** or **Caddy** with TLS (HTTPS)
- [ ] Set `FRONTEND_URL` to your real domain
- [ ] Keep `obsidian.db` and `.env` out of Git (already in `.gitignore`)
- [ ] Run as a non-root user

---

*© 2025 OBSIDIAN — Maison de Luxe*