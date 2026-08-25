import { readFile, readdir } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const selfPath = resolve(fileURLToPath(import.meta.url));
const ignoredDirectories = new Set([".git", "node_modules", "coverage"]);

const detectors = [
  ["PipSync live API key", /pipsync_live_[A-Za-z0-9]{32}\b/g],
  ["Slack incoming webhook", /https:\/\/hooks\.slack\.com\/services\/[A-Za-z0-9/_-]{20,}/g],
  ["Telegram bot token", /\b\d{7,12}:[A-Za-z0-9_-]{30,}\b/g],
  ["GitHub token", /\bgh[pousr]_[A-Za-z0-9]{20,}\b/g],
  ["AWS access key", /\bAKIA[0-9A-Z]{16}\b/g],
  ["private key", /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g],
  ["literal bearer token", /Authorization["']?\s*[:=]\s*["']Bearer\s+[A-Za-z0-9._-]{16,}/gi],
  ["exported n8n credentials", /"credentials"\s*:/g],
];

async function filesUnder(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const paths = [];
  for (const entry of entries) {
    if (ignoredDirectories.has(entry.name)) continue;
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) paths.push(...await filesUnder(path));
    else if (entry.isFile() && path !== selfPath) paths.push(path);
  }
  return paths;
}

const findings = [];
for (const path of await filesUnder(repositoryRoot)) {
  const content = await readFile(path, "utf8");
  for (const [label, detector] of detectors) {
    detector.lastIndex = 0;
    if (detector.test(content)) findings.push(`${relative(repositoryRoot, path)}: ${label}`);
  }
}

if (findings.length > 0) {
  throw new Error(`Potential secrets found:\n${findings.join("\n")}`);
}

console.log("Secret scan passed: no credential material detected.");
