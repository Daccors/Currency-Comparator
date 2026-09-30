const FRANKFURTER_URL = "https://api.frankfurter.app/latest";
const FETCH_TIMEOUT_MS = 3000;

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

export type RateResult = {
  from: string;
  to: string;
  rate: number;
  source: "frankfurter";
};

export async function getExchangeRate(from: string, to: string): Promise<RateResult> {
  if (from === to) {
    return { from, to, rate: 1, source: "frankfurter" };
  }

  const url = `${FRANKFURTER_URL}?from=${from}&to=${to}`;
  const res = await fetchWithTimeout(url, FETCH_TIMEOUT_MS);
  const data = (await res.json()) as { rates: Record<string, number> };
  const rate = data.rates?.[to];

  if (typeof rate !== "number") {
    throw new Error(`Taux introuvable pour ${from}/${to}`);
  }

  return { from, to, rate, source: "frankfurter" };
}