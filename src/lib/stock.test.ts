import { describe, expect, it } from "vitest";
import { summarizeStock } from "./stock";

const today = new Date("2026-10-29T00:00:00Z");
const b = (quantity: number, max_capacity: number, avg_daily_use: number, expiry_date: string) => ({
  quantity, max_capacity, avg_daily_use, expiry_date,
});

describe("stock status", () => {
  it("zero quantity is Not available", () => {
    expect(summarizeStock([b(0, 100, 4, "2027-03-01")], today).status).toBe("out");
  });
  it("expired batches do not count as available", () => {
    expect(summarizeStock([b(500, 500, 4, "2026-10-01")], today).status).toBe("out");
  });
  it("under 14 days of use is Low", () => {
    expect(summarizeStock([b(50, 100, 4, "2027-06-01")], today).status).toBe("low");
  });
  it("healthy stock is In Stock", () => {
    expect(summarizeStock([b(80, 100, 2, "2027-06-01")], today).status).toBe("in_stock");
  });
  it("flags expiry within 90 days", () => {
    expect(summarizeStock([b(80, 100, 2, "2027-01-15")], today).expiringSoon).toBe(true);
    expect(summarizeStock([b(80, 100, 2, "2027-03-15")], today).expiringSoon).toBe(false);
  });
});
