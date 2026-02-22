const statusEl = document.getElementById("status");
const moleculeInput = document.getElementById("moleculeInput");
const fragAInput = document.getElementById("fragAInput");
const fragBInput = document.getElementById("fragBInput");
const tableBody = document.querySelector("#resultsTable tbody");
const heatmapMetricEl = document.getElementById("heatmapMetric");

const viewer = $3Dmol.createViewer("viewer", { backgroundColor: "white" });

let parsedMolecule = null;
let latestComparisonRows = [];
let latestHeatmapMetric = "ml_Total";

function setStatus(message, kind = "") {
  statusEl.textContent = message;
  statusEl.classList.remove("error", "ok");
  if (kind) {
    statusEl.classList.add(kind);
  }
}

function formatFragmentText(fragmentMap) {
  return Object.entries(fragmentMap)
    .map(([name, indices]) => `${name}: ${indices.join(",")}`)
    .join("\n");
}

function parseFragmentText(text) {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const out = {};
  for (const line of lines) {
    const splitAt = line.indexOf(":");
    if (splitAt === -1) {
      throw new Error(`Invalid fragment line '${line}'. Expected Name: indices`);
    }
    const name = line.slice(0, splitAt).trim();
    const rhs = line.slice(splitAt + 1).trim();
    if (!name || !rhs) {
      throw new Error(`Invalid fragment line '${line}'.`);
    }
    out[name] = rhs;
  }

  return out;
}

function getPayload() {
  return {
    molecule: moleculeInput.value,
    fragments_a: parseFragmentText(fragAInput.value),
    fragments_b: parseFragmentText(fragBInput.value),
  };
}

async function callJson(url, method = "GET", body = null) {
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : null,
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || `Request failed: ${res.status}`);
  }
  return data;
}

function drawMolecule(parsed) {
  if (!parsed || !parsed.xyz) {
    return;
  }

  parsedMolecule = parsed;
  viewer.clear();
  viewer.addModel(parsed.xyz, "xyz");

  const monomerA = parsed.monomer_a_indices.map((idx) => idx - 1);
  const monomerB = parsed.monomer_b_indices.map((idx) => idx - 1);

  viewer.setStyle(
    { serial: monomerA },
    { stick: { colorscheme: "greenCarbon", radius: 0.19 }, sphere: { radius: 0.28 } }
  );
  viewer.addStyle(
    { serial: monomerB },
    { stick: { colorscheme: "cyanCarbon", radius: 0.19 }, sphere: { radius: 0.28 } }
  );
  viewer.zoomTo();
  viewer.render();
}

function colorFromBlueWhiteRed(value, maxAbs) {
  if (!maxAbs || maxAbs < 1e-8) {
    return "#dfe6f5";
  }

  const t = Math.max(-1, Math.min(1, value / maxAbs));
  const neg = [47, 87, 184];
  const mid = [224, 230, 245];
  const pos = [201, 71, 56];

  const blend = (a, b, x) => Math.round(a + (b - a) * x);

  let r;
  let g;
  let b;
  if (t < 0) {
    const x = t + 1;
    r = blend(neg[0], mid[0], x);
    g = blend(neg[1], mid[1], x);
    b = blend(neg[2], mid[2], x);
  } else {
    r = blend(mid[0], pos[0], t);
    g = blend(mid[1], pos[1], t);
    b = blend(mid[2], pos[2], t);
  }
  return `rgb(${r}, ${g}, ${b})`;
}

function valueForMetric(row, metricKey) {
  if (typeof row[metricKey] === "number") {
    return row[metricKey];
  }

  if (metricKey === "ml_Total") {
    return typeof row.Total === "number" ? row.Total : 0;
  }

  if (metricKey === "Total") {
    return typeof row.Total === "number" ? row.Total : 0;
  }

  return 0;
}

function aggregateFragmentContributions(rows, metricKey) {
  const byFragment = new Map();

  const add = (name, indices, value) => {
    if (!name || name === "All" || !indices || indices.length === 0) {
      return;
    }
    if (!byFragment.has(name)) {
      byFragment.set(name, { name, indices: [...indices], value: 0 });
    }
    byFragment.get(name).value += value;
  };

  for (const row of rows) {
    const energy = valueForMetric(row, metricKey);
    add(row.Frag1, row.Frag1_indices, energy);
    add(row.Frag2, row.Frag2_indices, energy);
  }

  return Array.from(byFragment.values());
}

function applyHeatmapToStructure(metricKey = latestHeatmapMetric) {
  if (!parsedMolecule || latestComparisonRows.length === 0) {
    return;
  }

  latestHeatmapMetric = metricKey;
  const groups = aggregateFragmentContributions(latestComparisonRows, metricKey);
  const maxAbs = groups.reduce((acc, group) => Math.max(acc, Math.abs(group.value)), 0);

  viewer.clear();
  viewer.addModel(parsedMolecule.xyz, "xyz");
  viewer.setStyle({}, { stick: { color: "#d6dccf", radius: 0.16, opacity: 0.35 } });

  for (const group of groups) {
    const color = colorFromBlueWhiteRed(group.value, maxAbs);
    const serials = group.indices.map((idx) => idx - 1);
    viewer.addStyle(
      { serial: serials },
      { stick: { color, radius: 0.23 }, sphere: { color, radius: 0.34 } }
    );
  }

  viewer.zoomTo();
  viewer.render();
}

