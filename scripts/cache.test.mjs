import test from "node:test";
import assert from "node:assert/strict";
import { chmod, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

test("Vercel disk cache persists when the application directory is read-only", async () => {
  const original = process.cwd();
  const directory = await mkdtemp(path.join(tmpdir(), "sgrt-readonly-"));
  const key = `cache-test-${process.pid}-${Date.now()}`;
  const previous = process.env.VERCEL;
  try {
    await chmod(directory, 0o555);
    process.chdir(directory);
    process.env.VERCEL = "1";
    const { readDisk, writeDisk } = await import("../src/lib/server/cache.ts");
    const entry = { generatedAt: "2026-10-22T00:00:00.000Z", data: { reports: 2 } };
    await writeDisk(key, entry);
    assert.deepEqual(await readDisk(key), entry);
  } finally {
    process.chdir(original);
    if (previous === undefined) delete process.env.VERCEL;
    else process.env.VERCEL = previous;
    await chmod(directory, 0o755);
    await rm(directory, { recursive: true, force: true });
    await rm(path.join(tmpdir(), "sgrttrafficinfo-cache", `${key}.json`), { force: true });
  }
});
