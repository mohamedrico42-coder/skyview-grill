// GET /api/mpesa/token
// Returns a fresh Daraja OAuth access token. Useful for debugging the
// integration. The token alone can't move money — it only proves our
// Consumer Key/Secret are valid.

import { getAccessToken, config } from './_lib.js'

export default async function handler(req, res) {
  try {
    const token = await getAccessToken()
    return res.status(200).json({
      access_token: token,
      env: config.env,
      baseUrl: config.baseUrl,
      shortcode: config.shortcode,
      headOffice: config.headOffice,
      transactionType: config.transactionType,
    })
  } catch (err) {
    console.error('[mpesa/token] failed:', err.message)
    return res.status(500).json({
      error: err.message || 'Failed to fetch token',
      code: err.code || null,
    })
  }
}
