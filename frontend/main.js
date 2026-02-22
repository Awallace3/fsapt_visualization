const statusEl = document.getElementById("status");
const moleculeInput = document.getElementById("moleculeInput");
const fragAInput = document.getElementById("fragAInput");
const fragBInput = document.getElementById("fragBInput");
const tableBody = document.querySelector("#resultsTable tbody");
const heatmapMetricEl = document.getElementById("heatmapMetric");
const focusMonomerEl = document.getElementById("focusMonomer");
const focusFragmentEl = document.getElementById("focusFragment");
const heatmapRangeEl = document.getElementById("heatmapRange");

const viewer = $3Dmol.createViewer("viewer", { backgroundColor: "white" });

let parsedMolecule = null;
let latestComparisonRows = [];
let latestHeatmapMetric = "ml_Total";
let latestRangeMin = null;
let latestRangeMax = null;

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

function updateRangeLabel(minValue = null, maxValue = null) {
  latestRangeMin = minValue;
  latestRangeMax = maxValue;
  if (minValue === null || maxValue === null) {
    heatmapRangeEl.textContent = "Range: n/a";
    return;
  }
  heatmapRangeEl.textContent = `Range: ${minValue.toFixed(4)} to ${maxValue.toFixed(4)} kcal/mol`;
}

function metricLabel(metricKey) {
  const names = {
    ml_Total: "ML Total",
    psi4_Total: "Psi4 Total",
    err_Total: "Error Total",
    Total: "Total (ML-only)",
  };
  return names[metricKey] || metricKey;
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

function uniqueSortedNames(rows, key) {
  return [...new Set(rows.map((row) => row[key]).filter((name) => name && name !== "All"))].sort();
}

function populateFocusFragmentOptions() {
  const side = focusMonomerEl.value;
  const sourceKey = side === "A" ? "Frag1" : "Frag2";
  const names = uniqueSortedNames(latestComparisonRows, sourceKey);

  const previousValue = focusFragmentEl.value;
  focusFragmentEl.innerHTML = "";

  for (const name of names) {
    const opt = document.createElement("option");
    opt.value = name;
    opt.textContent = name;
    focusFragmentEl.appendChild(opt);
  }

  if (names.length === 0) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "No fragments";
    focusFragmentEl.appendChild(opt);
    focusFragmentEl.value = "";
    return;
  }

  if (names.includes(previousValue)) {
    focusFragmentEl.value = previousValue;
  } else {
    focusFragmentEl.value = names[0];
  }
}

function focusedContributions(rows, metricKey, side, focusedFragment) {
  const out = new Map();
  const sourceKey = side === "A" ? "Frag1" : "Frag2";
  const targetKey = side === "A" ? "Frag2" : "Frag1";
  const sourceIndicesKey = side === "A" ? "Frag1_indices" : "Frag2_indices";
  const targetIndicesKey = side === "A" ? "Frag2_indices" : "Frag1_indices";
  let focusIndices = [];

  for (const row of rows) {
    if (row[sourceKey] !== focusedFragment || row[targetKey] === "All") {
      continue;
    }
    if (row[sourceIndicesKey] && row[sourceIndicesKey].length > 0) {
      focusIndices = row[sourceIndicesKey];
    }

    const name = row[targetKey];
    if (!out.has(name)) {
      out.set(name, {
        name,
        indices: row[targetIndicesKey] || [],
        value: 0,
      });
    }
    out.get(name).value += valueForMetric(row, metricKey);
  }

  return {
    targets: Array.from(out.values()),
    focusIndices,
  };
}

