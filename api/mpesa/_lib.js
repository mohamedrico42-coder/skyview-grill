// Shared helpers for Safaricom Daraja STK Push integration.
// Used by /api/mpesa/{token,stkpush,callback}.js
//
// Required env vars (set in Vercel project settings):
//   MPESA_CONSUMER_KEY
//   MPESA_CONSUMER_SECRET
//   MPESA_PASSKEY
//   MPESA_SHORTCODE         (Sky View Grill till: 3429185)
//   MPESA_ENV               optional — 'sandbox' or 'production' (default: production)
//   MPESA_CALLBACK_URL      optional — overrides the default callback URL
//   FIREBASE_SERVICE_ACCOUNT  full service-account JSON (string) — required for callback to write Firestore
//                             alternatives: FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY

import admin from 'firebase-admin'

const ENV = process.env.MPESA_ENV || 'production'
const BASE = ENV === 'sandbox'
  ? 'https://sandbox.safaricom.co.ke'
  : 'https://api.safaricom.co.ke'

// TransactionType depends on the shortcode's product configuration:
//   • Safaricom's sandbox uses shortcode 174379, which is a PayBill →
//     CustomerPayBillOnline. Sending CustomerBuyGoodsOnline returns
//     "Invalid TransactionType".
//   • Production till 3429185 is a Buy Goods → CustomerBuyGoodsOnline.
// Override via MPESA_TRANSACTION_TYPE if your real account differs.
const TX_TYPE =
  process.env.MPESA_TRANSACTION_TYPE ||
  (ENV === 'sandbox' ? 'CustomerPayBillOnline' : 'CustomerBuyGoodsOnline')

export const config = {
  baseUrl: BASE,
  env: ENV,
  transactionType: TX_TYPE,
  // The customer-facing till — used as PartyB.
  shortcode: process.env.MPESA_SHORTCODE,
  // Head Office / Online Pay Shortcode — used as BusinessShortCode and in the
  // password seed. For most BuyGoods tills this is the same as the till, so
  // we fall back to MPESA_SHORTCODE. Override only if Safaricom issued you a
  // distinct Head Office number for your app.
  headOffice: process.env.MPESA_HEAD_OFFICE || process.env.MPESA_SHORTCODE,
  passkey: process.env.MPESA_PASSKEY,
  consumerKey: process.env.MPESA_CONSUMER_KEY,
  consumerSecret: process.env.MPESA_CONSUMER_SECRET,
  callbackUrl:
    process.env.MPESA_CALLBACK_URL ||
    'https://skyview-grill.vercel.app/api/mpesa/callback',
}

const requireEnv = () => {
  const missing = ['MPESA_SHORTCODE', 'MPESA_PASSKEY', 'MPESA_CONSUMER_KEY', 'MPESA_CONSUMER_SECRET']
    .filter((k) => !process.env[k])
  if (missing.length) {
    throw Object.assign(new Error(`Missing env vars: ${missing.join(', ')}`), { code: 'MISSING_ENV' })
  }
}

// Cache Daraja access token (~1 hour TTL → cache for 50 min)
let _tokenCache = { token: null, expiresAt: 0 }

export async function getAccessToken() {
  requireEnv()
  const now = Date.now()
  if (_tokenCache.token && _tokenCache.expiresAt > now) return _tokenCache.token

  const basic = Buffer
    .from(`${config.consumerKey}:${config.consumerSecret}`)
    .toString('base64')

  const res = await fetch(`${BASE}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${basic}` },
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Daraja token failed (${res.status}): ${text.slice(0, 200)}`)
  }
  const data = await res.json()
  _tokenCache = { token: data.access_token, expiresAt: now + 50 * 60 * 1000 }
  return data.access_token
}

export function makeTimestamp(d = new Date()) {
  const pad = (n) => String(n).padStart(2, '0')
  return (
    d.getFullYear() +
    pad(d.getMonth() + 1) +
    pad(d.getDate()) +
    pad(d.getHours()) +
    pad(d.getMinutes()) +
    pad(d.getSeconds())
  )
}

export function makePassword(timestamp = makeTimestamp()) {
  return Buffer
    .from(`${config.headOffice}${config.passkey}${timestamp}`)
    .toString('base64')
}

// Accepts 0712345678, 254712345678, +254712345678, 712345678 — returns 2547XXXXXXXX
export function normalizePhone(raw) {
  const cleaned = String(raw || '').replace(/\s+/g, '').replace(/^\+/, '')
  if (/^254\d{9}$/.test(cleaned)) return cleaned
  if (/^0\d{9}$/.test(cleaned)) return '254' + cleaned.slice(1)
  if (/^[17]\d{8}$/.test(cleaned)) return '254' + cleaned
  throw Object.assign(
    new Error('Invalid Kenyan phone number — use 07XXXXXXXX or 2547XXXXXXXX'),
    { code: 'BAD_PHONE' },
  )
}

export async function initiateStkPush({ phone, amount, accountReference, description }) {
  requireEnv()
  const token = await getAccessToken()
  const timestamp = makeTimestamp()
  const password = makePassword(timestamp)
  const partyA = normalizePhone(phone)
  const amt = Math.max(1, Math.round(Number(amount) || 0))

  const payload = {
    BusinessShortCode: config.headOffice,
    Password: password,
    Timestamp: timestamp,
    TransactionType: config.transactionType,
    Amount: amt,
    PartyA: partyA,
    PartyB: config.shortcode,
    PhoneNumber: partyA,
    CallBackURL: config.callbackUrl,
    AccountReference: (accountReference || 'SkyViewGrill').toString().slice(0, 12),
    TransactionDesc: (description || 'Sky View Grill order').toString().slice(0, 13),
  }

  const res = await fetch(`${BASE}/mpesa/stkpush/v1/processrequest`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok || data.ResponseCode !== '0') {
    const msg =
      data?.errorMessage ||
      data?.ResponseDescription ||
      `STK push failed (HTTP ${res.status})`
    // Echo back what we sent (minus password) so the caller can see exactly
    // what Daraja rejected.
    const { Password, ...safePayload } = payload
    throw Object.assign(new Error(msg), {
      code: 'STK_FAILED',
      data,
      sent: { ...safePayload, _env: ENV, _url: `${BASE}/mpesa/stkpush/v1/processrequest` },
    })
  }
  return data // { MerchantRequestID, CheckoutRequestID, ResponseCode, ResponseDescription, CustomerMessage }
}

// ── Firebase Admin singleton ──────────────────────────────────────────────
function loadServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT
  if (raw) {
    try {
      return JSON.parse(raw)
    } catch {
      try {
        return JSON.parse(Buffer.from(raw, 'base64').toString('utf-8'))
      } catch {
        /* fall through */
      }
    }
  }
  const project_id = process.env.FIREBASE_PROJECT_ID
  const client_email = process.env.FIREBASE_CLIENT_EMAIL
  const private_key = (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n')
  if (project_id && client_email && private_key) {
    return { project_id, client_email, private_key }
  }
  return null
}

let _firestoreReady = false
export function getDb() {
  if (!_firestoreReady) {
    if (admin.apps.length === 0) {
      const creds = loadServiceAccount()
      if (!creds) {
        throw new Error(
          'Firebase Admin credentials missing. Set FIREBASE_SERVICE_ACCOUNT (full JSON) ' +
          'or FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY.',
        )
      }
      admin.initializeApp({ credential: admin.credential.cert(creds) })
    }
    _firestoreReady = true
  }
  return admin.firestore()
}

export { admin }
