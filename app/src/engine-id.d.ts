// The id of the sources that compute a set (scripts/engine_id.ts, D-237), as vite.config.ts gives it to the page.
declare module "virtual:engine-id" {
  const id: string;
  export default id;
}
