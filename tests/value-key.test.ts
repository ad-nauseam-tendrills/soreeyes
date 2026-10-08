import { describe, expect, it } from "vitest";
import { defaultThresholds, histogram, LEVEL_GRAYS, lumaOf, luminance, otsu, posterize } from "@/lib/value-key";

describe("value key maths", () => {
  it("luminance weights green most and stays in 0–255", () => {
    expect(luminance(0, 0, 0)).toBe(0);
    expect(Math.round(luminance(255, 255, 255))).toBe(255);
    expect(luminance(0, 255, 0)).toBeGreaterThan(luminance(255, 0, 0));
  });

  it("Otsu splits a two-cluster image between the clusters", () => {
    const luma = [...Array(500).fill(40), ...Array(500).fill(200)];
    const t = otsu(histogram(luma));
    expect(t).toBeGreaterThan(40);
    expect(t).toBeLessThanOrEqual(200);
  });

  it("three-value defaults find both gaps in a three-cluster image", () => {
    const luma = [...Array(300).fill(30), ...Array(300).fill(120), ...Array(300).fill(220)];
    const [t1, t2] = defaultThresholds(histogram(luma), 3);
    expect(t1).toBeGreaterThan(30);
    expect(t1).toBeLessThanOrEqual(120);
    expect(t2).toBeGreaterThan(120);
    expect(t2).toBeLessThanOrEqual(220);
  });

  it("posterize maps every pixel to one of the level grays", () => {
    const out = posterize([10, 100, 150, 250], [128], LEVEL_GRAYS[2]);
    expect([...out]).toEqual([58, 58, 214, 214]);
    const out3 = posterize([10, 100, 150, 250], [60, 200], LEVEL_GRAYS[3]);
    expect([...out3]).toEqual([58, 140, 140, 222]);
  });

  it("is deterministic and reads RGBA", () => {
    const rgba = [255, 255, 255, 255, 0, 0, 0, 255];
    expect([...lumaOf(rgba)]).toEqual([255, 0]);
    const h = histogram([1, 1, 2]);
    expect(otsu(h)).toBe(otsu(h));
  });
});
