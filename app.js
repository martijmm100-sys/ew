// EW and Calories — local-only browser app.
// Data model is intentionally plain JSON so future API/database features can be added later.

const STORAGE_KEY = "ewCalories.v1";

const defaultState = {
  settings: {
    calorieGoal: 1800,
    waterGoal: 64,
    weightGoal: "",
    proteinGoal: 100,
    carbGoal: 180,
    fatGoal: 60,
    reminderDays: 5
  },
  cycles: [],
  foods: [],
  water: [],
  weights: []
};

const starterFoods = [
  { name: "Greek yogurt", calories: 100, protein: 17, carbs: 6, fat: 0, meal: "Breakfast" },
  { name: "Banana", calories: 105, protein: 1.3, carbs: 27, fat: 0.4, meal: "Snack" },
  { name: "Apple", calories: 95, protein: 0.5, carbs: 25, fat: 0.3, meal: "Snack" },
  { name: "Chicken breast, 4 oz", calories: 187, protein: 35, carbs: 0, fat: 4, meal: "Dinner" },
  { name: "Egg, large", calories: 72, protein: 6, carbs: 0.4, fat: 5, meal: "Breakfast" },
  { name: "Oatmeal, 1 cup cooked", calories: 154, protein: 6, carbs: 27, fat: 3, meal: "Breakfast" },
  { name: "Avocado, half", calories: 120, protein: 1.5, carbs: 6, fat: 11, meal: "Snack" },
  { name: "Salmon, 4 oz", calories: 233, protein: 25, carbs: 0, fat: 14, meal: "Dinner" },
  { name: "White rice, 1 cup", calories: 205, protein: 4, carbs: 45, fat: 0.4, meal: "Dinner" },
  { name: "Protein shake", calories: 160, protein: 30, carbs: 4, fat: 3, meal: "Drink" }
];

let state = loadState();

document.addEventListener("DOMContentLoaded", () => {
  setTodayDefaults();
  setupTabs();
  setupForms();
  setupExports();
  setupFoodSearch();
  fillFoodDatalist();
  populateSettingsForm();
  renderAll();
});


