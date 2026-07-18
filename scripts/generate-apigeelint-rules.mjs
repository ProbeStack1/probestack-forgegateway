// Generates src/data/apigeelintRules.json directly from the installed
// `apigeelint` package's plugin files — not hand-transcribed from the README.
//
// Each apigeelint plugin (lib/package/plugins/XXNNN-*.js) exports a `plugin`
// object with { ruleId, name, message, severity, enabled }, where `ruleId` is
// derived from the plugin's own filename (e.g. "BN001-checkBundleStructure.js"
// -> "BN001"). This script requires every plugin file and reads that metadata
// straight from the library, so the rule catalog stays authoritative as
// apigeelint releases add/change rules.
//
// Run: node scripts/generate-apigeelint-rules.mjs
// Re-run whenever the `apigeelint` devDependency is upgraded.

import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const apigeelintPkgJson = require.resolve("apigeelint/package.json");
const apigeelintVersion = require(apigeelintPkgJson).version;
const apigeelintRoot = path.dirname(apigeelintPkgJson);
const pluginsDir = path.join(apigeelintRoot, "lib/package/plugins");

// Same category grouping the apigeelint README uses for its rule table,
// keyed by the two-letter prefix on each rule id.
const CATEGORY_BY_PREFIX = {
  BN: "Bundle",
  PD: "Proxy Definition",
  TD: "Target Definition",
  FL: "Flow",
  ST: "Step",
  PO: "Policy",
  FR: "FaultRules",
  CC: "Conditional",
  EP: "Endpoints",
  FE: "Features",
  DC: "Deprecation",
};

const pluginFiles = fs
  .readdirSync(pluginsDir)
  .filter((f) => /^[A-Z]{2}\d{3}-.+\.js$/.test(f));

const rules = pluginFiles
  .map((file) => {
    const mod = require(path.join(pluginsDir, file));
    const p = mod?.plugin;
    if (!p?.ruleId) {
      console.warn(`Skipping ${file} — no plugin.ruleId export found.`);
      return null;
    }
    const prefix = p.ruleId.slice(0, 2);

    // apigeelint's `message` is often "<name>: <description>" — the name is
    // already shown separately as ruleName, so drop the redundant prefix.
    let description = String(p.message || "").trim();
    const redundantPrefix = `${p.name}: `;
    if (description.startsWith(redundantPrefix)) {
      description = description.slice(redundantPrefix.length);
    }

    return {
      ruleId: p.ruleId,
      ruleName: p.name,
      ruleDescription: description,
      category: CATEGORY_BY_PREFIX[prefix] || prefix,
      // apigeelint uses ESLint-style severity: 2 = error, 1 = warning.
      severity: p.severity === 2 ? "MANDATORY" : "RECOMMENDED",
      enabled: p.enabled !== false,
      status: "ACTIVE",
    };
  })
  .filter((r) => r && r.enabled) // drop rules apigeelint itself has disabled (e.g. BN004)
  .sort((a, b) => a.ruleId.localeCompare(b.ruleId));

const outPath = path.join(__dirname, "../src/data/apigeelintRules.json");
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(
  outPath,
  JSON.stringify({ apigeelintVersion, generatedAt: new Date().toISOString(), rules }, null, 2) + "\n",
);

console.log(`Wrote ${rules.length} rules from apigeelint@${apigeelintVersion} to ${outPath}`);
