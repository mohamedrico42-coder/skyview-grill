# Sky View Grill — Restaurant Website

Premium rooftop restaurant website for **Sky View Grill**, Simara Mall, Tom Mboya Street, Nairobi.

Built with **React + Vite + Tailwind CSS + Firebase (Firestore, Auth, Storage)** and deployed to **Vercel**.

---

## Features

- **Home** — Cinematic hero, featured dishes from Firestore, Pizza BOGO promo banner (Wed/Sat/Sun), restaurant info.
- **Menu** — Food / Drinks tabs, section chips, live search, variant selection (e.g. Coffee Single/Double, Pizza M/L), Add-to-Cart.
- **Cart & Order** — Quantity controls, Dine-In (table + floor: Rooftop / First Floor), Takeaway, Delivery (address). Payment by M-Pesa phone or Cash. Orders save to Firestore. WhatsApp order button pre-fills the cart to `254119619263`.
- **Confirmation** — Order ID, 20–30 min estimate, WhatsApp contact.
- **Admin** (`/admin`) — Firebase Auth login (route protected), real-time orders via `onSnapshot`, status flow (Received → Preparing → Ready → Done), status filter, daily revenue. Menu management tab to add/edit/delete items, upload photos to Firebase Storage with progress, and toggle availability.

---

## Tech Stack

- React 18 + Vite 5
- Tailwind CSS 3 (custom dark warm theme: charcoal `#1a1a18`, gold `#D4A017`, cream `#F5F0E8`, flame `#F4923A`)
- Firebase 10 (Auth + Firestore + Storage)
- React Router DOM 6

---

## Getting Started

```bash
# 1. Install dependencies
npm install

# 2. Copy env file and fill in your Firebase keys
cp .env.example .env
# then edit .env

# 3. Run dev server
npm run dev

# 4. Build for production
npm run build
```

---

## Firebase Setup

1. Create a Firebase project at https://console.firebase.google.com
2. Enable:
   - **Authentication** → Email/Password (create your admin user manually here)
   - **Firestore Database** → start in production mode
   - **Storage** → start in production mode
3. Copy your web app config values into `.env`.

### Firestore data model

`/menu/{itemId}`
```js
{
  name: "Margherita Pizza",
  category: "food" | "drinks",
  section: "Pizza",
  price: 1200,
  variants: [{ label: "M", price: 1200 }, { label: "L", price: 1800 }],
  imageUrl: "https://...",
  available: true,
  featured: true
}
```

`/orders/{orderId}`
```js
{
  items: [{ name, price, quantity, variant }],
  customerName, phone, orderType,            // dine-in | takeaway | delivery
  tableNumber, floor,                        // when dine-in
  deliveryAddress,                           // when delivery
  total,
  paymentMethod,                             // mpesa | cash
  mpesaPhone,
  status: "received" | "preparing" | "ready" | "done",
  createdAt: <serverTimestamp>
}
```

### Suggested Firestore rules (starter)

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /menu/{id} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    match /orders/{id} {
      allow create: if true;
      allow read, update, delete: if request.auth != null;
    }
  }
}
```

### Suggested Storage rules (starter)

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /menu/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

---

## Logo

Drop your logo at `public/logo.jpg`. It is used in the navbar, hero, footer, admin header, and favicon. If missing, the UI hides the image gracefully.

---

## Deploy to Vercel

1. Push to GitHub.
2. Import the repo in Vercel.
3. Framework preset: **Vite**.
4. Add the same `VITE_FIREBASE_*` env vars in the Vercel project settings.
5. Deploy. Vercel will run `npm run build` and serve `dist/`.

Add a `vercel.json` (optional) for SPA routing if needed:
```json
{ "rewrites": [{ "source": "/(.*)", "destination": "/" }] }
```

---

## Contact

- WhatsApp: `0119 619 263` (254119619263)
- Hours: Open every day, 7:00 AM – 10:00 PM
- Location: Simara Mall, Tom Mboya Street, Nairobi · First Floor & Rooftop
- Instagram & TikTok: `@SkyViewGrill`