function cloneDefaultState() {
  return JSON.parse(JSON.stringify(defaultState));
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return cloneDefaultState();
    const parsed = JSON.parse(raw);
    return {
      settings: { ...defaultState.settings, ...(parsed.settings || {}) },
      cycles: Array.isArray(parsed.cycles) ? parsed.cycles : [],
      foods: Array.isArray(parsed.foods) ? parsed.foods : [],
      water: Array.isArray(parsed.water) ? parsed.water : [],
      weights: Array.isArray(parsed.weights) ? parsed.weights : []
    };
  } catch {
    return structuredClone(defaultState);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function setTodayDefaults() {
  const today = todayISO();
  byId("ewStartDate").value = today;
  byId("foodDate").value = today;
  byId("foodFilterDate").value = today;
  byId("weightDate").value = today;
}

function setupTabs() {
  document.querySelectorAll(".tab").forEach((button) => {
    button.addEventListener("click", () => openTab(button.dataset.tab));
  });

  document.querySelectorAll("[data-open-tab]").forEach((button) => {
    button.addEventListener("click", () => openTab(button.dataset.openTab));
  });
}

function openTab(tabName) {
  document.querySelectorAll(".tab").forEach((button) => {
    const active = button.dataset.tab === tabName;
    button.classList.toggle("active", active);
    button.setAttribute("aria-selected", String(active));
  });

  document.querySelectorAll(".panel").forEach((panel) => {
    panel.classList.toggle("active", panel.id === tabName);
  });

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function setupForms() {
  byId("ewForm").addEventListener("submit", saveEwEntry);
  byId("resetEwForm").addEventListener("click", resetEwForm);

  byId("foodForm").addEventListener("submit", saveFoodEntry);
  byId("resetFoodForm").addEventListener("click", resetFoodForm);
  byId("foodFilterDate").addEventListener("change", renderFoodTable);
  byId("showAllFood").addEventListener("click", () => {
    byId("foodFilterDate").value = "";
    renderFoodTable();
  });

  byId("quickWaterForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const amount = numberValue("quickWaterAmount");
    if (amount <= 0) return;
    state.water.push({ id: cryptoId(), date: todayISO(), amount });
    saveState();
    renderAll();
  });

  byId("goalsForm").addEventListener("submit", (event) => {
    event.preventDefault();
    state.settings = {
      calorieGoal: numberValue("goalCalories"),
      waterGoal: numberValue("goalWater"),
      weightGoal: byId("goalWeight").value,
      proteinGoal: numberValue("goalProtein"),
      carbGoal: numberValue("goalCarbs"),
      fatGoal: numberValue("goalFat"),
      reminderDays: clamp(numberValue("goalReminderDays"), 0, 14)
    };

    const weight = numberValue("currentWeight");
    const date = byId("weightDate").value;
    if (date && weight > 0) {
      state.weights.push({ id: cryptoId(), date, weight });
      state.weights = sortByDateDesc(state.weights, "date");
      byId("currentWeight").value = "";
    }

    saveState();
    populateSettingsForm();
    renderAll();
  });
}

function saveEwEntry(event) {
  event.preventDefault();

  const startDate = byId("ewStartDate").value;
  const endDate = byId("ewEndDate").value;

  if (!startDate) {
    alert("Please enter an EW start date.");
    return;
  }

  if (endDate && new Date(endDate) < new Date(startDate)) {
    alert("EW end date cannot be before the start date.");
    return;
  }

  const entry = {
    id: byId("ewId").value || cryptoId(),
    startDate,
    endDate,
    flow: byId("ewFlow").value,
    cramps: byId("ewCramps").value,
    mood: byId("ewMood").value,
    symptoms: [...document.querySelectorAll('input[name="symptoms"]:checked')].map((box) => box.value),
    notes: byId("ewNotes").value.trim(),
    updatedAt: new Date().toISOString()
  };

  const existingIndex = state.cycles.findIndex((item) => item.id === entry.id);
  if (existingIndex >= 0) state.cycles[existingIndex] = entry;
  else state.cycles.push(entry);

  state.cycles = sortByDateDesc(state.cycles, "startDate");
  saveState();
  resetEwForm();
  renderAll();
}

function resetEwForm() {
  byId("ewForm").reset();
  byId("ewId").value = "";
  byId("ewStartDate").value = todayISO();
}

function editEwEntry(id) {
  const entry = state.cycles.find((item) => item.id === id);
  if (!entry) return;

  byId("ewId").value = entry.id;
  byId("ewStartDate").value = entry.startDate || todayISO();
  byId("ewEndDate").value = entry.endDate || "";
  byId("ewFlow").value = entry.flow || "";
  byId("ewCramps").value = entry.cramps || "";
  byId("ewMood").value = entry.mood || "";
  byId("ewNotes").value = entry.notes || "";

  document.querySelectorAll('input[name="symptoms"]').forEach((box) => {
    box.checked = (entry.symptoms || []).includes(box.value);
  });

  openTab("ew");
}

function deleteEwEntry(id) {
  if (!confirm("Delete this EW entry?")) return;
  state.cycles = state.cycles.filter((item) => item.id !== id);
  saveState();
  renderAll();
}

function saveFoodEntry(event) {
  event.preventDefault();

  const entry = {
    id: byId("foodId").value || cryptoId(),
    date: byId("foodDate").value,
    name: byId("foodName").value.trim(),
    calories: numberValue("foodCalories"),
    protein: numberValue("foodProtein"),
    carbs: numberValue("foodCarbs"),
    fat: numberValue("foodFat"),
    meal: byId("foodMeal").value,
    updatedAt: new Date().toISOString()
  };

  if (!entry.date || !entry.name) {
    alert("Please enter a date and food name.");
    return;
  }

  const existingIndex = state.foods.findIndex((item) => item.id === entry.id);
  if (existingIndex >= 0) state.foods[existingIndex] = entry;
  else state.foods.push(entry);

  state.foods = sortByDateDesc(state.foods, "date");
  saveState();
  resetFoodForm();
  renderAll();
}

function resetFoodForm() {
  byId("foodForm").reset();
  byId("foodId").value = "";
  byId("foodDate").value = todayISO();
}

function editFoodEntry(id) {
  const entry = state.foods.find((item) => item.id === id);
  if (!entry) return;

  byId("foodId").value = entry.id;
  byId("foodDate").value = entry.date || todayISO();
  byId("foodName").value = entry.name || "";
  byId("foodCalories").value = entry.calories || "";
  byId("foodProtein").value = entry.protein || "";
  byId("foodCarbs").value = entry.carbs || "";
  byId("foodFat").value = entry.fat || "";
  byId("foodMeal").value = entry.meal || "Snack";

  openTab("calories");
}

function deleteFoodEntry(id) {
  if (!confirm("Delete this food entry?")) return;
  state.foods = state.foods.filter((item) => item.id !== id);
  saveState();
  renderAll();
}

function deleteWeightEntry(id) {
  if (!confirm("Delete this weight entry?")) return;
  state.weights = state.weights.filter((item) => item.id !== id);
  saveState();
  renderAll();
}

function populateSettingsForm() {
  const s = state.settings;
  byId("goalCalories").value = s.calorieGoal ?? "";
  byId("goalWater").value = s.waterGoal ?? "";
  byId("goalWeight").value = s.weightGoal ?? "";
  byId("goalProtein").value = s.proteinGoal ?? "";
  byId("goalCarbs").value = s.carbGoal ?? "";
  byId("goalFat").value = s.fatGoal ?? "";
  byId("goalReminderDays").value = s.reminderDays ?? 5;
}

function renderAll() {
  renderDashboard();
  renderPredictions();
  renderEwTable();
  renderFoodTable();
  renderWeightTable();
}

function renderDashboard() {
  const today = todayISO();
  const totals = foodTotalsForDate(today);
  const water = waterTotalForDate(today);
  const settings = state.settings;
  const prediction = getCyclePrediction();

  const calorieMax = settings.calorieGoal || Math.max(totals.calories, 1);
  byId("calorieProgress").max = calorieMax;
  byId("calorieProgress").value = Math.min(totals.calories, calorieMax);
  byId("calorieProgressLabel").textContent = `${round(totals.calories)} / ${round(settings.calorieGoal || 0)} cal`;

  const waterMax = settings.waterGoal || Math.max(water, 1);
  byId("waterProgress").max = waterMax;
  byId("waterProgress").value = Math.min(water, waterMax);
  byId("waterProgressLabel").textContent = `${round(water)} / ${round(settings.waterGoal || 0)} oz`;

  byId("macroTotals").innerHTML = [
    statPill("Protein", `${round(totals.protein)} / ${round(settings.proteinGoal || 0)} g`),
    statPill("Carbs", `${round(totals.carbs)} / ${round(settings.carbGoal || 0)} g`),
    statPill("Fat", `${round(totals.fat)} / ${round(settings.fatGoal || 0)} g`),
    statPill("Foods", `${state.foods.filter((food) => food.date === today).length} today`)
  ].join("");

  if (!prediction.nextStart) {
    byId("ewReminderText").textContent = "Add at least one EW entry to begin predictions.";
  } else {
    const days = daysBetween(today, prediction.nextStart);
    const reminderDays = Number(settings.reminderDays ?? 5);

    if (days > reminderDays) {
      byId("ewReminderText").textContent = `Next EW estimate: ${formatDate(prediction.nextStart)}.`;
    } else if (days > 1) {
      byId("ewReminderText").textContent = `EW is coming in ${days} days 🌸`;
    } else if (days === 1) {
      byId("ewReminderText").textContent = "EW is coming tomorrow 🌸";
    } else if (days === 0) {
      byId("ewReminderText").textContent = "EW is estimated for today 🌸";
    } else {
      byId("ewReminderText").textContent = `EW estimate was ${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} ago. Update your EW log when ready.`;
    }
  }

  byId("ewStats").innerHTML = [
    statPill("Avg cycle", prediction.averageCycleLength ? `${prediction.averageCycleLength} days` : "Need data"),
    statPill("Avg EW length", prediction.averageDuration ? `${prediction.averageDuration} days` : "Need data"),
    statPill("Ovulation est.", prediction.ovulationDate ? formatDate(prediction.ovulationDate) : "Need data"),
    statPill("Entries", `${state.cycles.length}`)
  ].join("");

  renderRecentActivity();
}

function renderRecentActivity() {
  const activities = [
    ...state.cycles.map((item) => ({
      date: item.startDate,
      text: `EW logged for ${formatDate(item.startDate)}${item.endDate ? ` to ${formatDate(item.endDate)}` : ""}.`
    })),
    ...state.foods.map((item) => ({
      date: item.date,
      text: `${item.meal}: ${escapeHtml(item.name)} — ${round(item.calories)} cal.`
    })),
    ...state.weights.map((item) => ({
      date: item.date,
      text: `Weight logged: ${round(item.weight)} on ${formatDate(item.date)}.`
    }))
  ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 8);

  byId("recentActivity").innerHTML = activities.length
    ? activities.map((item) => `<li><strong>${formatDate(item.date)}:</strong> ${item.text}</li>`).join("")
    : `<li class="empty">No activity yet. Add an EW entry or food entry to get started.</li>`;
}

function renderPredictions() {
  const p = getCyclePrediction();
  const panel = byId("predictionPanel");

  if (!p.nextStart) {
    panel.innerHTML = `<div class="prediction-item"><strong>Need EW history</strong>Add your first EW entry to calculate estimates.</div>`;
    return;
  }

  panel.innerHTML = [
    predictionItem("Next EW start estimate", formatDate(p.nextStart)),
    predictionItem("Next EW end estimate", p.nextEnd ? formatDate(p.nextEnd) : "Need more data"),
    predictionItem("Ovulation estimate", p.ovulationDate ? formatDate(p.ovulationDate) : "Need more data"),
    predictionItem("Fertile window estimate", p.fertileStart && p.fertileEnd ? `${formatDate(p.fertileStart)} – ${formatDate(p.fertileEnd)}` : "Need more data"),
    predictionItem("Average cycle length", p.averageCycleLength ? `${p.averageCycleLength} days` : "Need more EW entries")
  ].join("");
}

function renderEwTable() {
  const body = byId("ewTableBody");
  if (!state.cycles.length) {
    body.innerHTML = `<tr><td colspan="7" class="empty">No EW entries yet.</td></tr>`;
    return;
  }

  body.innerHTML = state.cycles.map((item) => `
    <tr>
      <td>${formatDate(item.startDate)}</td>
      <td>${item.endDate ? formatDate(item.endDate) : "—"}</td>
      <td>${escapeHtml(item.flow || "—")}</td>
      <td>${escapeHtml(item.cramps || "—")}</td>
      <td>${escapeHtml(item.mood || "—")}</td>
      <td>${escapeHtml((item.symptoms || []).join(", ") || "—")}${item.notes ? `<br><small>${escapeHtml(item.notes)}</small>` : ""}</td>
      <td>
        <div class="action-group">
          <button class="action-btn" onclick="editEwEntry('${item.id}')">Edit</button>
          <button class="action-btn delete" onclick="deleteEwEntry('${item.id}')">Delete</button>
        </div>
      </td>
    </tr>
  `).join("");
}

function renderFoodTable() {
  const body = byId("foodTableBody");
  const filterDate = byId("foodFilterDate").value;
  const rows = filterDate ? state.foods.filter((food) => food.date === filterDate) : state.foods;

  if (!rows.length) {
    body.innerHTML = `<tr><td colspan="8" class="empty">No food entries for this view.</td></tr>`;
    return;
  }

  body.innerHTML = rows.map((item) => `
    <tr>
      <td>${formatDate(item.date)}</td>
      <td>${escapeHtml(item.meal || "—")}</td>
      <td>${escapeHtml(item.name)}</td>
      <td>${round(item.calories)}</td>
      <td>${round(item.protein)} g</td>
      <td>${round(item.carbs)} g</td>
      <td>${round(item.fat)} g</td>
      <td>
        <div class="action-group">
          <button class="action-btn" onclick="editFoodEntry('${item.id}')">Edit</button>
          <button class="action-btn delete" onclick="deleteFoodEntry('${item.id}')">Delete</button>
        </div>
      </td>
    </tr>
  `).join("");
}

function renderWeightTable() {
  const body = byId("weightTableBody");
  if (!state.weights.length) {
    body.innerHTML = `<tr><td colspan="4" class="empty">No weight entries yet.</td></tr>`;
    return;
  }

  const goal = Number(state.settings.weightGoal);
  body.innerHTML = state.weights.map((item) => {
    const gap = goal ? round(item.weight - goal) : "";
    return `
      <tr>
        <td>${formatDate(item.date)}</td>
        <td>${round(item.weight)}</td>
        <td>${goal ? `${gap > 0 ? "+" : ""}${gap}` : "No goal set"}</td>
        <td><button class="action-btn delete" onclick="deleteWeightEntry('${item.id}')">Delete</button></td>
      </tr>
    `;
  }).join("");
}

function getCyclePrediction() {
  const cycles = [...state.cycles]
    .filter((cycle) => cycle.startDate)
    .sort((a, b) => new Date(a.startDate) - new Date(b.startDate));

  if (!cycles.length) {
    return { nextStart: null, nextEnd: null, averageCycleLength: null, averageDuration: null, ovulationDate: null, fertileStart: null, fertileEnd: null };
  }

  const startDiffs = [];
  for (let i = 1; i < cycles.length; i++) {
    const diff = daysBetween(cycles[i - 1].startDate, cycles[i].startDate);
    if (diff > 10 && diff < 90) startDiffs.push(diff);
  }

  const durations = cycles
    .map((cycle) => {
      if (!cycle.endDate) return null;
      const d = daysBetween(cycle.startDate, cycle.endDate) + 1;
      return d > 0 && d < 20 ? d : null;
    })
    .filter(Boolean);

  const averageCycleLength = Math.round(avg(startDiffs) || 28);
  const averageDuration = Math.round(avg(durations) || 5);
  const lastStart = cycles[cycles.length - 1].startDate;

  let nextStart = addDays(lastStart, averageCycleLength);
  const today = todayISO();

  // If a user has not logged in a while, advance the estimate forward by whole cycles.
  while (daysBetween(nextStart, today) > 0) {
    nextStart = addDays(nextStart, averageCycleLength);
  }

  const nextEnd = addDays(nextStart, averageDuration - 1);
  const ovulationDate = addDays(nextStart, -14);
  const fertileStart = addDays(ovulationDate, -5);
  const fertileEnd = addDays(ovulationDate, 1);

  return { nextStart, nextEnd, averageCycleLength, averageDuration, ovulationDate, fertileStart, fertileEnd };
}

function foodTotalsForDate(date) {
  return state.foods
    .filter((food) => food.date === date)
    .reduce((sum, food) => ({
      calories: sum.calories + Number(food.calories || 0),
      protein: sum.protein + Number(food.protein || 0),
      carbs: sum.carbs + Number(food.carbs || 0),
      fat: sum.fat + Number(food.fat || 0)
    }), { calories: 0, protein: 0, carbs: 0, fat: 0 });
}

function waterTotalForDate(date) {
  return state.water
    .filter((item) => item.date === date)
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);
}