function applyHeatmapToStructure(metricKey = latestHeatmapMetric) {
  if (!parsedMolecule || latestComparisonRows.length === 0) {
    updateRangeLabel();
    return;
  }

  const side = focusMonomerEl.value;
  const focusedFragment = focusFragmentEl.value;
  if (!focusedFragment) {
    updateRangeLabel();
    return;
  }

  latestHeatmapMetric = metricKey;
  const heatmapData = focusedContributions(latestComparisonRows, metricKey, side, focusedFragment);
  const groups = heatmapData.targets;

  if (groups.length === 0) {
    drawMolecule(parsedMolecule);
    updateRangeLabel();
    return;
  }

  const values = groups.map((group) => group.value);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const maxAbs = Math.max(Math.abs(minValue), Math.abs(maxValue));
  updateRangeLabel(minValue, maxValue);

  const focusedMonomerSerials =
    side === "A"
      ? parsedMolecule.monomer_a_indices.map((idx) => idx - 1)
      : parsedMolecule.monomer_b_indices.map((idx) => idx - 1);
  const oppositeMonomerSerials =
    side === "A"
      ? parsedMolecule.monomer_b_indices.map((idx) => idx - 1)
      : parsedMolecule.monomer_a_indices.map((idx) => idx - 1);

  viewer.clear();
  viewer.addModel(parsedMolecule.xyz, "xyz");
  viewer.setStyle(
    { serial: focusedMonomerSerials },
    {
      stick: { colorscheme: "Jmol", radius: 0.2, opacity: 0.95 },
      sphere: { colorscheme: "Jmol", radius: 0.28, opacity: 0.95 },
    }
  );
  viewer.addStyle(
    { serial: oppositeMonomerSerials },
    {
      stick: { color: "#d6dccf", radius: 0.16, opacity: 0.2 },
      sphere: { color: "#d6dccf", radius: 0.22, opacity: 0.2 },
    }
  );

  if (heatmapData.focusIndices.length > 0) {
    const focusSerials = heatmapData.focusIndices.map((idx) => idx - 1);
    viewer.addStyle(
      { serial: focusSerials },
      {
        stick: { colorscheme: "Jmol", radius: 0.26, opacity: 1.0 },
        sphere: { colorscheme: "Jmol", radius: 0.34, opacity: 1.0 },
      }
    );
  }

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

function loadImageFromUri(uri) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Unable to load image from canvas."));
    img.src = uri;
  });
}

async function saveCurrentViewPng() {
  try {
    if (latestComparisonRows.length > 0) {
      applyHeatmapToStructure(latestHeatmapMetric);
    }

    const uri = viewer.pngURI();
    const baseImage = await loadImageFromUri(uri);
    const width = baseImage.width;
    const legendHeight = 110;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = baseImage.height + legendHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Canvas context unavailable");
    }

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(baseImage, 0, 0);

    const legendY = baseImage.height + 16;
    const leftPad = 28;
    const rightPad = 28;
    const barX = leftPad;
    const barY = legendY + 28;
    const barWidth = width - leftPad - rightPad;
    const barHeight = 18;

    ctx.fillStyle = "#1d2a2e";
    ctx.font = "600 20px IBM Plex Sans, Segoe UI, sans-serif";
    const metricText = metricLabel(latestHeatmapMetric);
    const focusText = `Focus ${focusMonomerEl.value}: ${focusFragmentEl.value || "n/a"}`;
    ctx.fillText(`${metricText} heatmap`, leftPad, legendY);
    ctx.font = "500 16px IBM Plex Sans, Segoe UI, sans-serif";
    ctx.fillText(focusText, width - rightPad - ctx.measureText(focusText).width, legendY);

    const gradient = ctx.createLinearGradient(barX, 0, barX + barWidth, 0);
    gradient.addColorStop(0, "#2f57b8");
    gradient.addColorStop(0.5, "#dfe6f5");
    gradient.addColorStop(1, "#c94738");
    ctx.fillStyle = gradient;
    ctx.fillRect(barX, barY, barWidth, barHeight);
    ctx.strokeStyle = "#b8c0c6";
    ctx.strokeRect(barX, barY, barWidth, barHeight);

    ctx.fillStyle = "#1d2a2e";
    ctx.font = "500 14px IBM Plex Sans, Segoe UI, sans-serif";
    if (latestRangeMin !== null && latestRangeMax !== null) {
      ctx.fillText(`${latestRangeMin.toFixed(4)} kcal/mol`, barX, barY + 38);
      const maxLabel = `${latestRangeMax.toFixed(4)} kcal/mol`;
      ctx.fillText(maxLabel, barX + barWidth - ctx.measureText(maxLabel).width, barY + 38);
    } else {
      ctx.fillText("Range: n/a", barX, barY + 38);
    }

    const finalUri = canvas.toDataURL("image/png");
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const anchor = document.createElement("a");
    anchor.href = finalUri;
    anchor.download = `fsapt_heatmap_${stamp}.png`;
    anchor.click();
    setStatus("Saved molecular view PNG with heatmap legend.", "ok");
  } catch (err) {
    setStatus(`Could not save PNG: ${err.message}`, "error");
  }
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
  populateFocusFragmentOptions();
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
  populateFocusFragmentOptions();
  drawMolecule(data);
  updateRangeLabel();
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

document.getElementById("savePngBtn").addEventListener("click", () => {
  saveCurrentViewPng();
});

focusMonomerEl.addEventListener("change", () => {
  populateFocusFragmentOptions();
  applyHeatmapToStructure(latestHeatmapMetric);
});

focusFragmentEl.addEventListener("change", () => {
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
