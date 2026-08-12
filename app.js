import React from "https://esm.sh/react@19.1.1";
import { createRoot } from "https://esm.sh/react-dom@19.1.1/client";
import { loadData, saveData } from "./storage.js";
import { cleanSchedulingWords, extractDate, formatDate, fromIso, iso, plusDays, weekDates } from "./dates.js";
import { useVoiceRecognition } from "./voice.js";

const { useCallback, useEffect, useMemo, useRef, useState } = React;
const h = React.createElement;
const VERSION = "9.0";

const EMPLOYEE_ALIASES = {
  "Артём Мишин": ["артём","артем","артёму","артему","тёма","тема","тёме","теме"],
  "Алексей": ["алексей","алексею","алексея","лёха","леха","лёхе","лехе","лёша","леша","лёшу","лешу"],
  "Дима": ["дима","диме","диму","дмитрий","дмитрию","димон","димону","митя","мите"]
};

function normalize(s) {
  return String(s || "").toLowerCase().replace(/ё/g,"е").replace(/[.,!?;:()[\]{}"']/g," ").replace(/\s+/g," ").trim();
}

function findEmployee(db, text) {
  const hay = ` ${normalize(text)} `;
  return db.employees.find(emp => {
    const aliases = [emp.name, ...(EMPLOYEE_ALIASES[emp.name] || [])].map(normalize);
    return aliases.some(a => a && hay.includes(` ${a} `));
  }) || null;
}

function stripEmployee(text, emp) {
  if (!emp) return text;
  let out = String(text);
  const aliases = [emp.name, ...(EMPLOYEE_ALIASES[emp.name] || [])].sort((a,b)=>b.length-a.length);
  for (const a of aliases) out = out.replace(new RegExp(a.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "ig"), " ");
  return out.replace(/\s+/g," ").trim();
}

function uid() {
  return Date.now() + Math.floor(Math.random() * 100000);
}

function usePersistentData() {
  const [db, setDb] = useState(() => loadData());
  useEffect(() => saveData(db), [db]);
  return [db, setDb];
}

function useTheme() {
  const [light, setLight] = useState(() => localStorage.getItem("assistant-theme") !== "dark");
  useEffect(() => {
    document.body.classList.toggle("light", light);
    localStorage.setItem("assistant-theme", light ? "light" : "dark");
  }, [light]);
  return [light, setLight];
}

function Header({ search, setSearch, onSettings, onCalc, light, setLight, onCalendar }) {
  return h("header", { className: "topbar" },
    h("div", { className: "searchbox" },
      h("span", null, "⌕"),
      h("input", { value: search, onChange: e => setSearch(e.target.value), placeholder: "Поиск…" })
    ),
    h("button", { className: "topbtn", onClick: onSettings, "aria-label": "Настройки" }, "⚙"),
    h("button", { className: "topbtn", onClick: onCalc, "aria-label": "Калькулятор" }, "⌘"),
    h("button", { className: "topbtn", onClick: () => setLight(!light), "aria-label": "Тема" }, light ? "◐" : "◑"),
    h("button", { className: "topbtn calendar-top", onClick: onCalendar, "aria-label": "Календарь" }, "▣",
      h("span", { className: "version-badge" }, `v${VERSION}`)
    )
  );
}

function NotesPanel({ notes, search, onDone }) {
  const filtered = notes.filter(n => n.text.toLowerCase().includes(search.toLowerCase()));
  return h("section", { className: "notes-panel", "data-noswipe": "true" },
    filtered.length
      ? filtered.map(n => h("div", { className: "note-row", key: n.id },
          h("button", { className: "check", onClick: () => onDone(n) }, ""),
          h("div", { className: "note-text" }, n.text)
        ))
      : h("div", { className: "empty" }, "Нет заметок")
  );
}

function GroupRow({ icon, title, meta, onClick, children, open }) {
  return h("div", { className: `folder ${open ? "open" : ""}` },
    h("button", { className: "folder-head", onClick },
      h("span", { className: "folder-icon" }, icon),
      h("span", { className: "folder-title" }, title),
      h("span", { className: "folder-meta" }, meta),
      h("span", { className: "chev" }, "›")
    ),
    open && children ? h("div", { className: "folder-body" }, children) : null
  );
}

function Home({ db, setDb, search, openScreen, openCalendar }) {
  const [openSection, setOpenSection] = useState(null);

  const completeNote = n => {
    setDb(prev => ({
      ...prev,
      notes: prev.notes.filter(x => x.id !== n.id),
      completed: [{ text: n.text, origin: "Заметки", at: new Date().toLocaleString("ru-RU") }, ...prev.completed]
    }));
  };

  const completeSectionItem = (sectionId, index) => {
    setDb(prev => {
      const sections = prev.sections.map(s => {
        if (s.id !== sectionId) return s;
        const items = [...s.items];
        const [text] = items.splice(index, 1);
        return { ...s, items };
      });
      const section = prev.sections.find(s => s.id === sectionId);
      const text = section?.items[index];
      return {
        ...prev,
        sections,
        completed: text ? [{ text, origin: section.name, at: new Date().toLocaleString("ru-RU") }, ...prev.completed] : prev.completed
      };
    });
  };

  return h("main", { className: "home-screen" },
    h(NotesPanel, { notes: db.notes, search, onDone: completeNote }),
    h("div", { className: "section-label" },
      h("b", null, "РАЗДЕЛЫ"),
      h("button", { onClick: () => {
        const name = prompt("Название нового раздела");
        if (!name?.trim()) return;
        setDb(prev => ({ ...prev, sections: [...prev.sections, { id: `s${uid()}`, name: name.trim(), icon: "📁", items: [] }] }));
      }}, "+")
    ),
    h("section", { className: "folders" },
      ...db.sections.map(s => h(GroupRow, {
        key: s.id, icon: s.icon || "📁", title: s.name, meta: String(s.items.length),
        open: openSection === s.id,
        onClick: () => setOpenSection(openSection === s.id ? null : s.id)
      }, s.items.map((item, i) => h("div", { className: "folder-item", key: `${s.id}-${i}` },
        h("span", null, item),
        h("button", { onClick: e => { e.stopPropagation(); completeSectionItem(s.id, i); } }, "✓")
      )))),
      h(GroupRow, { icon: "✓", title: "Выполненные", meta: String(db.completed.length), onClick: () => openScreen("completed") }),
      h(GroupRow, { icon: "♙", title: "Сотрудники", meta: `${db.employees.length} сотрудника`, onClick: () => openScreen("employees") }),
      h(GroupRow, { icon: "▣", title: "Календарь", meta: "Задачи по датам", onClick: openCalendar })
    )
  );
}

function TaskCard({ task, employee, onDone, onMove }) {
  return h("article", { className: "task-card" },
    h("div", { className: "task-title" }, task.text),
    h("div", { className: "task-meta" }, `${employee ? employee.name + " · " : ""}${formatDate(task.date)}${task.time ? " · " + task.time : ""}`),
    h("div", { className: "task-actions" },
      h("button", { onClick: () => onDone(task) }, "✓ Выполнено"),
      h("button", { onClick: () => onMove(task) }, "↻ Перенести")
    )
  );
}

function WeekPlanner({ db, anchor, setAnchor, onBack, onDone, onMove }) {
  const dates = weekDates(anchor);
  const [selected, setSelected] = useState(anchor);
  const touch = useRef(null);

  useEffect(() => setSelected(anchor), [anchor]);

  const tasks = db.tasks.filter(t => !t.done && t.date === selected);
  const employeeById = id => db.employees.find(e => e.id === id);

  const shiftDay = dir => {
    const index = dates.indexOf(selected);
    if (dir > 0 && index < dates.length - 1) setSelected(dates[index + 1]);
    else if (dir < 0 && index > 0) setSelected(dates[index - 1]);
    else if (dir < 0 && index === 0) onBack();
  };

  return h("main", {
      className: "sub-screen planner",
      onTouchStart: e => { touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; },
      onTouchEnd: e => {
        if (!touch.current) return;
        const dx = e.changedTouches[0].clientX - touch.current.x;
        const dy = e.changedTouches[0].clientY - touch.current.y;
        touch.current = null;
        if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.2) shiftDay(dx < 0 ? 1 : -1);
      }
    },
    h("div", { className: "sub-title" },
      h("button", { onClick: onBack }, "‹"),
      h("b", null, "План на неделю"),
      h("span", null, "")
    ),
    h("div", { className: "week-strip" },
      dates.map(d => h("button", { key: d, className: `day-chip ${d === selected ? "active" : ""}`, onClick: () => setSelected(d) },
        fromIso(d).toLocaleDateString("ru-RU", { weekday: "short", day: "numeric" })
      ))
    ),
    h("div", { className: "task-list" },
      tasks.length ? tasks.map(t => h(TaskCard, { key: t.id, task: t, employee: employeeById(t.employeeId), onDone, onMove }))
                   : h("div", { className: "empty" }, "На этот день задач нет")
    )
  );
}

function Overdue({ db, onBack, onDone, onMove }) {
  const tasks = db.tasks.filter(t => !t.done && t.date && t.date < iso());
  const touch = useRef(null);
  return h("main", {
      className: "sub-screen",
      onTouchStart: e => touch.current = e.touches[0].clientX,
      onTouchEnd: e => {
        if (touch.current == null) return;
        const dx = e.changedTouches[0].clientX - touch.current;
        touch.current = null;
        if (dx < -60) onBack();
      }
    },
    h("div", { className: "sub-title" },
      h("button", { onClick: onBack }, "‹"),
      h("b", null, "Просрочено"),
      h("span", { className: "count" }, `${tasks.length}`)
    ),
    h("div", { className: "task-list" },
      tasks.length ? tasks.map(t => h(TaskCard, {
        key: t.id, task: t, employee: db.employees.find(e => e.id === t.employeeId), onDone, onMove
      })) : h("div", { className: "empty" }, "Просроченных задач нет")
    )
  );
}

function Employees({ db, onBack }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(null);
  const list = db.employees.filter(e => e.name.toLowerCase().includes(q.toLowerCase()));

  return h("main", { className: "sub-screen" },
    h("div", { className: "sub-title" },
      h("button", { onClick: onBack }, "‹"),
      h("b", null, "Сотрудники"),
      h("span", null, "")
    ),
    h("div", { className: "employee-search" }, h("input", { value: q, onChange: e => setQ(e.target.value), placeholder: "Найти сотрудника…" })),
    h("div", { className: "employee-list" },
      list.map(emp => {
        const tasks = db.tasks.filter(t => t.employeeId === emp.id);
        const active = tasks.filter(t => !t.done);
        return h("article", { className: `employee-card ${open === emp.id ? "open" : ""}`, key: emp.id },
          h("button", { className: "employee-head", onClick: () => setOpen(open === emp.id ? null : emp.id) },
            h("span", { className: "avatar" }, emp.name[0]),
            h("span", { className: "employee-main" },
              h("b", null, emp.name),
              h("small", null, `${emp.role || "Сотрудник"} · ${active.length} активных`)
            ),
            h("span", null, "⌄")
          ),
          open === emp.id ? h("div", { className: "employee-details" },
            active.length ? active.map(t => h("div", { className: "emp-task", key: t.id }, h("b", null, t.text), h("small", null, formatDate(t.date))))
                          : h("div", { className: "empty compact" }, "Активных задач нет")
          ) : null
        );
      })
    )
  );
}

function Completed({ db, onBack }) {
  return h("main", { className: "sub-screen" },
    h("div", { className: "sub-title" }, h("button", { onClick: onBack }, "‹"), h("b", null, "Выполненные"), h("span", null, "")),
    h("div", { className: "task-list" },
      db.completed.length ? db.completed.map((c,i) => h("article", { className: "task-card", key: i },
        h("div", { className: "task-title" }, `✓ ${c.text}`),
        h("div", { className: "task-meta" }, `${c.origin || ""}${c.at ? " · " + c.at : ""}`)
      )) : h("div", { className: "empty" }, "Пока пусто")
    )
  );
}

function Modal({ title, children, onClose }) {
  return h("div", { className: "modal-layer", onMouseDown: e => { if (e.target === e.currentTarget) onClose(); } },
    h("div", { className: "modal-card" },
      h("div", { className: "modal-head" }, h("b", null, title), h("button", { onClick: onClose }, "×")),
      children
    )
  );
}

function CalendarModal({ initial, onSelect, onClose }) {
  const [month, setMonth] = useState(() => {
    const d = initial ? fromIso(initial) : new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const touch = useRef(null);

  const y = month.getFullYear(), m = month.getMonth();
  const first = new Date(y,m,1);
  const last = new Date(y,m+1,0);
  const lead = (first.getDay()+6)%7;
  const cells = [...Array(lead).fill(null), ...Array.from({length:last.getDate()},(_,i)=>i+1)];

  const shift = delta => setMonth(new Date(y, m + delta, 1));

  return h(Modal, { title: "Календарь", onClose },
    h("div", {
      className: "calendar",
      onTouchStart: e => touch.current = e.touches[0].clientX,
      onTouchEnd: e => {
        if (touch.current == null) return;
        const dx = e.changedTouches[0].clientX - touch.current; touch.current = null;
        if (Math.abs(dx)>60) shift(dx<0?1:-1);
      }
    },
      h("div", { className: "calendar-head" },
        h("button", { onClick: () => shift(-1) }, "‹"),
        h("b", null, month.toLocaleDateString("ru-RU",{month:"long",year:"numeric"})),
        h("button", { onClick: () => shift(1) }, "›")
      ),
      h("div", { className: "weekdays" }, ["Пн","Вт","Ср","Чт","Пт","Сб","Вс"].map(x=>h("span",{key:x},x))),
      h("div", { className: "calendar-grid" },
        cells.map((day,i) => day == null ? h("span",{key:`e${i}`}) : (() => {
          const value = iso(new Date(y,m,day,12));
          return h("button", {
            key:value, className: `${value===iso()?"today":""} ${value===initial?"selected":""}`,
            onClick:()=>onSelect(value)
          }, String(day));
        })())
      )
    )
  );
}

function SettingsModal({ onClose }) {
  const groups = [
    ["Голосовой ввод", ["Нажми 🎙 один раз — начать диктовку.","Нажми 🎙 ещё раз — сохранить сказанное.","⌫ слово — удалить последнее распознанное слово до сохранения."]],
    ["Заметки и даты", ["«Позвонить поставщику» → обычная заметка.","«В среду съездить на рыбалку» → задача на ближайшую среду.","«Завтра проверить склад» → задача на завтра.","«15 августа встретиться с клиентом» → задача на указанную дату."]],
    ["Сотрудники", ["«Лёхе позвонить клиенту завтра» → задача Алексею.","«Тёме проверить оборудование в пятницу» → задача Артёму.","«Диме съездить на склад» → задача Диме."]],
    ["Разделы", ["«Купить для производства перчатки» → добавляет покупку.","«Сделано» / «Выполнено» → выполняет последнюю заметку."]],
    ["Блокнот", ["Открой лист и включи 🎙 — текст пишется на текущий лист.","Рисовать — одним пальцем. Масштабировать — двумя пальцами."]]
  ];
  return h(Modal,{title:"Настройки",onClose},
    h("div",{className:"command-list"},
      groups.map(([title,lines])=>h("section",{className:"command-group",key:title},h("b",null,title),lines.map((x,i)=>h("span",{key:i},x))))
    ),
    h("div",{className:"small-note"},`React v${VERSION} · аудио не сохраняется · данные на устройстве`)
  );
}

function CalculatorModal({ onClose }) {
  const [value,setValue]=useState("");
  const [result,setResult]=useState("");
  const calc=()=>{
    try {
      if (!/^[0-9+\-*/().,\s]+$/.test(value)) throw new Error();
      const expr=value.replace(/,/g,".");
      setResult(String(Function(`"use strict";return (${expr})`)()));
    } catch { setResult("Ошибка"); }
  };
  return h(Modal,{title:"Калькулятор",onClose},
    h("input",{className:"field",value,onChange:e=>setValue(e.target.value),placeholder:"125*8"}),
    h("button",{className:"primary",onClick:calc},"Посчитать"),
    result?h("div",{className:"calc-result"},result):null
  );
}

function Notebook({ db, setDb, mode, setMode, onBack, voiceListening }) {
  const page = db.notebook[db.page] || {text:"",drawing:""};
  const [tool,setTool] = useState("text");
  const [zoom,setZoom] = useState(1);
  const canvasRef = useRef(null);
  const wrapRef = useRef(null);
  const ctxRef = useRef(null);
  const pointers = useRef(new Map());
  const drawing = useRef(false);
  const pinching = useRef(false);
  const last = useRef(null);
  const pinchStart = useRef({distance:0,zoom:1});

  const savePage = patch => setDb(prev => {
    const notebook = [...prev.notebook];
    notebook[prev.page] = {...notebook[prev.page], ...patch};
    return {...prev,notebook};
  });

  const setPage = index => setDb(prev=>({...prev,page:index}));

  useEffect(()=>{
    if(mode!=="editor") return;
    const canvas=canvasRef.current;
    if(!canvas) return;
    const rect=canvas.getBoundingClientRect();
    const dpr=Math.min(window.devicePixelRatio||1,2);
    canvas.width=Math.max(1,Math.round(rect.width*dpr));
    canvas.height=Math.max(1,Math.round(rect.height*dpr));
    const ctx=canvas.getContext("2d");
    ctx.setTransform(dpr,0,0,dpr,0,0);
    ctx.lineCap="round";ctx.lineJoin="round";
    ctxRef.current=ctx;
    ctx.clearRect(0,0,rect.width,rect.height);
    if(page.drawing){
      const img=new Image();
      img.onload=()=>ctx.drawImage(img,0,0,rect.width,rect.height);
      img.src=page.drawing;
    }
  },[mode,db.page]);

  const saveDrawing=()=>{
    const canvas=canvasRef.current;
    if(canvas) savePage({drawing:canvas.toDataURL("image/png")});
  };

  const point=e=>{
    const rect=canvasRef.current.getBoundingClientRect();
    return {x:e.clientX-rect.left,y:e.clientY-rect.top};
  };

  const distance=()=>{
    const a=[...pointers.current.values()];
    if(a.length<2)return 0;
    return Math.hypot(a[1].x-a[0].x,a[1].y-a[0].y);
  };

  const pointerDown=e=>{
    if(tool==="text") return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId,{x:e.clientX,y:e.clientY});

    if(pointers.current.size>=2){
      pinching.current=true;
      drawing.current=false;
      pinchStart.current={distance:distance(),zoom};
      return;
    }
    if(pinching.current)return;
    drawing.current=true;
    last.current=point(e);
  };

  const pointerMove=e=>{
    if(tool==="text")return;
    if(pointers.current.has(e.pointerId)) pointers.current.set(e.pointerId,{x:e.clientX,y:e.clientY});

    if(pointers.current.size>=2 || pinching.current){
      pinching.current=true;
      drawing.current=false;
      const d=distance();
      if(d && pinchStart.current.distance){
        setZoom(Math.max(.8,Math.min(2.6,pinchStart.current.zoom*d/pinchStart.current.distance)));
      }
      return;
    }

    if(!drawing.current || !last.current)return;
    const ctx=ctxRef.current;
    const p=point(e);
    ctx.globalCompositeOperation=tool==="erase"?"destination-out":"source-over";
    ctx.strokeStyle="#2d2927";
    ctx.lineWidth=tool==="erase"?22:3;
    ctx.beginPath();ctx.moveTo(last.current.x,last.current.y);ctx.lineTo(p.x,p.y);ctx.stroke();
    last.current=p;
  };

  const pointerUp=e=>{
    pointers.current.delete(e.pointerId);
    if(pinching.current){
      if(pointers.current.size<2) {
        pinching.current=false;
        drawing.current=false;
        last.current=null;
      }
      return;
    }
    if(drawing.current)saveDrawing();
    drawing.current=false;last.current=null;
  };

  if(mode==="gallery"){
    return h("main",{className:"notebook-screen"},
      h("div",{className:"nb-head"},
        h("button",{onClick:onBack},"‹"),h("b",null,"Блокнот"),
        h("button",{onClick:()=>setMode("editor")},"✎")
      ),
      h("div",{className:"gallery-title"},h("b",null,"Листы"),h("button",{onClick:()=>{
        setDb(prev=>({...prev,notebook:[...prev.notebook,{text:"",drawing:""}],page:prev.notebook.length}));
        setMode("editor");
      }},"＋ Новый лист")),
      h("div",{className:"sheet-grid"},
        db.notebook.map((p,i)=>h("button",{className:`sheet-thumb ${i===db.page?"active":""}`,key:i,onClick:()=>{setPage(i);setMode("editor");}},
          p.drawing?h("img",{src:p.drawing,alt:""}):null,
          h("span",{className:"sheet-text"},p.text.slice(0,160)),
          h("span",{className:"sheet-num"},String(i+1))
        )),
        h("button",{className:"sheet-thumb add",onClick:()=>{
          setDb(prev=>({...prev,notebook:[...prev.notebook,{text:"",drawing:""}],page:prev.notebook.length}));
          setMode("editor");
        }},h("span",null,"＋"),h("small",null,"Добавить лист"))
      )
    );
  }

  return h("main",{className:"notebook-screen"},
    h("div",{className:"nb-head"},
      h("button",{onClick:onBack},"‹"),h("b",null,"Блокнот"),
      h("button",{onClick:()=>setMode("gallery")},"▦")
    ),
    h("div",{className:"notebook-tools"},
      h("button",{className:tool==="text"?"active":"",onClick:()=>setTool("text")},"Текст"),
      h("button",{className:tool==="draw"?"active":"",onClick:()=>setTool("draw")},"✎"),
      h("button",{className:tool==="erase"?"active":"",onClick:()=>setTool("erase")},"⌫"),
      h("button",{onClick:()=>{ctxRef.current?.clearRect(0,0,canvasRef.current.clientWidth,canvasRef.current.clientHeight);savePage({drawing:""});}},"Очистить"),
      h("button",{onClick:()=>setZoom(z=>Math.max(.8,z-.2))},"−"),
      h("button",{onClick:()=>setZoom(z=>Math.min(2.6,z+.2))},"＋")
    ),
    h("div",{className:"paper-scroll",ref:wrapRef},
      h("div",{className:"paper",style:{transform:`scale(${zoom})`,width:`${100/zoom}%`,height:`${100/zoom}%`}},
        h("span",{className:"page-label"},`Лист ${db.page+1}`),
        h("span",{className:"zoom-label"},`${Math.round(zoom*100)}%`),
        h("textarea",{value:page.text,onChange:e=>savePage({text:e.target.value}),disabled:tool!=="text",placeholder:voiceListening?"Говорите…":""}),
        h("canvas",{ref:canvasRef,className:tool==="text"?"disabled":"",
          onPointerDown:pointerDown,onPointerMove:pointerMove,onPointerUp:pointerUp,onPointerCancel:pointerUp
        })
      )
    )
  );
}

function VoiceDock({ listening, text, error, onMic, onDeleteWord, screen, onNotebook, notebookMode, onBack }) {
  return h(React.Fragment,null,
    (listening || text || error) ? h("div",{className:"voice-live"},
      h("div",{className:"voice-live-head"},h("b",null,listening?"Слушаю…":error?"Ошибка":"Распознано"),listening?h("button",{onClick:onDeleteWord},"⌫ слово"):null),
      h("div",{className:"voice-live-text"},error || text || "Говорите…")
    ):null,
    h("aside",{className:"float-dock"},
      h("button",{className:"float-btn",onClick:onNotebook,title:"Блокнот"},screen==="notebook"&&notebookMode==="gallery"?"✎":"▤"),
      h("button",{className:"float-btn",onClick:onBack,title:"Назад/домой"},screen==="home"?"⌂":"←"),
      h("button",{className:`float-btn mic ${listening?"listening":""}`,onClick:onMic,title:"Голосовой ввод"},"🎙")
    )
  );
}

function App() {
  const [db,setDb]=usePersistentData();
  const [light,setLight]=useTheme();
  const [search,setSearch]=useState("");
  const [screen,setScreen]=useState("home");
  const [notebookMode,setNotebookMode]=useState("editor");
  const [weekAnchor,setWeekAnchor]=useState(iso());
  const [modal,setModal]=useState(null);
  const mainTouch=useRef(null);

  const completeTask=task=>setDb(prev=>({
    ...prev,
    tasks:prev.tasks.map(t=>t.id===task.id?{...t,done:true}:t),
    completed:[{text:task.text,origin:"План",at:new Date().toLocaleString("ru-RU")},...prev.completed]
  }));

  const moveTask=task=>{
    const value=prompt("Новая дата YYYY-MM-DD",task.date||iso());
    if(!value)return;
    setDb(prev=>({...prev,tasks:prev.tasks.map(t=>t.id===task.id?{...t,date:value}:t)}));
  };

  const routeVoice=useCallback(text=>{
    const low=normalize(text);

    if(/^(сделано|выполнено|готово)$/.test(low)){
      setDb(prev=>{
        const note=prev.notes[0];
        if(!note)return prev;
        return {...prev,notes:prev.notes.slice(1),completed:[{text:note.text,origin:"Заметки",at:new Date().toLocaleString("ru-RU")},...prev.completed]};
      });
      return;
    }

    if(screen==="notebook" && notebookMode==="editor"){
      setDb(prev=>{
        const notebook=[...prev.notebook];
        const page=notebook[prev.page]||{text:"",drawing:""};
        notebook[prev.page]={...page,text:(page.text?`${page.text}\n`:"")+text};
        return {...prev,notebook};
      });
      return;
    }

    const employee=findEmployee(db,text);
    const date=extractDate(text);
    const buy=/купить|для производства|покупк/.test(low);

    if(buy){
      let clean=String(text).replace(/добавь|добавить|купить для производства|для производства/gi," ").replace(/\s+/g," ").trim();
      if(!clean)clean=text;
      setDb(prev=>({...prev,sections:prev.sections.map(s=>s.id==="buy"?{...s,items:[clean,...s.items]}:s)}));
      return;
    }

    if(employee || date){
      let clean=stripEmployee(text,employee);
      clean=cleanSchedulingWords(clean);
      if(!clean)clean=text;
      const task={id:uid(),text:clean,date:date||iso(),time:"",employeeId:employee?.id||null,done:false};
      setDb(prev=>({...prev,tasks:[...prev.tasks,task]}));
      return;
    }

    setDb(prev=>({...prev,notes:[{id:uid(),text},...prev.notes]}));
  },[db,notebookMode,screen,setDb]);

  const voice=useVoiceRecognition({onCommit:routeVoice});

  const goHome=()=>{
    if(voice.listening)voice.stop(false);
    setScreen("home");
  };

  const contextBack=()=>{
    if(voice.listening)voice.stop(false);
    if(screen==="notebook" && notebookMode==="gallery"){setNotebookMode("editor");return;}
    if(screen!=="home"){setScreen("home");return;}
  };

  const openNotebook=()=>{
    if(voice.listening)voice.stop(false);
    if(screen==="notebook"){
      setNotebookMode(m=>m==="gallery"?"editor":"gallery");
    }else{
      setScreen("notebook");setNotebookMode("editor");
    }
  };

  const selectCalendarDate=value=>{
    setModal(null);
    setWeekAnchor(value);
    setScreen("week");
  };

  const openCalendar=()=>setModal("calendar");

  const onMainTouchStart=e=>{
    if(e.target.closest("[data-noswipe],button,input,textarea"))return;
    mainTouch.current={x:e.touches[0].clientX,y:e.touches[0].clientY};
  };
  const onMainTouchEnd=e=>{
    if(!mainTouch.current)return;
    const dx=e.changedTouches[0].clientX-mainTouch.current.x;
    const dy=e.changedTouches[0].clientY-mainTouch.current.y;
    mainTouch.current=null;
    if(Math.abs(dx)<65||Math.abs(dx)<Math.abs(dy)*1.2)return;
    if(dx>0)setScreen("overdue");
    else{setWeekAnchor(iso());setScreen("week");}
  };

  let content;
  if(screen==="home") content=h("div",{className:"swipe-stage",onTouchStart:onMainTouchStart,onTouchEnd:onMainTouchEnd},
      h(Home,{db,setDb,search,openScreen:setScreen,openCalendar}));
  else if(screen==="week") content=h(WeekPlanner,{db,anchor:weekAnchor,setAnchor:setWeekAnchor,onBack:goHome,onDone:completeTask,onMove:moveTask});
  else if(screen==="overdue") content=h(Overdue,{db,onBack:goHome,onDone:completeTask,onMove:moveTask});
  else if(screen==="employees") content=h(Employees,{db,onBack:goHome});
  else if(screen==="completed") content=h(Completed,{db,onBack:goHome});
  else if(screen==="notebook") content=h(Notebook,{db,setDb,mode:notebookMode,setMode:setNotebookMode,onBack:goHome,voiceListening:voice.listening});

  return h("div",{className:"app"},
    screen!=="notebook" ? h(Header,{search,setSearch,onSettings:()=>setModal("settings"),onCalc:()=>setModal("calc"),light,setLight,onCalendar:openCalendar}) : null,
    content,
    h(VoiceDock,{
      listening:voice.listening,text:voice.displayText,error:voice.error,onMic:voice.toggle,onDeleteWord:voice.deleteLastWord,
      screen,onNotebook:openNotebook,notebookMode,onBack:contextBack
    }),
    modal==="settings"?h(SettingsModal,{onClose:()=>setModal(null)}):null,
    modal==="calc"?h(CalculatorModal,{onClose:()=>setModal(null)}):null,
    modal==="calendar"?h(CalendarModal,{initial:weekAnchor,onSelect:selectCalendarDate,onClose:()=>setModal(null)}):null
  );
}

createRoot(document.getElementById("root")).render(h(App));

if("serviceWorker" in navigator){
  navigator.serviceWorker.register("./sw.js",{updateViaCache:"none"}).then(r=>r.update()).catch(()=>{});
}
