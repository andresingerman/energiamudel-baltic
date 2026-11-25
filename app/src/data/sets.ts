// Every set the page holds, by what it computes from (`jobKey`, D-134): the one store of the table, its
// sensitivities, the presentation's blocks, the deck's outages and replays and a validation run (D-232). The sets
// last used stay in the page's memory up to a budget of bytes — a set of three years weighs about 0.66 MB, a state
// with every page shown forty-four of them — and in the browser's store (stored.ts), so that a set whose engine input
// comes back — a control returned to an earlier value, the page loaded again, 0 SMR when only the plant's clause
// moves, a gas floor under the scenario's gas — is taken and not computed again. Here is what decides where a set
// comes from, apart from the page that asks (main.ts) and from IndexedDB itself (stored.ts), so that a test can ask
// it without either (D-239).
import { Lru, bytesOf } from "./stored.ts";

/** Where a set held came from: the build's files, or this browser — its store, or a run of this page. */
export type Origin = "site" | "browser";
export interface Kept<S> { set: S; from: Origin }

/** The browser's store as the sets use it: what a set is kept under before its job (null: nothing is kept, and
 * nothing kept is read), a set read, a set written. */
export interface Keeping<S> {
  prefix: Promise<string | null>;
  recall(id: string): Promise<S | null>;
  remember(id: string, set: S, prefix: string): unknown;
}

export class Sets<S> {
  private held: Lru<Kept<S>>;
  private keeping: Keeping<S>;

  /** `bytes`: the page's memory for the sets last used. */
  constructor(bytes: number, keeping: Keeping<S>) {
    this.held = new Lru<Kept<S>>(bytes);
    this.keeping = keeping;
  }

  /** Into the page's memory alone: a set of the build's files, or one the store gave. */
  keep(job: string, set: S, from: Origin): void {
    this.held.set(job, { set, from }, bytesOf(set));
  }

  /** The set in the page's memory, or undefined; no store is asked. */
  peek(job: string): S | undefined {
    return this.held.get(job)?.set;
  }

  /** A set computed before, by its job: the page's memory, else the browser's store — and from then on the memory. */
  async kept(job: string): Promise<Kept<S> | null> {
    const had = this.held.get(job);
    if (had) return had;
    const prefix = await this.keeping.prefix;
    const mine = prefix ? await this.keeping.recall(prefix + job) : null;
    if (!mine) return null;
    this.keep(job, mine, "browser");
    return { set: mine, from: "browser" };
  }

  /** A set this page computed: into its memory and into the browser's store. */
  put(job: string, set: S): void {
    this.keep(job, set, "browser");
    void this.keeping.prefix.then((prefix) => { if (prefix) void this.keeping.remember(prefix + job, set, prefix); });
  }

  /** A set computed before for `job`, for an asker that a later one may supersede while the answers come: kept
   * before, else the build's file of it (`file`), which is kept in the memory only while the asker is still the
   * latest (`live`) — an older asker would else keep under its job what a newer one's settings name (D-238). Null:
   * to be computed; undefined: the asker was superseded, and does nothing more. */
  async found(job: string, file: () => Promise<S | null>, live: () => boolean): Promise<S | null | undefined> {
    const had = await this.kept(job);
    if (!live()) return undefined;
    if (had) return had.set;
    const built = await file();
    if (!live()) return undefined;
    if (built) this.keep(job, built, "site");
    return built;
  }
}

/** The sets of `jobs` computed before, all of them or null (R-ENG-7; D-126, D-129, D-232): the build's opening view
 * where it is these jobs' (`opening`, with the sensitivities it holds, each by its job) — else the page's memory and
 * the browser's store, each job — else the build's file of them (`file`, the sets in the jobs' order). What the
 * build's files give goes into the page's memory by job, for the changes that leave a set as it was (D-134). A set
 * that only this browser holds makes the answer the browser's. */
export async function known<S>(store: Sets<S>, jobs: string[], opening: () => Promise<{ sets: S[]; sens: [job: string, set: S][] } | null>,
  file: () => Promise<S[] | null>): Promise<{ sets: S[]; from: Origin; opening: boolean } | null> {
  const o = await opening();
  if (o) {
    jobs.forEach((j, i) => store.keep(j, o.sets[i], "site"));
    for (const [j, set] of o.sens) store.keep(j, set, "site");
    return { sets: o.sets, from: "site", opening: true };
  }
  const mine = (await Promise.all(jobs.map((j) => store.kept(j)))).filter((x) => x !== null);
  if (mine.length === jobs.length) return { sets: mine.map((x) => x.set), from: mine.some((x) => x.from === "browser") ? "browser" : "site", opening: false };
  const built = await file();
  if (!built) return null;
  jobs.forEach((j, i) => store.keep(j, built[i], "site"));
  return { sets: built, from: "site", opening: false };
}
