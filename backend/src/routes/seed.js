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
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@reflexityram.com';
    const adminPassword = process.env.ADMIN_PASSWORD;
    // SECURITY: never ship a default admin password in source code.
    // The seed refuses to create/reset the admin unless ADMIN_PASSWORD is set.
    if (!adminPassword || adminPassword.length < 12) {
      results.errors.push('Admin: ADMIN_PASSWORD env var must be set (12+ chars) to seed the admin user');
    } else {
    const existingAdmin = await User.findOne({ email: adminEmail });
    if (!existingAdmin) {
      const admin = new User({ firstName: 'Admin', lastName: 'User', email: adminEmail, password: adminPassword, role: 'admin', isEmailVerified: true });
      await admin.save();
      results.admin = `Created: ${adminEmail}`;
    } else {
      existingAdmin.role = 'admin';
      existingAdmin.isEmailVerified = true;
      existingAdmin.isActive = true;
      existingAdmin.password = adminPassword;
      await existingAdmin.save();
      results.admin = `Updated: ${adminEmail}`;
    }
    }
  } catch (err) {
    results.errors.push(`Admin: ${err.message}`);
  }

  const products = [
    { name: '32GB (2x16GB) DDR5-6000 CL30 EXPO Kit', slug: 'rfx-d5-32-6000-cl30-expo', sku: 'RFX-D5-32-6000-CL30', description: 'High-performance DDR5 for AMD AM5. 2x16GB EXPO + XMP 3.0.', line: 'Gaming / Enthusiast', generation: 'DDR5', formFactor: 'UDIMM', capacity: 32, capacityLabel: '32GB', kit: '2 x 16GB', speed: 6000, speedLabel: '6000 MT/s', cas: 'CL30', timings: '30-38-38-96', voltage: '1.35V', ecc: false, rgb: false, heatspreader: 'Aluminum, low-profile black', condition: 'New', warranty: 'Limited Lifetime', price: 119.0, compareAt: 139.0, stock: 'in', stockLabel: 'In stock', stockQuantity: 50, isFeatured: true, tags: ['DDR5','EXPO','AM5'], images: [] },
    { name: '64GB (2x32GB) DDR5-6400 CL32 Kit', slug: 'rfx-d5-64-6400-cl32', sku: 'RFX-D5-64-6400-CL32', description: 'Massive 64GB DDR5 for workstations. 2x32GB XMP 3.0 + EXPO.', line: 'Workstation', generation: 'DDR5', formFactor: 'UDIMM', capacity: 64, capacityLabel: '64GB', kit: '2 x 32GB', speed: 6400, speedLabel: '6400 MT/s', cas: 'CL32', timings: '32-39-39-102', voltage: '1.4V', ecc: false, rgb: false, heatspreader: 'Aluminum, brushed silver', condition: 'New', warranty: 'Limited Lifetime', price: 219.0, compareAt: 259.0, stock: 'in', stockLabel: 'In stock', stockQuantity: 20, isFeatured: true, tags: ['DDR5','XMP','High Capacity'], images: [] },
    { name: '32GB (2x16GB) DDR5 SO-DIMM 5600 CL46', slug: 'rfx-d5-so-32-5600', sku: 'RFX-D5-SO-32-5600', description: 'DDR5 SO-DIMM for laptops and mini-PCs. 2x16GB JEDEC.', line: 'Laptop', generation: 'DDR5', formFactor: 'SO-DIMM', capacity: 32, capacityLabel: '32GB', kit: '2 x 16GB', speed: 5600, speedLabel: '5600 MT/s', cas: 'CL46', timings: '46-45-45-90', voltage: '1.1V', ecc: false, rgb: false, heatspreader: 'None (bare PCB)', condition: 'New', warranty: 'Limited Lifetime', price: 109.0, compareAt: 129.0, stock: 'in', stockLabel: 'In stock', stockQuantity: 40, isFeatured: false, tags: ['DDR5','SO-DIMM','Laptop'], images: [] },
    { name: '32GB (2x16GB) DDR4-3600 CL16 XMP Kit', slug: 'rfx-d4-32-3600-cl16', sku: 'RFX-D4-32-3600-CL16', description: 'Sweet-spot DDR4 for AM4 and LGA1200. 2x16GB CL16 XMP 2.0.', line: 'Gaming / Enthusiast', generation: 'DDR4', formFactor: 'UDIMM', capacity: 32, capacityLabel: '32GB', kit: '2 x 16GB', speed: 3600, speedLabel: '3600 MT/s', cas: 'CL16', timings: '16-19-19-39', voltage: '1.35V', ecc: false, rgb: false, heatspreader: 'Aluminum, matte black', condition: 'New', warranty: 'Limited Lifetime', price: 89.0, compareAt: 109.0, stock: 'low', stockLabel: 'Low stock', stockQuantity: 8, isFeatured: true, tags: ['DDR4','XMP','Ryzen sweet-spot'], images: [] },
    { name: '16GB (2x8GB) DDR4-3200 CL16 Kit', slug: 'rfx-d4-16-3200-cl16', sku: 'RFX-D4-16-3200-CL16', description: 'Reliable 16GB DDR4 for mainstream builds. 2x8GB CL16 XMP 2.0.', line: 'Desktop', generation: 'DDR4', formFactor: 'UDIMM', capacity: 16, capacityLabel: '16GB', kit: '2 x 8GB', speed: 3200, speedLabel: '3200 MT/s', cas: 'CL16', timings: '16-18-18-38', voltage: '1.35V', ecc: false, rgb: false, heatspreader: 'Aluminum, low-profile', condition: 'New', warranty: 'Limited Lifetime', price: 39.0, compareAt: 49.0, stock: 'in', stockLabel: 'In stock', stockQuantity: 100, isFeatured: false, tags: ['DDR4','Value'], images: [] },
    { name: '16GB (2x8GB) DDR4 SO-DIMM 3200 CL22', slug: 'rfx-d4-so-16-3200', sku: 'RFX-D4-SO-16-3200', description: 'Laptop DDR4 SO-DIMM. 2x8GB plug-and-play.', line: 'Laptop', generation: 'DDR4', formFactor: 'SO-DIMM', capacity: 16, capacityLabel: '16GB', kit: '2 x 8GB', speed: 3200, speedLabel: '3200 MT/s', cas: 'CL22', timings: '22-22-22-52', voltage: '1.2V', ecc: false, rgb: false, heatspreader: 'None', condition: 'New', warranty: 'Limited Lifetime', price: 42.0, compareAt: 54.0, stock: 'in', stockLabel: 'In stock', stockQuantity: 80, isFeatured: false, tags: ['DDR4','SO-DIMM'], images: [] },
    { name: '64GB (2x32GB) DDR4 RDIMM ECC 2933', slug: 'rfx-d4-ecc-rd-64-2933', sku: 'RFX-D4-RD-64-2933', description: 'Server DDR4 RDIMM ECC for Xeon/EPYC. 2x32GB refurbished.', line: 'Server', generation: 'DDR4', formFactor: 'RDIMM', capacity: 64, capacityLabel: '64GB', kit: '2 x 32GB', speed: 2933, speedLabel: '2933 MT/s', cas: 'CL21', timings: '21-21-21-47', voltage: '1.2V', ecc: true, rgb: false, heatspreader: 'Industrial heatspreader', condition: 'Refurbished — Tested', warranty: '1 Year', price: 159.0, compareAt: 249.0, stock: 'in', stockLabel: 'In stock', stockQuantity: 15, isFeatured: false, tags: ['DDR4','ECC','Registered','Server'], images: [] },
    { name: '128GB (2x64GB) DDR4 LRDIMM ECC 2666', slug: 'rfx-d4-ecc-lr-128-2666', sku: 'RFX-D4-LR-128-2666', description: 'High-density 128GB DDR4 LRDIMM ECC. 2x64GB refurbished.', line: 'Server', generation: 'DDR4', formFactor: 'LRDIMM', capacity: 128, capacityLabel: '128GB', kit: '2 x 64GB', speed: 2666, speedLabel: '2666 MT/s', cas: 'CL19', timings: '19-19-19-43', voltage: '1.2V', ecc: true, rgb: false, heatspreader: 'Industrial heatspreader', condition: 'Refurbished — Tested', warranty: '1 Year', price: 289.0, compareAt: 499.0, stock: 'low', stockLabel: 'Low stock', stockQuantity: 4, isFeatured: false, tags: ['DDR4','ECC','LRDIMM','High Density'], images: [] },
    { name: '64GB DDR5 RDIMM ECC 4800', slug: 'rfx-d5-ecc-rd-64-4800', sku: 'RFX-D5-RD-64-4800', description: 'Server DDR5 RDIMM ECC for Xeon Sapphire Rapids / EPYC Genoa. Open-box tested.', line: 'Server', generation: 'DDR5', formFactor: 'RDIMM', capacity: 64, capacityLabel: '64GB', kit: '1 x 64GB', speed: 4800, speedLabel: '4800 MT/s', cas: 'CL40', timings: '40-39-39-77', voltage: '1.1V', ecc: true, rgb: false, heatspreader: 'Industrial heatspreader', condition: 'Open Box — Tested', warranty: '1 Year', price: 269.0, compareAt: 339.0, stock: 'in', stockLabel: 'In stock', stockQuantity: 10, isFeatured: false, tags: ['DDR5','ECC','Registered','Server'], images: [] },
    { name: '32GB (2x16GB) DDR5-7200 CL34 Premium', slug: 'rfx-d5-32-7200-cl34', sku: 'RFX-D5-32-7200-CL34', description: 'Flagship DDR5-7200 for extreme Intel OC builds. 2x16GB CL34 XMP 3.0.', line: 'Gaming / Enthusiast', generation: 'DDR5', formFactor: 'UDIMM', capacity: 32, capacityLabel: '32GB', kit: '2 x 16GB', speed: 7200, speedLabel: '7200 MT/s', cas: 'CL34', timings: '34-42-42-108', voltage: '1.4V', ecc: false, rgb: false, heatspreader: 'Aluminum, brushed black', condition: 'New', warranty: 'Limited Lifetime', price: 169.0, compareAt: 199.0, stock: 'in', stockLabel: 'In stock', stockQuantity: 25, isFeatured: true, tags: ['DDR5','XMP','High Speed','Z790/Z890'], images: [] },
  ];

  try {
    let upserted = 0;
    for (const p of products) {
      await Product.findOneAndUpdate({ slug: p.slug }, { $set: p }, { upsert: true, new: true, runValidators: true });
      upserted++;
    }
    results.products = upserted;
  } catch (err) {
    results.errors.push(`Products: ${err.message}`);
  }

  const success = results.errors.length === 0;
  return res.status(success ? 200 : 207).json({ success, ...results });
});

module.exports = router;
