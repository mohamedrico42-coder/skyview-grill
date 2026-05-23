// POST /api/mpesa/stkpush
// Body: { phone, amount, orderId, description? }
//
// 1. Calls Safaricom Daraja STK Push.
// 2. Writes the returned CheckoutRequestID back onto the order document so
//    that the callback can locate it.
// Returns: { checkoutRequestId, merchantRequestId, message }

import { admin, getDb, initiateStkPush } from './_lib.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { phone, amount, orderId, description } = req.body || {}

  if (!phone || !amount) {
    return res.status(400).json({ error: 'phone and amount are required' })
  }
  if (!orderId) {
    return res.status(400).json({ error: 'orderId is required' })
  }
  if (Number(amount) < 1) {
    return res.status(400).json({ error: 'amount must be at least 1' })
  }

  let stk
  try {
    stk = await initiateStkPush({
      phone,
      amount,
      accountReference: String(orderId).slice(-8),
      description,
    })
  } catch (err) {
    console.error('[mpesa/stkpush] Daraja error:', err.message, err.sent || '')
    return res.status(400).json({
      error: err.message || 'STK push failed',
      code: err.code || null,
      details: err.data || null,
      sent: err.sent || null, // payload we sent to Daraja (no password)
    })
  }

  // Attach CheckoutRequestID to the order so the callback can find it.
  // We do this best-effort — if Firestore admin isn't configured, we still
  // return success to the client so they can poll by checkoutRequestId.
  try {
    const db = getDb()
    await db.collection('orders').doc(String(orderId)).set(
      {
        mpesaCheckoutRequestId: stk.CheckoutRequestID,
        mpesaMerchantRequestId: stk.MerchantRequestID,
        paymentStatus: 'pending',
        paymentMethod: 'mpesa',
        stkRequestedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    )
  } catch (err) {
    console.warn('[mpesa/stkpush] could not link CheckoutRequestID to order:', err.message)
    // Don't fail the response — payment can still complete; admin can reconcile.
  }

  return res.status(200).json({
    checkoutRequestId: stk.CheckoutRequestID,
    merchantRequestId: stk.MerchantRequestID,
    message: stk.CustomerMessage || 'STK push sent. Check your phone.',
  })
}
