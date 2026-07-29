const API_URL = "/api/jobs";

let allJobs = [];
let filteredJobs = [];

const jobListEl = document.getElementById("job-list");
const resultCountEl = document.getElementById("result-count");
const emptyStateEl = document.getElementById("empty-state");
const errorStateEl = document.getElementById("error-state");
const errorDetailEl = document.getElementById("error-detail");
const loadingStateEl = document.getElementById("loading-state");
const retryButton = document.getElementById("retry-button");

const searchInput = document.getElementById("search-input");
const locationInput = document.getElementById("location-input");
const typeSelect = document.getElementById("type-select");
const remoteSelect = document.getElementById("remote-select");
const sortSelect = document.getElementById("sort-select");
const clearFiltersBtn = document.getElementById("clear-filters");

const overlay = document.getElementById("detail-overlay");
const detailClose = document.getElementById("detail-close");
const detailRef = document.getElementById("detail-ref");
const detailTitle = document.getElementById("detail-title");
const detailMeta = document.getElementById("detail-meta");
const detailTags = document.getElementById("detail-tags");
const detailDesc = document.getElementById("detail-desc");
const detailApply = document.getElementById("detail-apply");

async function loadJobs() {
  setState("loading");

  try {
    const response = await fetch(API_URL);

    if (!response.ok) {
      throw new Error(`Server responded with status ${response.status}`);
    }

    const payload = await response.json();

    if (!payload || !Array.isArray(payload.data)) {
      throw new Error("Unexpected response format from job data source.");
    }

    allJobs = payload.data.slice(0, 10).map(normalizeJob);

    if (allJobs.length === 0) {
      throw new Error("The job data source returned zero listings.");
    }

    populateTypeOptions(allJobs);
    applyFilters();
  } catch (err) {
    console.error("Failed to load jobs:", err);
    showError(err);
  }
}

function normalizeJob(raw, index) {
  return {
    ref: index + 1,
    slug: raw.slug || String(index),
    title: raw.title || "Untitled role",
    company: raw.company_name || "Unknown company",
    location: raw.location || "Location not specified",
    remote: Boolean(raw.remote),
    tags: Array.isArray(raw.tags) ? raw.tags : [],
    jobTypes: Array.isArray(raw.job_types) ? raw.job_types : [],
    description: raw.description || "",
    url: raw.url || "#",
    createdAt: typeof raw.created_at === "number" ? raw.created_at * 1000 : Date.parse(raw.created_at) || 0
  };
}

function populateTypeOptions(jobs) {
  const types = new Set();
  jobs.forEach(j => j.jobTypes.forEach(t => types.add(t)));

  typeSelect.innerHTML = '<option value="">All types</option>';
  [...types].sort().forEach(type => {
    const opt = document.createElement("option");
    opt.value = type;
    opt.textContent = type;
    typeSelect.appendChild(opt);
  });
}

function applyFilters() {
  const query = searchInput.value.trim().toLowerCase();
  const locationQuery = locationInput.value.trim().toLowerCase();
  const typeFilter = typeSelect.value;
  const remoteFilter = remoteSelect.value;
  const sortMode = sortSelect.value;

  filteredJobs = allJobs.filter(job => {
    const matchesQuery = !query ||
      job.title.toLowerCase().includes(query) ||
      job.company.toLowerCase().includes(query) ||
      job.tags.some(t => t.toLowerCase().includes(query));

    const matchesLocation = !locationQuery ||
      job.location.toLowerCase().includes(locationQuery);

    const matchesType = !typeFilter || job.jobTypes.includes(typeFilter);

    const matchesRemote = !remoteFilter || String(job.remote) === remoteFilter;

    return matchesQuery && matchesLocation && matchesType && matchesRemote;
  });

  sortJobs(sortMode);
  render();
}

