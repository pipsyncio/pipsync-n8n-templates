import { readFile, readdir } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const workflowsDirectory = resolve(repositoryRoot, "workflows");

const allowedNodeTypes = new Set([
  "n8n-nodes-base.code",
  "n8n-nodes-base.httpRequest",
  "n8n-nodes-base.if",
  "n8n-nodes-base.manualTrigger",
  "n8n-nodes-base.merge",
  "n8n-nodes-base.respondToWebhook",
  "n8n-nodes-base.scheduleTrigger",
  "n8n-nodes-base.set",
  "n8n-nodes-base.slack",
  "n8n-nodes-base.stickyNote",
  "n8n-nodes-base.telegram",
  "n8n-nodes-base.webhook",
]);

const documentedReadOnlyPaths = new Set([
  "/health",
  "/signals",
  "/account/usage",
  "/reports",
]);

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function findProperty(value, propertyName) {
  if (!value || typeof value !== "object") return false;
  if (Object.prototype.hasOwnProperty.call(value, propertyName)) return true;
  return Object.values(value).some((child) => findProperty(child, propertyName));
}

function assignmentValue(workflow, nodeName, assignmentName) {
  const node = workflow.nodes.find((candidate) => candidate.name === nodeName);
  const assignments = node?.parameters?.assignments?.assignments;
  const assignment = Array.isArray(assignments)
    ? assignments.find((candidate) => candidate.name === assignmentName)
    : undefined;
  return assignment?.value;
}

function pathFromUrlExpression(url) {
  if (typeof url !== "string") return null;
  return [...documentedReadOnlyPaths]
    .sort((left, right) => right.length - left.length)
    .find((path) => url.endsWith(path)) ?? null;
}

