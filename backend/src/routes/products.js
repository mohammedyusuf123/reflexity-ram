const express = require('express');
const { query, param } = require('express-validator');
const Product = require('../models/Product');
const { validate } = require('../middleware/validate');

const router = express.Router();

const preventStaleProductCache = (req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
};

router.use(preventStaleProductCache);

// ─── GET /api/products ─────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 24,
      generation,
      formFactor,
      capacity,
      condition,
      minPrice,
      maxPrice,
      stock,
      search,
      sort = 'createdAt',
      order = 'desc',
      featured,
    } = req.query;

    const filter = { isActive: true };

    if (generation) filter.generation = { $in: generation.split(',') };
    if (formFactor) filter.formFactor = { $in: formFactor.split(',') };
    if (capacity) filter.capacity = { $in: capacity.split(',').map(Number) };
    if (condition) filter.condition = { $in: condition.split(',') };
    if (stock) filter.stock = { $in: stock.split(',') };
    if (featured === 'true') filter.isFeatured = true;

    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }

    if (search) {
      filter.$text = { $search: search };
    }

    const sortObj = {};
    const validSortFields = ['price', 'createdAt', 'name', 'speed', 'capacity'];
    const sortField = validSortFields.includes(sort) ? sort : 'createdAt';
    sortObj[sortField] = order === 'asc' ? 1 : -1;

    const skip = (Number(page) - 1) * Number(limit);
    const limitNum = Math.min(Number(limit), 100);

    const [products, total] = await Promise.all([
      Product.find(filter).sort(sortObj).skip(skip).limit(limitNum).lean(),
      Product.countDocuments(filter),
    ]);

    res.json({
      products,
      pagination: {
        page: Number(page),
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (err) {
    console.error('Products list error:', err);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// ─── GET /api/products/featured ───────────────────────────────────────────────
router.get('/featured', async (req, res) => {
  try {
    const products = await Product.find({ isActive: true, isFeatured: true })
      .sort({ createdAt: -1 })
      .limit(8)
      .lean();
    res.json({ products });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch featured products' });
  }
});

// ─── GET /api/products/filters ─────────────────────────────────────────────────
router.get('/filters', async (req, res) => {
  try {
    const [generations, formFactors, capacities, conditions, priceRange] = await Promise.all([
      Product.distinct('generation', { isActive: true }),
      Product.distinct('formFactor', { isActive: true }),
      Product.distinct('capacity', { isActive: true }),
      Product.distinct('condition', { isActive: true }),
      Product.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: null, min: { $min: '$price' }, max: { $max: '$price' } } },
      ]),
    ]);

    res.json({
      generation: generations.sort(),
      formFactor: formFactors.sort(),
      capacity: capacities.sort((a, b) => a - b),
      condition: conditions,
      priceRange: priceRange[0] || { min: 0, max: 1000 },
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch filters' });
  }
});

// ─── GET /api/products/:slug ───────────────────────────────────────────────────
router.get('/:slug', async (req, res) => {
  try {
    const product = await Product.findOne({
      slug: req.params.slug,
      isActive: true,
    }).lean();

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Fetch related products (same generation, different product)
    const related = await Product.find({
      generation: product.generation,
      _id: { $ne: product._id },
      isActive: true,
    })
      .limit(4)
      .lean();

    res.json({ product, related });
  } catch (err) {
    console.error('Product detail error:', err);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

module.exports = router;
