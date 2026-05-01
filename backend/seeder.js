// ============================================
// QUINT ESSENTIALS — Seed Script v3
// Uses image_url instead of emoji
// Run once: node seed.js
// ============================================

require('dotenv').config();
const { getDb } = require('./db');

const PRODUCTS = [
  { name:'Noir Tote Classique',     category:'bags',  price:45000, image_url:'', tag:'Bestseller', description:'A timeless structured tote crafted from full-grain Italian leather. Features brushed gold hardware and a suede-lined interior with multiple compartments. The epitome of understated elegance.' },
  { name:'Onyx Clutch Minimaliste', category:'bags',  price:28000, image_url:'', tag:'New',        description:'A sleek evening clutch with a magnetic clasp and subtle embossed logo. Compact yet spacious, lined with silk for your most precious essentials.' },
  { name:'Velvet Shoulder Luxe',    category:'bags',  price:62000, image_url:'', tag:'',           description:'Sculptural shoulder bag with adjustable chain strap in antiqued silver. The quilted exterior references the great Parisian ateliers while remaining entirely modern.' },
  { name:'Obsidian Backpack Elite', category:'bags',  price:78000, image_url:'', tag:'Limited',    description:'The ultimate luxury backpack for the modern executive. Full leather exterior, ergonomic straps, and a dedicated laptop sleeve with magnetic locking system.' },
  { name:'Pearl Satchel Raffinée',  category:'bags',  price:52000, image_url:'', tag:'',           description:'A structured satchel with top-handle and optional crossbody strap. Polished edge stitching in contrasting ivory thread for a signature detail that sets it apart.' },
  { name:'Midnight Mini Bag',       category:'bags',  price:22000, image_url:'', tag:'New',        description:'The perfectly sized mini bag for evening events. Comes with a detachable mirror compact. Finished in our signature deep noir with rose-gold hardware.' },
  { name:'Stiletto Noire Absolue',  category:'shoes', price:38000, image_url:'', tag:'Bestseller', description:'A razor-sharp stiletto in mirror-polished patent leather. 110mm heel engineered for stability without compromise. The shoe that commands every room.' },
  { name:'Oxford Blanc Élégant',    category:'shoes', price:42000, image_url:'', tag:'',           description:'Handcrafted brogued Oxford in pristine white calfskin. Goodyear welted construction ensures decades of wear. The foundation of any refined wardrobe.' },
  { name:'Loafer Royale Noir',      category:'shoes', price:35000, image_url:'', tag:'New',        description:'A museum-quality penny loafer with a signature bit detail in 18k gold-plated brass. Butter-soft leather upper meets a hand-stitched Venetian sole.' },
  { name:'Sneaker Luxe Monochrome', category:'shoes', price:29000, image_url:'', tag:'Limited',    description:'The luxury sneaker reimagined. Hand-painted white calfskin with tonal stitching and a sculptural rubber sole. Comfort and prestige, unified.' },
  { name:'Boot Minuit Chelsea',     category:'shoes', price:55000, image_url:'', tag:'',           description:'A heritage Chelsea boot in midnight black calf with elastic side panels in silk-blend. A boot that transitions from boardroom to evening effortlessly.' },
  { name:'Sandal Dorée Classique',  category:'shoes', price:24000, image_url:'', tag:'New',        description:'Minimalist strappy sandal with a slender gold-toned buckle. The 70mm block heel offers all-day confidence. Hand-stitched in our Florence atelier.' },
];

function seed() {
  const db = getDb();
  const { n } = db.prepare('SELECT COUNT(*) as n FROM products').get();
  if (n > 0) {
    console.log(`✓ Already seeded (${n} products). Delete quint.db and re-run to reset.`);
    return;
  }
  const ins = db.prepare(`
    INSERT INTO products (name, category, price, image_url, tag, description)
    VALUES (@name, @category, @price, @image_url, @tag, @description)
  `);
  db.transaction(rows => rows.forEach(r => ins.run(r)))(PRODUCTS);
  console.log(`✓ Seeded ${PRODUCTS.length} products (no images — add via Admin panel).`);
}

seed();
process.exit(0);