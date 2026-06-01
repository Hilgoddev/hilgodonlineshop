const { cleanEnv } = require('../lib/env');
const GREY_BASE_URL = 'https://api.grey.co';
const GREY_API_KEY = cleanEnv(process.env.GREY_API_KEY);

if (!GREY_API_KEY) {
  console.warn('[GREY] GREY_API_KEY not set — Grey payments will fail');
}

async function greyRequest(method, path, body) {
  const res = await fetch(`${GREY_BASE_URL}${path}`, {
    method,
    headers: {
      'Authorization': `Bearer ${GREY_API_KEY}`,
      'Content-Type': 'application/json',
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  const data = await res.json();
  if (!res.ok) {
    const err = new Error(data?.message || `Grey API error ${res.status}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

module.exports = { greyRequest };
