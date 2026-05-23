// POST /api/mpesa/callback
// Safaricom calls this endpoint when an STK Push transaction settles
// (success or failure). We:
//   1. Look up the order by mpesaCheckoutRequestId
//   2. Update paymentStatus + mpesa metadata
//   3. Always respond 200 to acknowledge (so Safaricom stops retrying)
//
// Expected body shape (Daraja):
// {
//   "Body": { "stkCallback": {
//     "MerchantRequestID": "...",
//     "CheckoutRequestID": "ws_CO_...",
//     "ResultCode": 0,
//     "ResultDesc": "...",
//     "CallbackMetadata": { "Item": [
//        { "Name": "Amount",              "Value": 100 },
//        { "Name": "MpesaReceiptNumber",  "Value": "NLJ7RT61SV" },
//        { "Name": "TransactionDate",     "Value": 20191219102115 },
//        { "Name": "PhoneNumber",         "Value": 254712345678 }
//     ]}
//   }}
// }

import { admin, getDb } from './_lib.js'

const pickItem = (items, name) => items?.find((i) => i.Name === name)?.Value

// Always 200 — Daraja will keep retrying otherwise.
const ack = (res, ResultDesc = 'Accepted') =>
  res.status(200).json({ ResultCode: 0, ResultDesc })

export default async function handler(req, res) {
  if (req.method !== 'POST') return ack(res, 'OK')

  let body = req.body
  if (typeof body === 'string') {
    try { body = JSON.parse(body) } catch { body = {} }
  }

  const cb = body?.Body?.stkCallback
  if (!cb || !cb.CheckoutRequestID) {
    console.warn('[mpesa/callback] missing stkCallback in body')
    return ack(res, 'No callback body')
  }

  const {
    CheckoutRequestID,
    MerchantRequestID,
    ResultCode,
    ResultDesc,
    CallbackMetadata,
  } = cb

  const items = CallbackMetadata?.Item || []
  const receipt = pickItem(items, 'MpesaReceiptNumber')
  const amount = pickItem(items, 'Amount')
  const phone = pickItem(items, 'PhoneNumber')
  const txDate = pickItem(items, 'TransactionDate')
  const paid = Number(ResultCode) === 0

  try {
    const db = getDb()
    const snap = await db
      .collection('orders')
      .where('mpesaCheckoutRequestId', '==', CheckoutRequestID)
      .limit(1)
      .get()

    if (snap.empty) {
      console.warn('[mpesa/callback] no order matches CheckoutRequestID', CheckoutRequestID)
      return ack(res, 'No matching order')
    }

    const update = {
      paymentStatus: paid ? 'paid' : 'failed',
      mpesaResultCode: Number(ResultCode),
      mpesaResultDesc: String(ResultDesc || ''),
      mpesaMerchantRequestId: MerchantRequestID || null,
      paymentUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }
    if (paid) {
      update.mpesaReceiptNumber = receipt || null
      update.mpesaAmount = amount || null
      update.mpesaPhone = phone ? String(phone) : null
      update.mpesaTransactionDate = txDate ? String(txDate) : null
      update.paidAt = admin.firestore.FieldValue.serverTimestamp()
    }

    await snap.docs[0].ref.update(update)
    console.log(
      `[mpesa/callback] ${paid ? 'PAID' : 'FAILED'} — order ${snap.docs[0].id}, ` +
      `receipt ${receipt || '-'}, result "${ResultDesc}"`,
    )
  } catch (err) {
    console.error('[mpesa/callback] failed to update order:', err.message)
    // Still ack — we'd rather lose the update than have Safaricom hammer us.
  }

  return ack(res)
}
