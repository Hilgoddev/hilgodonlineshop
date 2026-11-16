export default function ProductAudienceField({ checked, onChange, category }) {
 return <label style={{display:'flex',alignItems:'flex-start',gap:12,padding:14,border:'1px solid #d1d5db',borderRadius:8,margin:'12px 0',cursor:'pointer',minHeight:48,gridColumn:'1 / -1'}}>
  <input type="checkbox" checked={category === 'unisex' || checked} disabled={category === 'unisex'} onChange={e=>onChange(e.target.checked)} style={{width:20,height:20,flexShrink:0,marginTop:3}} />
  <span><strong>Unisex — suitable for everyone</strong><span style={{display:'block',fontSize:'.85rem',marginTop:4,color:'#4b5563'}}>Show this same product in Unisex, Menswear and Womenswear. Its category, price and stock stay shared.</span></span>
 </label>;
}
