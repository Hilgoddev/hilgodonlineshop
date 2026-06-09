// Order statuses that count as a real sale / revenue for a seller.
// Semantics (see Part 7):
//   pending    = order placed, awaiting payment           -> NOT counted
//   processing = payment received, being prepared          -> counted
//   paid       = payment received                          -> counted
//   shipped    = dispatched                                -> counted
//   delivered  = completed                                 -> counted
//   cancelled  = voided                                    -> NOT counted
const REVENUE_STATUSES = ['paid', 'processing', 'shipped', 'delivered'];

// Statuses whose money is actually received and therefore withdrawable by a
// seller. Excludes 'processing' because a pay-on-delivery order can be in
// preparation before the cash is collected — it shows as a sale on dashboards
// (REVENUE_STATUSES) but must not inflate the payable balance.
const PAYABLE_STATUSES = ['paid', 'shipped', 'delivered'];

module.exports = { REVENUE_STATUSES, PAYABLE_STATUSES };
