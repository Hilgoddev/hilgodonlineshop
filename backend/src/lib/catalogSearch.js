const taxonomy = require('./taxonomy.json');
const normalize = value => String(value || '').toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, ' ').replace(/\s+/g, ' ').trim().slice(0,100);
const families = [
 ['earpiece','earpieces','earphone','earphones','earbud','earbuds'], ['headphone','headphones','headset','headsets'],
 ['jean','jeans','denim'], ['jogger','joggers','jogers'], ['hoodie','hoodies','sweatshirt','sweatshirts'],
 ['tshirt','tshirts','t-shirt','t-shirts'], ['sneaker','sneakers','trainer','trainers'],
 ['woman','women','womens','womenswear','female','ladies'], ['man','men','mens','menswear','male'],
 ['kid','kids','child','children'], ['baby','babies','infant','infants'], ['phone','phones','smartphone','smartphones']
];
function searchGroups(value) {
 const words=normalize(value).replace(/ear pieces?/g,'earpiece').replace(/t shirts?/g,'tshirt').split(' ').filter(Boolean).slice(0,6);
 return words.map(word=>families.find(f=>f.includes(word)) || [word]);
}
function applySearch(query,value,{description=true}={}) {
 for(const terms of searchGroups(value)) {
  const gender=terms.includes('womenswear')?'womenswear':terms.includes('menswear')?'menswear':null;
  if(gender){const prefix=gender==='menswear'?'men':'women';query=query.or('category.eq.'+gender+',category.eq.unisex,is_unisex.eq.true,name.ilike.'+prefix+'%,name.ilike.% '+prefix+'%,subcategory.ilike.'+prefix+'%');continue;}
  const fields=['name','brand','category','subcategory',...(description?['description']:[])];
  const clauses=terms.flatMap(term=>fields.map(f=>f+'.ilike.%'+term+'%'));
  if(terms.includes('womenswear') || terms.includes('menswear') || terms.includes('unisex')) clauses.push('is_unisex.eq.true','category.eq.unisex');
  query=query.or([...new Set(clauses)].join(','));
 }
 return query;
}
function scoreProduct(product,value) {
 const name=normalize(product.name), q=normalize(value), groups=searchGroups(value);
 let score=name===q?1000:name.startsWith(q)?500:0;
 for(const terms of groups) {
  if(terms.some(t=>name.split(/\s+/).includes(t)))score+=80;
  else if(terms.some(t=>name.includes(t)))score+=50;
  if(terms.some(t=>normalize(product.brand).includes(t)))score+=20;
  if(terms.some(t=>normalize(product.subcategory).includes(t)))score+=15;
 }
 if(Number(product.stock)>0)score+=2;
 return score;
}
function categorySuggestions(value,category='') {
 const groups=searchGroups(value);if(!groups.length)return [];
 const found=[];
 for(const c of taxonomy.filter(c=>!category||c.id===category)) {
  for(const sub of [null,...c.subs]) {
   const text=normalize(c.name+' '+c.id+' '+(sub||''));
   if(groups.every(terms=>terms.includes('menswear') ? ['menswear','unisex'].includes(c.id) : terms.includes('womenswear') ? ['womenswear','unisex'].includes(c.id) : terms.some(t=>text.includes(t))))found.push({name:sub?sub+' · '+c.name:c.name,href:'/products?category='+c.id+(sub?'&subcategory='+encodeURIComponent(sub):'')});
  }
 }
 return found.slice(0,6);
}
module.exports={normalize,searchGroups,applySearch,scoreProduct,categorySuggestions};
