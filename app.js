import React from "https://esm.sh/react@19.1.1";
import { createRoot } from "https://esm.sh/react-dom@19.1.1/client";
import { loadData, saveData } from "./storage.js";
import { cleanSchedulingWords, extractDate, formatDate, fromIso, iso, plusDays, weekDates } from "./dates.js";
import { useVoiceRecognition } from "./voice.js";

const { useCallback, useEffect, useMemo, useRef, useState } = React;
const h = React.createElement;
const VERSION = "9.3";

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

function Header({ search, setSearch, onSettings, light, setLight, onApps }) {
  return h("header", { className: "topbar v93" },
    h("div", { className: "searchbox" },
      h("span", null, "⌕"),
      h("input", { value: search, onChange: e => setSearch(e.target.value), placeholder: "Поиск…" })
    ),
    h("button", { className: "topbtn", onClick: onSettings, "aria-label": "Настройки" }, "⚙"),
    h("button", { className: "topbtn", onClick: () => setLight(!light), "aria-label": "Тема" }, light ? "◐" : "◑"),
    h("button", { className: "topbtn apps-top", onClick: onApps, "aria-label": "Приложения" }, "▦",
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

function LegacyHome({ db, setDb, search, openScreen, openCalendar }) {
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


function shiftIsoDay(value, delta) {
  const d = fromIso(value);
  d.setDate(d.getDate() + delta);
  return iso(d);
}

function DayTaskRow({ task, employee, onDone, onMore }) {
  return h("div",{className:"day-note-row"},
    h("button",{className:"day-check",onClick:()=>onDone(task),"aria-label":"Выполнено"},""),
    h("div",{className:"day-note-main"},
      h("div",{className:"day-note-text"},task.text),
      employee?h("small",null,employee.name):null
    ),
    h("button",{className:"note-more",onClick:()=>onMore(task),"aria-label":"Перенести"},"•••")
  );
}

function DayHome({db,setDb,selectedDay,setSelectedDay,search,onCompleteTask,onOpenSection,onMoveTask}) {
  const [drawerOpen,setDrawerOpen]=useState(false);
  const [draft,setDraft]=useState("");
  const touch=useRef(null);
  const drawerTouch=useRef(null);
  const isToday=selectedDay===iso();

  const dayTasks=db.tasks
    .filter(t=>!t.done && t.date===selectedDay && t.text.toLowerCase().includes(search.toLowerCase()))
    .sort((a,b)=>(a.time||"").localeCompare(b.time||""));

  const addTyped=()=>{
    const text=draft.trim();
    if(!text)return;
    const task={id:uid(),text,date:selectedDay,time:"",employeeId:null,done:false};
    setDb(prev=>({...prev,tasks:[...prev.tasks,task]}));
    setDraft("");
  };

  const dayDate=fromIso(selectedDay);
  const dayLabel=dayDate.toLocaleDateString("ru-RU",{weekday:"long",day:"numeric",month:"long"});
  const year=dayDate.getFullYear();

  const swipeStart=e=>{
    if(e.target.closest("button,input,textarea,[data-noswipe]"))return;
    touch.current={x:e.touches[0].clientX,y:e.touches[0].clientY};
  };
  const swipeEnd=e=>{
    if(!touch.current)return;
    const dx=e.changedTouches[0].clientX-touch.current.x;
    const dy=e.changedTouches[0].clientY-touch.current.y;
    touch.current=null;
    if(Math.abs(dx)<55||Math.abs(dx)<Math.abs(dy)*1.2)return;
    setSelectedDay(d=>shiftIsoDay(d,dx<0?1:-1));
  };

  const compactGroups=[
    ...db.sections.map(s=>({id:s.id,icon:s.icon||"📁",title:s.name,meta:String(s.items.length)})),
    {id:"completed",icon:"✓",title:"Выполненные",meta:String(db.completed.length)}
  ];

  return h("main",{className:"day-home v93",onTouchStart:swipeStart,onTouchEnd:swipeEnd},
    h("div",{className:`day-date-plaque ${isToday?"today":""}`},
      h("div",{className:"day-date-main"},
        h("b",null,dayLabel),
        h("small",null,String(year))
      ),
      isToday?h("span",{className:"today-badge"},h("i",null),"Сегодня"):null
    ),

    h("section",{className:"day-content"},
      h("div",{className:"day-list"},
        dayTasks.length
          ? dayTasks.map(t=>h(DayTaskRow,{
              key:t.id,task:t,employee:db.employees.find(e=>e.id===t.employeeId),
              onDone:onCompleteTask,onMore:onMoveTask
            }))
          : h("div",{className:"day-empty"},
              h("b",null,isToday?"На сегодня всё свободно":"На этот день ничего не запланировано"),
              h("span",null,"Добавь запись голосом или с клавиатуры")
            )
      )
    ),

    h("div",{className:"day-composer","data-noswipe":"true"},
      h("input",{
        value:draft,
        onChange:e=>setDraft(e.target.value),
        onKeyDown:e=>{if(e.key==="Enter")addTyped()},
        placeholder:"＋ Написать…"
      }),
      h("button",{onClick:addTyped,disabled:!draft.trim()},"Добавить")
    ),

    h("section",{
      className:`sections-drawer compact ${drawerOpen?"open":""}`,
      onTouchStart:e=>drawerTouch.current=e.touches[0].clientY,
      onTouchEnd:e=>{
        if(drawerTouch.current==null)return;
        const dy=e.changedTouches[0].clientY-drawerTouch.current;
        drawerTouch.current=null;
        if(dy<-30)setDrawerOpen(true);
        if(dy>30)setDrawerOpen(false);
      }
    },
      h("button",{className:"drawer-handle",onClick:()=>setDrawerOpen(v=>!v)},
        h("span",{className:"handle-line"}),
        h("b",null,"Разделы"),
        h("span",{className:"drawer-arrow"},drawerOpen?"⌄":"⌃")
      ),
      h("div",{className:"drawer-horizontal"},
        compactGroups.map(row=>h("button",{className:"group-chip",key:row.id,onClick:()=>onOpenSection(row.id)},
          h("span",{className:"group-chip-icon"},row.icon),
          h("span",{className:"group-chip-title"},row.title),
          h("span",{className:"group-chip-meta"},row.meta)
        ))
      )
    )
  );
}

function SectionScreen({db,setDb,sectionId,onBack}) {
  const section=db.sections.find(s=>s.id===sectionId);
  const [draft,setDraft]=useState("");
  const [subDrafts,setSubDrafts]=useState({});
  if(!section)return h("main",{className:"sub-screen"},h("button",{onClick:onBack},"Назад"));

  const normalizeItem=item=>typeof item==="string"
    ? {id:uid(),title:item,subnotes:[]}
    : {id:item.id||uid(),title:item.title||item.text||"",subnotes:Array.isArray(item.subnotes)?item.subnotes:[]};

  const items=section.items.map(normalizeItem);

  const saveItems=next=>setDb(prev=>({
    ...prev,
    sections:prev.sections.map(s=>s.id===sectionId?{...s,items:next}:s)
  }));

  const addNote=()=>{
    const title=draft.trim();if(!title)return;
    saveItems([...items,{id:uid(),title,subnotes:[]}]);
    setDraft("");
  };

  const addSub=(itemId)=>{
    const text=(subDrafts[itemId]||"").trim();if(!text)return;
    saveItems(items.map(item=>item.id===itemId?{...item,subnotes:[...item.subnotes,{id:uid(),text}]}:item));
    setSubDrafts(prev=>({...prev,[itemId]:""}));
  };

  return h("main",{className:"section-screen"},
    h("div",{className:"sub-title section-screen-title"},
      h("button",{onClick:onBack},"‹"),
      h("b",null,section.name),
      h("span",null,"")
    ),
    h("div",{className:"section-note-composer"},
      h("input",{value:draft,onChange:e=>setDraft(e.target.value),onKeyDown:e=>{if(e.key==="Enter")addNote()},placeholder:"＋ Новая заметка…"}),
      h("button",{onClick:addNote},"Добавить")
    ),
    h("div",{className:"section-notes"},
      items.length?items.map(item=>h("article",{className:"section-note",key:item.id},
        h("div",{className:"section-note-title"},item.title),
        h("div",{className:"subnotes"},
          item.subnotes.map(sub=>h("div",{className:"subnote",key:sub.id||sub.text},
            h("span",{className:"subnote-dot"},"—"),
            h("span",null,sub.text||sub)
          ))
        ),
        h("div",{className:"subnote-composer"},
          h("input",{value:subDrafts[item.id]||"",onChange:e=>setSubDrafts(prev=>({...prev,[item.id]:e.target.value})),onKeyDown:e=>{if(e.key==="Enter")addSub(item.id)},placeholder:"Добавить подзаметку…"}),
          h("button",{onClick:()=>addSub(item.id)},"＋")
        )
      )):h("div",{className:"day-empty"},h("b",null,"Пока пусто"),h("span",null,"Добавь первую заметку"))
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


function CalendarGrid({initial,onSelect,taskDates=[],completedDates=[],overdueDates=[]}) {
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

  return h("div", {
      className:"calendar calendar-v3",
      onTouchStart:e=>touch.current=e.touches[0].clientX,
      onTouchEnd:e=>{
        if(touch.current==null)return;
        const dx=e.changedTouches[0].clientX-touch.current;touch.current=null;
        if(Math.abs(dx)>60)shift(dx<0?1:-1);
      }
    },
    h("div",{className:"calendar-head"},
      h("button",{onClick:()=>shift(-1)},"‹"),
      h("b",null,month.toLocaleDateString("ru-RU",{month:"long",year:"numeric"})),
      h("button",{onClick:()=>shift(1)},"›")
    ),
    h("div",{className:"weekdays"},["Пн","Вт","Ср","Чт","Пт","Сб","Вс"].map(x=>h("span",{key:x},x))),
    h("div",{className:"calendar-grid"},
      cells.map((day,i)=>day==null?h("span",{key:`e${i}`}):(()=>{
        const value=iso(new Date(y,m,day,12));
        const hasTask=taskDates.includes(value);
        const hasDone=completedDates.includes(value);
        const hasOverdue=overdueDates.includes(value);
        return h("button",{
          key:value,
          className:`calendar-day ${value===iso()?"today":""} ${value===initial?"selected":""}`,
          onClick:()=>onSelect(value)
        },
          h("span",null,String(day)),
          (hasTask||hasDone||hasOverdue)?h("i",{className:`day-dot ${hasOverdue?"overdue":hasDone?"done":"task"}`}):null
        );
      })())
    )
  );
}

function CalendarModal({ initial, db, onSelect, onClose }) {
  const [view,setView]=useState("calendar");
  const taskDates=[...new Set(db.tasks.filter(t=>!t.done&&t.date).map(t=>t.date))];
  const overdueDates=[...new Set(db.tasks.filter(t=>!t.done&&t.date&&t.date<iso()).map(t=>t.date))];

  const nearby=useMemo(()=>{
    const map=new Map();
    db.tasks.filter(t=>!t.done&&t.date>=iso()).sort((a,b)=>a.date.localeCompare(b.date)).forEach(t=>{
      map.set(t.date,(map.get(t.date)||0)+1);
    });
    return [...map.entries()].slice(0,7);
  },[db]);

  return h(Modal,{title:"Календарь",onClose},
    h("div",{className:"calendar-view-tabs"},
      h("button",{className:view==="calendar"?"active":"",onClick:()=>setView("calendar")},"Календарь"),
      h("button",{className:view==="list"?"active":"",onClick:()=>setView("list")},"Список")
    ),
    view==="calendar"
      ? h(React.Fragment,null,
          h(CalendarGrid,{initial,onSelect,taskDates,overdueDates}),
          h("div",{className:"calendar-nearby-title"},"Ближайшие даты с задачами"),
          h("div",{className:"calendar-nearby"},
            nearby.length?nearby.map(([date,count])=>h("button",{key:date,onClick:()=>onSelect(date)},
              h("span",null,fromIso(date).toLocaleDateString("ru-RU",{weekday:"long",day:"numeric",month:"short"})),
              h("b",null,String(count)),h("i",null,"›")
            )):h("div",{className:"empty compact"},"Нет ближайших задач")
          )
        )
      : h("div",{className:"calendar-list"},
          nearby.length?nearby.map(([date,count])=>h("button",{key:date,onClick:()=>onSelect(date)},
            h("b",null,fromIso(date).toLocaleDateString("ru-RU",{weekday:"long",day:"numeric",month:"long"})),
            h("span",null,`${count} задач`)
          )):h("div",{className:"empty"},"Нет задач")
        )
  );
}

function TransferModal({task,db,onMoveDate,onMoveCategory,onClose}) {
  const [mode,setMode]=useState("date");
  const [picked,setPicked]=useState(task?.date||iso());

  return h(Modal,{title:"Перенести заметку",onClose},
    h("div",{className:"transfer-tabs"},
      h("button",{className:mode==="date"?"active":"",onClick:()=>setMode("date")},"Дата"),
      h("button",{className:mode==="category"?"active":"",onClick:()=>setMode("category")},"Категория")
    ),
    h("div",{className:"transfer-task"},task?.text||""),
    mode==="date"
      ? h(React.Fragment,null,
          h(CalendarGrid,{
            initial:picked,
            onSelect:setPicked,
            taskDates:[...new Set(db.tasks.filter(t=>!t.done&&t.date).map(t=>t.date))],
            overdueDates:[...new Set(db.tasks.filter(t=>!t.done&&t.date&&t.date<iso()).map(t=>t.date))]
          }),
          h("div",{className:"quick-date-row"},
            [["Сегодня",iso()],["Завтра",plusDays(1)],["Через 3 дня",plusDays(3)],["Через неделю",plusDays(7)]].map(([label,val])=>
              h("button",{key:label,onClick:()=>setPicked(val)},label)
            )
          ),
          h("button",{className:"primary",onClick:()=>onMoveDate(task,picked)},"Перенести на дату")
        )
      : h("div",{className:"category-picker"},
          db.sections.map(s=>h("button",{key:s.id,onClick:()=>onMoveCategory(task,s.id)},
            h("span",{className:"category-icon"},s.icon||"📁"),
            h("span",{className:"category-name"},s.name),
            h("span",{className:"category-count"},String(s.items.length)),
            h("span",{className:"category-arrow"},"›")
          ))
        )
  );
}

function AppsMenu({onClose,onEmployees,onCalendar,onCalculator,onNotebook}) {
  const items=[
    ["♙","Сотрудники",onEmployees],
    ["▣","Календарь",onCalendar],
    ["⌘","Калькулятор",onCalculator],
    ["▤","Блокнот",onNotebook]
  ];
  return h("div",{className:"apps-menu-layer",onMouseDown:e=>{if(e.target===e.currentTarget)onClose()}},
    h("div",{className:"apps-menu"},
      h("div",{className:"apps-menu-head"},h("b",null,"Инструменты"),h("button",{onClick:onClose},"×")),
      h("div",{className:"apps-grid"},
        items.map(([icon,label,fn])=>h("button",{key:label,onClick:()=>{onClose();fn()}},
          h("span",null,icon),h("b",null,label)
        ))
      )
    )
  );
}

function SettingsModal({ onClose }) {
  const groups = [
    ["Голосовой ввод", ["Нажми 🎙 один раз — начать диктовку.","Нажми 🎙 ещё раз — сохранить сказанное.","⌫ слово — удалить последнее распознанное слово до сохранения."]],
    ["День и даты", ["«Позвонить поставщику» → запись на открытый сейчас день.","«В среду съездить на рыбалку» → запись на ближайшую среду.","«Завтра проверить склад» → задача на завтра.","«15 августа встретиться с клиентом» → задача на указанную дату."]],
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
  const [tab,setTab]=useState("main");
  const [expr,setExpr]=useState("");
  const [result,setResult]=useState("0");
  const [memory,setMemory]=useState(0);
  const [history,setHistory]=useState(()=>{
    try{return JSON.parse(localStorage.getItem("assistant-calc-history")||"[]")}catch{return []}
  });
  const [showHistory,setShowHistory]=useState(false);
  const [convert,setConvert]=useState({kind:"length",value:"1",from:"m",to:"cm"});

  useEffect(()=>{localStorage.setItem("assistant-calc-history",JSON.stringify(history.slice(0,80)))},[history]);

  const safeEval=raw=>{
    let x=String(raw||"")
      .replace(/×/g,"*").replace(/÷/g,"/").replace(/,/g,".")
      .replace(/π/g,String(Math.PI)).replace(/\be\b/g,String(Math.E))
      .replace(/\^/g,"**");
    if(!/^[0-9+\-*/().\s*]+$/.test(x))throw new Error();
    return Function(`"use strict";return (${x})`)();
  };

  const commit=(label=expr,value=null)=>{
    try{
      const v=value===null?safeEval(expr):value;
      if(!Number.isFinite(v))throw new Error();
      const text=Number(v.toFixed(10)).toLocaleString("ru-RU",{maximumFractionDigits:10});
      setResult(text);
      setHistory(prev=>[{expr:label,result:text,at:new Date().toLocaleTimeString("ru-RU",{hour:"2-digit",minute:"2-digit"})},...prev].slice(0,80));
      return v;
    }catch{
      setResult("Ошибка");
      return null;
    }
  };

  const append=s=>setExpr(v=>v+String(s));
  const back=()=>setExpr(v=>v.slice(0,-1));
  const clear=()=>{setExpr("");setResult("0")};
  const unary=(name,fn)=>{
    try{
      const base=expr?safeEval(expr):Number(String(result).replace(/\s/g,"").replace(",","."));
      const v=fn(base);
      if(!Number.isFinite(v))throw new Error();
      setExpr(String(v));
      commit(`${name}(${base})`,v);
    }catch{setResult("Ошибка")}
  };

  const mainKeys=[
    ["(",()=>append("(")], [")",()=>append(")")], ["%",()=>append("/100")], ["⌫",back],
    ["7",()=>append("7")],["8",()=>append("8")],["9",()=>append("9")],["÷",()=>append("÷")],
    ["4",()=>append("4")],["5",()=>append("5")],["6",()=>append("6")],["×",()=>append("×")],
    ["1",()=>append("1")],["2",()=>append("2")],["3",()=>append("3")],["−",()=>append("-")],
    ["+/-",()=>setExpr(v=>v.startsWith("-")?v.slice(1):"-"+v)],["0",()=>append("0")],[",",()=>append(".")],["+",()=>append("+")]
  ];

  const scientific=[
    ["x²",()=>unary("x²",x=>x*x)],["x³",()=>unary("x³",x=>x*x*x)],["√x",()=>unary("√",Math.sqrt)],["∛x",()=>unary("∛",Math.cbrt)],
    ["xʸ",()=>append("^")],["1/x",()=>unary("1/x",x=>1/x)],["|x|",()=>unary("|x|",Math.abs)],["π",()=>append("π")],
    ["sin",()=>unary("sin",x=>Math.sin(x*Math.PI/180))],["cos",()=>unary("cos",x=>Math.cos(x*Math.PI/180))],["tan",()=>unary("tan",x=>Math.tan(x*Math.PI/180))],["e",()=>append("e")]
  ];

  const conv={
    length:{label:"Длина",units:{mm:.001,cm:.01,m:1,km:1000}},
    area:{label:"Площадь",units:{"мм²":.000001,"см²":.0001,"м²":1,"км²":1000000}},
    volume:{label:"Объём",units:{"мл":.001,"л":1,"м³":1000}},
    mass:{label:"Масса",units:{g:.001,kg:1,t:1000}}
  };
  const c=conv[convert.kind];
  const convertResult=()=>{
    const n=Number(String(convert.value).replace(",","."));
    if(!Number.isFinite(n))return 0;
    return n*c.units[convert.from]/c.units[convert.to];
  };

  return h("div",{className:"calculator-screen"},
    h("div",{className:"calc-top"},
      h("button",{onClick:onClose},"‹"),
      h("b",null,"Калькулятор"),
      h("div",{className:"calc-top-actions"},
        h("button",{onClick:()=>setShowHistory(v=>!v)},"↶"),
        h("button",{onClick:()=>clear()},"⋮")
      )
    ),
    h("div",{className:"calc-mode-tabs"},
      h("button",{className:tab==="main"?"active":"",onClick:()=>setTab("main")},"Основной"),
      h("button",{className:tab==="science"?"active":"",onClick:()=>setTab("science")},"Научный"),
      h("button",{className:tab==="convert"?"active":"",onClick:()=>setTab("convert")},"Конвертер")
    ),
    showHistory?h("div",{className:"calc-history-panel"},
      h("div",{className:"calc-history-head"},h("b",null,"История"),h("button",{onClick:()=>setHistory([])},"Очистить")),
      history.length?history.map((x,i)=>h("button",{key:i,onClick:()=>{setExpr(x.expr);setResult(x.result);setShowHistory(false)}},
        h("span",null,x.expr),h("b",null,x.result),h("small",null,x.at)
      )):h("div",{className:"empty compact"},"История пуста")
    ):null,
    tab!=="convert"?h(React.Fragment,null,
      h("div",{className:"calc-display"},
        h("div",{className:"calc-expression"},expr||"0"),
        h("div",{className:"calc-big-result"},result),
        history[0]?h("div",{className:"calc-last"},`${history[0].expr} = ${history[0].result}`):null
      ),
      tab==="main"?h(React.Fragment,null,
        h("div",{className:"memory-row"},
          h("button",{onClick:()=>setMemory(0)},"mc"),
          h("button",{onClick:()=>setMemory(m=>m+(Number(String(result).replace(/\s/g,"").replace(",","."))||0))},"m+"),
          h("button",{onClick:()=>setMemory(m=>m-(Number(String(result).replace(/\s/g,"").replace(",","."))||0))},"m−"),
          h("button",{onClick:()=>setExpr(String(memory))},"mr")
        ),
        h("div",{className:"calc-keypad main"},mainKeys.map(([label,fn])=>h("button",{key:label,onClick:fn,className:/[÷×−+]/.test(label)?"op":""},label)))
      ):h(React.Fragment,null,
        h("div",{className:"science-grid"},scientific.map(([label,fn])=>h("button",{key:label,onClick:fn},label))),
        h("div",{className:"calc-keypad main science-numbers"},mainKeys.slice(4).map(([label,fn])=>h("button",{key:label,onClick:fn,className:/[÷×−+]/.test(label)?"op":""},label)))
      ),
      h("button",{className:"calc-equals",onClick:()=>commit()},"=")
    ):h("div",{className:"converter-panel"},
      h("div",{className:"converter-kind"},Object.entries(conv).map(([id,o])=>h("button",{key:id,className:convert.kind===id?"active":"",onClick:()=>{
        const keys=Object.keys(o.units);setConvert({kind:id,value:"1",from:keys[0],to:keys[1]||keys[0]})
      }},o.label))),
      h("label",null,h("span",null,"Значение"),h("input",{inputMode:"decimal",value:convert.value,onChange:e=>setConvert({...convert,value:e.target.value})})),
      h("div",{className:"converter-selects"},
        h("select",{value:convert.from,onChange:e=>setConvert({...convert,from:e.target.value})},Object.keys(c.units).map(u=>h("option",{key:u,value:u},u))),
        h("span",null,"→"),
        h("select",{value:convert.to,onChange:e=>setConvert({...convert,to:e.target.value})},Object.keys(c.units).map(u=>h("option",{key:u,value:u},u)))
      ),
      h("div",{className:"converter-result"},`${Number(convertResult()).toLocaleString("ru-RU",{maximumFractionDigits:8})} ${convert.to}`)
    )
  );
}

function Notebook({ db, setDb, mode, setMode, onBack, voiceListening }) {
  const page = db.notebook[db.page] || {text:"",drawing:""};
  const [tool,setTool] = useState("text");
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const activePointer = useRef(null);
  const drawing = useRef(false);
  const last = useRef(null);

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
  const pointerDown=e=>{
    if(tool==="text")return;
    if(activePointer.current!==null&&activePointer.current!==e.pointerId)return;
    activePointer.current=e.pointerId;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    drawing.current=true;
    last.current=point(e);
  };
  const pointerMove=e=>{
    if(tool==="text"||!drawing.current||activePointer.current!==e.pointerId||!last.current)return;
    const ctx=ctxRef.current,p=point(e);
    ctx.globalCompositeOperation=tool==="erase"?"destination-out":"source-over";
    ctx.strokeStyle="#2d2927";
    ctx.lineWidth=tool==="erase"?22:3;
    ctx.beginPath();ctx.moveTo(last.current.x,last.current.y);ctx.lineTo(p.x,p.y);ctx.stroke();
    last.current=p;
  };
  const pointerUp=e=>{
    if(activePointer.current!==e.pointerId)return;
    if(drawing.current)saveDrawing();
    drawing.current=false;activePointer.current=null;last.current=null;
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
      h("button",{onClick:()=>{ctxRef.current?.clearRect(0,0,canvasRef.current.clientWidth,canvasRef.current.clientHeight);savePage({drawing:""});}},"Очистить")
    ),
    h("div",{className:"paper-scroll"},
      h("div",{className:"paper"},
        h("span",{className:"page-label"},`Лист ${db.page+1}`),
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
    h("aside",{className:`float-dock ${screen==="home"?"over-drawer":""}`},
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
  const [selectedDay,setSelectedDay]=useState(iso());
  const [activeSectionId,setActiveSectionId]=useState(null);
  const [notebookMode,setNotebookMode]=useState("editor");
  const [modal,setModal]=useState(null);
  const [appsOpen,setAppsOpen]=useState(false);
  const [transferTask,setTransferTask]=useState(null);

  const completeTask=task=>setDb(prev=>({
    ...prev,
    tasks:prev.tasks.map(t=>t.id===task.id?{...t,done:true}:t),
    completed:[{text:task.text,origin:"План дня",at:new Date().toLocaleString("ru-RU")},...prev.completed]
  }));

  const moveTaskDate=(task,date)=>{
    setDb(prev=>({...prev,tasks:prev.tasks.map(t=>t.id===task.id?{...t,date}:t)}));
    setTransferTask(null);
  };

  const moveTaskCategory=(task,sectionId)=>{
    setDb(prev=>({
      ...prev,
      tasks:prev.tasks.filter(t=>t.id!==task.id),
      sections:prev.sections.map(s=>s.id===sectionId
        ? {...s,items:[{id:uid(),title:task.text,subnotes:[]},...s.items]}
        : s)
    }));
    setTransferTask(null);
  };

  const routeVoice=useCallback(text=>{
    const low=normalize(text);

    if(/^(сделано|выполнено|готово)$/.test(low)){
      setDb(prev=>{
        const task=prev.tasks.find(t=>!t.done && t.date===(screen==="home"?selectedDay:iso()));
        if(!task)return prev;
        return {
          ...prev,
          tasks:prev.tasks.map(t=>t.id===task.id?{...t,done:true}:t),
          completed:[{text:task.text,origin:"План дня",at:new Date().toLocaleString("ru-RU")},...prev.completed]
        };
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
      setDb(prev=>({...prev,sections:prev.sections.map(s=>s.id==="buy"?{...s,items:[{id:uid(),title:clean,subnotes:[]},...s.items]}:s)}));
      return;
    }

    if(employee || date || screen==="home"){
      let clean=stripEmployee(text,employee);
      clean=cleanSchedulingWords(clean);
      if(!clean)clean=text;
      const task={id:uid(),text:clean,date:date||(screen==="home"?selectedDay:iso()),time:"",employeeId:employee?.id||null,done:false};
      setDb(prev=>({...prev,tasks:[...prev.tasks,task]}));
      return;
    }

    setDb(prev=>({...prev,notes:[{id:uid(),text},...prev.notes]}));
  },[db,notebookMode,screen,selectedDay,setDb]);

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
    setSelectedDay(value);
    setScreen("home");
  };

  const openCalendar=()=>setModal("calendar");
  const openCalculator=()=>setModal("calc");

  let content;
  if(screen==="home") content=h(DayHome,{
      db,setDb,selectedDay,setSelectedDay,search,onCompleteTask:completeTask,onMoveTask:setTransferTask,
      onOpenSection:id=>{
        if(id==="completed"){setScreen("completed");return;}
        setActiveSectionId(id);setScreen("section");
      }
    });
  else if(screen==="section") content=h(SectionScreen,{db,setDb,sectionId:activeSectionId,onBack:goHome});
  else if(screen==="employees") content=h(Employees,{db,onBack:goHome});
  else if(screen==="completed") content=h(Completed,{db,onBack:goHome});
  else if(screen==="notebook") content=h(Notebook,{db,setDb,mode:notebookMode,setMode:setNotebookMode,onBack:goHome,voiceListening:voice.listening});

  return h("div",{className:"app"},
    screen!=="notebook" ? h(Header,{
      search,setSearch,onSettings:()=>setModal("settings"),light,setLight,onApps:()=>setAppsOpen(true)
    }) : null,
    content,
    h(VoiceDock,{
      listening:voice.listening,text:voice.displayText,error:voice.error,onMic:voice.toggle,onDeleteWord:voice.deleteLastWord,
      screen,onNotebook:openNotebook,notebookMode,onBack:contextBack
    }),
    appsOpen?h(AppsMenu,{
      onClose:()=>setAppsOpen(false),
      onEmployees:()=>setScreen("employees"),
      onCalendar:openCalendar,
      onCalculator:openCalculator,
      onNotebook:openNotebook
    }):null,
    transferTask?h(TransferModal,{
      task:transferTask,db,onMoveDate:moveTaskDate,onMoveCategory:moveTaskCategory,onClose:()=>setTransferTask(null)
    }):null,
    modal==="settings"?h(SettingsModal,{onClose:()=>setModal(null)}):null,
    modal==="calc"?h(CalculatorModal,{onClose:()=>setModal(null)}):null,
    modal==="calendar"?h(CalendarModal,{initial:selectedDay,db,onSelect:selectCalendarDate,onClose:()=>setModal(null)}):null
  );
}

createRoot(document.getElementById("root")).render(h(App));

if("serviceWorker" in navigator){
  navigator.serviceWorker.register("./sw.js",{updateViaCache:"none"}).then(r=>r.update()).catch(()=>{});
}
