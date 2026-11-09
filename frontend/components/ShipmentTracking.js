import {useEffect,useState} from 'react';
import {apiFetch} from '../lib/apiClient';

// Where the shipment stands with the courier. GIG bookings carry a status
// (awaiting_booking / booked / booking_failed) and, once booked, a waybill with
// a link to GIG's own tracking page; manual entries just show the reference.
export function GigStatus({tracking}) {
 if(!tracking)return null;
 const s=tracking.status;
 const badge=s==='booking_failed'?['failed','fa-circle-exclamation','Handing over to GIG — retrying']
  :!tracking.trackingNumber?['waiting','fa-clock','Preparing for GIG Logistics pickup']
  :['booked','fa-truck-fast',`${tracking.carrier||'Courier'} · ${tracking.trackingNumber}`];
 return <div className="shipment-tracking">
  <span className={`shipment-tracking__badge shipment-tracking__badge--${badge[0]}`}><i className={`fas ${badge[1]}`}/> {badge[2]}</span>
  {tracking.trackingUrl&&<div><a className="shipment-tracking__link" href={tracking.trackingUrl} target="_blank" rel="noopener noreferrer"><i className="fas fa-location-dot"/> Track on GIG Logistics</a></div>}
 </div>;
}
export default function ShipmentTracking({item,editable=false,onSaved}) {
 const [editing,setEditing]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const [saved,setSaved]=useState(item.tracking||null);
 const [carrier,setCarrier]=useState(item.tracking?.carrier||'GIG Logistics');
 const [number,setNumber]=useState(item.tracking?.trackingNumber||'');
 useEffect(()=>{setSaved(item.tracking||null);if(!editing){setCarrier(item.tracking?.carrier||'GIG Logistics');setNumber(item.tracking?.trackingNumber||'');}},[item.tracking,editing]);
 const save=async()=>{if(busy)return;setBusy(true);setError('');try{const res=await apiFetch('/api/seller/order-items/'+item.id+'/tracking',{method:'PATCH',body:JSON.stringify({carrier,trackingNumber:number})});const json=await res.json();if(!res.ok||!json.success)throw new Error(json.error||'Could not save tracking');setSaved(json.data);setEditing(false);onSaved?.(json.data);}catch(e){setError(e.message);}finally{setBusy(false);}};
 if(!editable&&!saved)return null;
 return <div style={{marginTop:10,fontSize:'.82rem',overflowWrap:'anywhere'}}>
 {saved&&<GigStatus tracking={saved}/>}
 {editable&&!editing&&<button type="button" className="btn btn-outline btn-sm" onClick={()=>setEditing(true)}>{saved?'Edit tracking':'Add delivery tracking'}</button>}
 {editable&&editing&&<div style={{display:'grid',gap:8,maxWidth:420}}><label>Delivery provider<select className="form-input" value={carrier} onChange={e=>setCarrier(e.target.value)} disabled={busy}>{['GIG Logistics','Other courier','Seller delivery'].map(c=><option key={c}>{c}</option>)}</select></label><label>Tracking or delivery reference<input className="form-input" maxLength={80} value={number} onChange={e=>setNumber(e.target.value)} disabled={busy} placeholder="Enter the courier-issued tracking ID"/></label><p>Orders are handed to GIG Logistics automatically once ready to ship. Use this only if you booked the delivery yourself. Update each item's delivery status as it progresses.</p><div style={{display:'flex',gap:8}}><button type="button" className="btn btn-primary btn-sm" disabled={busy||number.trim().length<3} onClick={save}>{busy?'Saving…':'Save tracking'}</button><button type="button" className="btn btn-outline btn-sm" disabled={busy} onClick={()=>{setEditing(false);setError('');}}>Cancel</button></div></div>}
 {error&&<p role="alert" style={{color:'var(--danger)'}}>{error}</p>}
 </div>;
}
