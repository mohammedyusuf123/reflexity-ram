/**
 * One-time seed route — protected by SEED_SECRET env var.
 * Call: POST /api/seed  with header  x-seed-secret: <SEED_SECRET>
 * Remove this route (or unset SEED_SECRET) after seeding.
 */
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Product = require('../models/Product');

router.post('/', async (req, res) => {
  const secret = req.headers['x-seed-secret'];
  if (!process.env.SEED_SECRET || secret !== process.env.SEED_SECRET) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  try {
    // ── Admin user ──────────────────────────────────────────────────────────
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@reflexityram.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'ReflexityAdmin2026!';
    let admin = await User.findOne({ email: adminEmail });
    if (!admin) {
      admin = new User({
        firstName: 'Admin',
        lastName: 'User',
        email: adminEmail,
        password: adminPassword,
        role: 'admin',
        isEmailVerified: true,
      });
      await admin.save();
    } else {
      // Update role without triggering password re-hash
      await User.updateOne(
        { email: adminEmail },
        { $set: { role: 'admin', isEmailVerified: true } }
      );
    }

    // ── Products ─────────────────────────────────────────────────────────────
    const existingCount = await Product.countDocuments();
    if (existingCount > 0) {
      return res.json({
        success: true,
        message: `Skipped product seed — ${existingCount} products already exist.`,
        admin: adminEmail,
      });
    }

    const products = [
      {
        name: 'Reflexity DDR5-6000 16GB Kit',
        slug: 'reflexity-ddr5-6000-16gb',
        description: 'High-performance DDR5 RAM for next-gen platforms. 2×8GB dual-channel kit with XMP 3.0 support.',
        price: 89.99,
        compareAtPrice: 109.99,
        sku: 'RFX-DDR5-6000-16',
        generation: 'DDR5',
        capacity: '16GB',
        speed: 6000,
        casLatency: 36,
        voltage: 1.35,
        formFactor: 'DIMM',
        ecc: false,
        rgb: true,
        heatSpreader: true,
        inventory: { quantity: 50, lowStockThreshold: 5 },
        images: [{ url: 'https://res.cloudinary.com/dfquny0nk/image/upload/v1/reflexity/placeholder-ddr5.jpg', alt: 'Reflexity DDR5-6000 16GB', isPrimary: true }],
        isFeatured: true,
        tags: ['ddr5', 'gaming', 'rgb'],
      },
      {
        name: 'Reflexity DDR5-5600 32GB Kit',
        slug: 'reflexity-ddr5-5600-32gb',
        description: 'Massive 32GB DDR5 kit for content creators and power users. 2×16GB with low-latency tuning.',
        price: 149.99,
        compareAtPrice: 179.99,
        sku: 'RFX-DDR5-5600-32',
        generation: 'DDR5',
        capacity: '32GB',
        speed: 5600,
        casLatency: 40,
        voltage: 1.1,
        formFactor: 'DIMM',
        ecc: false,
        rgb: false,
        heatSpreader: true,
        inventory: { quantity: 30, lowStockThreshold: 5 },
        images: [{ url: 'https://res.cloudinary.com/dfquny0nk/image/upload/v1/reflexity/placeholder-ddr5-32.jpg', alt: 'Reflexity DDR5-5600 32GB', isPrimary: true }],
        isFeatured: true,
        tags: ['ddr5', 'workstation'],
      },
      {
        name: 'Reflexity DDR4-3600 16GB Kit',
        slug: 'reflexity-ddr4-3600-16gb',
        description: 'The sweet-spot DDR4 kit for AM4 and LGA1200 platforms. 2×8GB CL18 with XMP 2.0.',
        price: 49.99,
        compareAtPrice: 64.99,
        sku: 'RFX-DDR4-3600-16',
        generation: 'DDR4',
        capacity: '16GB',
        speed: 3600,
        casLatency: 18,
        voltage: 1.35,
        formFactor: 'DIMM',
        ecc: false,
        rgb: true,
        heatSpreader: true,
        inventory: { quantity: 100, lowStockThreshold: 10 },
        images: [{ url: 'https://res.cloudinary.com/dfquny0nk/image/upload/v1/reflexity/placeholder-ddr4.jpg', alt: 'Reflexity DDR4-3600 16GB', isPrimary: true }],
        isFeatured: true,
        tags: ['ddr4', 'gaming', 'rgb'],
      },
      {
        name: 'Reflexity DDR4-3200 32GB Kit',
        slug: 'reflexity-ddr4-3200-32gb',
        description: 'Reliable 32GB DDR4 for workstations and multi-tasking builds. 2×16GB CL16.',
        price: 79.99,
        compareAtPrice: 99.99,
        sku: 'RFX-DDR4-3200-32',
        generation: 'DDR4',
        capacity: '32GB',
        speed: 3200,
        casLatency: 16,
        voltage: 1.35,
        formFactor: 'DIMM',
        ecc: false,
        rgb: false,
        heatSpreader: true,
        inventory: { quantity: 60, lowStockThreshold: 5 },
        images: [{ url: 'https://res.cloudinary.com/dfquny0nk/image/upload/v1/reflexity/placeholder-ddr4-32.jpg', alt: 'Reflexity DDR4-3200 32GB', isPrimary: true }],
        isFeatured: false,
        tags: ['ddr4', 'workstation'],
      },
      {
        name: 'Reflexity DDR5-6400 64GB Kit',
        slug: 'reflexity-ddr5-6400-64gb',
        description: 'Flagship 64GB DDR5 kit for extreme workloads. 2×32GB with Intel XMP 3.0 and AMD EXPO.',
        price: 299.99,
        compareAtPrice: 349.99,
        sku: 'RFX-DDR5-6400-64',
        generation: 'DDR5',
        capacity: '64GB',
        speed: 6400,
        casLatency: 32,
        voltage: 1.4,
        formFactor: 'DIMM',
        ecc: false,
        rgb: true,
        heatSpreader: true,
        inventory: { quantity: 20, lowStockThreshold: 3 },
        images: [{ url: 'https://res.cloudinary.com/dfquny0nk/image/upload/v1/reflexity/placeholder-ddr5-64.jpg', alt: 'Reflexity DDR5-6400 64GB', isPrimary: true }],
        isFeatured: true,
        tags: ['ddr5', 'flagship', 'rgb'],
      },
      {
        name: 'Reflexity SO-DIMM DDR4-3200 16GB',
        slug: 'reflexity-sodimm-ddr4-3200-16gb',
        description: 'Laptop-grade DDR4 SO-DIMM for upgrades. Single 16GB stick, plug-and-play.',
        price: 39.99,
        compareAtPrice: 54.99,
        sku: 'RFX-SODIMM-DDR4-3200-16',
        generation: 'DDR4',
        capacity: '16GB',
        speed: 3200,
        casLatency: 22,
        voltage: 1.2,
        formFactor: 'SO-DIMM',
        ecc: false,
        rgb: false,
        heatSpreader: false,
        inventory: { quantity: 80, lowStockThreshold: 10 },
        images: [{ url: 'https://res.cloudinary.com/dfquny0nk/image/upload/v1/reflexity/placeholder-sodimm.jpg', alt: 'Reflexity SO-DIMM DDR4-3200 16GB', isPrimary: true }],
        isFeatured: false,
        tags: ['ddr4', 'laptop', 'so-dimm'],
      },
    ];

    await Product.insertMany(products);

    return res.json({
      success: true,
      message: `Seeded ${products.length} products and admin user.`,
      admin: adminEmail,
      products: products.length,
    });
  } catch (err) {
    console.error('Seed error:', err);
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
