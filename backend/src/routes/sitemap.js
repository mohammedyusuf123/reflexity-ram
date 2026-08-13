const express = require('express');
const Product = require('../models/Product');
const { BASE_URL, STATIC_PAGES } = require('../config/sitemap');

const router = express.Router();

router.get('/sitemap.xml', async (req, res) => {
  try {
    const products = await Product.find({ isActive: true })
      .select('slug updatedAt createdAt')
      .lean();

    const today = new Date().toISOString().split('T')[0];

    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

    for (const page of STATIC_PAGES) {
      xml += `  <url>\n`;
      xml += `    <loc>${BASE_URL}${page.path}</loc>\n`;
      xml += `    <lastmod>${today}</lastmod>\n`;
      xml += `    <changefreq>${page.changefreq}</changefreq>\n`;
      xml += `    <priority>${page.priority}</priority>\n`;
      xml += `  </url>\n`;
    }

    for (const product of products) {
      const lastmod = (product.updatedAt || product.createdAt || new Date()).toISOString().split('T')[0];
      xml += `  <url>\n`;
      xml += `    <loc>${BASE_URL}/shop/${product.slug}</loc>\n`;
      xml += `    <lastmod>${lastmod}</lastmod>\n`;
      xml += `    <changefreq>weekly</changefreq>\n`;
      xml += `    <priority>0.7</priority>\n`;
      xml += `  </url>\n`;
    }

    xml += '</urlset>';

    res.set('Content-Type', 'application/xml');
    res.set('Cache-Control', 'public, max-age=3600');
    res.send(xml);
  } catch (err) {
    console.error('Sitemap error:', err);
    res.status(500).send('Error generating sitemap');
  }
});

module.exports = router;
