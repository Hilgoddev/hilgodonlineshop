function cleanTracking(input) {
 const carrier = typeof input?.carrier === 'string' ? input.carrier.trim() : '';
 const trackingNumber = typeof input?.trackingNumber === 'string' ? input.trackingNumber.trim() : '';
 if (!['GIG Logistics','Other courier','Seller delivery'].includes(carrier)) throw new Error('Choose a delivery provider.');
 if (!/^[A-Za-z0-9][A-Za-z0-9 ._/-]{2,79}$/.test(trackingNumber)) throw new Error('Enter a tracking or delivery reference of 3–80 letters, numbers, spaces, dots, slashes or hyphens.');
 return {carrier,trackingNumber,source:'manual',updatedAt:new Date().toISOString()};
}
const transitions = {pending:['packed','cancelled'],packed:['shipped','cancelled'],shipped:['delivered'],delivered:[],cancelled:[]};
function canSellerTransition(from,to) {return from === to || (transitions[from || 'pending'] || []).includes(to);}
module.exports={cleanTracking,canSellerTransition};
