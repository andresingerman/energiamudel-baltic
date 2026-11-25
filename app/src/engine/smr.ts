// The plant's units and their planned outages (R-SMR-1, R-SMR-2; the contract account is M6).
// Each unit's outage of `len` hours goes where the hourly surplus of fixed and renewable output
// over demand, summed over the window, is largest; a later unit's window keeps at least `gap`
// hours from every earlier one. Ties go to the earlier start. Pre-clearing data only.

/** Start hour of each unit's outage window. */
export function outageStarts(surplus: Float64Array, units: number, len: number, gap: number): number[] {
  const H = surplus.length;
  const starts: number[] = [];
  if (units <= 0 || len <= 0) return starts;
  if (len > H) throw new Error(`outage of ${len} h exceeds the run's ${H} h`);
  const prefix = new Float64Array(H + 1);
  for (let h = 0; h < H; h++) prefix[h + 1] = prefix[h] + surplus[h];
  for (let u = 0; u < units; u++) {
    let best = -1;
    let bestSum = 0;
    for (let s = 0; s + len <= H; s++) {
      let clash = false;
      for (const t of starts) if (s < t + len + gap && t < s + len + gap) clash = true;
      if (clash) continue;
      const sum = prefix[s + len] - prefix[s];
      if (best < 0 || sum > bestSum) {
        best = s;
        bestSum = sum;
      }
    }
    if (best < 0) throw new Error(`no room for ${units} outages of ${len} h ${gap} h apart in ${H} h`);
    starts.push(best);
  }
  return starts;
}

/** Hourly number of units in service. */
export function available(H: number, units: number, starts: number[], len: number): Float64Array {
  const a = new Float64Array(H).fill(units);
  for (const s of starts) for (let h = s; h < s + len && h < H; h++) a[h] -= 1;
  return a;
}
