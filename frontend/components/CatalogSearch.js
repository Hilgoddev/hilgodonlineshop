import {useEffect,useId,useMemo,useState} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/router';
import {useCurrency} from '@/contexts/CurrencyContext';
import taxonomy from '@/lib/taxonomy.json';
import {categorySuggestions} from '@/lib/catalogSearch';
export default function CatalogSearch({mobile=false,onNavigate}) {
 const id=useId().replace(/:/g,''),router=useRouter(),{formatPrice}=useCurrency();
 const [query,setQuery]=useState(''),[category,setCategory]=useState(''),[products,setProducts]=useState([]),[open,setOpen]=useState(false),[loading,setLoading]=useState(false),[failed,setFailed]=useState(false),[active,setActive]=useState(-1);
 const recommendations=useMemo(()=>categorySuggestions(query,category),[query,category]);
 const params=new URLSearchParams();if(query.trim())params.set('search',query.trim());if(category)params.set('category',category);
 const resultsHref='/products?'+params.toString();
 const options=[...recommendations.map(c=>({...c,kind:'Category'})),...products.map(p=>({name:p.name,href:'/products/'+(p.id||p._id),kind:'Product',product:p}))];
 const navigate=href=>{setOpen(false);onNavigate?.();router.push(href);};
 useEffect(()=>{setOpen(false);setActive(-1);},[router.asPath]);
 useEffect(()=>{
  const controller=new AbortController();let current=true;
  setProducts([]);setActive(-1);setFailed(false);
  if(query.trim().length<2){setLoading(false);return ()=>controller.abort();}
  setLoading(true);
  const timer=setTimeout(async()=>{try{
   const p=new URLSearchParams({q:query.trim(),limit:'6'});if(category)p.set('category',category);
   const response=await fetch('/api/products/suggest?'+p,{signal:controller.signal});const data=await response.json();
   if(!response.ok||!data.success)throw new Error('Search unavailable');
   if(current)setProducts(data.data||[]);
  }catch(e){if(current&&e.name!=='AbortError')setFailed(true);}finally{if(current)setLoading(false);}},250);
  return ()=>{current=false;clearTimeout(timer);controller.abort();};
 },[query,category]);
 const expanded=open&&query.trim().length>=2;
 const keydown=e=>{if(e.key==='Escape'){setOpen(false);setActive(-1);}else if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();setOpen(true);setActive(i=>options.length?(e.key==='ArrowDown'?(i+1)%options.length:(i-1+options.length)%options.length):-1);}else if(e.key==='Enter'&&expanded&&active>=0&&options[active]){e.preventDefault();navigate(options[active].href);}};
 return <div className={'catalog-search '+(mobile?'mobile':'')} onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget)){setOpen(false);setActive(-1);}}}>
  <form className="header-search" role="search" onSubmit={e=>{e.preventDefault();if(query.trim()||category)navigate(resultsHref);}}>
   <select aria-label="Search category" className="search-category" value={category} onChange={e=>setCategory(e.target.value)}><option value="">All Categories</option>{taxonomy.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select>
   <input role="combobox" aria-label="Search products" aria-autocomplete="list" aria-expanded={expanded} aria-controls={id+'-results'} aria-activedescendant={expanded&&active>=0?id+'-option-'+active:undefined} className="search-input" placeholder="Search products, brands or categories" value={query} maxLength={100} autoComplete="off" onChange={e=>{setQuery(e.target.value);setOpen(true);}} onFocus={()=>setOpen(true)} onKeyDown={keydown}/>
   <button type="submit" className="search-btn" aria-label="Submit search"><i className="fas fa-magnifying-glass"/></button>
  </form>
  {expanded&&<div className="catalog-suggestions">
   <div role="status" className="search-status">{loading?'Finding products…':failed?'Suggestions unavailable. You can still search.':products.length?'Suggested products and categories':recommendations.length?'Browse these categories':'No exact suggestions. Try a brand or a shorter name.'}</div>
   <div role="listbox" id={id+'-results'} aria-label="Search suggestions">
    {options.map((item,i)=><Link key={item.href} role="option" aria-selected={i===active} id={id+'-option-'+i} href={item.href} className={'catalog-option '+(i===active?'selected':'')} onMouseDown={e=>e.preventDefault()} onClick={()=>{setOpen(false);onNavigate?.();}}>
     {item.product?.image?<img src={item.product.image} alt="" width="40" height="40"/>:<i className={'fas '+(item.kind==='Category'?'fa-tags':'fa-search')}/>}
     <span className="option-name"><small>{item.kind}</small>{item.name}</span>{item.product&&<strong>{formatPrice(item.product.price||0,item.product.currency||'NGN',false)}</strong>}
    </Link>)}
   </div>
   <Link href={resultsHref} className="catalog-all" onMouseDown={e=>e.preventDefault()} onClick={()=>{setOpen(false);onNavigate?.();}}>See all results for “{query.trim()}”</Link>
  </div>}
  <style jsx>{`
   .catalog-search{position:relative;min-width:0;width:100%}.catalog-search form{display:flex;min-width:0;margin:0}.catalog-search input{min-width:0;font-size:16px}.catalog-search button{min-width:44px;min-height:44px;flex-shrink:0}.catalog-suggestions{position:absolute;top:100%;left:0;right:0;margin-top:6px;background:white;color:#1f2937;border:1px solid #e5e7eb;border-radius:10px;box-shadow:0 8px 28px #0002;z-index:1100;max-height:min(440px,55vh);overflow:auto;overscroll-behavior:contain}.search-status{padding:10px 12px;color:#4b5563;font-size:12px}.catalog-suggestions :global(.catalog-option){display:flex;align-items:center;gap:10px;min-height:52px;padding:10px 12px;border-top:1px solid #f3f4f6;color:#1f2937;text-decoration:none}.catalog-suggestions :global(.selected),.catalog-suggestions :global(.catalog-option:hover),.catalog-suggestions :global(.catalog-option:focus-visible){background:#fff1f2;outline:2px solid #dc2626;outline-offset:-2px}.catalog-suggestions :global(img){object-fit:cover;border-radius:5px;flex-shrink:0}.catalog-suggestions :global(.option-name){min-width:0;flex:1;overflow-wrap:anywhere;font-size:14px}.catalog-suggestions :global(small){display:block;font-size:11px;color:#6b7280}.catalog-suggestions :global(strong){font-size:12px;white-space:nowrap;color:#b91c1c}.catalog-suggestions :global(.catalog-all){display:block;padding:14px;color:#b91c1c;background:#fff1f2;font-weight:600;overflow-wrap:anywhere;min-height:44px}.mobile .search-category{display:none}.mobile .header-search{display:flex!important;width:100%}.mobile input{width:100%;flex:1;padding:12px}.mobile button{width:44px!important}.mobile .catalog-suggestions{max-height:45vh}
  `}</style>
 </div>;
}
