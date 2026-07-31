const express = require('express');
const Product = require('../models/Product');

const router = express.Router();

const BASE_URL = 'https://reflexityram.com';

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

      xml += '  <item>\n';
      xml += `    <g:id>${p.sku}</g:id>\n`;
      xml += `    <title><![CDATA[${p.name}]]></title>\n`;
      xml += `    <description><![CDATA[${p.name} — ${p.generation} ${p.formFactor} ${p.speedLabel} ${p.cas}. ${p.condition}. ${p.warranty} warranty.]]></description>\n`;
      xml += `    <link>${BASE_URL}/shop/${p.slug}</link>\n`;
      if (imageUrl) xml += `    <g:image_link>${imageUrl}</g:image_link>\n`;
      xml += `    <g:price>${p.price} CAD</g:price>\n`;
      if (p.compareAt && p.compareAt > p.price) {
        xml += `    <g:sale_price>${p.price} CAD</g:sale_price>\n`;
      }
      xml += `    <g:condition>${condition}</g:condition>\n`;
      xml += `    <g:availability>${availability}</g:availability>\n`;
      xml += `    <g:brand>Reflexity RAM</g:brand>\n`;
      xml += `    <g:mpn>${p.sku}</g:mpn>\n`;
      xml += `    <g:identifier_exists>true</g:identifier_exists>\n`;
      xml += `    <g:item_group_id>reflexity-ram</g:item_group_id>\n`;
      xml += `    <g:product_type>Computer Memory</g:product_type>\n`;
      xml += '    <g:shipping>\n';
      xml += '      <g:country>CA</g:country>\n';
      xml += '      <g:service>Standard</g:service>\n';
      xml += '      <g:price>14 CAD</g:price>\n';
      xml += '    </g:shipping>\n';
      xml += '    <g:shipping>\n';
      xml += '      <g:country>US</g:country>\n';
      xml += '      <g:service>Standard</g:service>\n';
      xml += '      <g:price>14 CAD</g:price>\n';
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

    const header = 'id,title,description,link,image_link,price,condition,availability,brand,mpn,item_group_id,product_type,google_product_category';
    const rows = products.map(p => {
      const imageUrl = p.images?.[0]?.url || '';
      const condition = mapCondition(p.condition);
      const availability = p.stock === 'out' ? 'out_of_stock' : 'in_stock';
      const desc = `${p.name} — ${p.generation} ${p.formFactor} ${p.speedLabel} ${p.cas}. ${p.condition}. ${p.warranty} warranty.`;
      return [
        p.sku,
        `"${p.name.replace(/"/g, '""')}"`,
        `"${desc.replace(/"/g, '""')}"`,
        `${BASE_URL}/shop/${p.slug}`,
        imageUrl,
        `${p.price} CAD`,
        condition,
        availability,
        'Reflexity RAM',
        p.sku,
        'reflexity-ram',
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

module.exports = router;
