const statusEl = document.getElementById("status");
const moleculeInput = document.getElementById("moleculeInput");
const fragAInput = document.getElementById("fragAInput");
const fragBInput = document.getElementById("fragBInput");
const resultsTable = document.getElementById("resultsTable");
const tableHead = resultsTable.querySelector("thead");
const tableBody = document.querySelector("#resultsTable tbody");
const heatmapComponentEl = document.getElementById("heatmapComponent");
const focusMonomerEl = document.getElementById("focusMonomer");
const focusFragmentEl = document.getElementById("focusFragment");
const heatmapRangeEl = document.getElementById("heatmapRange");
const heatmapMinEl = document.getElementById("heatmapMin");
const heatmapMaxEl = document.getElementById("heatmapMax");
const toggleSourceBtn = document.getElementById("toggleSourceBtn");
const tableViewModeEl = document.getElementById("tableViewMode");
const componentFilterEls = Array.from(document.querySelectorAll("#componentFilters input[type='checkbox']"));
const uploadFsaptInput = document.getElementById("uploadFsaptInput");
const resetHeatmapRangeBtn = document.getElementById("resetHeatmapRangeBtn");
const psi4molWarningEl = document.getElementById("psi4molWarning");

const viewer = $3Dmol.createViewer("viewer", { backgroundColor: "white" });

let parsedMolecule = null;
let latestComparisonRows = [];
let tableSource = "ml";
let tableViewMode = tableViewModeEl?.value || "tabulated";
let latestHeatmapComponent = "Total";
let latestRangeMin = null;
let latestRangeMax = null;
let latestDefaultBoundsByComponent = {};
let uploadedPsi4Rows = [];
const ALL_COMPONENTS = ["Total", "Elst", "Exch", "Ind", "Disp"];

function parseErrorDetails(data) {
  if (!data || typeof data !== "object") {
    return "";
  }
  if (Array.isArray(data.details) && data.details.length > 0) {
    return ` (${data.details.join("; ")})`;
  }
  return "";
}

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

function moleculeStringFromParsed(parsed) {
  const atoms = parsed?.atoms || [];
  const monomerA = atoms.filter((atom) => atom.monomer === 1);
  const monomerB = atoms.filter((atom) => atom.monomer === 2);

  const lines = ["0 1"];
  for (const atom of monomerA) {
    lines.push(`${atom.symbol} ${atom.x} ${atom.y} ${atom.z}`);
  }
  lines.push("--");
  lines.push("0 1");
  for (const atom of monomerB) {
    lines.push(`${atom.symbol} ${atom.x} ${atom.y} ${atom.z}`);
  }
  lines.push("units angstrom");
  lines.push("symmetry c1");
  lines.push("no_reorient");
  lines.push("no_com");
  return lines.join("\n");
}

function extractFragmentsMapFromRows(rows, side) {
  const nameKey = side === "A" ? "Frag1" : "Frag2";
  const idxKey = side === "A" ? "Frag1_indices" : "Frag2_indices";
  const out = {};

  for (const row of rows) {
    const name = sanitizeFragmentName(row[nameKey]);
    const indices = row[idxKey];
    if (!name || name === "All" || !Array.isArray(indices) || indices.length === 0) {
      continue;
    }
    if (!(name in out)) {
      out[name] = [...indices];
    }
  }

  return out;
}

function sanitizeFragmentName(name) {
  return String(name || "")
    .trim()
    .replace(/:+$/, "");
}

function normalizeRowFragmentNames(row) {
  return {
    ...row,
    Frag1: sanitizeFragmentName(row.Frag1),
    Frag2: sanitizeFragmentName(row.Frag2),
  };
}

