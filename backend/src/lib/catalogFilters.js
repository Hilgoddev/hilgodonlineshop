const taxonomy = require('./taxonomy.json');
const VALID_CATEGORIES = new Set(taxonomy.map(c => c.id));
function normalizeCategory(value) { const v = typeof value === 'string' ? value.trim().toLowerCase() : ''; return VALID_CATEGORIES.has(v) ? v : null; }
function applyCategory(query, category) {
 if (category === 'unisex') return query.or('category.eq.unisex,is_unisex.eq.true');
 if (category === 'fashion') return query.or('category.in.(menswear,womenswear,unisex),is_unisex.eq.true');
 if (category === 'menswear' || category === 'womenswear') return query.or('category.eq.' + category + ',category.eq.unisex,is_unisex.eq.true');
 return category ? query.eq('category', category) : query;
}
function subcategoryValues(value) {
 const selected = String(value || '').split(',').map(s=>s.trim()).filter(Boolean).slice(0,30);
 const pairs = [["Men's Tops", "Women's Tops"], ["Men's Bottoms", "Women's Bottoms"], ["Men's Suits & Sets", "Women's Suits & Sets"], ["Men's Sleepwear", "Women's Sleepwear", 'Sleepwear'], ["Men's Traditional Wear", "Women's Traditional Wear", 'Traditional Wear'], ['Shirts', 'Shirts & Blouses'], ['Shorts', 'Skirts & Shorts']];
 return [...new Set(selected.flatMap(s => pairs.find(p=>p.includes(s)) || [s]))];
}
module.exports = { taxonomy, normalizeCategory, applyCategory, subcategoryValues };
