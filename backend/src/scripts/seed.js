require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');
const Product = require('../models/Product');
const User = require('../models/User');

const PRODUCTS = [
  {
    slug: 'rfx-d4-16-3200-cl16',
    sku: 'RFX-D4-16-3200-CL16',
    name: '16GB (2x8GB) DDR4-3200 CL16 Desktop',
    line: 'Desktop',
    generation: 'DDR4',
    formFactor: 'UDIMM',
    capacity: 16,
    capacityLabel: '16GB',
    kit: '2 x 8GB',
    speed: 3200,
    speedLabel: '3200 MT/s',
    cas: 'CL16',
    timings: '16-18-18-38',
    voltage: '1.35V',
    ecc: false,
    rank: 'Single Rank',
    profile: 'XMP 2.0',
    heatspreader: 'Aluminum, low-profile',
    rgb: false,
    condition: 'New',
    warranty: 'Limited Lifetime',
    price: 44.99,
    compareAt: 59.99,
    stockQuantity: 50,
    estimatedDispatch: '1–2 business days',
    images: [{ url: 'https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?w=1200&q=80', alt: '16GB DDR4 Desktop RAM' }],
    tags: ['DDR4', 'Desktop', 'XMP'],
    compatibility: ['Intel Z490/Z590/Z690', 'AMD X570/B550/A520'],
    included: ['2 × DDR4 UDIMM modules'],
    isFeatured: true,
  },
  {
    slug: 'rfx-d4-32-3600-cl18',
    sku: 'RFX-D4-32-3600-CL18',
    name: '32GB (2x16GB) DDR4-3600 CL18 Desktop',
    line: 'Desktop',
    generation: 'DDR4',
    formFactor: 'UDIMM',
    capacity: 32,
    capacityLabel: '32GB',
    kit: '2 x 16GB',
    speed: 3600,
    speedLabel: '3600 MT/s',
    cas: 'CL18',
    timings: '18-22-22-42',
    voltage: '1.35V',
    ecc: false,
    rank: 'Dual Rank',
    profile: 'XMP 2.0',
    heatspreader: 'Aluminum, low-profile',
    rgb: false,
    condition: 'New',
    warranty: 'Limited Lifetime',
    price: 79.99,
    compareAt: 99.99,
    stockQuantity: 30,
    estimatedDispatch: '1–2 business days',
    images: [{ url: 'https://images.unsplash.com/photo-1562976540-1502c2145186?w=1200&q=80', alt: '32GB DDR4 Desktop RAM' }],
    tags: ['DDR4', 'Desktop', 'XMP'],
    compatibility: ['Intel Z490/Z590/Z690', 'AMD X570/B550/A520'],
    included: ['2 × DDR4 UDIMM modules'],
    isFeatured: true,
  },
    {
      slug: 'rfx-d5-32-5600-cl36',
      sku: 'RFX-D5-32-5600-CL36',
      name: '32GB (2x16GB) DDR5-5600 CL36 Desktop - MANUS FIXED',
    line: 'Desktop',
    generation: 'DDR5',
    formFactor: 'UDIMM',
    capacity: 32,
    capacityLabel: '32GB',
    kit: '2 x 16GB',
    speed: 5600,
    speedLabel: '5600 MT/s',
    cas: 'CL36',
    timings: '36-36-36-76',
    voltage: '1.1V',
    ecc: false,
    rank: 'Single Rank',
    profile: 'XMP 3.0',
    heatspreader: 'Aluminum, brushed black',
    rgb: false,
    condition: 'New',
    warranty: 'Limited Lifetime',
    price: 89.99,
    compareAt: 119.99,
    stockQuantity: 25,
    estimatedDispatch: '1–2 business days',
    images: [{ url: 'https://images.unsplash.com/photo-1592664474505-04ec8d80b637?w=1200&q=80', alt: '32GB DDR5 Desktop RAM' }],
    tags: ['DDR5', 'Desktop', 'XMP'],
    compatibility: ['Intel Z690/Z790/Z890', 'AMD AM5 (X670/B650)'],
    included: ['2 × DDR5 UDIMM modules'],
    isFeatured: true,
  },
  {
    slug: 'rfx-d4-so-16-3200',
    sku: 'RFX-D4-SO-16-3200',
    name: '16GB (2x8GB) DDR4 SO-DIMM 3200',
    line: 'Laptop',
    generation: 'DDR4',
    formFactor: 'SO-DIMM',
    capacity: 16,
    capacityLabel: '16GB',
    kit: '2 x 8GB',
    speed: 3200,
    speedLabel: '3200 MT/s',
    cas: 'CL22',
    timings: '22-22-22-52',
    voltage: '1.2V',
    ecc: false,
    rank: 'Single Rank',
    profile: 'JEDEC',
    heatspreader: 'None (laptop form factor)',
    rgb: false,
    condition: 'New',
    warranty: 'Limited Lifetime',
    price: 49.99,
    compareAt: 69.99,
    stockQuantity: 40,
    estimatedDispatch: '1–2 business days',
    images: [{ url: 'https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?w=1200&q=80', alt: '16GB DDR4 Laptop RAM' }],
    tags: ['DDR4', 'Laptop', 'SO-DIMM'],
    compatibility: ['Most DDR4 laptops', 'Intel NUC', 'Mini-PCs'],
    included: ['2 × DDR4 SO-DIMM modules'],
  },
  {
    slug: 'rfx-d4-ecc-rd-64-2933',
    sku: 'RFX-D4-RD-64-2933',
    name: '64GB (2x32GB) DDR4 RDIMM ECC 2933',
    line: 'Server',
    generation: 'DDR4',
    formFactor: 'RDIMM',
    capacity: 64,
    capacityLabel: '64GB',
    kit: '2 x 32GB',
    speed: 2933,
    speedLabel: '2933 MT/s',
    cas: 'CL21',
    timings: '21-21-21-47',
    voltage: '1.2V',
    ecc: true,
    rank: 'Dual Rank',
    profile: 'JEDEC',
    heatspreader: 'Industrial heatspreader',
    rgb: false,
    condition: 'Refurbished — Tested',
    warranty: '1 Year',
    price: 159.00,
    compareAt: 249.00,
    stockQuantity: 8,
    estimatedDispatch: '1–3 business days',
    images: [{ url: 'https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?w=1200&q=80', alt: '64GB DDR4 ECC Server RAM' }],
    tags: ['DDR4', 'ECC', 'Registered', 'Server'],
    compatibility: ['Intel Xeon Scalable Gen 1/2', 'AMD EPYC 7001/7002'],
    included: ['2 × DDR4 RDIMM ECC modules'],
  },
  {
    slug: 'rfx-d5-32-7200-cl34',
    sku: 'RFX-D5-32-7200-CL34',
    name: '32GB (2x16GB) DDR5-7200 CL34 Premium',
    line: 'Desktop',
    generation: 'DDR5',
    formFactor: 'UDIMM',
    capacity: 32,
    capacityLabel: '32GB',
    kit: '2 x 16GB',
    speed: 7200,
    speedLabel: '7200 MT/s',
    cas: 'CL34',
    timings: '34-42-42-108',
    voltage: '1.4V',
    ecc: false,
    rank: 'Dual Rank',
    profile: 'XMP 3.0',
    heatspreader: 'Aluminum, brushed black',
    rgb: false,
    condition: 'New',
    warranty: 'Limited Lifetime',
    price: 169.00,
    compareAt: 199.00,
    stockQuantity: 15,
    estimatedDispatch: '1–2 business days',
    images: [{ url: 'https://images.unsplash.com/photo-1562976540-1502c2145186?w=1200&q=80', alt: '32GB DDR5 7200 Premium RAM' }],
    tags: ['DDR5', 'XMP', 'High Speed', 'Z790/Z890'],
    compatibility: ['Intel Z790/Z890 with strong memory tuning'],
    included: ['2 × DDR5 UDIMM modules'],
    isFeatured: true,
  },
];

