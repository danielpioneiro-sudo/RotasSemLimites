import {Stop} from '../types';

function toRad(v: number) {
  return (v * Math.PI) / 180;
}

export function haversineKm(a: Stop, b: Stop): number {
  const R = 6371;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.latitude)) *
      Math.cos(toRad(b.latitude)) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(h));
}

export function totalDistance(stops: Stop[]): number {
  let d = 0;
  for (let i = 0; i < stops.length - 1; i++) {
    d += haversineKm(stops[i], stops[i + 1]);
  }
  return d;
}

// NN a partir de um ponto de origem específico
function nearestNeighborFrom(pool: Stop[], start: Stop): Stop[] {
  const remaining = [...pool];
  const result: Stop[] = [];
  let current = start;
  while (remaining.length > 0) {
    let bestIdx = 0;
    let bestDist = haversineKm(current, remaining[0]);
    for (let i = 1; i < remaining.length; i++) {
      const d = haversineKm(current, remaining[i]);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    }
    const [next] = remaining.splice(bestIdx, 1);
    result.push(next);
    current = next;
  }
  return result;
}

// 2-opt respeitando início e fim fixos
function twoOptFixed(stops: Stop[], fixedEnd: boolean): Stop[] {
  let best = [...stops];
  let improved = true;
  let iter = 0;
  // i começa em 1 (não move início), j não ultrapassa penúltimo se fim fixo
  const jMax = fixedEnd ? best.length - 2 : best.length - 1;
  while (improved && iter < 300) {
    improved = false;
    iter++;
    for (let i = 1; i < jMax; i++) {
      for (let j = i + 1; j <= jMax; j++) {
        const before =
          haversineKm(best[i - 1], best[i]) +
          (j + 1 < best.length ? haversineKm(best[j], best[j + 1]) : 0);
        const after =
          haversineKm(best[i - 1], best[j]) +
          (j + 1 < best.length ? haversineKm(best[i], best[j + 1]) : 0);
        if (after < before - 0.001) {
          best = [
            ...best.slice(0, i),
            ...best.slice(i, j + 1).reverse(),
            ...best.slice(j + 1),
          ];
          improved = true;
        }
      }
    }
  }
  return best;
}

export interface OptimizeResult {
  optimized: Stop[];
  originalKm: number;
  optimizedKm: number;
  savedKm: number;
  savedPct: number;
}

export function optimizeRoute(
  stops: Stop[],
  fixedStartId?: string | null,
  fixedEndId?: string | null,
): OptimizeResult {
  const originalKm = totalDistance(stops);

  if (stops.length <= 2) {
    return {optimized: [...stops], originalKm, optimizedKm: originalKm, savedKm: 0, savedPct: 0};
  }

  // Separa início e fim do pool de paradas a ordenar
  let pool = [...stops];

  // Extrai parada inicial
  const startIdx = fixedStartId ? pool.findIndex(s => s.id === fixedStartId) : 0;
  const [start] = pool.splice(startIdx >= 0 ? startIdx : 0, 1);

  // Extrai parada final (se definida e diferente do início)
  let end: Stop | null = null;
  if (fixedEndId && fixedEndId !== start.id) {
    const endIdx = pool.findIndex(s => s.id === fixedEndId);
    if (endIdx >= 0) {
      [end] = pool.splice(endIdx, 1);
    }
  }

  // NN nas paradas intermediárias partindo do início
  const middle = nearestNeighborFrom(pool, start);

  // Monta rota completa
  const full = end ? [start, ...middle, end] : [start, ...middle];

  // Melhoria 2-opt respeitando fixações
  const optimized = twoOptFixed(full, end !== null);

  const optimizedKm = totalDistance(optimized);
  const savedKm = originalKm - optimizedKm;
  const savedPct = originalKm > 0 ? (savedKm / originalKm) * 100 : 0;

  return {optimized, originalKm, optimizedKm, savedKm, savedPct};
}
