// Analytics beacon relay. The tracker posts to /stats/api/send, which
// vercel.json rewrites here; this forwards the hit to Umami's gateway with
// the visitor's IP address added to the payload. A plain rewrite loses it:
// the gateway then geolocates every visit to Vercel's egress address and
// starts a new session per request.
const UPSTREAM = "https://gateway.umami.is/api/send";

// Request headers passed through to the gateway. The user agent drives
// browser/OS/device detection; the x-umami-* ones carry the website ID and
// the session cache token the tracker gets back from its first hit.
const FORWARDED = [
  "content-type",
  "user-agent",
  "accept-language",
  "origin",
  "referer",
  "x-umami-website-id",
  "x-umami-hostname",
  "x-umami-cache",
];

export function clientIp(headers) {
  const forwardedFor = headers.get("x-forwarded-for");
  const ip = forwardedFor ? forwardedFor.split(",")[0] : headers.get("x-real-ip") || "";
  return ip.trim();
}

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return new Response("bad request", { status: 400 });
  }
  const ip = clientIp(request.headers);
  if (ip && body && typeof body.payload === "object" && body.payload) body.payload.ip = ip;

  const headers = {};
  for (const name of FORWARDED) {
    const value = request.headers.get(name);
    if (value) headers[name] = value;
  }
  const upstream = await fetch(UPSTREAM, { method: "POST", headers, body: JSON.stringify(body) });
  return new Response(await upstream.text(), {
    status: upstream.status,
    headers: {
      "content-type": upstream.headers.get("content-type") || "text/plain",
      "cache-control": "no-store",
    },
  });
}
