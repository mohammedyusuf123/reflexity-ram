/**
 * One-time seed route — protected by SEED_SECRET env var.
 * Call: POST /api/seed  with header  x-seed-secret: <SEED_SECRET>
 * Remove SEED_SECRET env var after seeding to disable this endpoint.
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

  const results = { admin: null, products: 0, errors: [] };

  try {
    // ── Admin user ──────────────────────────────────────────────────────────
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@reflexityram.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'ReflexityAdmin2026!';

    const existingAdmin = await User.findOne({ email: adminEmail });
    if (!existingAdmin) {
      const admin = new User({
        firstName: 'Admin',
        lastName: 'User',
        email: adminEmail,
        password: adminPassword,
        role: 'admin',
        isEmailVerified: true,
      });
      await admin.save();
      results.admin = `Created: ${adminEmail}`;
    } else {
      await User.updateOne(
        { _id: existingAdmin._id },
        { $set: { role: 'admin', isEmailVerified: true } }
      );
      results.admin = `Updated: ${adminEmail}`;
    }
  } catch (err) {
    results.errors.push(`Admin: ${err.message}`);
  }

  // ── Products ─────────────────────────────────────────────────────────────
  try {
    const existingCount = await Product.countDocuments();
    if (existingCount > 0) {
      results.products = existingCount;
      results.skippedProducts = true;
    } else {
      const products = [
        {
          name: 'Reflexity DDR5-6000 16GB Kit (2×8GB)',
          slug: 'reflexity-ddr5-6000-16gb-kit',
          sku: 'RFX-DDR5-6000-16-RGB',
          description: 'High-performance DDR5 RAM for next-gen Intel and AMD platforms. 2×8GB dual-channel kit with XMP 3.0 support and RGB lighting.',
          line: 'Gaming / Enthusiast',
          generation: 'DDR5',
          formFactor: 'UDIMM',
          capacity: 16,
          capacityLabel: '16GB',
          kit: '2 × 8GB',
          speed: 6000,
          speedLabel: 'DDR5-6000',
          cas: 'CL36',
          timings: '36-36-36-76',
          voltage: '1.35V',
          ecc: false,
          rgb: true,
          heatspreader: 'Aluminium',
          condition: 'New',
          warranty: 'Lifetime',
          price: 89.99,
          compareAt: 109.99,
          stock: 'in',
          stockLabel: 'In stock',
          stockQuantity: 50,
          isFeatured: true,
          tags: ['ddr5', 'gaming', 'rgb', 'xmp3'],
          images: [],
        },
        {
          name: 'Reflexity DDR5-5600 32GB Kit (2×16GB)',
          slug: 'reflexity-ddr5-5600-32gb-kit',
          sku: 'RFX-DDR5-5600-32',
          description: 'Massive 32GB DDR5 kit for content creators and power users. 2×16GB with low-latency tuning and EXPO/XMP support.',
          line: 'Workstation',
          generation: 'DDR5',
          formFactor: 'UDIMM',
          capacity: 32,
          capacityLabel: '32GB',
          kit: '2 × 16GB',
          speed: 5600,
          speedLabel: 'DDR5-5600',
          cas: 'CL40',
          timings: '40-40-40-77',
          voltage: '1.1V',
          ecc: false,
          rgb: false,
          heatspreader: 'Aluminium',
          condition: 'New',
          warranty: 'Lifetime',
          price: 149.99,
          compareAt: 179.99,
          stock: 'in',
          stockLabel: 'In stock',
          stockQuantity: 30,
          isFeatured: true,
          tags: ['ddr5', 'workstation', 'expo'],
          images: [],
        },
        {
          name: 'Reflexity DDR4-3600 16GB Kit (2×8GB)',
          slug: 'reflexity-ddr4-3600-16gb-kit',
          sku: 'RFX-DDR4-3600-16-RGB',
          description: 'The sweet-spot DDR4 kit for AM4 and LGA1200 platforms. 2×8GB CL18 with XMP 2.0 and RGB lighting.',
          line: 'Gaming / Enthusiast',
          generation: 'DDR4',
          formFactor: 'UDIMM',
          capacity: 16,
          capacityLabel: '16GB',
          kit: '2 × 8GB',
          speed: 3600,
          speedLabel: 'DDR4-3600',
          cas: 'CL18',
          timings: '18-22-22-42',
          voltage: '1.35V',
          ecc: false,
          rgb: true,
          heatspreader: 'Aluminium',
          condition: 'New',
          warranty: 'Lifetime',
          price: 49.99,
          compareAt: 64.99,
          stock: 'in',
          stockLabel: 'In stock',
          stockQuantity: 100,
          isFeatured: true,
          tags: ['ddr4', 'gaming', 'rgb', 'xmp2'],
          images: [],
        },
        {
          name: 'Reflexity DDR4-3200 32GB Kit (2×16GB)',
          slug: 'reflexity-ddr4-3200-32gb-kit',
          sku: 'RFX-DDR4-3200-32',
          description: 'Reliable 32GB DDR4 for workstations and multi-tasking builds. 2×16GB CL16 with XMP 2.0.',
          line: 'Workstation',
          generation: 'DDR4',
          formFactor: 'UDIMM',
          capacity: 32,
          capacityLabel: '32GB',
          kit: '2 × 16GB',
          speed: 3200,
          speedLabel: 'DDR4-3200',
          cas: 'CL16',
          timings: '16-18-18-38',
          voltage: '1.35V',
          ecc: false,
          rgb: false,
          heatspreader: 'Aluminium',
          condition: 'New',
          warranty: 'Lifetime',
          price: 79.99,
          compareAt: 99.99,
          stock: 'in',
          stockLabel: 'In stock',
          stockQuantity: 60,
          isFeatured: false,
          tags: ['ddr4', 'workstation'],
          images: [],
        },
        {
          name: 'Reflexity DDR5-6400 64GB Kit (2×32GB)',
          slug: 'reflexity-ddr5-6400-64gb-kit',
          sku: 'RFX-DDR5-6400-64-RGB',
          description: 'Flagship 64GB DDR5 kit for extreme workloads. 2×32GB with Intel XMP 3.0 and AMD EXPO, RGB lighting.',
          line: 'Gaming / Enthusiast',
          generation: 'DDR5',
          formFactor: 'UDIMM',
          capacity: 64,
          capacityLabel: '64GB',
          kit: '2 × 32GB',
          speed: 6400,
          speedLabel: 'DDR5-6400',
          cas: 'CL32',
          timings: '32-39-39-102',
          voltage: '1.4V',
          ecc: false,
          rgb: true,
          heatspreader: 'Aluminium',
          condition: 'New',
          warranty: 'Lifetime',
          price: 299.99,
          compareAt: 349.99,
          stock: 'in',
          stockLabel: 'In stock',
          stockQuantity: 20,
          isFeatured: true,
          tags: ['ddr5', 'flagship', 'rgb', 'xmp3', 'expo'],
          images: [],
        },
        {
          name: 'Reflexity SO-DIMM DDR4-3200 16GB',
          slug: 'reflexity-sodimm-ddr4-3200-16gb',
          sku: 'RFX-SODIMM-DDR4-3200-16',
          description: 'Laptop-grade DDR4 SO-DIMM for notebook upgrades. Single 16GB stick, plug-and-play compatible.',
          line: 'Laptop',
          generation: 'DDR4',
          formFactor: 'SO-DIMM',
          capacity: 16,
          capacityLabel: '16GB',
          kit: '1 × 16GB',
          speed: 3200,
          speedLabel: 'DDR4-3200',
          cas: 'CL22',
          timings: '22-22-22-52',
          voltage: '1.2V',
          ecc: false,
          rgb: false,
          heatspreader: 'None',
          condition: 'New',
          warranty: 'Lifetime',
          price: 39.99,
          compareAt: 54.99,
          stock: 'in',
          stockLabel: 'In stock',
          stockQuantity: 80,
          isFeatured: false,
          tags: ['ddr4', 'laptop', 'so-dimm'],
          images: [],
        },
      ];

      await Product.insertMany(products);
      results.products = products.length;
    }
  } catch (err) {
    results.errors.push(`Products: ${err.message}`);
  }

  const success = results.errors.length === 0;
  return res.status(success ? 200 : 207).json({
    success,
    ...results,
  });
});

module.exports = router;
