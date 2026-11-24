import { drizzle } from "drizzle-orm/node-postgres";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite/driver";
import { PGlite } from "@electric-sql/pglite";
import { Pool } from "pg";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import * as schema from "./schema.js";

export type DbMode = "pglite" | "postgres";

let mode: DbMode | undefined;
let pool: Pool | undefined;
let client: PGlite | undefined;

/** Walk up from cwd to find the monorepo root (dir containing pnpm-workspace.yaml). */
export function findRepoRoot(from = process.cwd()): string {
  let dir = from;
  for (let i = 0; i < 10; i++) {
    if (existsSync(join(dir, "pnpm-workspace.yaml"))) return dir;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return from;
}

/** PGlite data dir — override with PGDATA_PATH, else <repo-root>/.pgdata (gitignored). */
export function getPglitePath(): string {
  return process.env.PGDATA_PATH ?? join(findRepoRoot(), ".pgdata");
}

/**
 * DATABASE_URL set → real Postgres (docker or remote).
 * Not set → embedded PGlite (zero infra). Same schema, same Drizzle API.
 */
export function getDb() {
  if (mode === "pglite") return drizzlePglite(client!, { schema });
  if (mode === "postgres") return drizzle(pool!, { schema });

  if (process.env.DATABASE_URL) {
    mode = "postgres";
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 10,
    });
    return drizzle(pool, { schema });
  }

  mode = "pglite";
  client = new PGlite(getPglitePath());
  console.warn(`[db] DATABASE_URL not set — using embedded PGlite (${getPglitePath()})`);
  return drizzlePglite(client, { schema });
}

export function getDbMode(): DbMode {
  return mode ?? (process.env.DATABASE_URL ? "postgres" : "pglite");
}

export async function closeDb(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = undefined;
    mode = undefined;
  }
}

export { schema };
export { encryptToken, decryptToken } from "./tokenCrypto.js";
export {
  getSpotifyTokenByUserId,
  updateSpotifyTokenByUserId,
  updateImportJob,
  insertImportedLike,
  insertImportedPlaylist,
} from "./spotifyRepo.js";
