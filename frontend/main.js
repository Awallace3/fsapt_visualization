const statusEl = document.getElementById("status");
const moleculeInput = document.getElementById("moleculeInput");
const fragAInput = document.getElementById("fragAInput");
const fragBInput = document.getElementById("fragBInput");
const tableBody = document.querySelector("#resultsTable tbody");
const heatmapComponentEl = document.getElementById("heatmapComponent");
const focusMonomerEl = document.getElementById("focusMonomer");
const focusFragmentEl = document.getElementById("focusFragment");
const heatmapRangeEl = document.getElementById("heatmapRange");
const heatmapMinEl = document.getElementById("heatmapMin");
const heatmapMaxEl = document.getElementById("heatmapMax");
const toggleSourceBtn = document.getElementById("toggleSourceBtn");
const colTotalEl = document.getElementById("colTotal");
const colElstEl = document.getElementById("colElst");
const colExchEl = document.getElementById("colExch");
const colIndEl = document.getElementById("colInd");
const colDispEl = document.getElementById("colDisp");
const uploadFsaptInput = document.getElementById("uploadFsaptInput");
const resetHeatmapRangeBtn = document.getElementById("resetHeatmapRangeBtn");

const viewer = $3Dmol.createViewer("viewer", { backgroundColor: "white" });

let parsedMolecule = null;
let latestComparisonRows = [];
let tableSource = "ml";
let latestHeatmapComponent = "Total";
let latestRangeMin = null;
let latestRangeMax = null;
let latestDefaultBoundsByComponent = {};

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

async function uploadZip(url, file) {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(url, {
    method: "POST",
    body: formData,
  });

  const data = await res.json();
  if (!res.ok) {
    const details = Array.isArray(data.details) ? ` (${data.details.join("; ")})` : "";
    throw new Error((data.error || `Upload failed: ${res.status}`) + details);
  }
  return data;
}

