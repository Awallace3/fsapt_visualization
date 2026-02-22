const statusEl = document.getElementById("status");
const moleculeInput = document.getElementById("moleculeInput");
const fragAInput = document.getElementById("fragAInput");
const fragBInput = document.getElementById("fragBInput");
const tableBody = document.querySelector("#resultsTable tbody");

const viewer = $3Dmol.createViewer("viewer", { backgroundColor: "white" });

let parsedMolecule = null;
let latestComparisonRows = [];

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

  viewer.setStyle({ serial: monomerA }, { stick: { colorscheme: "greenCarbon" } });
  viewer.addStyle({ serial: monomerB }, { stick: { colorscheme: "cyanCarbon" } });
  viewer.zoomTo();
  viewer.render();
}

function highlightPair(row) {
  if (!parsedMolecule) {
    return;
  }

  viewer.clear();
  viewer.addModel(parsedMolecule.xyz, "xyz");

  const allA = parsedMolecule.monomer_a_indices.map((i) => i - 1);
  const allB = parsedMolecule.monomer_b_indices.map((i) => i - 1);

  viewer.setStyle({ serial: allA }, { stick: { colorscheme: "greenCarbon", opacity: 0.3 } });
  viewer.addStyle({ serial: allB }, { stick: { colorscheme: "cyanCarbon", opacity: 0.3 } });

  const pairA = (row.Frag1_indices || []).map((i) => i - 1);
  const pairB = (row.Frag2_indices || []).map((i) => i - 1);

  viewer.addStyle(
    { serial: pairA },
    { stick: { radius: 0.23, color: "#9f3f20" }, sphere: { radius: 0.36, color: "#9f3f20" } }
  );
  viewer.addStyle(
    { serial: pairB },
    { stick: { radius: 0.23, color: "#2f3f8f" }, sphere: { radius: 0.36, color: "#2f3f8f" } }
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

loadExample().catch((err) => setStatus(err.message, "error"));
