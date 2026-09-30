import request from "supertest";
import { createApp } from "../src/app";

const mockFetch = jest.fn();
(global as any).fetch = mockFetch;

const app = createApp();

beforeEach(() => {
  mockFetch.mockReset();
});

describe("GET /health", () => {
  it("répond 200 avec un statut ok", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });
});

describe("GET /convert", () => {
  it("rejette une requête invalide (montant négatif)", async () => {
    const res = await request(app).get("/convert?from=EUR&to=USD&amount=-5");
    expect(res.status).toBe(400);
  });

  it("rejette un code devise invalide", async () => {
    const res = await request(app).get("/convert?from=EU&to=USD&amount=10");
    expect(res.status).toBe(400);
  });

  it("retourne 1 directement si from === to, sans appel réseau", async () => {
    const res = await request(app).get("/convert?from=EUR&to=EUR&amount=50");
    expect(res.status).toBe(200);
    expect(res.body.rate).toBe(1);
    expect(res.body.converted).toBe(50);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("convertit correctement en utilisant la source primaire", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ rates: { USD: 1.1 } }),
    });

    const res = await request(app).get("/convert?from=EUR&to=USD&amount=10");
    expect(res.status).toBe(200);
    expect(res.body.rate).toBe(1.1);
    expect(res.body.converted).toBe(11);
    expect(res.body.source).toBe("frankfurter");
  });

  it("bascule sur la source secondaire si la première échoue", async () => {
    mockFetch
      .mockRejectedValueOnce(new Error("timeout"))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ rates: { CHF: 1.2 } }),
      });

    const res = await request(app).get("/convert?from=GBP&to=CHF&amount=10");
    expect(res.status).toBe(200);
    expect(res.body.source).toBe("exchangerate-host");
    expect(res.body.rate).toBe(1.2);
  });

  it("retourne 503 si les deux sources échouent et qu'il n'y a rien en cache", async () => {
    mockFetch
      .mockRejectedValueOnce(new Error("timeout"))
      .mockRejectedValueOnce(new Error("timeout"));

    const res = await request(app).get("/convert?from=GBP&to=JPY&amount=10");
    expect(res.status).toBe(503);
  });
});

describe("GET /metrics", () => {
  it("expose des compteurs JSON", async () => {
    const res = await request(app).get("/metrics");
    expect(res.status).toBe(200);
    expect(typeof res.body.requestsTotal).toBe("number");
  });
});