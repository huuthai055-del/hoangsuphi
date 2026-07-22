import { access, readdir } from "node:fs/promises";
import path from "node:path";

const projectRoot = process.cwd();
const runtimeTests = [
  "src/lib/cross-crawl.runtime.test.ts",
  "src/lib/redirect.runtime.test.ts",
  "src/lib/ssr.runtime.test.ts",
];

async function collectTests(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const collected: string[] = [];

  for (const entry of entries) {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      collected.push(...(await collectTests(absolutePath)));
      continue;
    }
    if (!entry.name.endsWith(".test.ts") && !entry.name.endsWith(".test.tsx")) {
      continue;
    }

    const relativePath = path.relative(projectRoot, absolutePath).replaceAll(path.sep, "/");
    if (!relativePath.endsWith(".runtime.test.ts")) {
      collected.push(relativePath);
    }
  }

  return collected.sort();
}

async function runBunTests(files: string[], label: string): Promise<void> {
  console.log(`\n▶ ${label}`);
  const child = Bun.spawn(
    [process.execPath, "test", "--preload", "./scripts/test-preload.ts", ...files, "--timeout", "120000"],
    {
    cwd: projectRoot,
    env: {
      ...process.env,
      NEXT_PHASE: "phase-production-build",
      PUBLIC_SITE_URL: process.env.PUBLIC_SITE_URL ?? "http://127.0.0.1:3001",
      INTERNAL_BACKEND_URL: process.env.INTERNAL_BACKEND_URL ?? "http://127.0.0.1:3000",
    },
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
  });

  const exitCode = await child.exited;
  if (exitCode !== 0) {
    throw new Error(`${label} failed with exit code ${exitCode}`);
  }
}

await access(path.join(projectRoot, ".next", "BUILD_ID")).catch(() => {
  throw new Error("Missing .next production build. Run `npm run build` before runtime tests.");
});

const unitTests = await collectTests(path.join(projectRoot, "src"));
await runBunTests(unitTests, "Unit and contract tests");

for (const runtimeTest of runtimeTests) {
  await runBunTests([runtimeTest], `Runtime test: ${runtimeTest}`);
}

console.log("\n✓ All Phase 5.1 tests passed sequentially.");