function mergeMlAndPsi4Rows(mlRows, psi4Rows) {
  const normalizedMlRows = mlRows.map((row) => normalizeRowFragmentNames(row));
  const normalizedPsiRows = psi4Rows.map((row) => normalizeRowFragmentNames(row));
  const keyFor = (row) => `${row.Frag1}||${row.Frag2}`;
  const psiMap = new Map(normalizedPsiRows.map((row) => [keyFor(row), row]));
  const merged = [];

  for (const mlRow of normalizedMlRows) {
    const key = keyFor(mlRow);
    const psi = psiMap.get(key);
    if (psi) {
      merged.push({
        ...mlRow,
        psi4_Total: psi.psi4_Total,
        psi4_Elst: psi.psi4_Elst,
        psi4_Exch: psi.psi4_Exch,
        psi4_IndAB: psi.psi4_IndAB,
        psi4_IndBA: psi.psi4_IndBA,
        psi4_Disp: psi.psi4_Disp,
      });
      psiMap.delete(key);
    } else {
      merged.push(mlRow);
    }
  }

  for (const [, psi] of psiMap) {
    merged.push({
      ...psi,
      ml_Total: 0,
      ml_Elst: 0,
      ml_Exch: 0,
      ml_IndAB: 0,
      ml_IndBA: 0,
      ml_Disp: 0,
    });
  }

  return merged;
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

  const rawText = await res.text();
  let data = null;
  try {
    data = rawText ? JSON.parse(rawText) : {};
  } catch {
    data = null;
  }

  if (!res.ok) {
    if (data && typeof data === "object") {
      throw new Error((data.error || `Request failed: ${res.status}`) + parseErrorDetails(data));
    }
    const fallback = rawText?.trim() || `Request failed: ${res.status}`;
    throw new Error(`Server error (${res.status}): ${fallback}`);
  }
  if (!data) {
    throw new Error("Server returned a non-JSON response.");
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

  const rawText = await res.text();
  let data = null;
  try {
    data = rawText ? JSON.parse(rawText) : {};
  } catch {
    data = null;
  }

  if (!res.ok) {
    if (data && typeof data === "object") {
      throw new Error((data.error || `Upload failed: ${res.status}`) + parseErrorDetails(data));
    }
    const fallback = rawText?.trim() || `Upload failed: ${res.status}`;
    throw new Error(`Upload failed (${res.status}): ${fallback}`);
  }
  if (!data) {
    throw new Error("Upload endpoint returned a non-JSON response.");
  }
  return data;
}

function clearVisualization() {
  parsedMolecule = null;
  latestComparisonRows = [];
  uploadedPsi4Rows = [];
  latestDefaultBoundsByComponent = {};
  tableSource = "ml";
  tableViewMode = "tabulated";
  tableViewModeEl.value = "tabulated";

  tableBody.innerHTML = "";
  focusFragmentEl.innerHTML = "";
  updateTableModeControls();
  renderTableHeader(getSelectedComponents());
  updateRangeLabel();
  setBoundaryInputs(Number.NaN, Number.NaN);

  viewer.clear();
  viewer.render();
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

function getSelectedComponents() {
  const selected = componentFilterEls
    .filter((el) => el.checked)
    .map((el) => el.dataset.component)
    .filter((component) => ALL_COMPONENTS.includes(component));
  return selected.length > 0 ? selected : ["Total"];
}

function enforceAtLeastOneComponent(changedEl) {
  const checked = componentFilterEls.filter((el) => el.checked);
  if (checked.length === 0 && changedEl) {
    changedEl.checked = true;
  }
}

function updateTableModeControls() {
  const prefix = sourceLabel(tableSource);
  toggleSourceBtn.textContent = `Showing: ${prefix}`;
  toggleSourceBtn.disabled = tableViewMode !== "tabulated";
}

function renderTableHeader(selectedComponents) {
  const tr = document.createElement("tr");
  const makeTh = (text) => {
    const th = document.createElement("th");
    th.textContent = text;
    tr.appendChild(th);
  };

  makeTh("Frag1");
  makeTh("Frag2");

  if (tableViewMode === "compare") {
    for (const component of selectedComponents) {
      makeTh(`Psi4 ${component}`);
      makeTh(`ML ${component}`);
      makeTh(`Diff ${component}`);
    }
  } else {
    const prefix = sourceLabel(tableSource);
    for (const component of selectedComponents) {
      makeTh(`${prefix} ${component}`);
    }
  }

  tableHead.innerHTML = "";
  tableHead.appendChild(tr);
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

function focusedContributions(rows, componentKey, side, focusedFragment) {
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
    out.get(name).value += tableValueForActiveComponent(row, componentKey);
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
    focusedFragment
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
    const metricText = `ML - Psi4 ${componentLabel(latestHeatmapComponent)}`;
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

function tableValueForActiveComponent(row, component) {
  if (tableViewMode === "compare") {
    return differenceComponentValue(row, component);
  }
  return componentValue(row, tableSource, component);
}

function sortMagnitudeForRow(row, component) {
  return Math.abs(tableValueForActiveComponent(row, component));
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

function differenceComponentValue(row, component) {
  return componentValue(row, "ml", component) - componentValue(row, "psi4", component);
}

function renderTable(rows) {
  latestComparisonRows = rows;
  updateTableModeControls();
  populateFocusFragmentOptions();
  const selectedComponents = getSelectedComponents();
  renderTableHeader(selectedComponents);
  tableBody.innerHTML = "";

  const sortedRows = [...rows].sort((a, b) => {
    const sortComponent = latestHeatmapComponent || "Total";
    const absA = sortMagnitudeForRow(a, sortComponent);
    const absB = sortMagnitudeForRow(b, sortComponent);
    return absB - absA;
  });

  const colorComponent = latestHeatmapComponent || "Total";
  const colorValues = sortedRows.map((row) => tableValueForActiveComponent(row, colorComponent));
  const maxAbsForColor = Math.max(1e-8, ...colorValues.map((value) => Math.abs(value)));

  const fallbackMin = -maxAbsForColor;
  const fallbackMax = maxAbsForColor;
  const minInput = Number.parseFloat(heatmapMinEl.value);
  const maxInput = Number.parseFloat(heatmapMaxEl.value);
  const { minBound, maxBound } = sanitizeBounds(minInput, maxInput, fallbackMin, fallbackMax);

  for (const row of sortedRows) {
    const rowColorValue = tableValueForActiveComponent(row, colorComponent);

    const tr = document.createElement("tr");
    const cells = [row.Frag1, row.Frag2];
    if (tableViewMode === "compare") {
      for (const component of selectedComponents) {
        const psiVal = componentValue(row, "psi4", component);
        const mlVal = componentValue(row, "ml", component);
        const diff = mlVal - psiVal;
        cells.push(psiVal.toFixed(2), mlVal.toFixed(2), diff.toFixed(2));
      }
    } else {
      for (const component of selectedComponents) {
        const value = componentValue(row, tableSource, component);
        cells.push(value.toFixed(2));
      }
    }
    tr.innerHTML = cells.map((value) => `<td>${value}</td>`).join("");
    tr.style.backgroundColor = rowShadeFromTotal(rowColorValue, minBound, maxBound);
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
  uploadedPsi4Rows = [];
  const data = await callJson("/api/example/ap3-fused");
  moleculeInput.value = data.molecule;
  fragAInput.value = formatFragmentText(data.fragments_a);
  fragBInput.value = formatFragmentText(data.fragments_b);
  drawMolecule(data.parsed);
  setStatus("Example loaded.", "ok");
}

async function runParse() {
  setStatus("Parsing molecule...");
  uploadedPsi4Rows = [];
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

  const rowsToRender =
    uploadedPsi4Rows.length > 0 ? mergeMlAndPsi4Rows(comparisonLike, uploadedPsi4Rows) : comparisonLike;

  renderTable(rowsToRender);
  if (uploadedPsi4Rows.length > 0) {
    setStatus("ML prediction complete. Compared against uploaded Psi4 FSAPT results.", "ok");
  } else {
    setStatus("ML prediction complete. Psi4 columns set to 0 until comparison run.", "ok");
  }
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
  uploadedPsi4Rows = (data.rows || []).map((row) => normalizeRowFragmentNames(row));
  drawMolecule(data.parsed);
  if (data.molecule_string) {
    moleculeInput.value = data.molecule_string;
  } else {
    moleculeInput.value = moleculeStringFromParsed(data.parsed);
  }
  psi4molWarningEl.hidden = !!data.used_psi4mol;
  fragAInput.value = formatFragmentText(extractFragmentsMapFromRows(uploadedPsi4Rows, "A"));
  fragBInput.value = formatFragmentText(extractFragmentsMapFromRows(uploadedPsi4Rows, "B"));
  tableSource = "psi4";
  renderTable(uploadedPsi4Rows);
  setStatus("Uploaded FSAPT data processed. Run ML to compare ML vs uploaded Psi4.", "ok");
}

function clearAllInputsAndData() {
  moleculeInput.value = "";
  fragAInput.value = "";
  fragBInput.value = "";
  psi4molWarningEl.hidden = true;
  clearVisualization();
  setStatus("Cleared molecule, fragments, and visualization.", "ok");
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

document.getElementById("clearAllBtn").addEventListener("click", () => {
  clearAllInputsAndData();
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

tableViewModeEl.addEventListener("change", () => {
  tableViewMode = tableViewModeEl.value;
  if (latestComparisonRows.length > 0) {
    renderTable(latestComparisonRows);
  } else {
    updateTableModeControls();
    renderTableHeader(getSelectedComponents());
  }
});

for (const checkbox of componentFilterEls) {
  checkbox.addEventListener("change", () => {
    enforceAtLeastOneComponent(checkbox);
    if (latestComparisonRows.length > 0) {
      renderTable(latestComparisonRows);
    } else {
      renderTableHeader(getSelectedComponents());
    }
  });
}

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

updateTableModeControls();
renderTableHeader(getSelectedComponents());
loadExample().catch((err) => setStatus(err.message, "error"));
