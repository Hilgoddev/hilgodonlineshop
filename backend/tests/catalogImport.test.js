const {parseCatalog,money,MAX_ROWS}=require('../../frontend/lib/catalogImport');
describe('seller catalogue import',()=>{
 test('maps export headers and quoted multiline descriptions',()=>{const r=parseCatalog('Title,Body (HTML),Variant Price,Size\n"Shirt, blue","Line one\nLine two",1250,M|L');expect(r.mapping.name).toBe(0);expect(r.mapping.description).toBe(1);expect(r.rows[0]).toEqual(['Shirt, blue','Line one\nLine two','1250','M|L']);});
 test('accepts BOM, tabs, escaped quotes and JSON',()=>{expect(parseCatalog('\uFEFFname\tprice\n"A ""special"" mug"\t100').rows[0][0]).toBe('A "special" mug');expect(parseCatalog(JSON.stringify({products:[{title:'Shirt',sizes:['M','L'],price:20}]})).rows[0]).toEqual(['Shirt','M|L','20']);});
 test('rejects malformed, duplicate, oversized and empty catalogues',()=>{for(const s of ['', 'name,name\na,b','name,price\n"bad,10','name,price\na,1,extra'])expect(()=>parseCatalog(s)).toThrow();expect(()=>parseCatalog('name\n'+Array(MAX_ROWS+1).fill('x').join('\n'))).toThrow(/500/);});
 test('rejects ambiguous prices',()=>{expect(money('₦1,250.50')).toBe(1250.5);expect(money('0')).toBe(0);for(const v of ['',null,'1.250,00','-20','10junk','1,25'])expect(money(v)).toBeNaN();});
});
