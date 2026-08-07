const express = require('express');
const Product = require('../models/Product');
const { SHIPPING_OPTIONS, CURRENCY } = require('../config/shipping');

const router = express.Router();

const BASE_URL = 'https://reflexityram.com';
const STORE_CURRENCY = CURRENCY.toUpperCase();
const STANDARD_SHIPPING_PRICE = SHIPPING_OPTIONS.standard.price;

// Google Merchant Center product feed (XML)
router.get('/feed.xml', async (req, res) => {
  try {
    const products = await Product.find({ isActive: true, stock: { $ne: 'out' } })
      .lean();

    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">\n';
    xml += '<channel>\n';
    xml += '  <title>Reflexity RAM</title>\n';
    xml += `  <link>${BASE_URL}</link>\n`;
    xml += '  <description>Server and desktop RAM modules — DDR4, DDR5, ECC, UDIMM, SO-DIMM, RDIMM, LRDIMM</description>\n';

    for (const p of products) {
      const imageUrl = p.images?.[0]?.url || '';
      const condition = mapCondition(p.condition);
      const availability = p.stock === 'out' ? 'out_of_stock' : 'in_stock';
      const { brand, mpn } = productIdentifiers(p);
      const description = productDescription(p);

      xml += '  <item>\n';
      xml += `    <g:id>${xmlEscape(p.sku)}</g:id>\n`;
      xml += `    <title><![CDATA[${cdata(p.name)}]]></title>\n`;
      xml += `    <description><![CDATA[${cdata(description)}]]></description>\n`;
      xml += `    <link>${BASE_URL}/shop/${encodeURIComponent(p.slug)}</link>\n`;
      if (imageUrl) xml += `    <g:image_link>${xmlEscape(imageUrl)}</g:image_link>\n`;
      xml += `    <g:price>${p.compareAt && p.compareAt > p.price ? p.compareAt : p.price} ${STORE_CURRENCY}</g:price>\n`;
      if (p.compareAt && p.compareAt > p.price) {
        xml += `    <g:sale_price>${p.price} ${STORE_CURRENCY}</g:sale_price>\n`;
      }
      xml += `    <g:condition>${condition}</g:condition>\n`;
      xml += `    <g:availability>${availability}</g:availability>\n`;
      if (brand) xml += `    <g:brand>${xmlEscape(brand)}</g:brand>\n`;
      if (mpn) xml += `    <g:mpn>${xmlEscape(mpn)}</g:mpn>\n`;
      xml += `    <g:identifier_exists>${Boolean(brand && mpn)}</g:identifier_exists>\n`;
      xml += `    <g:product_type>Computer Memory</g:product_type>\n`;
      xml += '    <g:shipping>\n';
      xml += '      <g:country>CA</g:country>\n';
      xml += '      <g:service>Standard</g:service>\n';
      xml += `      <g:price>${STANDARD_SHIPPING_PRICE} ${STORE_CURRENCY}</g:price>\n`;
      xml += '    </g:shipping>\n';
      xml += '    <g:shipping>\n';
      xml += '      <g:country>US</g:country>\n';
      xml += '      <g:service>Standard</g:service>\n';
      xml += `      <g:price>${STANDARD_SHIPPING_PRICE} ${STORE_CURRENCY}</g:price>\n`;
      xml += '    </g:shipping>\n';
      xml += '  </item>\n';
    }

    xml += '</channel>\n';
    xml += '</rss>';

    res.set('Content-Type', 'application/xml');
    res.set('Cache-Control', 'public, max-age=3600');
    res.send(xml);
  } catch (err) {
    console.error('Feed error:', err);
    res.status(500).send('Error generating feed');
  }
});

// Also serve as CSV for platforms that prefer it
router.get('/feed.csv', async (req, res) => {
  try {
    const products = await Product.find({ isActive: true, stock: { $ne: 'out' } })
      .lean();

    const header = 'id,title,description,link,image_link,price,condition,availability,brand,mpn,identifier_exists,product_type';
    const rows = products.map(p => {
      const imageUrl = p.images?.[0]?.url || '';
      const condition = mapCondition(p.condition);
      const availability = p.stock === 'out' ? 'out_of_stock' : 'in_stock';
      const desc = productDescription(p);
      const { brand, mpn } = productIdentifiers(p);
      return [
        p.sku,
        `"${p.name.replace(/"/g, '""')}"`,
        `"${desc.replace(/"/g, '""')}"`,
        `${BASE_URL}/shop/${p.slug}`,
        imageUrl,
        `${p.price} ${STORE_CURRENCY}`,
        condition,
        availability,
        brand,
        mpn,
        Boolean(brand && mpn),
        'Computer Memory',
      ].join(',');
    });

    const csv = header + '\n' + rows.join('\n');

    res.set('Content-Type', 'text/csv');
    res.set('Cache-Control', 'public, max-age=3600');
    res.send(csv);
  } catch (err) {
    console.error('CSV feed error:', err);
    res.status(500).send('Error generating CSV feed');
  }
});

function mapCondition(condition) {
  const map = {
    'New': 'new',
    'Open Box — Tested': 'refurbished',
    'Refurbished — Tested': 'refurbished',
    'Used': 'used',
  };
  return map[condition] || 'used';
}

function productDescription(product) {
  const supplied = (product.description || '').trim();
  if (supplied.length >= 20 && !/^\d+$/.test(supplied)) return supplied;
  return `${product.name} — ${product.generation} ${product.formFactor} ${product.speedLabel}${product.cas ? ` ${product.cas}` : ''}. ${product.condition}. ${product.warranty} warranty.`;
}

function productIdentifiers(product) {
  const text = `${product.name || ''} ${product.description || ''}`;
  let brand = (product.brand || '').trim();
  if (!brand) {
    if (/^samsung\b/i.test(text)) brand = 'Samsung';
    else if (/^sk[ -]?hynix\b/i.test(text)) brand = 'SK hynix';
    else if (/^micron\b/i.test(text)) brand = 'Micron';
    else if (/^kingston\b/i.test(text)) brand = 'Kingston';
  }

  let mpn = (product.mpn || '').trim();
  if (!mpn) {
    const match = text.match(/\b(?:M(?:386|393)[A-Z0-9-]{7,}|HMA[A-Z0-9-]{7,})\b/i);
    if (match) mpn = match[0].toUpperCase();
  }
  return { brand, mpn };
}

function xmlEscape(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function cdata(value) {
  return String(value ?? '').replace(/]]>/g, ']]]]><![CDATA[>');
}

module.exports = router;
