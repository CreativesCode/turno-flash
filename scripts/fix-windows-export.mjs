// Static export built on Windows: Next writes the route segment files as
// nested folders (dashboard/__next.!KGFwcCk/dashboard.txt) while the client
// asks for flat names (dashboard/__next.!KGFwcCk.dashboard.txt). Every
// prefetch is a 404 and every tap in the menu becomes a full page reload
// (P2-08). This adds the flat copies the client asks for. On Linux/macOS
// (Vercel) the nested folders don't exist and it does nothing.
// Usage: node scripts/fix-windows-export.mjs   (after next build)

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), "../out");
let copied = 0;

/** Copies every file below a `__next.*` folder next to it, with `/` as `.`. */
function flatten(segmentDir) {
  const parent = path.dirname(segmentDir);
  const prefix = path.basename(segmentDir);
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
        continue;
      }
      const relative = path.relative(segmentDir, full).split(path.sep).join(".");
      const target = path.join(parent, `${prefix}.${relative}`);
      if (!fs.existsSync(target)) {
        fs.copyFileSync(full, target);
        copied++;
      }
    }
  };
  walk(segmentDir);
}

function scan(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name === "_next") continue;
    const full = path.join(dir, entry.name);
    if (entry.name.startsWith("__next.")) flatten(full);
    else scan(full);
  }
}

if (fs.existsSync(OUT)) {
  scan(OUT);
  console.log(`fix-windows-export: ${copied} navigation files copied`);
}
