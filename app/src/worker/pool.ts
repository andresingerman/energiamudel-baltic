// Up to eight workers, one less than the cores (D-114; four until then, D-028, D-095), running the
// engine of record (R-ENG-7, R-NFR-2): jobs wait in a queue by priority (0 to 0.75 the headline's
// three scenarios, the one shown first, D-127; 1 the standard sensitivities of R-APP-11, which a
// scenario shown anew drops by their tag — 2.9 while another page than the Model view is shown, behind
// that page's own sets, `shift`, D-233; from 2 the presentation's blocks and the deck's outages;
// 3 the warm-up of a page opened on a view computed before, D-128; a year's later jobs go
// 0.5 and 0.75 ahead of its first, `runYear`); a new generation — a change of a control that needs a
// run, not the scenario shown or the strike — drops every queued job of an older one, and the
// results of jobs already running for it are thrown away when they arrive (a running solve is not
// interrupted: its worker keeps its loaded data).

/** How long a job may go unanswered before its worker is given up (D-238): a part of a year takes a second or two on
 * a desktop and some tens of seconds on a phone, a worker's first job its downloads besides; a worker the browser has
 * put down — a phone short of memory does it — never answers at all, and without a limit its table says "computing…"
 * for ever. ponytail: one limit for every kind of job; a limit per kind if a slow device ever meets it honestly. */
export const JOB_MS = 120_000;

export interface Port {
  terminate?(): void; // a browser's worker: let go of when it is given up
  postMessage(msg: unknown): void;
  onmessage: ((e: { data: unknown }) => void) | null;
  onerror?: ((e: { message?: string }) => void) | null; // a worker's uncaught error
  onmessageerror?: ((e: unknown) => void) | null; // a reply that could not be read
}

interface Queued { gen: number; priority: number; seq: number; msg: Record<string, unknown>; resolve: (v: unknown) => void; reject: (e: Error) => void; cancelled?: boolean; id?: number; timer?: ReturnType<typeof setTimeout> }

export class Pool {
  private idle: Port[] = [];
  private queue: Queued[] = [];
  private busy = new Map<Port, Queued>();
  private seq = 0;
  private id = 0;
  private alive: number;
  gen = 0;
  readonly workers: number;

  private patience: number;
  private lost = false; // a worker was given up for not answering
  private behind = new Map<string, number>(); // a tag's jobs moved in the queue's order (`shift`)

  /** `patience`: the milliseconds a job may go unanswered (JOB_MS). */
  constructor(ports: Port[], patience = JOB_MS) {
    this.patience = patience;
    this.workers = ports.length;
    this.alive = ports.length;
    for (const p of ports) {
      p.onmessage = (e) => this.done(p, e.data as { id: number; error?: string });
      // a worker that fails outside its own try/catch still answers its job, with the error, and
      // takes the next one: the pool does not shrink in silence
      p.onerror = (e) => this.done(p, { id: 0, error: `the worker failed: ${e.message ?? "unknown error"}` });
      p.onmessageerror = () => this.done(p, { id: 0, error: "the worker's reply could not be read" });
      this.idle.push(p);
    }
  }

  static size(cores: number | undefined): number {
    return Math.min(8, Math.max(1, (cores ?? 2) - 1));
  }

  /** Starts a new generation: queued jobs of older ones are dropped (their promises reject). */
  next(): number {
    this.gen++;
    const old = this.queue;
    this.queue = [];
    for (const q of old) q.reject(new Error("superseded"));
    return this.gen;
  }

  /** Drops the queued jobs whose message carries `tag` and throws away the results of its running
   * ones when they arrive (their solves are not interrupted). */
  cancel(tag: string): void {
    const keep: Queued[] = [];
    for (const q of this.queue) if (q.msg.tag === tag) q.reject(new Error("cancelled")); else keep.push(q);
    this.queue = keep;
    for (const q of this.busy.values()) if (q.msg.tag === tag) q.cancelled = true;
  }

  /** Moves the jobs whose message carries `tag` by `by` in the queue's order, those queued and those asked for
   * from now on — a year's later clearings among them (D-238): the sensitivities behind the sets of another page
   * while it is shown, and back (D-233). A job already running keeps its worker. */
  shift(tag: string, by: number): void {
    this.behind.set(tag, (this.behind.get(tag) ?? 0) + by);
    for (const q of this.queue) if (q.msg.tag === tag) q.priority += by;
    this.queue.sort((a, b) => a.priority - b.priority || a.seq - b.seq);
  }

  run<T>(msg: Record<string, unknown>, priority = 0): Promise<T> {
    if (!this.alive) return Promise.reject(new Error(this.lost ? "no worker is left: load the page again" : "no worker could start"));
    return new Promise<T>((resolve, reject) => {
      this.queue.push({ gen: this.gen, priority: priority + (this.behind.get(String(msg.tag)) ?? 0), seq: this.seq++, msg, resolve: resolve as (v: unknown) => void, reject });
      this.queue.sort((a, b) => a.priority - b.priority || a.seq - b.seq);
      this.pump();
    });
  }

