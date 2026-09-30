import { InMemoryCache } from "./cache";

const FRANKFURTER_URL = "https://api.frankfurter.app/latest";
const EXCHANGERATE_HOST_URL = "https://api.exchangerate.host/latest";
const FETCH_TIMEOUT_MS = 3000;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 min

const cache = new InMemoryCache<{ rate: number; source: string; fetchedAt: number }>();

async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchFromFrankfurter(from: string, to: string): Promise<number> {
  const url = `${FRANKFURTER_URL}?from=${from}&to=${to}`;
  const res = await fetchWithTimeout(url, FETCH_TIMEOUT_MS);
  const data = (await res.json()) as { rates: Record<string, number> };
  const rate = data.rates?.[to];
  if (typeof rate !== "number") throw new Error("Taux introuvable (frankfurter)");
  return rate;
}

async function fetchFromExchangerateHost(from: string, to: string): Promise<number> {
  const url = `${EXCHANGERATE_HOST_URL}?base=${from}&symbols=${to}`;
  const res = await fetchWithTimeout(url, FETCH_TIMEOUT_MS);
  const data = (await res.json()) as { rates: Record<string, number> };
  const rate = data.rates?.[to];
  if (typeof rate !== "number") throw new Error("Taux introuvable (exchangerate.host)");
  return rate;
}

export type RateResult = {
  from: string;
  to: string;
  rate: number;
  source: "frankfurter" | "exchangerate-host" | "cache";
  fetchedAt: number;
  stale: boolean;
};

export async function getExchangeRate(from: string, to: string): Promise<RateResult> {
  const key = `${from}:${to}`;

  if (from === to) {
    return { from, to, rate: 1, source: "cache", fetchedAt: Date.now(), stale: false };
  }

  const fresh = cache.get(key);
  if (fresh) {
    return { from, to, rate: fresh.rate, source: "cache", fetchedAt: fresh.fetchedAt, stale: false };
  }

  try {
    const rate = await fetchFromFrankfurter(from, to);
    cache.set(key, { rate, source: "frankfurter", fetchedAt: Date.now() }, CACHE_TTL_MS);
    return { from, to, rate, source: "frankfurter", fetchedAt: Date.now(), stale: false };
  } catch {

  }

  try {
    const rate = await fetchFromExchangerateHost(from, to);
    cache.set(key, { rate, source: "exchangerate-host", fetchedAt: Date.now() }, CACHE_TTL_MS);
    return { from, to, rate, source: "exchangerate-host", fetchedAt: Date.now(), stale: false };
  } catch {

  }

  const stale = cache.getStale(key);
  if (stale) {
    return { from, to, rate: stale.value.rate, source: "cache", fetchedAt: stale.value.fetchedAt, stale: true };
  }

  throw new Error(`Aucune source de taux disponible pour ${from}/${to}`);
}