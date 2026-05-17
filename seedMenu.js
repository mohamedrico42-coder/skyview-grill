// Seed every Sky View Grill menu item into Firestore using the Firebase Admin SDK.
// Items are derived from the printed PDF menus in /public.
//
// Each item is assigned an `imageUrl` based on its section — pointing at the
// corresponding extracted PDF page image in /public/menu-images. Run
// `node extractMenuImages.js` first if those JPGs don't exist yet.
//
// Usage:
//   1. In Firebase Console → Project Settings → Service accounts →
//      "Generate new private key" → save the downloaded file as
//      serviceAccountKey.json in the project root (same folder as this script).
//   2. node seedMenu.js                ← upsert every item (sets imageUrl)
//      node seedMenu.js --clear        ← wipe /menu first, then re-seed
//      node seedMenu.js --keep-images  ← upsert WITHOUT touching imageUrl
//                                        (use this after uploading custom
//                                         photos via the admin dashboard so
//                                         re-seeds don't overwrite them)
//
// Re-runs are idempotent: each item has a deterministic ID derived from its
// name + category + section, so re-running updates fields without creating
// duplicates.

import admin from 'firebase-admin'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const KEY_PATH = path.join(__dirname, 'serviceAccountKey.json')

const die = (msg) => { console.error(`\n❌ ${msg}\n`); process.exit(1) }

let serviceAccount
try {
  serviceAccount = JSON.parse(await readFile(KEY_PATH, 'utf-8'))
} catch {
  die(
    'Missing serviceAccountKey.json in project root.\n\n' +
    'How to fix:\n' +
    '  1. Open https://console.firebase.google.com/project/skyview-grill/settings/serviceaccounts/adminsdk\n' +
    '  2. Click "Generate new private key" → "Generate key"\n' +
    '  3. Save the downloaded JSON file as: serviceAccountKey.json\n' +
    '     (in the same folder as this script — the project root)\n' +
    '  4. Re-run:  node seedMenu.js',
  )
}

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) })
const db = admin.firestore()

// ── Helpers ──────────────────────────────────────────────────────────────
const slug = (s) =>
  String(s)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

const docId = (item) =>
  [item.category, slug(item.section), slug(item.name)].filter(Boolean).join('-')

// Section → PDF page image. Pages are extracted by extractMenuImages.js
// to /public/menu-images/{food|drinks}/{food|drink}-NN.jpg
// (e.g. /menu-images/food/food-02.jpg is page 2 of food menu.pdf).
const FOOD_IMG  = (n) => `/menu-images/food/food-${String(n).padStart(2, '0')}.jpg`
const DRINK_IMG = (n) => `/menu-images/drinks/drink-${String(n).padStart(2, '0')}.jpg`

const sectionImage = {
  // ── Food (explicit per spec) ─────────────────────────────────────────
  'Starters & Bites':   FOOD_IMG(2),
  'Soups':              FOOD_IMG(2),   // same page as starters in the PDF
  'Pasta':              FOOD_IMG(4),
  'Pilau & Biryani':    FOOD_IMG(5),
  'Rice Dishes':        FOOD_IMG(6),
  'Meat & Mandi':       FOOD_IMG(8),
  'Chicken':            FOOD_IMG(9),
  'Seafood':            FOOD_IMG(10),
  'Curries':            FOOD_IMG(11),
  'Wraps & Shawarma':   FOOD_IMG(13),
  'Sandwiches':         FOOD_IMG(14),
  'Burgers & Wings':    FOOD_IMG(15),
  'Pizza':              FOOD_IMG(16),
  // ── Food (sections not in the user's list — using the PDF page each section appears on) ──
  'Salads':             FOOD_IMG(3),
  'Specials':           FOOD_IMG(6),
  'Platters':           FOOD_IMG(12),
  // ── Drinks (explicit per spec) ───────────────────────────────────────
  'Tea':                DRINK_IMG(2),
  'Coffee':             DRINK_IMG(3),
  'Lattes':             DRINK_IMG(3),
  'Smoothies':          DRINK_IMG(5),
  'Fresh Juice':        DRINK_IMG(5),
  'Lemonades':          DRINK_IMG(6),
  'Mojitos':            DRINK_IMG(7),
  'Milkshakes':         DRINK_IMG(9),
  // ── Drinks (inferred for sections not explicitly listed) ─────────────
  'Iced Lattes':        DRINK_IMG(3),  // shown on the latte page
  'Iced Teas':          DRINK_IMG(3),  // shown on the latte page in the PDF
  'Chocolate':          DRINK_IMG(2),  // chocolate sits next to tea on p2
  'Slushies':           DRINK_IMG(4),
  'Coladas':            DRINK_IMG(8),
}