function setupFoodSearch() {
  byId("foodSearch").addEventListener("input", renderFoodSearch);
  renderFoodSearch();
}

function fillFoodDatalist() {
  byId("foodSuggestions").innerHTML = starterFoods
    .map((food) => `<option value="${escapeHtml(food.name)}"></option>`)
    .join("");

  byId("foodName").addEventListener("change", () => {
    const found = starterFoods.find((food) => food.name.toLowerCase() === byId("foodName").value.trim().toLowerCase());
    if (!found) return;
    byId("foodCalories").value = found.calories;
    byId("foodProtein").value = found.protein;
    byId("foodCarbs").value = found.carbs;
    byId("foodFat").value = found.fat;
    byId("foodMeal").value = found.meal;
  });
}

function renderFoodSearch() {
  const q = byId("foodSearch").value.trim().toLowerCase();
  const results = starterFoods
    .filter((food) => !q || food.name.toLowerCase().includes(q))
    .slice(0, 6);

  byId("foodSearchResults").innerHTML = results.length
    ? results.map((food, index) => `
      <li>
        <button type="button" data-food-index="${starterFoods.indexOf(food)}">
          ${escapeHtml(food.name)} · ${food.calories} cal · P ${food.protein}g / C ${food.carbs}g / F ${food.fat}g
        </button>
      </li>
    `).join("")
    : `<li class="empty">No starter foods match that search.</li>`;

  document.querySelectorAll("[data-food-index]").forEach((button) => {
    button.addEventListener("click", () => {
      const food = starterFoods[Number(button.dataset.foodIndex)];
      byId("foodDate").value = todayISO();
      byId("foodName").value = food.name;
      byId("foodCalories").value = food.calories;
      byId("foodProtein").value = food.protein;
      byId("foodCarbs").value = food.carbs;
      byId("foodFat").value = food.fat;
      byId("foodMeal").value = food.meal;
      openTab("calories");
    });
  });
}