function highlightPair(row) {
  if (!parsedMolecule) {
    return;
  }

  if (latestComparisonRows.length > 0) {
    applyHeatmapToStructure(latestHeatmapMetric);
  } else {
    drawMolecule(parsedMolecule);
  }

  const pairA = (row.Frag1_indices || []).map((i) => i - 1);
  const pairB = (row.Frag2_indices || []).map((i) => i - 1);

  viewer.addStyle(
    { serial: pairA },
    {
      stick: { radius: 0.29, color: "#9f3f20" },
      sphere: { radius: 0.4, color: "#9f3f20" },
    }
  );
  viewer.addStyle(
    { serial: pairB },
    {
      stick: { radius: 0.29, color: "#2f3f8f" },
      sphere: { radius: 0.4, color: "#2f3f8f" },
    }
  );

  viewer.zoomTo({ serial: [...pairA, ...pairB] });
  viewer.render();
}

function errorShade(absErr) {
  const bounded = Math.min(2.5, absErr);
  const strength = bounded / 2.5;
  const red = Math.round(255 - 35 * strength);
  const green = Math.round(255 - 140 * strength);
  const blue = Math.round(255 - 165 * strength);
  return `rgb(${red}, ${green}, ${blue})`;
}

function renderTable(rows) {
  latestComparisonRows = rows;
  tableBody.innerHTML = "";

  for (const row of rows) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${row.Frag1}</td>
      <td>${row.Frag2}</td>
      <td>${row.ml_Total.toFixed(4)}</td>
      <td>${row.psi4_Total.toFixed(4)}</td>
      <td>${row.err_Total.toFixed(4)}</td>
      <td>${row.abs_err_Total.toFixed(4)}</td>
    `;
    tr.style.backgroundColor = errorShade(row.abs_err_Total);
    tr.addEventListener("click", () => {
      for (const old of tableBody.querySelectorAll("tr")) {
        old.classList.remove("active");
      }
      tr.classList.add("active");
      highlightPair(row);
    });
    tableBody.appendChild(tr);
  }

  applyHeatmapToStructure(heatmapMetricEl.value || latestHeatmapMetric);
}

async function loadExample() {
  setStatus("Loading AP3 example...");
  const data = await callJson("/api/example/ap3-fused");
  moleculeInput.value = data.molecule;
  fragAInput.value = formatFragmentText(data.fragments_a);
  fragBInput.value = formatFragmentText(data.fragments_b);
  drawMolecule(data.parsed);
  setStatus("Example loaded.", "ok");
}

async function runParse() {
  setStatus("Parsing molecule...");
  const payload = { molecule: moleculeInput.value };
  const data = await callJson("/api/parse-molecule", "POST", payload);
  latestComparisonRows = [];
  drawMolecule(data);
  setStatus("Molecule parsed.", "ok");
}

async function runMl() {
  setStatus("Running ML FSAPT prediction...");
  const payload = getPayload();
  const data = await callJson("/api/predict/ml-fsapt", "POST", payload);
  drawMolecule(data.parsed);

  const comparisonLike = data.rows.map((row) => ({
    ...row,
    ml_Total: row.Total,
    psi4_Total: 0,
    err_Total: row.Total,
    abs_err_Total: Math.abs(row.Total),
  }));

  renderTable(comparisonLike);
  setStatus("ML prediction complete. Psi4 columns set to 0 until comparison run.", "ok");
}

async function runCompare() {
  setStatus("Running ML + Psi4 comparison...");
  const payload = { ...getPayload(), run_psi4: true };
  const data = await callJson("/api/compare", "POST", payload);
  renderTable(data.comparison_rows);
  setStatus("Comparison complete.", "ok");
}

document.getElementById("loadExampleBtn").addEventListener("click", async () => {
  try {
    await loadExample();
  } catch (err) {
    setStatus(err.message, "error");
  }
});

document.getElementById("parseBtn").addEventListener("click", async () => {
  try {
    await runParse();
  } catch (err) {
    setStatus(err.message, "error");
  }
});

document.getElementById("runMlBtn").addEventListener("click", async () => {
  try {
    await runMl();
  } catch (err) {
    setStatus(err.message, "error");
  }
});

document.getElementById("runCompareBtn").addEventListener("click", async () => {
  try {
    await runCompare();
  } catch (err) {
    setStatus(err.message, "error");
  }
});

document.getElementById("applyHeatmapBtn").addEventListener("click", () => {
  latestHeatmapMetric = heatmapMetricEl.value;
  applyHeatmapToStructure(latestHeatmapMetric);
});

heatmapMetricEl.addEventListener("change", () => {
  latestHeatmapMetric = heatmapMetricEl.value;
  applyHeatmapToStructure(latestHeatmapMetric);
});

window.addEventListener("resize", () => {
  viewer.resize();
  if (parsedMolecule) {
    if (latestComparisonRows.length > 0) {
      applyHeatmapToStructure(latestHeatmapMetric);
    } else {
      drawMolecule(parsedMolecule);
    }
  }
});

loadExample().catch((err) => setStatus(err.message, "error"));