// shorthand item factory
const I = (name, price, section, category, opts = {}) => ({
  name,
  price,
  section,
  category,
  available: true,
  featured: !!opts.featured,
  variants: opts.variants || [],
  imageUrl: sectionImage[section] ?? null,
})

// ── Menu data ────────────────────────────────────────────────────────────
const FOOD = [
  // Starters & Bites
  I('Cheese Loaded Fries', 850, 'Starters & Bites', 'food'),
  I('Garlic Chips', 350, 'Starters & Bites', 'food'),
  I('Maduros Plantain', 500, 'Starters & Bites', 'food'),
  I('Chips Masala', 400, 'Starters & Bites', 'food'),

  // Soups
  I('Butternut Squash Soup', 350, 'Soups', 'food'),
  I('Chicken Clear Soup', 350, 'Soups', 'food'),
  I('Mushroom Soup', 400, 'Soups', 'food'),
  I('Chicken Lemon Soup', 500, 'Soups', 'food'),

  // Salads
  I('Cobb Salad', 1000, 'Salads', 'food'),
  I('Caesar Salad', 700, 'Salads', 'food'),
  I('Grilled Chicken Salad', 800, 'Salads', 'food'),
  I('Greek Salad', 350, 'Salads', 'food'),
  I('Plain Fruit Salad', 300, 'Salads', 'food'),
  I('Special Fruit Salad', 500, 'Salads', 'food'),

  // Pasta
  I('Pasta Saldato', 600, 'Pasta', 'food'),
  I('Chipotle Chicken Pasta', 1200, 'Pasta', 'food'),
  I('Chicken Alfredo Pasta', 1000, 'Pasta', 'food'),
  I('Penne Arabiata Pasta', 700, 'Pasta', 'food'),

  // Pilau & Biryani
  I('Mutton Pilau', 500, 'Pilau & Biryani', 'food'),
  I('Fish Pilau', 700, 'Pilau & Biryani', 'food'),
  I('Chicken Pilau', 500, 'Pilau & Biryani', 'food'),
  I('Mutton Biryani', 1000, 'Pilau & Biryani', 'food'),
  I('Fish Biryani', 1100, 'Pilau & Biryani', 'food'),
  I('Chicken Biryani', 950, 'Pilau & Biryani', 'food'),

  // Rice Dishes
  I('Coconut Rice', 500, 'Rice Dishes', 'food'),
  I('Tuna Rice', 500, 'Rice Dishes', 'food'),
  I('Rice Saldato', 500, 'Rice Dishes', 'food'),
  I('Chicken Fried Rice', 600, 'Rice Dishes', 'food'),
  I('Fried Vegetable Rice', 400, 'Rice Dishes', 'food'),
  I('Beans with Rice', 400, 'Rice Dishes', 'food'),

  // Specials
  I('Fish Fingers', 400, 'Specials', 'food'),
  I('Ugali Special', 500, 'Specials', 'food'),
  I('¼ Chicken with Fries', 750, 'Specials', 'food'),
  I('½ Chicken with Fries', 800, 'Specials', 'food'),
  I('Full Capon', 1500, 'Specials', 'food'),

  // Meat & Mandi
  I('Full Mandi', 1800, 'Meat & Mandi', 'food', { featured: true }),
  I('Mutton Mandi', 1200, 'Meat & Mandi', 'food'),
  I('Lamb Mandi', 1200, 'Meat & Mandi', 'food'),
  I('Dello', 1200, 'Meat & Mandi', 'food'),
  I('Arosto', 1200, 'Meat & Mandi', 'food'),
  I('Kostato', 1200, 'Meat & Mandi', 'food'),
  I('Aleso', 1200, 'Meat & Mandi', 'food'),
  I('Camel Steak', 1200, 'Meat & Mandi', 'food'),
  I('Sizzling Stir Fry Beef', 1000, 'Meat & Mandi', 'food'),
  I('Beef Strips', 1100, 'Meat & Mandi', 'food'),

  // Chicken
  I('Flame Chicken', 1100, 'Chicken', 'food'),
  I('Lemon Herb Roasted Chicken', 1200, 'Chicken', 'food'),
  I('Caribbean Royal Chicken', 1200, 'Chicken', 'food'),
  I('Chicken Mandi', 1100, 'Chicken', 'food'),
  I('Grilled Chicken Breast', 1100, 'Chicken', 'food'),
  I('Sizzling Stir Fry Chicken', 1000, 'Chicken', 'food'),

  // Seafood
  I('Salmon Fish', 2500, 'Seafood', 'food'),
  I('Grilled Fish Fillet', 1200, 'Seafood', 'food'),
  I('King Fish', 1200, 'Seafood', 'food'),
  I('Whole Fish', 1000, 'Seafood', 'food'),

  // Curries
  I('Butter Chicken', 1200, 'Curries', 'food'),
  I('Chicken Curry', 1200, 'Curries', 'food'),
  I('Fish Curry', 1200, 'Curries', 'food'),
  I('Beef Curry', 1100, 'Curries', 'food'),
  I('Hyderabad Curry', 1100, 'Curries', 'food'),
  I('Vegetable Curry', 800, 'Curries', 'food'),

  // Platters
  I('Sky View Platter (2 Person)', 2500, 'Platters', 'food', { featured: true }),
  I('Sky View Platter (3-4 Persons)', 3500, 'Platters', 'food'),
  I('Sky View Platter (4-6 Persons)', 7000, 'Platters', 'food'),

  // Wraps & Shawarma
  I('Chicken Shawarma', 600, 'Wraps & Shawarma', 'food'),
  I('Mexican Quesadilla', 1000, 'Wraps & Shawarma', 'food'),
  I('Beef Wrap', 750, 'Wraps & Shawarma', 'food'),
  I('Vegetable Wrap', 700, 'Wraps & Shawarma', 'food'),
  I('Fish Wrap', 300, 'Wraps & Shawarma', 'food'),

  // Sandwiches
  I('Chicken Sandwich', 800, 'Sandwiches', 'food'),
  I('Tuna Sandwich', 900, 'Sandwiches', 'food'),
  I('Beef Sandwich', 850, 'Sandwiches', 'food'),
  I('Club Sandwich', 600, 'Sandwiches', 'food'),

  // Burgers & Wings
  I('Chicken Cheese Burger', 750, 'Burgers & Wings', 'food'),
  I('Beef Cheese Burger', 800, 'Burgers & Wings', 'food'),
  I('Vegetable Burger', 600, 'Burgers & Wings', 'food'),
  I('BBQ Chicken Wings (6pcs)', 600, 'Burgers & Wings', 'food'),
  I('BBQ Chicken Wings (12pcs)', 1200, 'Burgers & Wings', 'food'),
  I('Breaded Chicken Nuggets (6pcs)', 600, 'Burgers & Wings', 'food'),
  I('Breaded Chicken Nuggets (12pcs)', 1200, 'Burgers & Wings', 'food'),

  // Pizza (with M/L variants — BOGO Wed/Sat/Sun)
  I('BBQ Chicken Pizza', 800, 'Pizza', 'food', {
    featured: true,
    variants: [{ label: 'M', price: 800 }, { label: 'L', price: 1000 }],
  }),
  I('Hawaiian Pizza', 800, 'Pizza', 'food', {
    variants: [{ label: 'M', price: 800 }, { label: 'L', price: 1000 }],
  }),
  I('Vegetable Pizza', 700, 'Pizza', 'food', {
    variants: [{ label: 'M', price: 700 }, { label: 'L', price: 900 }],
  }),
  I('Chicken Tikka Pizza', 800, 'Pizza', 'food', {
    variants: [{ label: 'M', price: 800 }, { label: 'L', price: 1000 }],
  }),
]

