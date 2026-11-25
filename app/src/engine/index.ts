// What a run returns (R-ENG-1): lp.ts's `runLP`, the engine of record (R-ENG-8), fills it. The
// two-pass engine of revisions 1.0–1.3 lived here and is removed (D-132); the fields it alone used
// went at the golden fixture's next re-baseline (D-138).

export interface UnitResult {
  name: string;
  zone: number;
  charge: Float64Array; // MW from the grid
  discharge: Float64Array; // MW to the grid
  energy: Float64Array; // MWh held at the end of the hour
  endMwh: number; // energy held at the end of the run: 0, a window's stores end it empty
}

export interface ReservoirResult {
  release: Float64Array; // MW
  value: Float64Array; // €/MWh per week
  spilled: number; // MWh the turbines could not pass
  leftMwh: number; // MWh of the weeks' budgets the cascade did not release
}

export interface Results {
  hours: number;
  price: Float64Array[]; // €/MWh per zone
  shed: Float64Array[]; // MW
  spill: Float64Array[]; // MW
  flow: Float64Array[]; // MW per internal link, + = towards LT
  sat: Uint8Array[];
  offers: Float64Array[][]; // per zone, per offer of the problem: MW supplied or consumed
  units: UnitResult[];
  reservoir: ReservoirResult | null;
  // per week, 1 where a window of the week ran a class of oil shale's entry at any hour it solved, those
  // it only looked ahead to included: the first clearing's, which the second may take a week of (D-130)
  entryRan: Uint8Array;
}
