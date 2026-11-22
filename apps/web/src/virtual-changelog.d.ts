/** CHANGELOG.md aus dem Repo-Wurzelverzeichnis (siehe changelogPlugin in vite.config.ts). */
declare module "virtual:changelog" {
  const text: string;
  export default text;
}