async function validateFsaptZip(file) {
  return uploadZip("/api/upload/psi4-fsapt-zip/validate", file);
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

function componentLabel(componentKey) {
  const names = {
    Total: "Total",
    Elst: "Elst",
    Exch: "Exch",
    Ind: "Ind",
    Disp: "Disp",
  };
  return names[componentKey] || componentKey;
}

function sourceLabel(source) {
  return source === "psi4" ? "Psi4" : "ML";
}

function updateTableHeaderLabels() {
  const prefix = sourceLabel(tableSource);
  colTotalEl.textContent = `${prefix} Total`;
  colElstEl.textContent = `${prefix} Elst`;
  colExchEl.textContent = `${prefix} Exch`;
  colIndEl.textContent = `${prefix} Ind`;
  colDispEl.textContent = `${prefix} Disp`;
  toggleSourceBtn.textContent = `Showing: ${prefix}`;
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

function colorFromBlueWhiteRedBounded(value, minBound, maxBound) {
  const safeMin = Number.isFinite(minBound) ? minBound : -1;
  const safeMax = Number.isFinite(maxBound) ? maxBound : 1;
  const minClamped = Math.min(safeMin, safeMax - 1e-8);
  const maxClamped = Math.max(safeMax, minClamped + 1e-8);
  const clipped = Math.max(minClamped, Math.min(maxClamped, value));

  const neg = [47, 87, 184];
  const mid = [224, 230, 245];
  const pos = [201, 71, 56];
  const blend = (a, b, x) => Math.round(a + (b - a) * x);

  if (clipped >= 0) {
    const t = maxClamped <= 0 ? 0 : Math.min(1, clipped / maxClamped);
    const r = blend(mid[0], pos[0], t);
    const g = blend(mid[1], pos[1], t);
    const b = blend(mid[2], pos[2], t);
    return `rgb(${r}, ${g}, ${b})`;
  }

  const t = minClamped >= 0 ? 0 : Math.min(1, clipped / minClamped);
  const r = blend(mid[0], neg[0], t);
  const g = blend(mid[1], neg[1], t);
  const b = blend(mid[2], neg[2], t);
  return `rgb(${r}, ${g}, ${b})`;
}

function setBoundaryInputs(minValue, maxValue) {
  heatmapMinEl.value = Number.isFinite(minValue) ? minValue.toFixed(4) : "";
  heatmapMaxEl.value = Number.isFinite(maxValue) ? maxValue.toFixed(4) : "";
}

function sanitizeBounds(minValue, maxValue, fallbackMin, fallbackMax) {
  let minBound = Number.isFinite(minValue) ? minValue : fallbackMin;
  let maxBound = Number.isFinite(maxValue) ? maxValue : fallbackMax;

  if (minBound >= maxBound) {
    minBound = fallbackMin;
    maxBound = fallbackMax;
  }

  if (minBound >= maxBound) {
    minBound = -1;
    maxBound = 1;
  }

  return { minBound, maxBound };
}

function getActiveBounds(componentKey) {
  const defaults = latestDefaultBoundsByComponent[componentKey] || { min: -1, max: 1 };
  const minInput = Number.parseFloat(heatmapMinEl.value);
  const maxInput = Number.parseFloat(heatmapMaxEl.value);
  const { minBound, maxBound } = sanitizeBounds(minInput, maxInput, defaults.min, defaults.max);
  return { minBound, maxBound };
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

function focusedContributions(rows, componentKey, side, focusedFragment, source) {
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
    out.get(name).value += componentValue(row, source, componentKey);
  }

  return {
    targets: Array.from(out.values()),
    focusIndices,
  };
}

function applyHeatmapToStructure(componentKey = latestHeatmapComponent, options = {}) {
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

  latestHeatmapComponent = componentKey;
  const heatmapData = focusedContributions(
    latestComparisonRows,
    componentKey,
    side,
    focusedFragment,
    tableSource
  );
  const groups = heatmapData.targets;

  if (groups.length === 0) {
    drawMolecule(parsedMolecule);
    updateRangeLabel();
    return;
  }

  const values = groups.map((group) => group.value);
  const maxAbs = Math.max(...values.map((value) => Math.abs(value)));
  const defaultMin = -maxAbs;
  const defaultMax = maxAbs;
  latestDefaultBoundsByComponent[componentKey] = { min: defaultMin, max: defaultMax };

  const hasMin = Number.isFinite(Number.parseFloat(heatmapMinEl.value));
  const hasMax = Number.isFinite(Number.parseFloat(heatmapMaxEl.value));
  if (options.resetBounds || !hasMin || !hasMax) {
    setBoundaryInputs(defaultMin, defaultMax);
  }

  const { minBound, maxBound } = getActiveBounds(componentKey);
  setBoundaryInputs(minBound, maxBound);
  updateRangeLabel(minBound, maxBound);

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
    const color = colorFromBlueWhiteRedBounded(group.value, minBound, maxBound);
    const serials = group.indices.map((idx) => idx - 1);
    viewer.addStyle(
      { serial: serials },
      { stick: { color, radius: 0.23 }, sphere: { color, radius: 0.34 } }
    );
  }

  if (focusedMonomerSerials.length > 0) {
    viewer.zoomTo({ serial: focusedMonomerSerials });
  } else {
    viewer.zoomTo();
  }
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
      applyHeatmapToStructure(latestHeatmapComponent);
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
    const metricText = `${sourceLabel(tableSource)} ${componentLabel(latestHeatmapComponent)}`;
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
    applyHeatmapToStructure(latestHeatmapComponent);
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

function rowShadeFromTotal(total, minBound, maxBound) {
  const base = colorFromBlueWhiteRedBounded(total, minBound, maxBound);
  const match = base.match(/\d+/g);
  if (!match || match.length < 3) {
    return "#ffffff";
  }
  const [r, g, b] = match.map((x) => Number.parseInt(x, 10));
  const mix = 0.82;
  const rr = Math.round(255 * mix + r * (1 - mix));
  const gg = Math.round(255 * mix + g * (1 - mix));
  const bb = Math.round(255 * mix + b * (1 - mix));
  return `rgb(${rr}, ${gg}, ${bb})`;
}

function valueOrZero(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function componentValue(row, source, component) {
  if (source === "ml") {
    if (component === "Ind") {
      return valueOrZero(row.ml_IndAB) + valueOrZero(row.ml_IndBA);
    }
    return valueOrZero(row[`ml_${component}`]);
  }

  if (component === "Ind") {
    return valueOrZero(row.psi4_IndAB) + valueOrZero(row.psi4_IndBA);
  }
  return valueOrZero(row[`psi4_${component}`]);
}

function renderTable(rows) {
  latestComparisonRows = rows;
  updateTableHeaderLabels();
  populateFocusFragmentOptions();
  tableBody.innerHTML = "";

  const sortedRows = [...rows].sort((a, b) => {
    const absA = Math.abs(componentValue(a, tableSource, "Total"));
    const absB = Math.abs(componentValue(b, tableSource, "Total"));
    return absB - absA;
  });

  const maxAbsTotal = Math.max(
    1e-8,
    ...sortedRows.map((row) => Math.abs(componentValue(row, tableSource, "Total")))
  );
  const fallbackMin = -maxAbsTotal;
  const fallbackMax = maxAbsTotal;
  const minInput = Number.parseFloat(heatmapMinEl.value);
  const maxInput = Number.parseFloat(heatmapMaxEl.value);
  const { minBound, maxBound } = sanitizeBounds(minInput, maxInput, fallbackMin, fallbackMax);

  for (const row of sortedRows) {
    const total = componentValue(row, tableSource, "Total");
    const elst = componentValue(row, tableSource, "Elst");
    const exch = componentValue(row, tableSource, "Exch");
    const ind = componentValue(row, tableSource, "Ind");
    const disp = componentValue(row, tableSource, "Disp");

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${row.Frag1}</td>
      <td>${row.Frag2}</td>
      <td>${total.toFixed(4)}</td>
      <td>${elst.toFixed(4)}</td>
      <td>${exch.toFixed(4)}</td>
      <td>${ind.toFixed(4)}</td>
      <td>${disp.toFixed(4)}</td>
    `;
    tr.style.backgroundColor = rowShadeFromTotal(total, minBound, maxBound);
    tr.addEventListener("click", () => {
      for (const old of tableBody.querySelectorAll("tr")) {
        old.classList.remove("active");
      }
      tr.classList.add("active");
      highlightPair(row);
    });
    tableBody.appendChild(tr);
  }

  applyHeatmapToStructure(heatmapComponentEl.value || latestHeatmapComponent);
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
    ml_Elst: row.Elst,
    ml_Exch: row.Exch,
    ml_IndAB: row.IndAB,
    ml_IndBA: row.IndBA,
    ml_Disp: row.Disp,
    psi4_Total: 0,
    psi4_Elst: 0,
    psi4_Exch: 0,
    psi4_IndAB: 0,
    psi4_IndBA: 0,
    psi4_Disp: 0,
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

async function runUploadFsapt(file) {
  setStatus("Validating uploaded FSAPT zip...");
  const validation = await validateFsaptZip(file);
  if (!validation.ok) {
    const missing = (validation.missing_files || []).join(", ");
    const invalid = (validation.invalid_files || []).join(", ");
    throw new Error(
      `FSAPT zip validation failed. Missing: ${missing || "none"}. Invalid: ${invalid || "none"}.`
    );
  }

  setStatus("Validation passed. Processing FSAPT data...");
  const data = await uploadZip("/api/upload/psi4-fsapt-zip", file);
  drawMolecule(data.parsed);
  tableSource = "psi4";
  renderTable(data.rows);
  setStatus("Uploaded FSAPT data processed. Showing Psi4 fragment energies.", "ok");
}

function resetCurrentHeatmapRange() {
  const defaults = latestDefaultBoundsByComponent[latestHeatmapComponent];
  if (!defaults) {
    setStatus("No heatmap defaults available yet. Apply or run analysis first.", "error");
    return;
  }

  setBoundaryInputs(defaults.min, defaults.max);
  if (latestComparisonRows.length > 0) {
    renderTable(latestComparisonRows);
  } else {
    applyHeatmapToStructure(latestHeatmapComponent, { resetBounds: true });
  }
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

document.getElementById("uploadFsaptBtn").addEventListener("click", () => {
  uploadFsaptInput.click();
});

uploadFsaptInput.addEventListener("change", async () => {
  const file = uploadFsaptInput.files && uploadFsaptInput.files[0];
  if (!file) {
    return;
  }
  try {
    await runUploadFsapt(file);
  } catch (err) {
    setStatus(err.message, "error");
  } finally {
    uploadFsaptInput.value = "";
  }
});

document.getElementById("applyHeatmapBtn").addEventListener("click", () => {
  latestHeatmapComponent = heatmapComponentEl.value;
  if (latestComparisonRows.length > 0) {
    renderTable(latestComparisonRows);
  } else {
    applyHeatmapToStructure(latestHeatmapComponent);
  }
});

resetHeatmapRangeBtn.addEventListener("click", () => {
  resetCurrentHeatmapRange();
});

document.getElementById("savePngBtn").addEventListener("click", () => {
  saveCurrentViewPng();
});

focusMonomerEl.addEventListener("change", () => {
  populateFocusFragmentOptions();
  applyHeatmapToStructure(latestHeatmapComponent);
});

focusFragmentEl.addEventListener("change", () => {
  applyHeatmapToStructure(latestHeatmapComponent);
});

heatmapComponentEl.addEventListener("change", () => {
  latestHeatmapComponent = heatmapComponentEl.value;
  applyHeatmapToStructure(latestHeatmapComponent, { resetBounds: true });
  if (latestComparisonRows.length > 0) {
    renderTable(latestComparisonRows);
  }
});

toggleSourceBtn.addEventListener("click", () => {
  tableSource = tableSource === "ml" ? "psi4" : "ml";
  renderTable(latestComparisonRows);
});

window.addEventListener("resize", () => {
  viewer.resize();
  if (parsedMolecule) {
    if (latestComparisonRows.length > 0) {
      applyHeatmapToStructure(latestHeatmapComponent);
    } else {
      drawMolecule(parsedMolecule);
    }
  }
});

updateTableHeaderLabels();
loadExample().catch((err) => setStatus(err.message, "error"));
