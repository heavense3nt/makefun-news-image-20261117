// news-image-20261117 — the entry program.
//
// The entry is one picture, entry.png, that sums up the world news of
// Tuesday 17 November 2026: a collapsed span of the Kerch Bridge, a third
// U.S. carrier sailing for the Gulf, a Trump-Xi-Putin summit set for
// Shenzhen, a European plan for a Rwanda return hub, and Japan scrambling
// jets. This program copies that picture to the output directory the
// harness asks for, after checking it is a whole PNG inside the size
// limits, so every run writes the same bytes: no network, no clock, no
// randomness anywhere in the path.
import { mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const MAX_BYTES = 1_048_576;
const MAX_SIDE = 1024;
const SOURCE_NAME = "entry.png";

function fail(message: string): never {
  throw new Error(`news-image-20261117: ${message}`);
}

// Read the dimensions out of the PNG header: the 8-byte signature, then the
// IHDR chunk, whose width sits at offset 16 and height at offset 20, both
// big-endian 32-bit numbers. The chunk tag at offset 12 must read IHDR, so a
// file that merely starts with the PNG magic but is not a PNG at all is
// refused here instead of being copied through.
function readPngSize(bytes: Buffer): { width: number; height: number } {
  if (bytes.length < 24) fail("entry.png is too short to be a PNG");
  if (bytes.subarray(12, 16).toString("ascii") !== "IHDR") {
    fail("entry.png has no IHDR chunk where a PNG must");
  }
  const width = bytes.readUInt32BE(16);
  const height = bytes.readUInt32BE(20);
  if (width === 0 || height === 0) fail("entry.png has a zero dimension");
  return { width, height };
}

function main(): void {
  const here = dirname(fileURLToPath(import.meta.url));
  const source = join(here, SOURCE_NAME);
  const bytes = readFileSync(source);
  if (!bytes.subarray(0, 8).equals(PNG_MAGIC)) {
    fail("entry.png is not a PNG");
  }
  const { width, height } = readPngSize(bytes);
  if (bytes.length > MAX_BYTES) {
    fail(`entry.png is ${bytes.length} bytes, over the 1 MiB cap`);
  }
  if (width > MAX_SIDE || height > MAX_SIDE) {
    fail(`entry.png is ${width}x${height}, over the 1024x1024 cap`);
  }
  const outDir = resolve(process.env.MAKEFUN_OUTPUT_DIR ?? "/output");
  mkdirSync(outDir, { recursive: true });
  const target = join(outDir, SOURCE_NAME);
  writeFileSync(target, bytes);
  const written = statSync(target).size;
  if (written !== bytes.length) fail("short write to the output file");
  console.log(`wrote ${target} (${width}x${height}, ${written} bytes)`);
}

main();
