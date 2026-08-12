import { iso, plusDays } from "./dates.js";

export const STORAGE_KEY = "assistant-v7-data";

function clone(x) {
  return JSON.parse(JSON.stringify(x));
}

export const defaults = {
  notes: [
    { id: 1, text: "Позвонить поставщику" },
    { id: 2, text: "Идея нового проекта" }
  ],
  sections: [
    { id: "buy", name: "Купить для производства", icon: "🛒", items: ["Краска", "Перчатки"] }
  ],
  employees: [
    { id: 1, name: "Артём Мишин", role: "Мастер цеха", tasks: [] },
    { id: 2, name: "Алексей", role: "", tasks: [] },
    { id: 3, name: "Дима", role: "", tasks: [] }
  ],
  tasks: [
    { id: 101, text: "Встреча с поставщиком", date: plusDays(1), time: "14:00", employeeId: null, done: false },
    { id: 102, text: "Проверить склад", date: plusDays(-1), time: "", employeeId: null, done: false }
  ],
  completed: [],
  notebook: [{ text: "", drawing: "" }],
  page: 0
};

export function migrate(raw) {
  const db = raw && typeof raw === "object" ? raw : clone(defaults);

  for (const [k, v] of Object.entries(defaults)) {
    if (db[k] === undefined || db[k] === null) db[k] = clone(v);
  }

  if (!Array.isArray(db.notes)) db.notes = [];
  if (!Array.isArray(db.sections)) db.sections = [];
  if (!Array.isArray(db.employees)) db.employees = [];
  if (!Array.isArray(db.tasks)) db.tasks = [];
  if (!Array.isArray(db.completed)) db.completed = [];
  if (!Array.isArray(db.notebook) || !db.notebook.length) db.notebook = [{ text: "", drawing: "" }];

  db.notebook = db.notebook.map(p =>
    typeof p === "string" ? { text: p, drawing: "" } : { text: p?.text || "", drawing: p?.drawing || "" }
  );

  if (!db.sections.some(s => s.id === "buy")) {
    db.sections.unshift({ id: "buy", name: "Купить для производства", icon: "🛒", items: [] });
  }
  db.sections = db.sections.map(section => ({
    ...section,
    items: Array.isArray(section.items) ? section.items.map(item =>
      typeof item === "string"
        ? { id: Date.now() + Math.floor(Math.random()*100000), title: item, subnotes: [] }
        : {
            id: item.id || Date.now() + Math.floor(Math.random()*100000),
            title: item.title || item.text || "",
            subnotes: Array.isArray(item.subnotes) ? item.subnotes.map(s =>
              typeof s === "string" ? { id: Date.now()+Math.floor(Math.random()*100000), text: s } : s
            ) : []
          }
    ) : []
  }));

  const baseEmployees = defaults.employees;
  for (const base of baseEmployees) {
    if (!db.employees.some(e => String(e.name || "").toLowerCase() === base.name.toLowerCase())) {
      db.employees.push(clone(base));
    }
  }

  db.employees.forEach(e => {
    if (!Array.isArray(e.tasks)) e.tasks = [];
    for (const t of e.tasks) {
      if (!db.tasks.some(x => x.id === t.id || (x.text === t.text && x.date === t.date && x.employeeId === e.id))) {
        db.tasks.push({
          id: t.id || Date.now() + Math.random(),
          text: t.text || "",
          date: t.date || iso(),
          time: t.time || "",
          employeeId: e.id,
          done: !!t.done
        });
      }
    }
  });

  db.page = Math.max(0, Math.min(Number(db.page) || 0, db.notebook.length - 1));
  return db;
}

export function loadData() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    return migrate(raw || clone(defaults));
  } catch {
    return migrate(clone(defaults));
  }
}

export function saveData(db) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
}