function setupExports() {
  byId("exportJson").addEventListener("click", () => {
    downloadFile(`ew-and-calories-backup-${todayISO()}.json`, JSON.stringify(state, null, 2), "application/json");
  });

  byId("exportEwCsv").addEventListener("click", () => {
    const rows = state.cycles.map((item) => ({
      startDate: item.startDate,
      endDate: item.endDate,
      flow: item.flow,
      cramps: item.cramps,
      mood: item.mood,
      symptoms: (item.symptoms || []).join("; "),
      notes: item.notes
    }));
    downloadFile(`ew-history-${todayISO()}.csv`, toCsv(rows), "text/csv");
  });

  byId("exportFoodCsv").addEventListener("click", () => {
    const rows = state.foods.map((item) => ({
      date: item.date,
      meal: item.meal,
      food: item.name,
      calories: item.calories,
      protein: item.protein,
      carbs: item.carbs,
      fat: item.fat
    }));
    downloadFile(`food-log-${todayISO()}.csv`, toCsv(rows), "text/csv");
  });

  byId("exportWeightCsv").addEventListener("click", () => {
    const rows = state.weights.map((item) => ({
      date: item.date,
      weight: item.weight
    }));
    downloadFile(`weight-log-${todayISO()}.csv`, toCsv(rows), "text/csv");
  });

  byId("importJson").addEventListener("change", importJsonBackup);

  byId("clearData").addEventListener("click", () => {
    const ok = confirm("This will delete all app data saved in this browser. Continue?");
    if (!ok) return;
    localStorage.removeItem(STORAGE_KEY);
    state = cloneDefaultState();
    populateSettingsForm();
    setTodayDefaults();
    renderAll();
  });
}

