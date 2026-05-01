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
```


## 🛍️ How Orders Work

1. Customer browses products → adds to cart (or clicks product)
2. Clicks **Order via WhatsApp**
3. Enters their name
4. WhatsApp opens with a pre-filled message including all product details, quantities, and total
5. Client receives the message and processes the order manually


---

*© 2026 QUINT ESSENTIALS — Maison de Luxe*