// src/services/apigeeToken.js
export const fetchApigeeToken = async () => {
  try {
    const res = await fetch("https://forgegateway.probestack.io/apigee-wrapper/auth/apigee/token");
    if (!res.ok) throw new Error(`Token service error: ${res.status}`);
    const data = await res.json();
    return data.access_token;
  } catch (err) {
    console.error("Token fetch error:", err);
    return null;
  }
};