const DRINKS = [
  // Tea
  I('Black Tea', 80, 'Tea', 'drinks'),
  I('Black Tea Spicy', 100, 'Tea', 'drinks'),
  I('Lemon Tea', 100, 'Tea', 'drinks'),
  I('Mint Tea', 120, 'Tea', 'drinks'),
  I('Turmeric Tea', 150, 'Tea', 'drinks'),
  I('Special Tea', 180, 'Tea', 'drinks'),
  I('English Tea', 180, 'Tea', 'drinks'),
  I('Camel Tea', 180, 'Tea', 'drinks'),
  I('Camel Tea (Spicy)', 200, 'Tea', 'drinks'),
  I('Cow Tea', 180, 'Tea', 'drinks'),
  I('Cow Tea (Spicy)', 180, 'Tea', 'drinks'),
  I('Karak Tea', 200, 'Tea', 'drinks'),
  I('Milk Tea Pot', 250, 'Tea', 'drinks'),
  I('Green Herbal Tea', 200, 'Tea', 'drinks'),
  I('Chai Dawa', 200, 'Tea', 'drinks'),

  // Coffee (Single / Double variants per the printed menu)
  I('House Coffee', 200, 'Coffee', 'drinks'),
  I('Espresso', 150, 'Coffee', 'drinks', {
    variants: [{ label: 'Single', price: 150 }, { label: 'Double', price: 200 }],
  }),
  I('Americano', 150, 'Coffee', 'drinks'),
  I('Macchiato', 200, 'Coffee', 'drinks', {
    variants: [{ label: 'Single', price: 200 }, { label: 'Double', price: 250 }],
  }),
  I('Cappuccino', 200, 'Coffee', 'drinks', {
    variants: [{ label: 'Single', price: 200 }, { label: 'Double', price: 250 }],
  }),
  I('Mocha', 250, 'Coffee', 'drinks', {
    variants: [{ label: 'Single', price: 250 }, { label: 'Double', price: 300 }],
  }),
  I('Black Coffee', 150, 'Coffee', 'drinks'),
  I('Plain Milk', 200, 'Coffee', 'drinks'),
  I('Kahawa Somali', 150, 'Coffee', 'drinks'),

  // Lattes
  I('Latte', 250, 'Lattes', 'drinks', {
    variants: [{ label: 'Single', price: 250 }, { label: 'Double', price: 300 }],
  }),
  I('Caramel Latte', 250, 'Lattes', 'drinks', {
    variants: [{ label: 'Single', price: 250 }, { label: 'Double', price: 300 }],
  }),
  I('Spanish Latte', 250, 'Lattes', 'drinks', {
    variants: [{ label: 'Single', price: 250 }, { label: 'Double', price: 300 }],
  }),
  I('Vanilla Latte', 250, 'Lattes', 'drinks', {
    variants: [{ label: 'Single', price: 250 }, { label: 'Double', price: 300 }],
  }),
  I('Chai Latte', 250, 'Lattes', 'drinks'),

  // Iced Lattes
  I('Iced Latte', 250, 'Iced Lattes', 'drinks'),
  I('Iced Caramel Latte', 250, 'Iced Lattes', 'drinks'),
  I('Iced Spanish Latte', 250, 'Iced Lattes', 'drinks'),
  I('Iced Vanilla Latte', 250, 'Iced Lattes', 'drinks'),

  // Iced Teas
  I('Strawberry Iced Tea', 250, 'Iced Teas', 'drinks', {
    variants: [{ label: 'Single', price: 250 }, { label: 'Double', price: 300 }],
  }),
  I('Peach Iced Tea', 250, 'Iced Teas', 'drinks', {
    variants: [{ label: 'Single', price: 250 }, { label: 'Double', price: 300 }],
  }),
  I('Passion Iced Tea', 250, 'Iced Teas', 'drinks', {
    variants: [{ label: 'Single', price: 250 }, { label: 'Double', price: 300 }],
  }),
  I('Blueberry Iced Tea', 250, 'Iced Teas', 'drinks'),
  I('Hibiscus Iced Tea', 250, 'Iced Teas', 'drinks'),

  // Chocolate
  I('Hot Chocolate', 180, 'Chocolate', 'drinks'),
  I('Iced Chocolate', 250, 'Chocolate', 'drinks'),

  // Slushies
  I('Strawberry Slush', 450, 'Slushies', 'drinks'),
  I('Blueberry Slush', 450, 'Slushies', 'drinks'),
  I('Kiwi Slush', 450, 'Slushies', 'drinks'),

  // Smoothies
  I('Strawberry Smoothie', 400, 'Smoothies', 'drinks'),
  I('Avocado Smoothie', 400, 'Smoothies', 'drinks'),
  I('Blueberry Banana Smoothie', 400, 'Smoothies', 'drinks'),
  I('Mango Smoothie', 400, 'Smoothies', 'drinks'),
  I('Passion Smoothie', 400, 'Smoothies', 'drinks'),
  I('Tropical Smoothie', 400, 'Smoothies', 'drinks'),

  // Fresh Juice
  I('Pineapple Juice', 300, 'Fresh Juice', 'drinks'),
  I('Orange Juice', 300, 'Fresh Juice', 'drinks'),
  I('Mango Juice', 300, 'Fresh Juice', 'drinks'),
  I('Avocado Juice', 300, 'Fresh Juice', 'drinks'),
  I('Watermelon Juice', 300, 'Fresh Juice', 'drinks'),
  I('Passion Juice', 300, 'Fresh Juice', 'drinks'),
  I('Beetroot Juice', 300, 'Fresh Juice', 'drinks'),
  I('Cocktail Juice', 300, 'Fresh Juice', 'drinks'),
  I('Pineapple Mint Juice', 300, 'Fresh Juice', 'drinks'),

  // Lemonades
  I('Classic Lemonade', 450, 'Lemonades', 'drinks'),
  I('Mint Lemonade', 450, 'Lemonades', 'drinks'),
  I('Strawberry Lemonade', 450, 'Lemonades', 'drinks'),
  I('Blueberry Lemonade', 450, 'Lemonades', 'drinks'),
  I('Ocean Blue Lemonade', 450, 'Lemonades', 'drinks'),
  I('Kiwi Lemonade', 450, 'Lemonades', 'drinks'),
  I('Peach Lemonade', 450, 'Lemonades', 'drinks'),

  // Mojitos
  I('Classic Mojito', 450, 'Mojitos', 'drinks'),
  I('Strawberry Mojito', 450, 'Mojitos', 'drinks'),
  I('Passion Mojito', 450, 'Mojitos', 'drinks'),
  I('Kiwi Mojito', 450, 'Mojitos', 'drinks'),
  I('Peach Mojito', 450, 'Mojitos', 'drinks'),
  I('Blueberry Mojito', 450, 'Mojitos', 'drinks'),
  I('Blue Ocean Mojito', 450, 'Mojitos', 'drinks'),

  // Coladas
  I('Piña Colada', 400, 'Coladas', 'drinks'),
  I('Passion Colada', 400, 'Coladas', 'drinks'),
  I('Peach Colada', 400, 'Coladas', 'drinks'),
  I('Strawberry Colada', 400, 'Coladas', 'drinks'),
  I('Kiwi Colada', 400, 'Coladas', 'drinks'),
  I('Blueberry Colada', 400, 'Coladas', 'drinks'),

  // Milkshakes
  I('Skyview Signature Shake', 400, 'Milkshakes', 'drinks', { featured: true }),
  I('Espresso Shake', 400, 'Milkshakes', 'drinks'),
  I('Vanilla Shake', 400, 'Milkshakes', 'drinks'),
  I('Caramel Shake', 400, 'Milkshakes', 'drinks'),
  I('Chocolate Shake', 500, 'Milkshakes', 'drinks'),
  I('Strawberry Shake', 400, 'Milkshakes', 'drinks'),
  I('Mango Shake', 400, 'Milkshakes', 'drinks'),
  I('Blueberry Shake', 400, 'Milkshakes', 'drinks'),
  I('Mint Shake', 400, 'Milkshakes', 'drinks'),
  I('Lotus Shake', 450, 'Milkshakes', 'drinks'),
  I('Oreo Shake', 450, 'Milkshakes', 'drinks'),
  I('Mocha Shake', 550, 'Milkshakes', 'drinks'),
  I('Hyderabad Shake', 400, 'Milkshakes', 'drinks'),
]

