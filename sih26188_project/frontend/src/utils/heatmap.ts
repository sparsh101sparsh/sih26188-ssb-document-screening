/**
 * SIH26188 — Heatmap & Canvas Forensics Rendering Utilities
 * Implements Turbo Colormap color ramp and canvas compositing
 */

/**
 * Turbo Colormap approximation polynomial (Google Turbo colormap)
 * Maps t in [0, 1] to [r, g, b] where r, g, b in [0, 255]
 */
export function turboColormap(t: number): [number, number, number] {
  const x = Math.max(0, Math.min(1, t));
  
  const r = 34.61 + x * (1172.33 + x * (-10793.56 + x * (33300.12 + x * (-38394.49 + x * 14825.05))));
  const g = 23.31 + x * (557.33 + x * (1225.33 + x * (-3574.96 + x * (1073.77 + x * 707.56))));
  const b = 27.2 + x * (3211.1 - x * (15327.97 - x * (27814.0 - x * (22569.18 - x * 6838.66))));

  return [
    Math.round(Math.max(0, Math.min(255, r))),
    Math.round(Math.max(0, Math.min(255, g))),
    Math.round(Math.max(0, Math.min(255, b))),
  ];
}

/**
 * Generate a synthetic Turbo Heatmap overlay canvas for demonstration when raw image is provided
 */
export function generateSyntheticHeatmap(
  width: number,
  height: number,
  anomalyRegions: Array<{ bbox: number[]; peak: number; label: string }>
): string {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const imgData = ctx.createImageData(width, height);
  const data = imgData.data;

  // Background baseline noise (approx 0.02 - 0.05)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let prob = 0.02 + Math.sin(x * 0.05) * Math.cos(y * 0.05) * 0.02;

      // Add energy around anomaly regions
      for (const region of anomalyRegions) {
        const [rx1, ry1, rx2, ry2] = region.bbox;
        const cx = (rx1 + rx2) / 2;
        const cy = (ry1 + ry2) / 2;
        const rx = (rx2 - rx1) / 2 + 10;
        const ry = (ry2 - ry1) / 2 + 10;

        const dx = (x - cx) / rx;
        const dy = (y - cy) / ry;
        const distSq = dx * dx + dy * dy;
        if (distSq < 4.0) {
          const intensity = Math.exp(-distSq * 0.8) * region.peak;
          prob = Math.max(prob, intensity);
        }
      }

      const [r, g, b] = turboColormap(Math.min(1.0, prob));
      const idx = (y * width + x) * 4;
      data[idx] = r;
      data[idx + 1] = g;
      data[idx + 2] = b;
      data[idx + 3] = prob > 0.15 ? Math.round(180 * (prob / 1.0)) : Math.round(60 * prob);
    }
  }

  ctx.putImageData(imgData, 0, 0);
  return canvas.toDataURL('image/png');
}