function sortJobs(mode) {
  const sorters = {
    "date-desc": (a, b) => b.createdAt - a.createdAt,
    "date-asc": (a, b) => a.createdAt - b.createdAt,
    "title-asc": (a, b) => a.title.localeCompare(b.title),
    "company-asc": (a, b) => a.company.localeCompare(b.company)
  };
  filteredJobs.sort(sorters[mode] || sorters["date-desc"]);
}

function render() {
  jobListEl.innerHTML = "";

  resultCountEl.textContent = `${filteredJobs.length} of ${allJobs.length} listings`;

  if (filteredJobs.length === 0) {
    setState("empty");
    return;
  }

  setState("list");

  const fragment = document.createDocumentFragment();

  filteredJobs.forEach(job => {
    const row = document.createElement("div");
    row.className = "job-row";
    row.setAttribute("role", "listitem");
    row.setAttribute("tabindex", "0");

    row.innerHTML = `
      <span class="job-ref">№${String(job.ref).padStart(4, "0")}</span>
      <div class="job-role">
        <p class="job-title">${escapeHtml(job.title)}</p>
        <span class="job-company">${escapeHtml(job.company)}</span>
        <span class="job-location">${escapeHtml(job.location)}</span>
      </div>
      <div class="job-tags">
        ${job.remote ? '<span class="tag-chip remote">remote</span>' : ""}
        ${job.tags.slice(0, 4).map(t => `<span class="tag-chip">${escapeHtml(t)}</span>`).join("")}
      </div>
      <span class="job-date">${formatDate(job.createdAt)}</span>
    `;

    row.addEventListener("click", () => openDetail(job));
    row.addEventListener("keypress", e => {
      if (e.key === "Enter" || e.key === " ") openDetail(job);
    });

    fragment.appendChild(row);
  });

  jobListEl.appendChild(fragment);
}

function formatDate(ms) {
  if (!ms) return "—";
  const d = new Date(ms);
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function openDetail(job) {
  detailRef.textContent = `JOB №${String(job.ref).padStart(4, "0")}`;
  detailTitle.textContent = job.title;
  detailMeta.textContent = `${job.company} · ${job.location}${job.remote ? " · Remote" : ""}`;
  detailTags.innerHTML = job.jobTypes.map(t => `<span class="tag-chip">${escapeHtml(t)}</span>`).join("")
    + job.tags.map(t => `<span class="tag-chip">${escapeHtml(t)}</span>`).join("");
  detailDesc.innerHTML = job.description || "<p>No further description provided.</p>";
  detailApply.href = job.url;

  overlay.hidden = false;
  document.body.style.overflow = "hidden";
}

function closeDetail() {
  overlay.hidden = true;
  document.body.style.overflow = "";
}

detailClose.addEventListener("click", closeDetail);
overlay.addEventListener("click", e => {
  if (e.target === overlay) closeDetail();
});
document.addEventListener("keydown", e => {
  if (e.key === "Escape" && !overlay.hidden) closeDetail();
});

function setState(state) {
  loadingStateEl.hidden = state !== "loading";
  errorStateEl.hidden = state !== "error";
  emptyStateEl.hidden = state !== "empty";
  jobListEl.hidden = state !== "list";
}

function showError(err) {
  errorDetailEl.textContent = err && err.message
    ? err.message
    : "The job data source may be temporarily unavailable. Please try again shortly.";
  setState("error");
  resultCountEl.textContent = "Ledger unavailable";
}

let debounceTimer;
function debouncedFilter() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(applyFilters, 180);
}

searchInput.addEventListener("input", debouncedFilter);
locationInput.addEventListener("input", debouncedFilter);
typeSelect.addEventListener("change", applyFilters);
remoteSelect.addEventListener("change", applyFilters);
sortSelect.addEventListener("change", applyFilters);

clearFiltersBtn.addEventListener("click", () => {
  searchInput.value = "";
  locationInput.value = "";
  typeSelect.value = "";
  remoteSelect.value = "";
  sortSelect.value = "date-desc";
  applyFilters();
});

retryButton.addEventListener("click", loadJobs);

loadJobs();