import assert from "node:assert/strict";
import { access, readFile, readdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { validateRepository, validateWorkflow } from "../scripts/validate-workflows.mjs";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

async function loadWorkflow(prefix) {
  const fileName = (await readdir(resolve(repositoryRoot, "workflows")))
    .find((candidate) => candidate.startsWith(prefix));
  assert.ok(fileName, `workflow ${prefix} not found`);
  const source = await readFile(resolve(repositoryRoot, "workflows", fileName), "utf8");
  return { fileName, workflow: JSON.parse(source) };
}

test("repository contains three valid deterministic workflow exports", async () => {
  assert.deepEqual(await validateRepository(repositoryRoot), [
    "01-tradingview-paper-signal-validator.json",
    "02-read-only-signals-to-chat.json",
    "03-read-only-usage-health-report-alert.json",
  ]);
});

test("paper validator accepts a bounded paper fixture and rejects live", async () => {
  const { fileName, workflow } = await loadWorkflow("01-");
  validateWorkflow(workflow, fileName);
  const code = workflow.nodes.find((node) => node.name === "Normalize and Validate Paper Only").parameters.jsCode;
  const run = new Function("$json", code);
  const validPayload = {
    body: {
      schema: "pipsync.tradingview.paper-signal.v1",
      environment: "paper",
      signal_id: "synthetic-0001",
      instrument: "EURUSD",
      direction: "BUY",
      entry_price: 1.085,
      stop_loss: 1.082,
      take_profit: 1.09,
      created_at: "2026-01-15T10:00:00.000Z",
    },
  };

  const accepted = run(validPayload)[0].json;
  assert.equal(accepted.httpStatus, 200);
  assert.equal(accepted.body.accepted, true);
  assert.equal(accepted.body.execution, "disabled");

  const livePayload = structuredClone(validPayload);
  livePayload.body.environment = "live";
  const rejected = run(livePayload)[0].json;
  assert.equal(rejected.httpStatus, 403);
  assert.equal(rejected.body.accepted, false);
  assert.ok(rejected.body.errors.some((error) => error.code === "LIVE_MODE_REJECTED"));
  assert.equal(rejected.body.limitations.durableReplayProtection, "not implemented");
});

test("paper validator rejects unknown fields and invalid risk geometry", async () => {
  const { workflow } = await loadWorkflow("01-");
  const code = workflow.nodes.find((node) => node.name === "Normalize and Validate Paper Only").parameters.jsCode;
  const run = new Function("$json", code);
  const result = run({
    body: {
      schema: "pipsync.tradingview.paper-signal.v1",
      environment: "sandbox",
      signal_id: "synthetic-0002",
      instrument: "EURUSD",
      direction: "BUY",
      entry_price: 1.085,
      stop_loss: 1.09,
      take_profit: 1.08,
      created_at: "2026-01-15T10:00:00.000Z",
      broker_password: "redacted-placeholder",
    },
  })[0].json;

  assert.equal(result.httpStatus, 400);
  assert.equal(result.body.accepted, false);
  assert.ok(result.body.errors.some((error) => error.code === "UNKNOWN_FIELD"));
  assert.ok(result.body.errors.some((error) => error.code === "INVALID_STOP_GEOMETRY"));
  assert.ok(result.body.errors.some((error) => error.code === "INVALID_TARGET_GEOMETRY"));
  assert.equal(JSON.stringify(result).includes("redacted-placeholder"), false);
});

test("signal summary omits identifiers, prices, channels, and providers", async () => {
  const { workflow } = await loadWorkflow("02-");
  const fixtureCode = workflow.nodes.find((node) => node.name === "Synthetic Signals Fixture").parameters.jsCode;
  const summaryCode = workflow.nodes.find((node) => node.name === "Build Redacted Summary").parameters.jsCode;
  const fixture = new Function(fixtureCode)()[0].json;
  const summary = new Function("$json", summaryCode)(fixture)[0].json;

  assert.equal(summary.ok, true);
  assert.equal(summary.count, 2);
  assert.deepEqual(summary.instruments, ["EURUSD", "GBPUSD"]);
  assert.equal(JSON.stringify(summary).includes("11111111-1111"), false);
  assert.equal(JSON.stringify(summary).includes("1.0850"), false);
  assert.equal(JSON.stringify(summary).includes("Synthetic Demo Channel"), false);
  assert.equal(summary.notification.previewOnly, true);
});

test("monitor uses only the documented health, usage, and report catalog GETs", async () => {
  const { workflow } = await loadWorkflow("03-");
  const requestNodes = workflow.nodes.filter((node) => node.type === "n8n-nodes-base.httpRequest");
  assert.equal(requestNodes.length, 3);
  assert.ok(requestNodes.every((node) => node.disabled === true && node.parameters.method === "GET"));
  assert.deepEqual(requestNodes.map((node) => node.parameters.url).sort(), [
    "={{ $('Monitor Configuration').first().json.apiBaseUrl }}/account/usage",
    "={{ $('Monitor Configuration').first().json.apiBaseUrl }}/health",
    "={{ $('Monitor Configuration').first().json.apiBaseUrl }}/reports",
  ]);
});

test("fixtures remain synthetic and valid JSON", async () => {
  const fixtureDirectory = resolve(repositoryRoot, "fixtures");
  const names = (await readdir(fixtureDirectory)).filter((name) => name.endsWith(".json")).sort();
  assert.deepEqual(names, [
    "signals-response.json",
    "tradingview-paper-signal.json",
    "usage-health-reports.json",
  ]);
  for (const name of names) {
    const value = JSON.parse(await readFile(resolve(fixtureDirectory, name), "utf8"));
    assert.equal(JSON.stringify(value).includes("pipsync_live_"), false);
  }
  const paper = JSON.parse(await readFile(resolve(fixtureDirectory, "tradingview-paper-signal.json"), "utf8"));
  assert.equal(paper.environment, "paper");
  assert.match(paper.signal_id, /^synthetic-/);
});

test("local Markdown links resolve to repository files", async () => {
  const markdownFiles = [
    "README.md",
    "CONTRIBUTING.md",
    "SECURITY.md",
    "CODE_OF_CONDUCT.md",
    "CHANGELOG.md",
    "docs/import-and-setup.md",
    "docs/security-boundaries.md",
    "docs/verification.md",
  ];
  const markdownLink = /\[[^\]]*\]\(([^)]+)\)/g;

  for (const relativeName of markdownFiles) {
    const sourcePath = resolve(repositoryRoot, relativeName);
    const source = await readFile(sourcePath, "utf8");
    for (const match of source.matchAll(markdownLink)) {
      const target = match[1].split("#", 1)[0];
      if (!target || /^(?:https?:|mailto:)/.test(target)) continue;
      await access(resolve(dirname(sourcePath), decodeURIComponent(target)));
    }
  }
});

test("SVG flow diagrams are accessible and self-contained", async () => {
  const screenshotDirectory = resolve(repositoryRoot, "screenshots");
  const names = (await readdir(screenshotDirectory)).filter((name) => name.endsWith(".svg")).sort();
  assert.equal(names.length, 3);
  for (const name of names) {
    const source = await readFile(resolve(screenshotDirectory, name), "utf8");
    assert.match(source, /^<svg /);
    assert.match(source, /<title id="title">/);
    assert.match(source, /<desc id="desc">/);
    assert.doesNotMatch(source, /(?:href|src)="https?:/);
  }
});
