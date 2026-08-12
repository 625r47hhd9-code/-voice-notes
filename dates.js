export function iso(d = new Date()) {
  const x = new Date(d);
  const y = x.getFullYear();
  const m = String(x.getMonth() + 1).padStart(2, "0");
  const day = String(x.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function fromIso(value) {
  return new Date(`${value}T12:00:00`);
}

export function plusDays(n, base = new Date()) {
  const d = new Date(base);
  d.setDate(d.getDate() + n);
  return iso(d);
}

const WEEKDAYS = {
  "воскресенье": 0, "воскресенья": 0,
  "понедельник": 1, "понедельника": 1,
  "вторник": 2, "вторника": 2,
  "среда": 3, "среду": 3, "среды": 3,
  "четверг": 4, "четверга": 4,
  "пятница": 5, "пятницу": 5, "пятницы": 5,
  "суббота": 6, "субботу": 6, "субботы": 6
};

export function nextWeekday(target, base = new Date()) {
  const d = new Date(base);
  let delta = (target - d.getDay() + 7) % 7;
  if (delta === 0) delta = 7;
  d.setDate(d.getDate() + delta);
  d.setHours(12, 0, 0, 0);
  return iso(d);
}

export function extractDate(text) {
  const low = String(text || "").toLowerCase().replace(/ё/g, "е");

  if (/\bпослезавтра\b/.test(low)) return plusDays(2);
  if (/\bзавтра\b/.test(low)) return plusDays(1);
  if (/\bсегодня\b/.test(low)) return iso();

  for (const [word, target] of Object.entries(WEEKDAYS)) {
    if (new RegExp(`(^|\\s)(в|на)?\\s*${word}(?=\\s|$|[,.!?])`, "i").test(low)) {
      return nextWeekday(target);
    }
  }

  const months = {
    января: 0, февраля: 1, марта: 2, апреля: 3, мая: 4, июня: 5,
    июля: 6, августа: 7, сентября: 8, октября: 9, ноября: 10, декабря: 11
  };
  const m = low.match(/\b(\d{1,2})\s+(января|февраля|марта|апреля|мая|июня|июля|августа|сентября|октября|ноября|декабря)\b/);
  if (m) {
    const now = new Date();
    let candidate = new Date(now.getFullYear(), months[m[2]], Number(m[1]), 12);
    if (candidate < new Date(new Date().setHours(0,0,0,0))) {
      candidate.setFullYear(candidate.getFullYear() + 1);
    }
    return iso(candidate);
  }

  return null;
}

export function cleanSchedulingWords(text) {
  return String(text || "")
    .replace(/\b(добавь|добавить|задача|поставь|поставить|напомни|напоминание)\b/gi, " ")
    .replace(/\b(на\s+)?(сегодня|завтра|послезавтра)\b/gi, " ")
    .replace(/\b(в|на)\s+(понедельник|понедельника|вторник|вторника|среду|среда|среды|четверг|четверга|пятницу|пятница|пятницы|субботу|суббота|субботы|воскресенье|воскресенья)\b/gi, " ")
    .replace(/\b(на\s+)?\d{1,2}\s+(января|февраля|марта|апреля|мая|июня|июля|августа|сентября|октября|ноября|декабря)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function formatDate(value) {
  if (!value) return "";
  return fromIso(value).toLocaleDateString("ru-RU", { day: "numeric", month: "short", weekday: "short" });
}

export function weekDates(anchor) {
  const start = fromIso(anchor);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return iso(d);
  });
}