export function validateWorkflow(workflow, fileName) {
  assert(workflow && typeof workflow === "object" && !Array.isArray(workflow), `${fileName}: expected an object`);
  assert(typeof workflow.name === "string" && workflow.name.startsWith("PipSync "), `${fileName}: invalid workflow name`);
  assert(workflow.active === false, `${fileName}: workflow must be inactive`);
  assert(workflow.settings?.executionOrder === "v1", `${fileName}: executionOrder must be v1`);
  assert(workflow.pinData && Object.keys(workflow.pinData).length === 0, `${fileName}: pinData must be empty`);
  assert(Array.isArray(workflow.tags) && workflow.tags.length === 0, `${fileName}: tags must be empty`);
  assert(uuidPattern.test(workflow.versionId), `${fileName}: versionId must be a UUID v4`);
  assert(Array.isArray(workflow.nodes) && workflow.nodes.length >= 3, `${fileName}: expected at least three nodes`);
  assert(workflow.connections && typeof workflow.connections === "object", `${fileName}: connections missing`);
  assert(!findProperty(workflow, "credentials"), `${fileName}: embedded credential reference found`);

  const nodeNames = new Set();
  const nodeIds = new Set();
  for (const node of workflow.nodes) {
    assert(typeof node.name === "string" && node.name.length > 0, `${fileName}: unnamed node`);
    assert(!nodeNames.has(node.name), `${fileName}: duplicate node name ${node.name}`);
    nodeNames.add(node.name);
    assert(uuidPattern.test(node.id), `${fileName}: node ${node.name} has an invalid UUID v4`);
    assert(!nodeIds.has(node.id), `${fileName}: duplicate node id ${node.id}`);
    nodeIds.add(node.id);
    assert(allowedNodeTypes.has(node.type), `${fileName}: ${node.name} is not a built-in allowlisted node`);
    assert(Number.isFinite(node.typeVersion), `${fileName}: ${node.name} has no numeric typeVersion`);
    assert(Array.isArray(node.position) && node.position.length === 2, `${fileName}: ${node.name} has no canvas position`);

    if (node.type === "n8n-nodes-base.httpRequest") {
      assert(node.disabled === true, `${fileName}: remote request ${node.name} must ship disabled`);
      assert((node.parameters.method ?? "GET") === "GET", `${fileName}: ${node.name} must use GET`);
      assert(node.parameters.sendBody !== true, `${fileName}: ${node.name} must not send a body`);
      const path = pathFromUrlExpression(node.parameters.url);
      assert(path && documentedReadOnlyPaths.has(path), `${fileName}: ${node.name} uses an undocumented path`);
      assert(node.parameters.headerParameters?.parameters?.every((header) => header.name === "Accept"), `${fileName}: ${node.name} may only define an Accept header`);
      if (path === "/health") {
        assert(!node.parameters.authentication || node.parameters.authentication === "none", `${fileName}: health must not embed auth`);
      } else {
        assert(node.parameters.authentication === "genericCredentialType", `${fileName}: ${node.name} must use an external generic credential`);
        assert(node.parameters.genericAuthType === "httpHeaderAuth", `${fileName}: ${node.name} must use Header Auth`);
      }
    }

    if (node.type === "n8n-nodes-base.slack" || node.type === "n8n-nodes-base.telegram") {
      assert(node.disabled === true, `${fileName}: notification node ${node.name} must ship disabled`);
    }
  }

  for (const [sourceName, groups] of Object.entries(workflow.connections)) {
    assert(nodeNames.has(sourceName), `${fileName}: connection source ${sourceName} does not exist`);
    assert(groups && typeof groups === "object", `${fileName}: invalid connection group for ${sourceName}`);
    for (const outputs of Object.values(groups)) {
      assert(Array.isArray(outputs), `${fileName}: invalid outputs for ${sourceName}`);
      for (const output of outputs) {
        assert(Array.isArray(output), `${fileName}: invalid output branch for ${sourceName}`);
        for (const connection of output) {
          assert(nodeNames.has(connection.node), `${fileName}: connection target ${connection.node} does not exist`);
          assert(connection.type === "main", `${fileName}: only main connections are expected`);
          assert(Number.isInteger(connection.index) && connection.index >= 0, `${fileName}: invalid target index`);
        }
      }
    }
  }

  if (fileName.startsWith("01-")) {
    assert(!workflow.nodes.some((node) => node.type === "n8n-nodes-base.httpRequest"), `${fileName}: validator must not call a remote service`);
    const validator = workflow.nodes.find((node) => node.name === "Normalize and Validate Paper Only");
    const code = validator?.parameters?.jsCode ?? "";
    assert(code.includes("LIVE_MODE_REJECTED"), `${fileName}: explicit live rejection is missing`);
    assert(code.includes("durableReplayProtection: 'not implemented'"), `${fileName}: replay limitation is missing`);
    assert(code.includes("execution: 'disabled'"), `${fileName}: execution-disabled result is missing`);
  }

  if (fileName.startsWith("02-")) {
    assert(assignmentValue(workflow, "Configuration", "useSyntheticData") === true, `${fileName}: synthetic mode must be the default`);
    const paths = workflow.nodes
      .filter((node) => node.type === "n8n-nodes-base.httpRequest")
      .map((node) => pathFromUrlExpression(node.parameters.url));
    assert(paths.length === 1 && paths[0] === "/signals", `${fileName}: expected only GET /signals`);
  }

  if (fileName.startsWith("03-")) {
    assert(assignmentValue(workflow, "Monitor Configuration", "useSyntheticData") === true, `${fileName}: synthetic mode must be the default`);
    const paths = new Set(workflow.nodes
      .filter((node) => node.type === "n8n-nodes-base.httpRequest")
      .map((node) => pathFromUrlExpression(node.parameters.url)));
    assert(paths.size === 3 && paths.has("/health") && paths.has("/account/usage") && paths.has("/reports"), `${fileName}: monitor paths drifted from the public contract`);
  }
}

export async function validateRepository(root = repositoryRoot) {
  const directory = resolve(root, "workflows");
  const fileNames = (await readdir(directory))
    .filter((fileName) => fileName.endsWith(".json"))
    .sort();
  assert(fileNames.length === 3, `expected exactly three workflow exports, found ${fileNames.length}`);

  for (const fileName of fileNames) {
    const path = resolve(directory, fileName);
    const source = await readFile(path, "utf8");
    const workflow = JSON.parse(source);
    validateWorkflow(workflow, basename(path));
    assert(source === `${JSON.stringify(workflow, null, 2)}\n`, `${fileName}: JSON formatting is not deterministic`);
  }

  return fileNames;
}

const invokedDirectly = process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (invokedDirectly) {
  const files = await validateRepository();
  console.log(`Validated ${files.length} inactive, credential-free n8n workflows.`);
}
