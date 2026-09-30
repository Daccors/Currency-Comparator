import http from "k6/http";
import { check, sleep } from "k6";

const BASE_URL = __ENV.BASE_URL || "http://localhost:3000";

const PAIRS = [
  ["EUR", "USD"],
  ["USD", "GBP"],
  ["GBP", "CHF"],
  ["CHF", "JPY"],
];

export const options = {
  stages: [
    { duration: "30s", target: 20 },
    { duration: "1m", target: 50 },
    { duration: "30s", target: 0 },
  ],
  thresholds: {
    http_req_duration: ["p(95)<800"],
    http_req_failed: ["rate<0.05"],
  },
};

export default function () {
  const [from, to] = PAIRS[Math.floor(Math.random() * PAIRS.length)];
  const amount = (Math.random() * 1000).toFixed(2);

  const res = http.get(`${BASE_URL}/convert?from=${from}&to=${to}&amount=${amount}`);

  check(res, {
    "status is 200 or 503 (comportement attendu hors rate-limit)": (r) =>
      r.status === 200 || r.status === 503,
    "status is 429 (rate-limit déclenché, normal si RATE_LIMIT_MAX bas)": (r) =>
      r.status === 429,
  });

  sleep(0.5);
}