async function seed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Seed products
    for (const productData of PRODUCTS) {
      await Product.findOneAndUpdate(
        { slug: productData.slug },
        productData,
        { upsert: true, new: true, runValidators: true }
      );
      console.log(`  ✓ Product: ${productData.name}`);
    }

    // Create admin user if not exists.
    // SECURITY: no default password ships in source. The script refuses to
    // create or reset the admin unless ADMIN_PASSWORD is set (12+ chars) —
    // same policy as the hardened /api/seed route.
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@reflexityram.com';
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (!adminPassword || adminPassword.length < 12) {
      console.warn('  ⚠ Skipping admin user: set ADMIN_PASSWORD env var (12+ chars) to seed the admin');
    } else {
    const existingAdmin = await User.findOne({ email: adminEmail });
    if (!existingAdmin) {
      await User.create({
        email: adminEmail,
        password: adminPassword,
        firstName: 'Admin',
        lastName: 'Reflexity',
        role: 'admin',
        isEmailVerified: true,
      });
      console.log(`  ✓ Admin user created: ${adminEmail}`);
    } else {
      existingAdmin.password = adminPassword;
      existingAdmin.role = 'admin';
      await existingAdmin.save();
      console.log(`  ✓ Admin user updated: ${adminEmail}`);
    }
    }

    console.log('\n✅ Seed complete!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seed error:', err);
    process.exit(1);
  }
}

seed();
