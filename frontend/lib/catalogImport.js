const MAX_BYTES = 5 * 1024 * 1024;
const MAX_ROWS = 500;
const fields = ['name','description','price','stock','category','currency','images','sizes','colors','brand'];
const aliases = {
 name:['name','title','productname','itemname'], description:['description','bodyhtml','productdescription'],
 price:['price','variantprice','standardprice','sellingprice','saleprice'], stock:['stock','quantity','quantityavailable','variantinventoryqty'],
 category:['category','type','producttype'], currency:['currency','currencycode'], images:['images','image','imageurl','imagesrc','mainimageurl','pictureurl'],
 sizes:['sizes','size','sizeoptions'], colors:['colors','colour','color','coloroptions'], brand:['brand','vendor','manufacturer']
};
const key = value => String(value || '').toLowerCase().replace(/[^a-z0-9]/g,'');
function parseCatalog(input) {
 if (typeof input !== 'string' || new TextEncoder().encode(input).length > MAX_BYTES) throw new Error('Choose a catalogue up to 5 MB.');
 const text = input.replace(/^\uFEFF/,'').trim();
 if (!text) throw new Error('The catalogue is empty.');
 let matrix;
 if (/^[\[{]/.test(text)) {
  const json = JSON.parse(text); const rows = Array.isArray(json) ? json : json.products;
  if (!Array.isArray(rows) || !rows.length || rows.some(row => !row || typeof row !== 'object' || Array.isArray(row))) throw new Error('JSON must contain an array of products.');
  const headers = [...new Set(rows.flatMap(row => Object.keys(row)))];
  matrix = [headers, ...rows.map(row => headers.map(h => Array.isArray(row[h]) ? row[h].join('|') : typeof row[h] === 'object' && row[h] !== null ? '' : String(row[h] ?? '')))];
 } else {
  const first = text.split(/\r?\n/)[0];
  const delimiter = ['\t',';',','].sort((a,b) => first.split(b).length-first.split(a).length)[0];
  matrix=[]; let row=[], cell='', quoted=false, closed=false;
  for(let i=0;i<text.length;i++) {
   const c=text[i];
   if(quoted) { if(c==='"') { if(text[i+1]==='"') {cell+='"';i++;} else {quoted=false;closed=true;} } else cell+=c; continue; }
   if(c==='"') { if(cell.trim() || closed) throw new Error('Unexpected quote in CSV. Export the file again.'); quoted=true; cell=''; }
   else if(c===delimiter) {row.push(cell.trim());cell='';closed=false;}
   else if(c==='\n' || c==='\r') {if(c==='\r' && text[i+1]==='\n')i++;row.push(cell.trim());if(row.some(Boolean))matrix.push(row);row=[];cell='';closed=false;}
   else if(closed && c.trim()) throw new Error('Unexpected text after a quoted value.');
   else cell+=c;
  }
  if(quoted) throw new Error('An opening quote has no closing quote.');
  row.push(cell.trim());if(row.some(Boolean))matrix.push(row);
 }
 if(matrix.length<2) throw new Error('Include a header row and at least one product.');
 if(matrix.length>MAX_ROWS+1) throw new Error('Import up to 500 products at a time. Split larger catalogues into files.');
 const headers=matrix.shift().map(h=>String(h).trim());
 if(headers.some(h=>!h) || new Set(headers.map(key)).size!==headers.length) throw new Error('Column names must be unique and non-empty.');
 if(matrix.some(row=>row.length>headers.length)) throw new Error('Some rows have more columns than the header. Check separators and quotes.');
 const mapping={}; fields.forEach(f=>{mapping[f]=headers.findIndex(h=>aliases[f].includes(key(h)));});
 return {headers,rows:matrix,mapping};
}
function money(value) {
 const raw=String(value??'').trim(); if(!raw)return NaN;
 const text=raw.replace(/^(?:NGN|USD|GBP|EUR|₦|\$|£|€)\s*/i,'');
 if(!/^(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d{1,2})?$/.test(text))return NaN;
 return Number(text.replace(/,/g,''));
}
module.exports={parseCatalog,money,fields,MAX_BYTES,MAX_ROWS};