function importJsonBackup(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const imported = JSON.parse(reader.result);
      const confirmed = confirm("Importing this backup will replace current browser data. Continue?");
      if (!confirmed) return;

      state = {
        settings: { ...defaultState.settings, ...(imported.settings || {}) },
        cycles: Array.isArray(imported.cycles) ? imported.cycles : [],
        foods: Array.isArray(imported.foods) ? imported.foods : [],
        water: Array.isArray(imported.water) ? imported.water : [],
        weights: Array.isArray(imported.weights) ? imported.weights : []
      };

      saveState();
      populateSettingsForm();
      renderAll();
      alert("Backup imported.");
    } catch {
      alert("That file does not look like a valid EW and Calories JSON backup.");
    } finally {
      event.target.value = "";
    }
  };
  reader.readAsText(file);
}

function toCsv(rows) {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(",")];
  rows.forEach((row) => {
    lines.push(headers.map((header) => csvCell(row[header])).join(","));
  });
  return lines.join("\n");
}

function csvCell(value) {
  const text = String(value ?? "");
  if (/[",\n]/.test(text)) return `"${text.replaceAll('"', '""')}"`;
  return text;
}

function downloadFile(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function predictionItem(label, value) {
  return `<div class="prediction-item"><strong>${label}</strong><span>${escapeHtml(value)}</span></div>`;
}

function statPill(label, value) {
  return `<div class="stat-pill"><strong>${escapeHtml(label)}</strong><span>${escapeHtml(value)}</span></div>`;
}

function byId(id) {
  return document.getElementById(id);
}

function numberValue(id) {
  return Number(byId(id).value || 0);
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function avg(values) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function round(value) {
  const num = Number(value || 0);
  return Number.isInteger(num) ? String(num) : num.toFixed(1);
}

function sortByDateDesc(items, field) {
  return [...items].sort((a, b) => new Date(b[field]) - new Date(a[field]));
}

function todayISO() {
  const date = new Date();
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 10);
}

function addDays(isoDate, days) {
  const date = parseLocalDate(isoDate);
  date.setDate(date.getDate() + days);
  return toISODate(date);
}

function daysBetween(startIso, endIso) {
  const start = parseLocalDate(startIso);
  const end = parseLocalDate(endIso);
  const diff = end.setHours(0,0,0,0) - start.setHours(0,0,0,0);
  return Math.round(diff / 86400000);
}

function parseLocalDate(isoDate) {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function toISODate(date) {
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 10);
}

function formatDate(isoDate) {
  if (!isoDate) return "—";
  return parseLocalDate(isoDate).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function cryptoId() {
  if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// Expose edit/delete handlers for table buttons.
window.editEwEntry = editEwEntry;
window.deleteEwEntry = deleteEwEntry;
window.editFoodEntry = editFoodEntry;
window.deleteFoodEntry = deleteFoodEntry;
window.deleteWeightEntry = deleteWeightEntry;
