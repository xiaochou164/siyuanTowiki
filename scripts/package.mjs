import { mkdir, rm, stat } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const outDir = path.join(rootDir, "release");
const stagingDir = path.join(outDir, "package");
const zipPath = path.join(outDir, "package.zip");

const packageFiles = [
  "plugin.json",
  "README.md",
  "icon.png",
  "preview.png",
  "index.js",
  "index.css",
];

async function ensureFilesExist() {
  for (const relativePath of packageFiles) {
    const fullPath = path.join(rootDir, relativePath);
    await stat(fullPath);
  }
}

function run(command, args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      stdio: "inherit",
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`${command} exited with code ${code}`));
    });
  });
}

async function main() {
  await ensureFilesExist();
  await rm(outDir, { recursive: true, force: true });
  await mkdir(stagingDir, { recursive: true });

  for (const relativePath of packageFiles) {
    const source = path.join(rootDir, relativePath);
    const target = path.join(stagingDir, relativePath);
    await run("cp", [source, target], rootDir);
  }

  await run("zip", ["-r", zipPath, "."], stagingDir);
  console.log(`Created ${zipPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
