export const metrics = {
  requestsTotal: 0,
  errorsTotal: 0,
  cacheHits: 0,
  rateSourceUsage: {
    frankfurter: 0,
    "exchangerate-host": 0,
    cache: 0,
  } as Record<string, number>,
  startedAt: Date.now(),
};

export function recordSourceUsage(source: string) {
  metrics.rateSourceUsage[source] = (metrics.rateSourceUsage[source] || 0) + 1;
  if (source === "cache") metrics.cacheHits += 1;
}