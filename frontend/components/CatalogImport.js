import { useMemo, useRef, useState } from 'react';
import { apiFetch } from '@/lib/apiClient';
import { parseSizeInput } from '@/lib/parseSizes';
import { parseCatalog, money, fields, MAX_BYTES } from '@/lib/catalogImport';
import { categoriesData } from '@/pages/categories';

export default function CatalogImport({ products = [], onComplete }) {
 const [open,setOpen]=useState(false), [catalog,setCatalog]=useState(null), [mapping,setMapping]=useState({});
 const [category,setCategory]=useState(''), [currency,setCurrency]=useState('NGN'), [url,setUrl]=useState(''), [pasted,setPasted]=useState('');
 const [error,setError]=useState(''), [busy,setBusy]=useState(false), [results,setResults]=useState({}), [progress,setProgress]=useState(0);
 const stop=useRef(false);
 const loadText=text=>{setCatalog(null);try {const data=parseCatalog(text);setCatalog(data);setMapping(data.mapping);setResults({});setProgress(0);setError('');}catch(e){setError(e.message);}};
 const loadFile=async e=>{const file=e.target.files?.[0];e.target.value='';if(!file)return;if(file.size>MAX_BYTES){setCatalog(null);setError('Choose a file up to 5 MB.');return;}loadText(await file.text());};
 const loadLink=async()=>{
  setBusy(true);setError('');const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),20000);
  try {const address=new URL(url);if(address.protocol!=='https:' || address.username || address.password)throw new Error('Use an HTTPS catalogue link without a username or password.');
   const response=await fetch(address.href,{credentials:'omit',signal:controller.signal});if(!response.ok)throw new Error('The catalogue could not be downloaded. Export a file and upload it instead.');
   if(Number(response.headers.get('content-length'))>MAX_BYTES)throw new Error('Catalogue is larger than 5 MB.');
   const reader=response.body.getReader();const decoder=new TextDecoder();let text='',bytes=0;
   while(true){const chunk=await reader.read();if(chunk.done)break;bytes+=chunk.value.length;if(bytes>MAX_BYTES){await reader.cancel();throw new Error('Catalogue is larger than 5 MB.');}text+=decoder.decode(chunk.value,{stream:true});}text+=decoder.decode();loadText(text);
  }catch(e){setError(e.name==='AbortError'?'The download timed out. Upload the catalogue file instead.':e.message==='Failed to fetch'?'This store does not allow catalogue downloads here. Export CSV and upload the file instead.':e.message);}finally{clearTimeout(timeout);setBusy(false);}
 };
 const preview=useMemo(()=>{
  if(!catalog)return [];const seen=new Set(products.map(p=>String(p.name).trim().toLowerCase()));
  return catalog.rows.map((row,index)=>{
   const get=f=>mapping[f]>=0?String(row[mapping[f]]??'').trim():'';
   const name=get('name'), description=get('description').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
   const price=money(get('price')), rawStock=get('stock'), stock=rawStock===''?NaN:Number(rawStock);
   const rawCategory=get('category')||category;
   const knownCategory=categoriesData.find(c=>c.id.toLowerCase()===rawCategory.toLowerCase()||c.name.toLowerCase()===rawCategory.toLowerCase());
   const images=get('images').split(/[|;\n]+/).map(v=>v.trim()).filter(Boolean);
   const sizes=parseSizeInput(get('sizes'));const colors=get('colors').split(/[,;|]+/).map(v=>v.trim()).filter(Boolean);
   const rowCurrency=(get('currency')||currency).toUpperCase();const issues=[];
   if(!name||name.length>200)issues.push('Name required (up to 200 characters)');
   if(!description)issues.push('Description required');
   if(!Number.isFinite(price)||price<0)issues.push('Use a price such as 1250.50');
   if(!Number.isSafeInteger(stock)||stock<0)issues.push('Stock must be a non-negative whole number');
   if(!knownCategory)issues.push('Choose a Hilgod category or map a valid category');
   if(!['NGN','USD','GBP','EUR'].includes(rowCurrency))issues.push('Unsupported currency');
   if(!images.length||images.some(v=>{try{return !['https:','http:'].includes(new URL(v).protocol);}catch{return true;}}))issues.push('At least one valid image URL required');
   if(sizes.some(s=>s.length>60))issues.push('Size labels must be 60 characters or fewer');
   const duplicate=seen.has(name.toLowerCase());if(name)seen.add(name.toLowerCase());
   return {index,name,issues,duplicate,payload:{name,description,price,stock,category:knownCategory?.id,currency:rowCurrency,images,size_options:sizes,color_options:colors,brand:get('brand')||undefined}};
  });
 },[catalog,mapping,category,currency,products]);
 const ready=preview.filter(r=>!r.issues.length&&!r.duplicate&&!results[r.index]);
 const run=async()=>{
  setBusy(true);stop.current=false;setError('');let completed=0;
  try{for(const row of ready){if(stop.current)break;
   try{const response=await apiFetch('/api/products',{method:'POST',body:JSON.stringify(row.payload)});const json=await response.json().catch(()=>null);
    if(response.ok&&json?.success){setResults(prev=>({...prev,[row.index]:json.data?.status==='approved'?'Imported · live':'Imported · awaiting approval'}));}
    else if(response.status>=500||!json){setResults(prev=>({...prev,[row.index]:'Uncertain result — check My Product List before importing again'}));stop.current=true;}
    else {setResults(prev=>({...prev,[row.index]:'Not imported: '+(json.error||'Request rejected')}));if([401,403,429].includes(response.status))stop.current=true;}
   }catch{setResults(prev=>({...prev,[row.index]:'Connection interrupted — check My Product List before importing again'}));stop.current=true;}
   completed++;setProgress(completed);
  }}finally{setBusy(false);await onComplete?.();}
 };
 const template=()=>{const blob=new Blob(['name,description,price,stock,category,currency,images,sizes,colors,brand\nExample T-shirt,Soft cotton T-shirt,12500,20,menswear,NGN,https://your-store.example/shirt.jpg,S|M|L,Black|White,Your brand\n'],{type:'text/csv;charset=utf-8'});const link=document.createElement('a');link.href=URL.createObjectURL(blob);link.download='hilgod-product-template.csv';link.click();setTimeout(()=>URL.revokeObjectURL(link.href),1000);};
 return <section className="card" style={{padding:20,marginBottom:24}}>
  <div style={{display:'flex',justifyContent:'space-between',gap:12,flexWrap:'wrap',alignItems:'center'}}><div><h2 style={{fontSize:'1.2rem'}}>Bring your catalogue to Hilgod</h2><p>Upload a file once, review your products, then import them into your seller account.</p></div><button type="button" className="btn btn-primary" disabled={busy} aria-expanded={open} onClick={()=>setOpen(!open)}>{open?'Close importer':'Import products'}</button></div>
  {open&&<div style={{marginTop:20}}>
   <details style={{padding:14,background:'var(--gray-6)',borderRadius:8,marginBottom:16}}><summary style={{cursor:'pointer',fontWeight:700,minHeight:44}}>Quick guide: files, store links and marketplaces</summary><ol style={{paddingLeft:22,lineHeight:1.8}}><li>Export your own catalogue from your store or marketplace seller dashboard as CSV/TSV. Amazon and Jumia exports may use different columns: match them below.</li><li>For Jiji or a store without export, use our template or paste rows copied from your inventory. A normal storefront link is not a catalogue feed.</li><li>A public HTTPS CSV or JSON catalogue link works if that store permits browser access. If it fails, download the file yourself and upload it here.</li><li>Match columns, choose the currency and Hilgod category, and review every warning. Prices are imported in the selected currency without conversion. Use one row per product, combining its sizes with a pipe (|). Separate image URLs with a pipe too; repeated variant rows are not merged automatically.</li><li>Import only your own products and images. Existing product names are skipped; this creates listings and does not overwrite stock or prices. Keep this page open until it finishes.</li></ol><p>Live API synchronisation requires an authorised connection to each marketplace and is not enabled by uploading a file. Normal product uploads remain available below.</p><button type="button" className="btn btn-outline" onClick={template}>Download CSV template</button></details>
   <fieldset disabled={busy} style={{border:0,padding:0,minWidth:0}}><label style={{display:'block',marginBottom:16}}>Catalogue file (CSV, TSV or JSON · up to 500 products / 5 MB)<input type="file" accept=".csv,.tsv,.json,text/csv,application/json" onChange={loadFile} style={{display:'block',maxWidth:'100%',marginTop:8}}/></label><label style={{display:'block'}}>Public catalogue feed link<input className="form-input" type="url" value={url} onChange={e=>setUrl(e.target.value)} placeholder="https://your-store.example/catalogue.csv"/></label><button type="button" className="btn btn-outline" disabled={!url.trim()} onClick={loadLink} style={{margin:'8px 0 16px'}}>Read catalogue link</button><details><summary style={{minHeight:44,cursor:'pointer'}}>Or paste CSV / spreadsheet rows</summary><textarea className="form-input" rows={5} value={pasted} onChange={e=>setPasted(e.target.value)} aria-label="Paste catalogue rows"/><button type="button" className="btn btn-outline" onClick={()=>loadText(pasted)}>Scan pasted rows</button></details>
   {catalog&&<><div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:12,margin:'16px 0'}}><label>Default category<select className="form-input" value={category} onChange={e=>setCategory(e.target.value)}><option value="">Choose category</option>{categoriesData.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label><label>Default price currency<select className="form-input" value={currency} onChange={e=>setCurrency(e.target.value)}>{['NGN','USD','GBP','EUR'].map(c=><option key={c}>{c}</option>)}</select></label></div><details open><summary style={{fontWeight:700,minHeight:44}}>Match your columns</summary><div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:12}}>{fields.map(field=><label key={field} style={{textTransform:'capitalize'}}>{field}<select className="form-input" value={mapping[field]??-1} onChange={e=>setMapping({...mapping,[field]:Number(e.target.value)})}><option value={-1}>Not supplied / use default</option>{catalog.headers.map((h,i)=><option value={i} key={i}>{h}</option>)}</select></label>)}</div></details></>}
   </fieldset>
   {error&&<p role="alert" style={{color:'#b91c1c',marginTop:12}}>{error}</p>}
   {catalog&&<><p aria-live="polite" style={{marginTop:16}}>{catalog.rows.length} rows · {ready.length} ready · {preview.filter(r=>r.issues.length).length} need correction · {preview.filter(r=>r.duplicate).length} duplicate names skipped</p><div style={{maxHeight:360,overflow:'auto',border:'1px solid var(--gray-4)',borderRadius:8}}>{preview.map(row=><div key={row.index} style={{padding:12,borderBottom:'1px solid var(--gray-4)',overflowWrap:'anywhere'}}><strong>Row {row.index+2}: {row.name||'Unnamed product'}</strong><div>{row.payload.currency} {Number.isFinite(row.payload.price)?row.payload.price:'—'} · Stock: {Number.isFinite(row.payload.stock)?row.payload.stock:'—'} · Sizes: {row.payload.size_options.join(', ')||'Not sized'}</div><div style={{color:row.issues.length?'#b91c1c':'inherit'}}>{results[row.index]||row.issues.join('; ')||(row.duplicate?'Skipped: name already exists':'Ready to import')}</div></div>)}</div><p>Review the preview before importing. Products follow Hilgod’s existing approval process.</p><button type="button" className="btn btn-primary" disabled={busy||!ready.length} onClick={run}>Import {ready.length} ready products</button>{busy&&<button type="button" className="btn btn-outline" onClick={()=>{stop.current=true;}}>Stop after current product</button>}<p role="status" aria-live="polite">{busy?'Working — keep this page open. ':''}{progress>0?progress+' rows processed.':''}</p></>}
  </div>}
 </section>;
}