const ITEMS = [...FOOD, ...DRINKS]

// ── Run ──────────────────────────────────────────────────────────────────
const flags = process.argv.slice(2)
const wipeFirst = flags.includes('--clear')
const keepImages = flags.includes('--keep-images')

const wipeMenu = async () => {
  console.log('\n🧹 --clear flag set: wiping /menu collection first…')
  const snap = await db.collection('menu').get()
  if (snap.empty) {
    console.log('   (already empty)')
    return
  }
  const chunks = []
  for (let i = 0; i < snap.docs.length; i += 400) {
    chunks.push(snap.docs.slice(i, i + 400))
  }
  for (const chunk of chunks) {
    const batch = db.batch()
    chunk.forEach((d) => batch.delete(d.ref))
    await batch.commit()
  }
  console.log(`   deleted ${snap.size} docs`)
}

const seed = async () => {
  console.log(`\n📦 Seeding ${ITEMS.length} menu items into Firestore (project: ${serviceAccount.project_id})…`)
  if (wipeFirst) await wipeMenu()

  if (keepImages) {
    console.log('   --keep-images: existing imageUrl values will NOT be overwritten.')
  }

  // Batches of 400 (Firestore limit is 500 per batch — leave headroom)
  let created = 0
  for (let i = 0; i < ITEMS.length; i += 400) {
    const chunk = ITEMS.slice(i, i + 400)
    const batch = db.batch()
    for (const item of chunk) {
      const ref = db.collection('menu').doc(docId(item))
      const data = { ...item, updatedAt: admin.firestore.FieldValue.serverTimestamp() }
      if (keepImages) delete data.imageUrl
      batch.set(ref, data, { merge: true })
    }
    await batch.commit()
    created += chunk.length
    process.stdout.write(`  ✓ ${created}/${ITEMS.length}\n`)
  }

  const foodCount = FOOD.length
  const drinkCount = DRINKS.length
  const withImages = ITEMS.filter((i) => i.imageUrl).length
  console.log(`\n✅ Done. Food: ${foodCount}, Drinks: ${drinkCount}, Total: ${ITEMS.length}`)
  console.log(`   ${withImages}/${ITEMS.length} items mapped to a PDF page image.`)
  if (!keepImages) {
    console.log('   Tip: after uploading custom photos via /admin, re-run with')
    console.log('        node seedMenu.js --keep-images   ← preserves admin uploads')
  }
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('\n❌ Seed failed:', err?.message || err)
    if (err?.code === 7 || /PERMISSION_DENIED/i.test(String(err))) {
      console.error('\n→ Service account lacks Firestore permissions. In IAM, give it the role:')
      console.error('  "Cloud Datastore User"  or  "Firebase Admin"')
    }
    process.exit(1)
  })
