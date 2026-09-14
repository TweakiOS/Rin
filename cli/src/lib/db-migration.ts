import { getWranglerEnv } from "./wrangler";

const bunExec = process.execPath;
const wranglerCwd = "server";

export const FEEDS_TABLE_EXISTS_QUERY =
  "SELECT name FROM sqlite_master WHERE type='table' AND name='feeds'";
export const FEEDS_TOP_EXISTS_QUERY = "SELECT name FROM pragma_table_info('feeds') WHERE name='top'";
export const ADD_FEEDS_TOP_COLUMN_SQL = "ALTER TABLE feeds ADD COLUMN top INTEGER DEFAULT 0 NOT NULL";
export const FEEDS_PASSWORD_HASH_EXISTS_QUERY =
  "SELECT name FROM pragma_table_info('feeds') WHERE name='password_hash'";
export const FEEDS_PASSWORD_SALT_EXISTS_QUERY =
  "SELECT name FROM pragma_table_info('feeds') WHERE name='password_salt'";
export const ADD_FEEDS_PASSWORD_HASH_COLUMN_SQL =
  "ALTER TABLE feeds ADD COLUMN password_hash TEXT DEFAULT '' NOT NULL";
export const ADD_FEEDS_PASSWORD_SALT_COLUMN_SQL =
  "ALTER TABLE feeds ADD COLUMN password_salt TEXT DEFAULT '' NOT NULL";

export function getMigrationFileVersion(fileName: string) {
  const match = /^(\d+)(?:\D.*)?\.sql$/i.exec(fileName.trim());
  if (!match) {
    return null;
  }

  return Number.parseInt(match[1] || "", 10);
}

async function runWranglerJson(args: string[]) {
  const proc = Bun.spawn([bunExec, "x", "wrangler", ...args], {
    cwd: wranglerCwd,
    env: getWranglerEnv(),
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);

  if (exitCode !== 0) {
    throw new Error(stderr.trim() || stdout.trim() || `wrangler failed with exit code ${exitCode}`);
  }

  return JSON.parse(stdout);
}

async function runWranglerQuiet(args: string[]) {
  const proc = Bun.spawn([bunExec, "x", "wrangler", ...args], {
    cwd: wranglerCwd,
    env: getWranglerEnv(),
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);

  if (exitCode !== 0) {
    throw new Error(stderr.trim() || stdout.trim() || `wrangler failed with exit code ${exitCode}`);
  }
}

export async function fixTopField(type: "local" | "remote", db: string) {
  const tableResult = await runWranglerJson([
    "d1",
    "execute",
    db,
    `--${type}`,
    "--json",
    "--command",
    FEEDS_TABLE_EXISTS_QUERY,
  ]);

  if (tableResult[0].results.length === 0) {
    console.log("Feeds table does not exist yet, skip top field check");
    return;
  }

  console.log("Checking top field on feeds table");
  const result = await runWranglerJson([
    "d1",
    "execute",
    db,
    `--${type}`,
    "--json",
    "--command",
    FEEDS_TOP_EXISTS_QUERY,
  ]);

  if (result[0].results.length === 0) {
    console.log("Adding top field to feeds table");
    await runWranglerQuiet([
      "d1",
      "execute",
      db,
      `--${type}`,
      "--json",
      "--command",
      ADD_FEEDS_TOP_COLUMN_SQL,
    ]);
  } else {
    console.log("Top field already exists in feeds table");
  }
}

/**
 * Idempotently ensure the feeds table carries the per-post password columns
 * (password_hash / password_salt) used by the encryption feature.
 *
 * Unlike a plain `ALTER TABLE ... ADD COLUMN`, this checks pragma_table_info
 * first, so it is safe to run on databases that already have the columns
 * (e.g. a production D1 that was patched by hand) — it becomes a no-op instead
 * of throwing "duplicate column name".
 *
 * The canonical columns also live in server/sql/0000.sql (feeds base schema),
 * so brand-new databases created from the migrations get them for free; this
 * helper only patches databases that predate that schema change.
 */
export async function ensureFeedPasswordColumns(type: "local" | "remote", db: string) {
  const tableResult = await runWranglerJson([
    "d1",
    "execute",
    db,
    `--${type}`,
    "--json",
    "--command",
    FEEDS_TABLE_EXISTS_QUERY,
  ]);

  if (tableResult[0].results.length === 0) {
    console.log("Feeds table does not exist yet, skip password columns check");
    return;
  }

  console.log("Checking password columns on feeds table");
  const hashResult = await runWranglerJson([
    "d1",
    "execute",
    db,
    `--${type}`,
    "--json",
    "--command",
    FEEDS_PASSWORD_HASH_EXISTS_QUERY,
  ]);
  if (hashResult[0].results.length === 0) {
    console.log("Adding password_hash column to feeds table");
    await runWranglerQuiet([
      "d1",
      "execute",
      db,
      `--${type}`,
      "--json",
      "--command",
      ADD_FEEDS_PASSWORD_HASH_COLUMN_SQL,
    ]);
  } else {
    console.log("password_hash column already exists in feeds table");
  }

  const saltResult = await runWranglerJson([
    "d1",
    "execute",
    db,
    `--${type}`,
    "--json",
    "--command",
    FEEDS_PASSWORD_SALT_EXISTS_QUERY,
  ]);
  if (saltResult[0].results.length === 0) {
    console.log("Adding password_salt column to feeds table");
    await runWranglerQuiet([
      "d1",
      "execute",
      db,
      `--${type}`,
      "--json",
      "--command",
      ADD_FEEDS_PASSWORD_SALT_COLUMN_SQL,
    ]);
  } else {
    console.log("password_salt column already exists in feeds table");
  }
}

export async function isInfoExist(type: "local" | "remote", db: string) {
  const result = await runWranglerJson([
    "d1",
    "execute",
    db,
    `--${type}`,
    "--json",
    "--command",
    "SELECT name FROM sqlite_master WHERE type='table' AND name='info'",
  ]);

  if (result[0].results.length === 0) {
    console.log("info table not exists");
    return false;
  }

  console.log("info table already exists");
  return true;
}

export async function getMigrationVersion(type: "local" | "remote", db: string) {
  const infoExists = await isInfoExist(type, db);
  if (!infoExists) {
    console.log("Legacy database, migration_version not exists");
    return -1;
  }

  const result = await runWranglerJson([
    "d1",
    "execute",
    db,
    `--${type}`,
    "--json",
    "--command",
    "SELECT value FROM info WHERE key='migration_version'",
  ]);

  if (result[0].results.length === 0) {
    console.log("migration_version not exists");
    return -1;
  }

  console.log("migration_version:", result[0].results[0].value);
  return parseInt(result[0].results[0].value);
}

export async function updateMigrationVersion(type: "local" | "remote", db: string, version: number) {
  const infoExists = await isInfoExist(type, db);
  if (!infoExists) {
    console.log("info table not exists, skip update migration_version");
    throw new Error("info table not exists");
  }

  await runWranglerQuiet([
    "d1",
    "execute",
    db,
    `--${type}`,
    "--json",
    "--command",
    `UPDATE info SET value='${version}' WHERE key='migration_version'`,
  ]);
  console.log("Updated migration_version to", version);
}
