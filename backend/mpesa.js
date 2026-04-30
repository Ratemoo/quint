// ============================================
// OBSIDIAN — M-Pesa Daraja API Service
// Handles OAuth token + STK Push
// ============================================

const axios = require('axios');

const BASE_URL = process.env.MPESA_ENV === 'production'
  ? 'https://api.safaricom.co.ke'
  : 'https://sandbox.safaricom.co.ke';

// ---- Step 1: Get OAuth Token ----
// M-Pesa requires a fresh access token for every request.
// Tokens expire after 1 hour, so we cache and refresh as needed.

let cachedToken = null;
let tokenExpiry = 0;

async function getAccessToken() {
  if (cachedToken && Date.now() < tokenExpiry) {
    return cachedToken;
  }

  const credentials = Buffer.from(
    `${process.env.MPESA_CONSUMER_KEY}:${process.env.MPESA_CONSUMER_SECRET}`
  ).toString('base64');

  const response = await axios.get(
    `${BASE_URL}/oauth/v1/generate?grant_type=client_credentials`,
    { headers: { Authorization: `Basic ${credentials}` } }
  );

  cachedToken = response.data.access_token;
  tokenExpiry = Date.now() + (response.data.expires_in - 60) * 1000; // Refresh 1 min early
  return cachedToken;
}

// ---- Step 2: Generate Password ----
// The password is: Base64(ShortCode + Passkey + Timestamp)

function generatePassword(timestamp) {
  const raw = `${process.env.MPESA_SHORTCODE}${process.env.MPESA_PASSKEY}${timestamp}`;
  return Buffer.from(raw).toString('base64');
}

function getTimestamp() {
  return new Date()
    .toISOString()
    .replace(/[-:T.Z]/g, '')
    .slice(0, 14); // YYYYMMDDHHmmss
}

// ---- Step 3: Initiate STK Push (Lipa Na M-Pesa Online) ----
// This sends a payment prompt to the customer's phone.

async function stkPush({ phone, amount, orderId, description }) {
  const token = await getAccessToken();
  const timestamp = getTimestamp();
  const password = generatePassword(timestamp);

  // Normalize phone: 0712345678 → 254712345678
  const normalizedPhone = phone.replace(/^0/, '254').replace(/^\+/, '');

  const payload = {
    BusinessShortCode: process.env.MPESA_SHORTCODE,
    Password: password,
    Timestamp: timestamp,
    TransactionType: 'CustomerPayBillOnline',  // or 'CustomerBuyGoodsOnline' for Till
    Amount: Math.ceil(amount),                 // Must be a whole number
    PartyA: normalizedPhone,                   // Customer phone
    PartyB: process.env.MPESA_SHORTCODE,       // Your shortcode
    PhoneNumber: normalizedPhone,
    CallBackURL: process.env.MPESA_CALLBACK_URL,
    AccountReference: `OBSIDIAN-${orderId}`,
    TransactionDesc: description || 'OBSIDIAN Purchase',
  };

  const response = await axios.post(
    `${BASE_URL}/mpesa/stkpush/v1/processrequest`,
    payload,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  return response.data;
  // Returns: { MerchantRequestID, CheckoutRequestID, ResponseCode, ResponseDescription, CustomerMessage }
  // ResponseCode "0" = success (request sent to phone)
}

// ---- Step 4: Query STK Push Status ----
// Use this to manually check if a payment went through
// (useful if callback wasn't received)

async function queryStkStatus(checkoutRequestId) {
  const token = await getAccessToken();
  const timestamp = getTimestamp();
  const password = generatePassword(timestamp);

  const response = await axios.post(
    `${BASE_URL}/mpesa/stkpushquery/v1/query`,
    {
      BusinessShortCode: process.env.MPESA_SHORTCODE,
      Password: password,
      Timestamp: timestamp,
      CheckoutRequestID: checkoutRequestId,
    },
    { headers: { Authorization: `Bearer ${token}` } }
  );

  return response.data;
}

module.exports = { stkPush, queryStkStatus };