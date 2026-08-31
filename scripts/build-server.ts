#!/usr/bin/env bun
import { $ } from "bun";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dir, "..");
const outDir = resolve(root, "dist/server");
const entry = resolve(root, "server/src/_worker.ts");
const configPath = resolve(root, "wrangler.build.toml");
const clientDir = resolve(root, "dist/client");

if (!(await Bun.file(entry).exists())) {
  throw new Error(`Server entry not found: ${entry}`);
}

await mkdir(outDir, { recursive: true });

const hasClient = await Bun.file(resolve(clientDir, "index.html")).exists();
const assetsBlock = hasClient
  ? `
[assets]
directory = "./dist/client"
binding = "ASSETS"
`
  : "";

await Bun.write(
  configPath,
  `# Generated for local/CI server bundle only. Do not use this as the live deploy config.
name = "rin-server-build"
main = "./server/src/_worker.ts"
compatibility_date = "2026-01-20"
${assetsBlock}`,
);

const bunExec = process.execPath;

await $`cd ${root} && ${bunExec} x wrangler deploy --dry-run --outdir=${outDir} --config=${configPath}`;

const bundled = resolve(outDir, "_worker.js");
if (!(await Bun.file(bundled).exists())) {
  throw new Error(`Server bundle was not written: ${bundled}`);
}

console.log(`✅ Server bundled -> ${bundled}`);