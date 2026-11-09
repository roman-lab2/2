import { spawnSync } from "node:child_process";
import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));
let origin;
try {
  const url = new URL(process.argv[2]);
  if (
    url.protocol !== "https:" ||
    !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.sourcecraft\.site$/.test(url.hostname) ||
    url.pathname !== "/" ||
    url.port || url.username || url.password || url.search || url.hash
  ) throw new Error();
  origin = url.origin;
} catch {
  console.error("Usage: node scripts/prepare-sourcecraft.mjs https://YOUR_ORGANIZATION.sourcecraft.site");
  console.error("Use an organization and repository with the same name to serve Autera at the domain root.");
  process.exit(1);
}

const build = spawnSync(
  process.execPath,
  [path.join(root, "node_modules/next/dist/bin/next"), "build"],
  { cwd: root, stdio: "inherit", env: { ...process.env, NEXT_PUBLIC_SITE_URL: origin } },
);
if (build.error) throw build.error;
if (build.status !== 0) process.exit(build.status || 1);

// Only the static export is copied. Source files, environment variables, local
// credentials, and database data never enter this publication repository.
const destination = path.join(root, ".sourcecraft-output");
await rm(destination, { recursive: true, force: true });
await mkdir(path.join(destination, ".sourcecraft"), { recursive: true });
await cp(path.join(root, "out"), path.join(destination, "site"), { recursive: true });
await writeFile(path.join(destination, ".sourcecraft/sites.yaml"), "site:\n  root: site\n");
await writeFile(path.join(destination, ".gitignore"), ".env*\n");
await writeFile(path.join(destination, "README.md"), `# Autera — static publication\n\nTarget origin: ${origin}\n\nThis directory is ready to push to a public SourceCraft repository in a public organization. Use a repository with exactly the organization's name and make main the default branch. The root address is required because the website uses root-relative navigation and assets.\n\nSource: https://github.com/roman-lab2/2/tree/codex/autera-sourcecraft\n\nPreparing files does not publish a website or reserve the address. Do not change the working Google Apps Script worker token. After verifying the new website, update only its AUTERA.siteUrl and save the existing script.\n`);
console.log(`Prepared publication files: ${destination}`);
console.log(`Target origin (not published or reserved): ${origin}`);
