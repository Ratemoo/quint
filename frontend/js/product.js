// ============================================
// QUINT ESSENTIALS — Products Data
// Edit via Admin Panel or directly here
// ============================================

const DEFAULT_PRODUCTS = [
  // ---- BAGS ----
  {
    id: 1,
    name: "Noir Tote Classique",
    category: "bags",
    price: 45000,
    emoji: "👜",
    description: "A timeless structured tote crafted from full-grain Italian leather. Features brushed gold hardware and a suede-lined interior with multiple compartments. The epitome of understated elegance.",
    tag: "Bestseller"
  },
  {
    id: 2,
    name: "Onyx Clutch Minimaliste",
    category: "bags",
    price: 28000,
    emoji: "👛",
    description: "A sleek evening clutch with a magnetic clasp and subtle embossed logo. Compact yet spacious, lined with silk for your most precious essentials.",
    tag: "New"
  },
  {
    id: 3,
    name: "Velvet Shoulder Luxe",
    category: "bags",
    price: 62000,
    emoji: "👝",
    description: "Sculptural shoulder bag with adjustable chain strap in antiqued silver. The quilted exterior references the great Parisian ateliers while remaining entirely modern.",
    tag: ""
  },
  {
    id: 4,
    name: "Obsidian Backpack Elite",
    category: "bags",
    price: 78000,
    emoji: "🎒",
    description: "The ultimate luxury backpack for the modern executive. Full leather exterior, ergonomic straps, and a dedicated laptop sleeve with magnetic locking system.",
    tag: "Limited"
  },
  {
    id: 5,
    name: "Pearl Satchel Raffinée",
    category: "bags",
    price: 52000,
    emoji: "💼",
    description: "A structured satchel with top-handle and optional crossbody strap. Polished edge stitching in contrasting ivory thread for a signature detail that sets it apart.",
    tag: ""
  },
  {
    id: 6,
    name: "Midnight Mini Bag",
    category: "bags",
    price: 22000,
    emoji: "👜",
    description: "The perfectly sized mini bag for evening events. Comes with a detachable mirror compact. Finished in our signature deep noir with rose-gold hardware.",
    tag: "New"
  },

  // ---- SHOES ----
  {
    id: 7,
    name: "Stiletto Noire Absolue",
    category: "shoes",
    price: 38000,
    emoji: "👠",
    description: "A razor-sharp stiletto in mirror-polished patent leather. 110mm heel engineered for stability without compromise. The shoe that commands every room.",
    tag: "Bestseller"
  },
  {
    id: 8,
    name: "Oxford Blanc Élégant",
    category: "shoes",
    price: 42000,
    emoji: "👞",
    description: "Handcrafted brogued Oxford in pristine white calfskin. Goodyear welted construction ensures decades of wear. The foundation of any refined wardrobe.",
    tag: ""
  },
  {
    id: 9,
    name: "Loafer Royale Noir",
    category: "shoes",
    price: 35000,
    emoji: "🥿",
    description: "A museum-quality penny loafer with a signature bit detail in 18k gold-plated brass. Butter-soft leather upper meets a hand-stitched Venetian sole.",
    tag: "New"
  },
  {
    id: 10,
    name: "Sneaker Luxe Monochrome",
    category: "shoes",
    price: 29000,
    emoji: "👟",
    description: "The luxury sneaker reimagined. Hand-painted white calfskin with tonal stitching and a sculptural rubber sole. Comfort and prestige, unified.",
    tag: "Limited"
  },
  {
    id: 11,
    name: "Boot Minuit Chelsea",
    category: "shoes",
    price: 55000,
    emoji: "👢",
    description: "A heritage Chelsea boot in midnight black calf with elastic side panels in silk-blend. A boot that transitions from boardroom to evening effortlessly.",
    tag: ""
  },
  {
    id: 12,
    name: "Sandal Dorée Classique",
    category: "shoes",
    price: 24000,
    emoji: "👡",
    description: "Minimalist strappy sandal with a slender gold-toned buckle. The 70mm block heel offers all-day confidence. Hand-stitched in our Florence atelier.",
    tag: "New"
  }
];

// Load products from localStorage or fall back to defaults
const API_URL = 'http://localhost:3000/api';
const token = sessionStorage.getItem('quint_token');

async function fetchProducts() {
  const res = await fetch(`${API_URL}/products`);
  const data = await res.json();
  return data.products;
}

async function createProduct(product) {
  const res = await fetch(`${API_URL}/products`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-admin-token': token
    },
    body: JSON.stringify(product)
  });

  return await res.json();
}

async function updateProduct(id, product) {
  const res = await fetch(`${API_URL}/products/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'x-admin-token': token
    },
    body: JSON.stringify(product)
  });

  return await res.json();
}

async function deleteProduct(id) {
  await fetch(`${API_URL}/products/${id}`, {
    method: 'DELETE',
    headers: { 'x-admin-token': token }
  });
}