  get pending(): number {
    return this.queue.length + this.busy.size;
  }

  private pump(): void {
    while (this.idle.length && this.queue.length) {
      const q = this.queue.shift()!;
      const p = this.idle.shift()!;
      this.busy.set(p, q);
      q.id = ++this.id;
      q.timer = setTimeout(() => this.silent(p, q), this.patience);
      (q.timer as { unref?: () => void }).unref?.(); // Node: a waiting limit does not keep a test alive
      p.postMessage({ ...q.msg, id: q.id });
    }
  }

  /** A worker that has not answered its job in time is given up: the job fails, saying so, the worker gets no other,
   * and an answer that comes after all is not read (D-238). The others go on; with none left every job fails. */
  private silent(p: Port, q: Queued): void {
    if (this.busy.get(p) !== q) return;
    this.busy.delete(p);
    this.lost = true;
    try { p.terminate?.(); } catch { /* gone already */ }
    q.reject(new Error(q.cancelled ? "cancelled" : q.gen !== this.gen ? "superseded" : `a worker did not answer in ${Math.round(this.patience / 1000)} s and was given up`));
    if (--this.alive) return void this.pump();
    for (const x of this.queue.splice(0)) x.reject(new Error("no worker is left: load the page again"));
  }

  private done(p: Port, data: { id: number; error?: string }): void {
    const q = this.busy.get(p);
    // a worker that fails with no job — its module did not load, say — is retired, not listed idle
    // twice, which would give it two jobs at once and leave one of them unanswered
    if (!q) return this.retire(p);
    // a reply to a job its worker's error has answered already is not the next job's
    if (data.id && data.id !== q.id) return;
    clearTimeout(q.timer);
    this.busy.delete(p);
    this.idle.push(p);
    if (q.cancelled) q.reject(new Error("cancelled"));
    else if (q.gen !== this.gen) q.reject(new Error("superseded"));
    else if (data.error) q.reject(new Error(data.error));
    else q.resolve(data);
    // the answer's own continuation first: what it queues — a year's next clearing — goes to the
    // worker it freed by its priority, not behind the job that happened to be next (D-128)
    queueMicrotask(() => this.pump());
  }

  private retire(p: Port): void {
    if (!this.idle.includes(p)) return;
    this.idle = this.idle.filter((x) => x !== p);
    if (--this.alive) return;
    for (const q of this.queue.splice(0)) q.reject(new Error("no worker could start"));
  }
}

/** One year of a set on the pool, its weeks shared by every worker (R-ENG-7, D-114): the first
 * clearing in as many parts as there are workers; with oil shale's entry, part k of the second as
 * soon as the first's parts 0 to k are in, on their joined price of the entry's zone — the
 * commitment decides each day on that day's price and the day before, and a part reads only its own
 * weeks (D-128, `runSplit`) — then one worker puts the year together and makes its view, replying
 * as a whole-year job does. A year's later jobs go ahead of the first jobs of years not yet started,
 * so a set finishes year by year; a new generation stops a year between its clearings. */
export async function runYear<T>(pool: Pool, msg: Record<string, unknown>, priority = 0): Promise<T> {
  const gen = pool.gen;
  const n = pool.workers;
  const go = () => { if (pool.gen !== gen) throw new Error("superseded"); };
  const run = (extra: Record<string, unknown>, at: number) => pool.run<Record<string, unknown>>({ ...msg, ...extra }, at);
  const got: Record<string, unknown>[] = [];
  const second: Promise<Record<string, unknown>>[] = [];
  const end = (r: Record<string, unknown>) => (r.h0 as number) + (r.price as Float64Array).length;
  const first = await Promise.all(Array.from({ length: n }, (_, k) => run({ part: { k, n } }, priority).then((r) => {
    got[k] = r;
    // the second clearing's parts whose first-clearing prices are all in, in order, each on the
    // joined price up to its own end
    for (let j = second.length; r.entry && pool.gen === gen && got[j]; j = second.length) {
      const price = new Float64Array(end(got[j]));
      for (let i = 0; i <= j; i++) price.set(got[i].price as Float64Array, got[i].h0 as number);
      const job = run({ part: { k: j, n, price, first: got[j].part } }, priority - 0.5);
      job.catch(() => undefined); // a year superseded between its clearings drops them unread
      second.push(job);
    }
    return r;
  })));
  go();
  if (!first[0].entry) return pool.run<T>({ ...msg, finish: { parts: first.map((r) => r.part), price: null } }, priority - 0.75);
  const price = new Float64Array(Math.max(...first.map(end)));
  for (const r of first) price.set(r.price as Float64Array, r.h0 as number);
  const parts = await Promise.all(second);
  go();
  return pool.run<T>({ ...msg, finish: { parts: parts.map((r) => r.part), price } }, priority - 0.75);
}
