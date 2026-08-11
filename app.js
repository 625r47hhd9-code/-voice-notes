const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const KEY="assistant-v7-data";
function iso(d=new Date()){return d.toISOString().slice(0,10)}function plus(n){let d=new Date();d.setDate(d.getDate()+n);return iso(d)}
let db=JSON.parse(localStorage.getItem(KEY)||"null")||{notes:[{id:1,text:"Позвонить поставщику"},{id:2,text:"Идея нового проекта"}],sections:[{id:"buy",name:"Купить для производства",icon:"🛒",items:["Краска","Перчатки"]}],employees:[{id:1,name:"Артём Мишин",role:"Мастер цеха",tasks:[{text:"Проверить оборудование",date:iso(),time:"10:00",done:false}]},{id:2,name:"Алексей",role:"",tasks:[]},{id:3,name:"Дима",role:"",tasks:[]}],tasks:[{id:101,text:"Встреча с поставщиком",date:plus(1),time:"14:00",employeeId:null,done:false},{id:102,text:"Проверить склад",date:plus(-1),time:"",employeeId:null,done:false}],completed:[],notebook:[{text:""}],page:0};
function save(){localStorage.setItem(KEY,JSON.stringify(db))}function esc(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}function fd(x){return x?new Date(x+"T12:00:00").toLocaleDateString("ru-RU",{day:"numeric",month:"short"}):""}
function done(text,origin){db.completed.unshift({text,origin,at:new Date().toLocaleString("ru-RU",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"})})}
function renderNotes(){let q=$("#globalSearch").value.toLowerCase();$("#notesList").innerHTML=db.notes.filter(n=>n.text.toLowerCase().includes(q)).map(n=>`<div class="note" data-note="${n.id}"><button class="check">✓</button><div class="note-text">${esc(n.text)}</div></div>`).join("")||`<div class="task-meta">Нет заметок</div>`;$$(".note .check").forEach(b=>b.onclick=()=>{let n=db.notes.find(x=>x.id==b.closest(".note").dataset.note);done(n.text,"Заметки");db.notes=db.notes.filter(x=>x.id!==n.id);save();renderAll()})}
function renderGroups(){
  let groups=[
    ...db.sections.map(s=>({id:s.id,name:s.name,icon:s.icon,meta:`${s.items.length}`})),
    {id:"completed",name:"Выполненные",icon:"✓",meta:`${db.completed.length}`},
    {id:"employees",name:"Сотрудники",icon:"♙",meta:`${db.employees.length} сотрудника`},
    {id:"calendar",name:"Календарь",icon:"▣",meta:"Задачи по датам"}
  ];
  $("#homeGroups").innerHTML=groups.map(g=>`
    <div class="group" data-group="${g.id}">
      <button class="group-head">
        <span class="group-icon">${g.icon}</span>
        <span class="group-main">
          <span class="group-name">${esc(g.name)}</span>
          <span class="group-meta">${esc(g.meta)}</span>
        </span>
        <span class="group-chevron">›</span>
      </button>
      <div class="group-body"></div>
    </div>`).join("");
  $$("[data-group]").forEach(el=>el.querySelector(".group-head").onclick=()=>{
    let id=el.dataset.group;
    if(id==="completed"){openCompleted();return}
    if(id==="employees"){openEmployees();return}
    if(id==="calendar"){calendar();return}
    let s=db.sections.find(x=>x.id===id); if(!s)return;
    el.classList.toggle("open");
    el.querySelector(".group-body").innerHTML=s.items.map((x,i)=>`
      <div class="group-item">
        <span>${esc(x)}</span>
        <button data-di="${id}:${i}">✓</button>
      </div>`).join("")||`<div class="group-item">Пусто</div>`;
    $$("[data-di]").forEach(b=>b.onclick=e=>{
      e.stopPropagation();
      let [sid,i]=b.dataset.di.split(":"),
          sec=db.sections.find(x=>x.id===sid),
          t=sec.items.splice(+i,1)[0];
      done(t,sec.name);save();
/* v7.7 — non-destructive data migration */
function migrateDataV77(){
  const defaults={
    notes:[],
    sections:[{id:"buy",name:"Купить для производства",icon:"🛒",items:[]}],
    employees:[
      {id:1,name:"Артём Мишин",role:"Мастер цеха",tasks:[]},
      {id:2,name:"Алексей",role:"",tasks:[]},
      {id:3,name:"Дима",role:"",tasks:[]}
    ],
    tasks:[],
    completed:[],
    notebook:[{text:"",drawing:""}],
    page:0
  };

  if(!db || typeof db!=="object") db={};

  for(const [key,value] of Object.entries(defaults)){
    if(db[key]===undefined || db[key]===null){
      db[key]=JSON.parse(JSON.stringify(value));
    }
  }

  if(!Array.isArray(db.notes)) db.notes=[];
  if(!Array.isArray(db.sections)) db.sections=[];
  if(!Array.isArray(db.employees)) db.employees=[];
  if(!Array.isArray(db.tasks)) db.tasks=[];
  if(!Array.isArray(db.completed)) db.completed=[];
  if(!Array.isArray(db.notebook)) db.notebook=[{text:"",drawing:""}];

  if(!db.sections.some(s=>s.id==="buy")){
    db.sections.unshift({id:"buy",name:"Купить для производства",icon:"🛒",items:[]});
  }

  const baseEmployees=[
    {id:1,name:"Артём Мишин",role:"Мастер цеха"},
    {id:2,name:"Алексей",role:""},
    {id:3,name:"Дима",role:""}
  ];
  baseEmployees.forEach(base=>{
    if(!db.employees.some(e=>String(e.name||"").toLowerCase()===base.name.toLowerCase())){
      db.employees.push({...base,tasks:[]});
    }
  });

  db.employees.forEach(e=>{
    if(!Array.isArray(e.tasks)) e.tasks=[];
  });

  db.notebook=db.notebook.map(p=>{
    if(typeof p==="string") return {text:p,drawing:""};
    return {text:p?.text||"",drawing:p?.drawing||""};
  });
  if(db.notebook.length===0) db.notebook=[{text:"",drawing:""}];
  if(!Number.isInteger(db.page) || db.page<0 || db.page>=db.notebook.length) db.page=0;

  save();
}
migrateDataV77();

renderAll();
    });
  });
}
function card(t){let e=db.employees.find(x=>x.id===t.employeeId);return `<div class="task-card"><div class="task-title">${esc(t.text)}</div><div class="task-meta">${e?esc(e.name)+" · ":""}${fd(t.date)} ${esc(t.time||"")}</div><div class="task-actions"><button data-c="${t.id}">✓ Выполнено</button><button data-m="${t.id}">↻ Перенести</button></div></div>`}
function bindTasks(){$$("[data-c]").forEach(b=>b.onclick=()=>{let t=db.tasks.find(x=>x.id==b.dataset.c);done(t.text,"План");t.done=true;save();renderAll()});$$("[data-m]").forEach(b=>b.onclick=()=>moveTask(+b.dataset.m))}
function renderOverdue(){let a=db.tasks.filter(t=>!t.done&&t.date<iso());$("#overdueCount").textContent=`${a.length} задач`;$("#overdueList").innerHTML=a.map(card).join("")||`<div class="task-meta">Просроченных задач нет</div>`;bindTasks()}
function renderWeek(){let s=$("#weekStrip");s.innerHTML="";for(let i=0;i<7;i++){let d=new Date();d.setDate(d.getDate()+i);let x=iso(d);s.insertAdjacentHTML("beforeend",`<button class="day-chip ${i===0?"active":""}" data-day="${x}">${d.toLocaleDateString("ru-RU",{weekday:"short",day:"numeric"})}</button>`)}renderWeekDay(iso());$$(".day-chip").forEach(b=>b.onclick=()=>{$$(".day-chip").forEach(x=>x.classList.remove("active"));b.classList.add("active");renderWeekDay(b.dataset.day)})}
function renderWeekDay(day){let a=db.tasks.filter(t=>!t.done&&t.date===day);$("#weekTasks").innerHTML=a.map(card).join("")||`<div class="task-meta">На этот день задач нет</div>`;bindTasks()}
function moveTask(id){modal(`<h2>Перенести</h2><div class="form"><button class="action" data-md="${plus(1)}">Завтра</button><button class="action" data-md="${plus(2)}">Послезавтра</button><input id="md" class="field" type="date"><button id="mdgo" class="primary">Перенести</button></div>`);$$("[data-md]").forEach(b=>b.onclick=()=>{db.tasks.find(x=>x.id===id).date=b.dataset.md;save();hideModal();renderAll()});$("#mdgo").onclick=()=>{if($("#md").value)db.tasks.find(x=>x.id===id).date=$("#md").value;save();hideModal();renderAll()}}
function renderEmployees(){let q=$("#employeeSearch").value.toLowerCase();$("#employeesList").innerHTML=db.employees.filter(e=>e.name.toLowerCase().includes(q)).map(e=>{let dn=e.tasks.filter(t=>t.done).length,a=e.tasks.length-dn,o=e.tasks.filter(t=>!t.done&&t.date<iso()).length,td=e.tasks.filter(t=>!t.done&&t.date===iso()).length;return `<div class="employee-card"><button class="employee-head"><span class="avatar">${esc(e.name[0])}</span><span class="employee-info"><span class="employee-name">${esc(e.name)}</span><span class="employee-role">${esc(e.role||"Сотрудник")} · ${a} активных</span></span><span>⌄</span></button><div class="employee-details"><div class="stats"><div class="stat"><b>${e.tasks.length}</b><small>ВСЕГО</small></div><div class="stat"><b>${td}</b><small>СЕГОДНЯ</small></div><div class="stat"><b>${o}</b><small>ПРОСРОЧ.</small></div><div class="stat"><b>${dn}</b><small>ГОТОВО</small></div></div>${e.tasks.map(t=>`<div class="emp-task">${esc(t.text)} <small>${fd(t.date)} ${esc(t.time||"")}</small></div>`).join("")}</div></div>`}).join("");$$(".employee-head").forEach(b=>b.onclick=()=>b.closest(".employee-card").classList.toggle("open"))}
function openEmployees(){hideScreens();$("#employeesScreen").classList.remove("hidden");setTab("employees");renderEmployees()}function openCompleted(){hideScreens();$("#completedScreen").classList.remove("hidden");$("#completedList").innerHTML=db.completed.map(c=>`<div class="task-card"><div class="task-title">✓ ${esc(c.text)}</div><div class="task-meta">${esc(c.origin)} · ${esc(c.at)}</div></div>`).join("")||`<div class="task-meta">Пока пусто</div>`}function openNotebook(){hideScreens();$("#notebookScreen").classList.remove("hidden");setTab("notebook");renderNotebook()}function openHome(){hideScreens();$("#swipeStage").classList.remove("hidden","show-overdue","show-week");setTab("home")}function hideScreens(){["employeesScreen","notebookScreen","completedScreen"].forEach(x=>$("#"+x).classList.add("hidden"));$("#swipeStage").classList.remove("hidden")}function setTab(t){$$(".tab").forEach(b=>b.classList.toggle("active",b.dataset.tab===t))}
function renderNotebook(){$("#paperText").value=db.notebook[db.page].text;$("#pageNum").textContent=`${db.page+1} / ${db.notebook.length}`}
function addSection(){modal(`<h2>Новый раздел</h2><div class="form"><input id="sn" class="field" placeholder="Название"><select id="si" class="select"><option>📁</option><option>💼</option><option>📦</option><option>💡</option><option>🚚</option></select><button id="ss" class="primary">Создать</button></div>`);$("#ss").onclick=()=>{db.sections.push({id:"s"+Date.now(),name:$("#sn").value||"Новый раздел",icon:$("#si").value,items:[]});save();hideModal();renderAll()}}
function addEmployee(){modal(`<h2>Новый сотрудник</h2><div class="form"><input id="en" class="field" placeholder="Имя"><input id="er" class="field" placeholder="Должность"><button id="ev" class="primary">Добавить</button></div>`);$("#ev").onclick=()=>{db.employees.push({id:Date.now(),name:$("#en").value||"Новый сотрудник",role:$("#er").value,tasks:[]});save();hideModal();renderAll()}}
function modal(h){$("#modalContent").innerHTML=h;$("#modal").classList.remove("hidden")}function hideModal(){$("#modal").classList.add("hidden")}async function shareText(t){if(navigator.share)try{await navigator.share({text:t})}catch{}else{await navigator.clipboard?.writeText(t)}}
function calendar(){let n=new Date(),y=n.getFullYear(),m=n.getMonth(),f=new Date(y,m,1),l=new Date(y,m+1,0),lead=(f.getDay()+6)%7,h=`<h2>${n.toLocaleDateString("ru-RU",{month:"long",year:"numeric"})}</h2><div class="calendar-grid">`;for(let i=0;i<lead;i++)h+="<span></span>";for(let d=1;d<=l.getDate();d++){let x=iso(new Date(y,m,d,12));h+=`<button class="cal-day ${d===n.getDate()?"today":""}" data-cal="${x}">${d}</button>`}h+="</div>";modal(h);$$("[data-cal]").forEach(b=>b.onclick=()=>{hideModal();$("#swipeStage").classList.remove("show-overdue");$("#swipeStage").classList.add("show-week");renderWeekDay(b.dataset.cal)})}
let rec=null,listening=false,buf="",interimBuf="",stopRequested=false;
function startVoice(){
  if(listening)return;
  let R=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!R){$("#voiceStatus").textContent="Распознавание речи недоступно";return}
  rec=new R();
  rec.lang="ru-RU";
  rec.continuous=true;
  rec.interimResults=true;
  buf="";interimBuf="";stopRequested=false;listening=true;
  $("#voiceBar").classList.add("listening");
  $("#voiceTitle").textContent="Слушаю…";
  $("#voiceStatus").textContent="Говорите";
  rec.onresult=e=>{
    let interim="";
    for(let k=e.resultIndex;k<e.results.length;k++){
      let r=e.results[k],txt=r[0].transcript.trim();
      if(r.isFinal){ if(txt) buf+=(buf?" ":"")+txt; }
      else interim=txt;
    }
    interimBuf=interim;
    $("#voiceStatus").textContent=interim||buf||"Говорите";
  };
  rec.onerror=e=>{
    if(e.error!=="aborted") $("#voiceStatus").textContent="Ошибка: "+e.error;
  };
  rec.onend=()=>{
    if(listening && !stopRequested){ try{rec.start()}catch{}; return; }
    if(stopRequested) finalizeVoice();
  };
  try{rec.start()}catch{}
}
function stopVoice(){
  if(!rec||!listening)return;
  listening=false;stopRequested=true;
  $("#voiceBar").classList.remove("listening");
  $("#voiceTitle").textContent="Обрабатываю…";
  $("#voiceStatus").textContent="Сохраняю текст";
  try{rec.stop()}catch{finalizeVoice()}
  setTimeout(()=>{ if(stopRequested) finalizeVoice(); },500);
}
function finalizeVoice(){
  if(!stopRequested)return;
  stopRequested=false;
  let t=(buf||interimBuf||"").trim();
  buf="";interimBuf="";
  $("#voiceTitle").textContent="Голосовой ввод";
  $("#voiceStatus").textContent="Нажмите или удерживайте, чтобы диктовать";
  if(t) voice(t);
}
function extractDate(text){
  let low=String(text||"").toLowerCase().replace(/ё/g,"е");
  if(/послезавтра/.test(low))return plus(2);
  if(/завтра/.test(low))return plus(1);
  if(/сегодня/.test(low))return iso();

  const weekdayMap={
    "воскресенье":0,"воскресенья":0,
    "понедельник":1,"понедельника":1,
    "вторник":2,"вторника":2,
    "среда":3,"среду":3,"среды":3,
    "четверг":4,"четверга":4,
    "пятница":5,"пятницу":5,"пятницы":5,
    "суббота":6,"субботу":6,"субботы":6
  };
  for(const [word,targetDay] of Object.entries(weekdayMap)){
    if(new RegExp("(^|\\s)(в|на)?\\s*"+word+"(?=\\s|$|[,.!?])","i").test(low)){
      const now=new Date();
      const today=now.getDay();
      let delta=(targetDay-today+7)%7;
      // "в среду" on Wednesday means the next Wednesday, not today.
      if(delta===0)delta=7;
      const d=new Date(now);
      d.setDate(now.getDate()+delta);
      d.setHours(12,0,0,0);
      return iso(d);
    }
  }

  const months={января:0,февраля:1,марта:2,апреля:3,мая:4,июня:5,июля:6,августа:7,сентября:8,октября:9,ноября:10,декабря:11};
  let m=low.match(/(\d{1,2})\s+(января|февраля|марта|апреля|мая|июня|июля|августа|сентября|октября|ноября|декабря)/);
  if(m){
    let d=new Date(),y=d.getFullYear(),candidate=new Date(y,months[m[2]],+m[1],12);
    if(candidate<new Date(new Date().setHours(0,0,0,0)))candidate.setFullYear(y+1);
    return iso(candidate);
  }
  return null;
}
function cleanCommandWords(text){
  return String(text||"")
    .replace(/\b(добавь|добавить|задача|поставь|поставить|напомни|напоминание|на сегодня|сегодня|на завтра|завтра|послезавтра)\b/gi,"")
    .replace(/\b(в|на)\s+(понедельник|понедельника|вторник|вторника|среду|среда|среды|четверг|четверга|пятницу|пятница|пятницы|субботу|суббота|субботы|воскресенье|воскресенья)\b/gi,"")
    .replace(/\b(на\s+)?\d{1,2}\s+(января|февраля|марта|апреля|мая|июня|июля|августа|сентября|октября|ноября|декабря)\b/gi,"")
    .replace(/\s{2,}/g," ")
    .trim();
}
function voice(text){
  let low=text.toLowerCase().trim();

  // v8.0: voice navigation and stronger commands
  if(/^(открой|покажи|перейди в)?\s*сотрудник/.test(low)){openEmployees();return;}
  if(/^(открой|покажи|перейди в)?\s*блокнот/.test(low)){openNotebook();return;}
  if(/^(открой|покажи)?\s*календар/.test(low)){calendar();return;}
  if(/^(открой|покажи)?\s*выполненн/.test(low)){openCompleted();return;}
  if(/^(домой|главная|открой заметки)$/.test(low)){openHome();return;}

  if(/^(сделано|выполнено|готово)\s+/.test(low)){
    const q=low.replace(/^(сделано|выполнено|готово)\s+/,"").trim();
    let i=db.notes.findIndex(n=>n.text.toLowerCase().includes(q));
    if(i>=0){let n=db.notes.splice(i,1)[0];done(n.text,"Заметки");save();renderAll();return;}
    let t=db.tasks.find(x=>!x.done&&x.text.toLowerCase().includes(q));
    if(t){t.done=true;done(t.text,"План");save();renderAll();return;}
  }

  if(/^перенести/.test(low)){
    let date=extractDate(text);
    let q=cleanCommandWords(text.replace(/^перенести\s*/i,"")).replace(/\b(на|в)\b/gi," ").trim();
    let candidates=db.tasks.filter(x=>!x.done);
    let t=q?candidates.find(x=>q.split(/\s+/).some(w=>w.length>3&&x.text.toLowerCase().includes(w.toLowerCase()))):candidates[0];
    if(t&&date){t.date=date;save();renderAll();return;}
  }

  if(/^(удалить|удали)( последнее слово)?$/.test(low)){
    let n=db.notes[0];
    if(n){n.text=n.text.trim().replace(/\s+\S+$/,"");if(!n.text)db.notes.shift()}
    save();renderAll();return;
  }
  if(/^(сделано|выполнено|готово)/.test(low)){
    let n=db.notes.shift();if(n)done(n.text,"Заметки");save();renderAll();return;
  }

  let date=extractDate(text);
  let emp=employeeFromVoiceV77(text);
  if(emp){
    let clean=cleanCommandWords(stripEmployeeV77(text,emp)).trim()||text;
    let d=date||iso();
    emp.tasks.push({text:clean,date:d,time:"",done:false});
    db.tasks.push({id:Date.now(),text:clean,date:d,time:"",employeeId:emp.id,done:false});
    save();renderAll();return;
  }

  if(/купить|покупк|для производства/.test(low)){
    let sec=db.sections.find(x=>x.id==="buy");
    let clean=text.replace(/добавь|добавить|в купить для производства|купить для производства/ig,"").trim()||text;
    sec.items.unshift(clean);
    save();renderAll();return;
  }

  if(date){
    let clean=cleanCommandWords(text)||text;
    db.tasks.push({id:Date.now(),text:clean,date:date,time:"",employeeId:null,done:false});
    save();renderAll();return;
  }

  db.notes.unshift({id:Date.now(),text:text});
  save();renderAll();
}
function renderAll(){renderNotes();renderGroups();renderOverdue();renderWeek();renderEmployees()}
for(let i=0;i<6;i++)$("#wave").appendChild(document.createElement("i"));
$("#globalSearch").oninput=renderNotes;$("#expandNotes").onclick=()=>$("#notesBox").classList.toggle("expanded");$("#addSectionBtn").onclick=addSection;$("#addEmployeeBtn").onclick=addEmployee;$("#employeeSearch").oninput=renderEmployees;
$("#settingsBtn").onclick=()=>modal(`<h2>Настройки</h2><button class="action">Голос: русский</button><button class="action">Аудио не сохраняется</button><button class="action">Данные: на устройстве</button>`);
$("#calcBtn").onclick=()=>modal(`<h2>Калькулятор</h2><input class="field" placeholder="125*8">`);$("#themeBtn").onclick=()=>{document.body.classList.toggle("light");localStorage.setItem("assistant-theme",document.body.classList.contains("light")?"light":"dark")};$("#calendarBtn").onclick=calendar;$("#weekCalendarBtn").onclick=calendar;$("#modalClose").onclick=hideModal;
$$(".backBtn").forEach(b=>b.onclick=openHome);$$(".tab").forEach(b=>b.onclick=()=>b.dataset.tab==="home"?openHome():b.dataset.tab==="employees"?openEmployees():openNotebook());
$("#newPageBtn").onclick=()=>{db.notebook.splice(db.page+1,0,{text:"",drawing:""});db.page++;save();renderNotebook()};$("#paperText").oninput=()=>{db.notebook[db.page].text=$("#paperText").value;save()};$("#sharePageBtn").onclick=()=>shareText(db.notebook[db.page].text||"Пустой лист");
let np=0;$("#notebookPager").ontouchstart=e=>np=e.touches[0].clientX;$("#notebookPager").ontouchend=e=>{let d=e.changedTouches[0].clientX-np;if(Math.abs(d)>60){if(d<0&&db.page<db.notebook.length-1)db.page++;if(d>0&&db.page>0)db.page--;renderNotebook()}};
/* v8.1 — state-aware horizontal navigation
   Notes: right -> overdue, left -> week.
   Overdue: left -> notes.
   Week: horizontal swipe changes selected day.
   On today's first day, one more swipe right -> notes.
*/
let sx=0, sy=0, selectedWeekIndex=0;

function showCenterPage(){
  $("#swipeStage").classList.remove("show-overdue","show-week");
}
function showOverduePage(){
  $("#swipeStage").classList.remove("show-week");
  $("#swipeStage").classList.add("show-overdue");
}
function showWeekPage(){
  $("#swipeStage").classList.remove("show-overdue");
  $("#swipeStage").classList.add("show-week");
}
function selectWeekIndex(index){
  const chips=$$(".day-chip");
  if(!chips.length)return;
  selectedWeekIndex=Math.max(0,Math.min(chips.length-1,index));
  chips.forEach((b,i)=>b.classList.toggle("active",i===selectedWeekIndex));
  renderWeekDay(chips[selectedWeekIndex].dataset.day);
}

const renderWeekV81=renderWeek;
renderWeek=function(){
  renderWeekV81();
  const chips=$$(".day-chip");
  selectedWeekIndex=Math.max(0,Math.min(selectedWeekIndex,chips.length-1));
  chips.forEach((b,i)=>{
    b.classList.toggle("active",i===selectedWeekIndex);
    b.onclick=()=>selectWeekIndex(i);
  });
  if(chips[selectedWeekIndex])renderWeekDay(chips[selectedWeekIndex].dataset.day);
};

$("#weekBackBtn")?.addEventListener("click",showCenterPage);

$("#swipeStage").ontouchstart=e=>{
  if(e.target.closest(".group,.note,button,input,textarea"))return;
  sx=e.touches[0].clientX;
  sy=e.touches[0].clientY;
};

$("#swipeStage").ontouchend=e=>{
  if(!sx)return;
  const dx=e.changedTouches[0].clientX-sx;
  const dy=e.changedTouches[0].clientY-sy;
  sx=0; sy=0;

  if(Math.abs(dx)<60 || Math.abs(dx)<Math.abs(dy)*1.25)return;

  const stage=$("#swipeStage");
  const inWeek=stage.classList.contains("show-week");
  const inOverdue=stage.classList.contains("show-overdue");

  if(inWeek){
    if(dx<0){
      // Swipe left = next day.
      selectWeekIndex(selectedWeekIndex+1);
    }else{
      // Swipe right = previous day; from today, return to Notes.
      if(selectedWeekIndex>0)selectWeekIndex(selectedWeekIndex-1);
      else showCenterPage();
    }
    return;
  }

  if(inOverdue){
    // From overdue, swipe left returns to Notes.
    if(dx<0)showCenterPage();
    return;
  }

  // Main Notes page.
  if(dx>0)showOverduePage();
  else showWeekPage();
};
renderAll();renderNotebook();

if(localStorage.getItem("assistant-theme")==="light")document.body.classList.add("light");
/* v7.3 alias recognition */
const EMP_ALIASES_V73={
  "Артём Мишин":["артём","артем","тёма","тема"],
  "Алексей":["алексей","лёха","леха","лёша","леша"],
  "Дима":["дима","дмитрий","димон","митя"]
};
function normV73(s){return String(s||"").toLowerCase().replace(/ё/g,"е").replace(/[.,!?;:]/g," ").replace(/\s+/g," ").trim()}
function employeeFromVoiceV77(text){
  const low=" "+normV73(text)+" ";
  return db.employees.find(emp=>{
    const aliases=[emp.name,...(EMP_ALIASES_V73[emp.name]||[])].map(normV73);
    return aliases.some(a=>a && low.includes(" "+a+" "));
  });
}

/* v7.3 notebook drawing */
db.notebook=(db.notebook||[{text:"",drawing:""}]).map(p=>typeof p==="string"?{text:p,drawing:""}:{text:p.text||"",drawing:p.drawing||""});
save();
const drawCanvas=$("#drawCanvas");
const drawCtx=drawCanvas?.getContext("2d");
let nbDraw=false,nbErase=false,nbPainting=false,lx=0,ly=0;
function nbResize(){
  if(!drawCanvas)return;
  const r=drawCanvas.getBoundingClientRect(),dpr=window.devicePixelRatio||1;
  drawCanvas.width=Math.max(1,Math.round(r.width*dpr));
  drawCanvas.height=Math.max(1,Math.round(r.height*dpr));
  drawCtx.setTransform(dpr,0,0,dpr,0,0);
  drawCtx.lineCap="round";drawCtx.lineJoin="round";
  nbLoad();
}
function nbLoad(){
  if(!drawCanvas)return;
  drawCtx.clearRect(0,0,drawCanvas.clientWidth,drawCanvas.clientHeight);
  const src=db.notebook[db.page]?.drawing;if(!src)return;
  const img=new Image();img.onload=()=>drawCtx.drawImage(img,0,0,drawCanvas.clientWidth,drawCanvas.clientHeight);img.src=src;
}
function nbSave(){if(drawCanvas){db.notebook[db.page].drawing=drawCanvas.toDataURL("image/png");save()}}
function nbMode(draw){
  nbDraw=draw;$("#paper")?.classList.toggle("draw-mode",draw);
  $("#textModeBtn")?.classList.toggle("active",!draw);
  $("#drawModeBtn")?.classList.toggle("active",draw&&!nbErase);
}
function nbPoint(e){const r=drawCanvas.getBoundingClientRect(),p=e.touches?.[0]||e;return{x:p.clientX-r.left,y:p.clientY-r.top}}
function nbStart(e){if(!nbDraw)return;e.preventDefault();nbPainting=true;let p=nbPoint(e);lx=p.x;ly=p.y}
function nbMove(e){if(!nbPainting||!nbDraw)return;e.preventDefault();let p=nbPoint(e);drawCtx.globalCompositeOperation=nbErase?"destination-out":"source-over";drawCtx.strokeStyle="#2f2d28";drawCtx.lineWidth=nbErase?24:3;drawCtx.beginPath();drawCtx.moveTo(lx,ly);drawCtx.lineTo(p.x,p.y);drawCtx.stroke();lx=p.x;ly=p.y}
function nbEnd(){if(!nbPainting)return;nbPainting=false;nbSave()}
$("#textModeBtn")?.addEventListener("click",()=>{nbErase=false;nbMode(false)});
$("#drawModeBtn")?.addEventListener("click",()=>{nbErase=false;nbMode(true)});
$("#eraserBtn")?.addEventListener("click",()=>{nbErase=!nbErase;nbMode(true);$("#eraserBtn").classList.toggle("active",nbErase)});
$("#clearDrawBtn")?.addEventListener("click",()=>{drawCtx?.clearRect(0,0,drawCanvas.clientWidth,drawCanvas.clientHeight);db.notebook[db.page].drawing="";save()});
["pointerdown","touchstart"].forEach(ev=>drawCanvas?.addEventListener(ev,nbStart,{passive:false}));
["pointermove","touchmove"].forEach(ev=>drawCanvas?.addEventListener(ev,nbMove,{passive:false}));
["pointerup","pointercancel","touchend","touchcancel"].forEach(ev=>drawCanvas?.addEventListener(ev,nbEnd,{passive:false}));
const renderNotebookV73=renderNotebook;
renderNotebook=function(){renderNotebookV73();requestAnimationFrame(nbResize)};
window.addEventListener("resize",()=>requestAnimationFrame(nbResize));
requestAnimationFrame(nbResize);



/* v7.7 — employee aliases and grammatical forms */
const EMPLOYEE_ALIASES_V77 = {
  "Артём Мишин":["артём","артем","артёму","артему","тёма","тема","тёме","теме"],
  "Алексей":["алексей","алексею","алексея","лёха","леха","лёхе","лехе","лёшу","лешу","лёша","леша"],
  "Дима":["дима","диме","диму","дмитрий","дмитрию","димон","димону","митя","мите"]
};
function normVoiceV77(s){
  return String(s||"")
    .toLowerCase()
    .replace(/ё/g,"е")
    .replace(/[.,!?;:()[\]{}"']/g," ")
    .replace(/\s+/g," ")
    .trim();
}
function employeeFromVoiceV77(text){
  const hay=" "+normVoiceV77(text)+" ";
  return db.employees.find(emp=>{
    const aliases=[emp.name,...(EMPLOYEE_ALIASES_V77[emp.name]||[])].map(normVoiceV77);
    return aliases.some(a=>a && hay.includes(" "+a+" "));
  });
}
function stripEmployeeV77(text,emp){
  let out=String(text||"");
  const aliases=[emp.name,...(EMPLOYEE_ALIASES_V77[emp.name]||[])].sort((a,b)=>b.length-a.length);
  aliases.forEach(a=>{
    const escA=a.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
    out=out.replace(new RegExp("(^|\\s)"+escA+"(?=\\s|$|[,.!?;:])","ig")," ");
  });
  return out.replace(/\s+/g," ").trim();
}

/* v7.8 — reliable tap / hold voice controller for iPhone Safari */
let v77Rec=null;
let v77Listening=false;
let v77Final="";
let v77Interim="";
let v77FinalizeTimer=null;

function v77SetVoiceUI(state,msg){
  const bar=$("#voiceBar"), title=$("#voiceTitle"), status=$("#voiceStatus");
  bar?.classList.toggle("listening",state==="listening");
  bar?.classList.toggle("processing",state==="processing");
  if(title) title.textContent=state==="listening"?"Слушаю…":state==="processing"?"Обрабатываю…":"Голосовой ввод";
  if(status) status.textContent=msg || (state==="listening"?"Говорите":state==="processing"?"Сохраняю текст":"Нажмите или удерживайте, чтобы диктовать");
}

function v77Commit(text){
  const clean=String(text||"").trim();
  if(!clean) return;
  try{
    voice(clean);
    const status=$("#voiceStatus");
    if(status){
      status.textContent="✓ "+clean;
      setTimeout(()=>{
        if(status.textContent==="✓ "+clean){
          status.textContent="Нажмите или удерживайте, чтобы диктовать";
        }
      },1800);
    }
  }catch(err){
    console.error("Voice routing error",err);
    db.notes.unshift({id:Date.now(),text:clean});
    save();
    renderAll();
  }
}

function v77Finalize(){
  clearTimeout(v77FinalizeTimer);
  const text=(v77Final || v77Interim || "").trim();
  v77Final=""; v77Interim="";
  v77Listening=false;
  v77SetVoiceUI("idle");
  if(text) v77Commit(text);
}

function v77Start(){
  if(v77Listening) return;
  const R=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!R){
    v77SetVoiceUI("idle","На этом iPhone распознавание речи недоступно");
    return;
  }

  v77Final="";
  v77Interim="";
  v77Rec=new R();
  v77Rec.lang="ru-RU";
  v77Rec.interimResults=true;
  v77Rec.continuous=false;
  v77Rec.maxAlternatives=1;
  v77Listening=true;
  v77SetVoiceUI("listening","Говорите");

  v77Rec.onresult=(e)=>{
    let interim="";
    for(let i=e.resultIndex;i<e.results.length;i++){
      const txt=e.results[i][0]?.transcript?.trim()||"";
      if(e.results[i].isFinal){
        if(txt) v77Final+=(v77Final?" ":"")+txt;
      }else{
        interim=txt;
      }
    }
    v77Interim=interim;
    const status=$("#voiceStatus");
    if(status) status.textContent=interim||v77Final||"Говорите";
  };

  v77Rec.onerror=(e)=>{
    console.warn("Speech error:",e.error);
    v77Listening=false;
    clearTimeout(v77FinalizeTimer);
    if(e.error==="not-allowed" || e.error==="service-not-allowed"){
      v77SetVoiceUI("idle","Разрешите микрофон для этого сайта");
    }else if(e.error==="no-speech"){
      v77SetVoiceUI("idle","Речь не услышана — нажмите ещё раз");
    }else if(e.error==="audio-capture"){
      v77SetVoiceUI("idle","Микрофон недоступен");
    }else{
      v77SetVoiceUI("idle","Ошибка голосового ввода: "+e.error);
    }
  };

  v77Rec.onend=()=>{
    if(!v77Listening){
      v77Finalize();
      return;
    }
    v77SetVoiceUI("processing");
    v77FinalizeTimer=setTimeout(v77Finalize,250);
  };

  try{
    v77Rec.start();
  }catch(err){
    console.error(err);
    v77Listening=false;
    v77SetVoiceUI("idle","Не удалось запустить микрофон");
  }
}

function v77Stop(){
  if(!v77Listening || !v77Rec) return;
  v77SetVoiceUI("processing");
  try{
    v77Rec.stop();
  }catch{
    v77Finalize();
  }
  v77FinalizeTimer=setTimeout(v77Finalize,500);
}

/* Replace old handlers instead of stacking on top of them. */
const oldVoiceBar=$("#voiceBar");
if(oldVoiceBar){
  const cleanBar=oldVoiceBar.cloneNode(true);
  oldVoiceBar.replaceWith(cleanBar);

  const bar=$("#voiceBar");
  const mic=$("#micBtn");

  bar.addEventListener("click",e=>{
    if(e.target.closest("#micBtn")) return;
    e.preventDefault();
    v77Listening ? v77Stop() : v77Start();
  });

  mic?.addEventListener("click",e=>{
    e.preventDefault();
    e.stopPropagation();
    v77Listening ? v77Stop() : v77Start();
  });

  let holdStarted=false;
  mic?.addEventListener("pointerdown",e=>{
    e.preventDefault();
    e.stopPropagation();
    holdStarted=true;
    if(!v77Listening) v77Start();
  });

  ["pointerup","pointercancel"].forEach(ev=>{
    mic?.addEventListener(ev,e=>{
      if(!holdStarted) return;
      e.preventDefault();
      e.stopPropagation();
      holdStarted=false;
      if(v77Listening) v77Stop();
    });
  });

  ["contextmenu","selectstart","dragstart"].forEach(ev=>{
    bar.addEventListener(ev,e=>e.preventDefault());
  });
}

/* v7.8 — visible version and update flow */
const APP_VERSION_V77="8.4";
const versionElV77=$("#versionBadge");
if(versionElV77) versionElV77.textContent="v"+APP_VERSION_V77;

if("serviceWorker" in navigator){
  window.addEventListener("load", async ()=>{
    try{
      const reg=await navigator.serviceWorker.register("./sw.js",{updateViaCache:"none"});
      await reg.update();
      let reloading=false;
      navigator.serviceWorker.addEventListener("controllerchange",()=>{
        if(reloading) return;
        reloading=true;
        location.reload();
      });
      if(reg.waiting) reg.waiting.postMessage({type:"SKIP_WAITING"});
    }catch(err){
      console.warn("SW update error",err);
    }
  });
}


/* =========================
   v8.2 notebook + floating dock
   ========================= */
let v82UndoSnapshot=null;
let v82UndoLabel="";
let v82UndoTimer=null;
let v82GalleryOpen=false;

function v82NotebookVisible(){
  const el=$("#notebookScreen");
  return !!el && !el.classList.contains("hidden");
}
function v82SetUndo(snapshot,label){
  v82UndoSnapshot=snapshot;
  v82UndoLabel=label||"Последняя голосовая запись";
  clearTimeout(v82UndoTimer);
  const b=$("#navUndoBtn");
  if(b){
    b.classList.add("undo-ready");
    b.textContent="↶";
    b.setAttribute("aria-label","Отменить последнюю голосовую запись");
  }
}
function v82ClearUndo(){
  v82UndoSnapshot=null;
  v82UndoLabel="";
  clearTimeout(v82UndoTimer);
  v82UpdateNavButton();
}
function v82UpdateNavButton(){
  const b=$("#navUndoBtn");
  if(!b)return;
  if(v82UndoSnapshot){
    b.classList.add("undo-ready");
    b.textContent="↶";
    return;
  }
  b.classList.remove("undo-ready");
  if(v82NotebookVisible() || $("#swipeStage")?.classList.contains("show-week") || $("#swipeStage")?.classList.contains("show-overdue")){
    b.textContent="←";
  }else{
    b.textContent="⌂";
  }
}
function v82UndoVoice(){
  if(!v82UndoSnapshot)return false;
  try{
    db=JSON.parse(v82UndoSnapshot);
    save();
    migrateDataV77();
    renderAll();
    if(v82NotebookVisible())renderNotebook();
    v82ClearUndo();
    const bar=$("#voiceBar");
    const title=$("#voiceTitle"),status=$("#voiceStatus");
    if(title)title.textContent="Отменено";
    if(status)status.textContent=v82UndoLabel||"Последняя запись удалена";
    bar?.classList.add("show-result");
    setTimeout(()=>bar?.classList.remove("show-result"),1400);
    return true;
  }catch(e){
    console.error(e);
    return false;
  }
}

/* Notebook render/editor/gallery */
const renderNotebookV82Base=renderNotebook;
renderNotebook=function(){
  if(!Array.isArray(db.notebook)||!db.notebook.length)db.notebook=[{text:"",drawing:""}];
  if(db.page<0||db.page>=db.notebook.length)db.page=0;
  const page=db.notebook[db.page];
  const ta=$("#paperText");
  if(ta)ta.value=page.text||"";
  if($("#pageLabel"))$("#pageLabel").textContent="Лист "+(db.page+1);
  if($("#pageNum"))$("#pageNum").textContent=`${db.page+1} / ${db.notebook.length}`;
  renderNotebookGalleryV82();
  requestAnimationFrame(()=>{try{nbResize()}catch{}});
}
function renderNotebookGalleryV82(){
  const grid=$("#sheetGrid");
  if(!grid)return;
  const pages=db.notebook||[];
  grid.innerHTML=pages.map((p,i)=>`
    <button class="sheet-thumb ${i===db.page?"active":""}" data-sheet="${i}">
      <span class="sheet-thumb-preview">${esc((p.text||"").slice(0,240))}</span>
      <span class="sheet-thumb-num">${i+1}</span>
    </button>`).join("")+`
    <button class="sheet-thumb sheet-thumb-add" id="galleryAddSheet">
      <span>＋<small>Добавить лист</small></span>
    </button>`;
  $$("[data-sheet]").forEach(b=>b.onclick=()=>{
    db.page=+b.dataset.sheet;
    save();
    v82ShowNotebookEditor();
  });
  $("#galleryAddSheet")?.addEventListener("click",v82AddSheet);
}
function v82AddSheet(){
  db.notebook.push({text:"",drawing:""});
  db.page=db.notebook.length-1;
  save();
  v82ShowNotebookEditor();
}
function v82ShowNotebookEditor(){
  v82GalleryOpen=false;
  $("#notebookGallery")?.classList.add("hidden");
  $("#notebookEditor")?.classList.remove("hidden");
  renderNotebook();
  v82UpdateNavButton();
}
function v82ShowNotebookGallery(){
  v82GalleryOpen=true;
  $("#notebookEditor")?.classList.add("hidden");
  $("#notebookGallery")?.classList.remove("hidden");
  renderNotebookGalleryV82();
  v82UpdateNavButton();
}
function v82OpenNotebook(){
  hideScreens();
  $("#notebookScreen")?.classList.remove("hidden");
  $("#swipeStage")?.classList.add("hidden");
  v82ShowNotebookEditor();
}
function v82ExitNotebook(){
  try{nbSave()}catch{}
  save();
  openHome();
  v82GalleryOpen=false;
  v82UpdateNavButton();
}

/* Override the old openNotebook used elsewhere. */
openNotebook=v82OpenNotebook;

$("#notebookFloatBtn")?.addEventListener("click",()=>{
  if(v82NotebookVisible()){
    v82GalleryOpen ? v82ShowNotebookEditor() : v82ShowNotebookGallery();
  }else{
    v82OpenNotebook();
  }
});
$("#nbGalleryBtn")?.addEventListener("click",v82ShowNotebookGallery);
$("#nbExitBtn")?.addEventListener("click",v82ExitNotebook);
$("#newPageBtn")?.addEventListener("click",v82AddSheet);

/* Middle button: undo the last voice action first; otherwise context-aware back/home. */
$("#navUndoBtn")?.addEventListener("click",()=>{
  if(v82UndoSnapshot){
    v82UndoVoice();
    return;
  }
  if(v82NotebookVisible()){
    if(v82GalleryOpen){v82ShowNotebookEditor();return}
    v82ExitNotebook();
    return;
  }
  const stage=$("#swipeStage");
  if(stage?.classList.contains("show-week")||stage?.classList.contains("show-overdue")){
    showCenterPage();
    v82UpdateNavButton();
    return;
  }
  if(!$("#employeesScreen")?.classList.contains("hidden") || !$("#completedScreen")?.classList.contains("hidden")){
    openHome();v82UpdateNavButton();return;
  }
  openHome();v82UpdateNavButton();
});

/* Keep drawing/text mutually usable. */
const nbModeV82=nbMode;
nbMode=function(draw){
  nbModeV82(draw);
  $("#paper")?.classList.toggle("draw-mode",draw);
};
$("#paperText")?.addEventListener("input",()=>{
  db.notebook[db.page].text=$("#paperText").value;
  save();
});

/* Voice commit:
   - in Notebook => append directly to current sheet;
   - elsewhere => keep the existing routing logic;
   - snapshot before both, so middle button can undo a mistaken voice command.
*/
v77Commit=function(text){
  const clean=String(text||"").trim();
  if(!clean)return;
  const snapshot=JSON.stringify(db);

  try{
    if(v82NotebookVisible() && !v82GalleryOpen){
      const page=db.notebook[db.page]||(db.notebook[db.page]={text:"",drawing:""});
      const before=String(page.text||"");
      page.text=before+(before && !before.endsWith("\n") ? "\n" : "")+clean;
      save();
      renderNotebook();
      v82SetUndo(snapshot,"Голосовой текст удалён");
    }else{
      voice(clean);
      v82SetUndo(snapshot,"Голосовая команда отменена");
    }

    const bar=$("#voiceBar");
    const title=$("#voiceTitle"),status=$("#voiceStatus");
    if(title)title.textContent="Записано";
    if(status)status.textContent=clean;
    bar?.classList.add("show-result");
    setTimeout(()=>{
      bar?.classList.remove("show-result");
      if(title)title.textContent="Голосовой ввод";
      if(status)status.textContent="Нажмите или удерживайте";
    },1800);
  }catch(err){
    console.error("Voice routing error",err);
    db.notes.unshift({id:Date.now(),text:clean});
    save();
    renderAll();
    v82SetUndo(snapshot,"Голосовая запись удалена");
  }
};

/* Compact notes are independently scrollable; don't start screen swipes there. */
$("#notesBox")?.addEventListener("touchstart",e=>{
  e.stopPropagation();
},{passive:true});

/* Ensure middle button reflects page transitions. */
const openHomeV82Base=openHome;
openHome=function(){
  openHomeV82Base();
  $("#swipeStage")?.classList.remove("hidden");
  v82UpdateNavButton();
};
const showCenterPageV82Base=showCenterPage;
showCenterPage=function(){showCenterPageV82Base();v82UpdateNavButton()};
const showWeekPageV82Base=showWeekPage;
showWeekPage=function(){showWeekPageV82Base();v82UpdateNavButton()};
const showOverduePageV82Base=showOverduePage;
showOverduePage=function(){showOverduePageV82Base();v82UpdateNavButton()};

renderAll();
renderNotebook();
v82UpdateNavButton();


/* =========================
   v8.3 fixes
   ========================= */

/* 1) Notebook gallery now previews BOTH drawing and text. */
renderNotebookGalleryV82=function(){
  const grid=$("#sheetGrid");
  if(!grid)return;
  const pages=db.notebook||[];
  grid.innerHTML=pages.map((p,i)=>{
    const drawing=p?.drawing||"";
    return `
      <button class="sheet-thumb ${i===db.page?"active":""} ${drawing?"has-drawing":""}" data-sheet="${i}">
        ${drawing?`<img class="sheet-thumb-drawing" src="${drawing}" alt="">`:""}
        <span class="sheet-thumb-preview">${esc((p?.text||"").slice(0,220))}</span>
        <span class="sheet-thumb-num">${i+1}</span>
      </button>`;
  }).join("")+`
    <button class="sheet-thumb sheet-thumb-add" id="galleryAddSheet">
      <span>＋<small>Добавить лист</small></span>
    </button>`;
  $$("[data-sheet]").forEach(b=>b.onclick=()=>{
    db.page=+b.dataset.sheet;
    save();
    v82ShowNotebookEditor();
  });
  $("#galleryAddSheet")?.addEventListener("click",v82AddSheet);
};

/* 2) Page zoom: +/- buttons and two-finger pinch. */
let v83Zoom=1;
let v83PinchStart=0;
let v83PinchZoom=1;
function v83ApplyZoom(next){
  v83Zoom=Math.max(0.8,Math.min(2.6,next));
  const paper=$("#paper");
  if(!paper)return;
  paper.style.transform=`scale(${v83Zoom})`;
  paper.style.width=(100/v83Zoom)+"%";
  paper.style.height=(100/v83Zoom)+"%";
  let readout=$("#zoomReadout");
  if(!readout){
    readout=document.createElement("div");
    readout.id="zoomReadout";
    readout.className="zoom-readout";
    paper.appendChild(readout);
  }
  readout.textContent=Math.round(v83Zoom*100)+"%";
}
function v83TouchDistance(touches){
  if(touches.length<2)return 0;
  const a=touches[0],b=touches[1];
  return Math.hypot(b.clientX-a.clientX,b.clientY-a.clientY);
}
$("#zoomInBtn")?.addEventListener("click",()=>v83ApplyZoom(v83Zoom+.2));
$("#zoomOutBtn")?.addEventListener("click",()=>v83ApplyZoom(v83Zoom-.2));
$("#notebookPager")?.addEventListener("touchstart",e=>{
  if(e.touches.length===2){
    v83PinchStart=v83TouchDistance(e.touches);
    v83PinchZoom=v83Zoom;
    $("#paper")?.classList.add("zooming");
  }
},{passive:true});
$("#notebookPager")?.addEventListener("touchmove",e=>{
  if(e.touches.length===2 && v83PinchStart){
    const dist=v83TouchDistance(e.touches);
    v83ApplyZoom(v83PinchZoom*(dist/v83PinchStart));
  }
},{passive:true});
$("#notebookPager")?.addEventListener("touchend",e=>{
  if(e.touches.length<2){
    v83PinchStart=0;
    $("#paper")?.classList.remove("zooming");
  }
},{passive:true});

/* Reset zoom for each opened sheet. */
const v83ShowEditorBase=v82ShowNotebookEditor;
v82ShowNotebookEditor=function(){
  v83ShowEditorBase();
  v83Zoom=1;
  requestAnimationFrame(()=>v83ApplyZoom(1));
};

/* 3) Voice: one reliable press-hold cycle, no synthetic click re-start.
      Also force-stop recognition before any navigation. */
function v83ForceStopVoice(cancelText=false){
  clearTimeout(v77FinalizeTimer);
  if(v77Rec){
    try{v77Rec.onend=null;v77Rec.onerror=null;v77Rec.abort()}catch{}
  }
  v77Rec=null;
  v77Listening=false;
  if(cancelText){v77Final="";v77Interim="";}
  const bar=$("#voiceBar");
  bar?.classList.remove("listening","processing","voice-error");
  const title=$("#voiceTitle"),status=$("#voiceStatus");
  if(title)title.textContent="Голосовой ввод";
  if(status)status.textContent="Нажмите и держите";
}

(function v83RebindMic(){
  const old=$("#micBtn");
  if(!old)return;
  const mic=old.cloneNode(true);
  old.replaceWith(mic);
  let pressed=false;
  let startedAt=0;

  mic.addEventListener("pointerdown",e=>{
    e.preventDefault();
    e.stopPropagation();
    if(pressed)return;
    pressed=true;
    startedAt=Date.now();
    try{mic.setPointerCapture?.(e.pointerId)}catch{}
    if(!v77Listening)v77Start();
  });

  const release=e=>{
    if(!pressed)return;
    e?.preventDefault?.();
    e?.stopPropagation?.();
    pressed=false;
    if(v77Listening)v77Stop();
  };
  mic.addEventListener("pointerup",release);
  mic.addEventListener("pointercancel",release);
  mic.addEventListener("lostpointercapture",release);
  mic.addEventListener("click",e=>{e.preventDefault();e.stopPropagation()});
})();

/* Safety timeout so Safari can never leave the mic stuck indefinitely. */
const v83StartBase=v77Start;
v77Start=function(){
  v83StartBase();
  if(v77Listening){
    setTimeout(()=>{
      if(v77Listening){
        try{v77Stop()}catch{v83ForceStopVoice(false)}
      }
    },30000);
  }
};

/* Navigation always works, even if the microphone is currently active. */
function v83BeforeNavigate(){
  if(v77Listening || v77Rec)v83ForceStopVoice(true);
}
$("#navUndoBtn")?.addEventListener("pointerdown",()=>v83BeforeNavigate(),true);
$("#notebookFloatBtn")?.addEventListener("pointerdown",()=>v83BeforeNavigate(),true);
$("#nbExitBtn")?.addEventListener("pointerdown",()=>v83BeforeNavigate(),true);
$("#weekBackBtn")?.addEventListener("pointerdown",()=>v83BeforeNavigate(),true);

/* If middle button is tapped while recording, first tap means EXIT/BACK, not undo. */
const v83NavBtn=$("#navUndoBtn");
if(v83NavBtn){
  const clean=v83NavBtn.cloneNode(true);
  v83NavBtn.replaceWith(clean);
  clean.addEventListener("click",()=>{
    v83BeforeNavigate();
    if(v82UndoSnapshot){
      // Undo stays available only when the user is on the same screen.
      v82ClearUndo();
    }
    if(v82NotebookVisible()){
      if(v82GalleryOpen){v82ShowNotebookEditor();return;}
      v82ExitNotebook();return;
    }
    const stage=$("#swipeStage");
    if(stage?.classList.contains("show-week")||stage?.classList.contains("show-overdue")){
      showCenterPage();return;
    }
    if(!$("#employeesScreen")?.classList.contains("hidden") || !$("#completedScreen")?.classList.contains("hidden")){
      openHome();return;
    }
    openHome();
  });
}

/* Re-attach notebook/voice state after nav button cloning. */
v82UpdateNavButton();

/* Better speech feedback for short/uncertain captures. */
const v83CommitBase=v77Commit;
v77Commit=function(text){
  const clean=String(text||"").trim();
  if(!clean){
    v83ForceStopVoice(true);
    return;
  }
  v83CommitBase(clean);
  v83ForceStopVoice(false);
  const bar=$("#voiceBar");
  bar?.classList.add("show-result");
  setTimeout(()=>bar?.classList.remove("show-result"),1800);
};

/* Version refresh */
if($("#versionBadge"))$("#versionBadge").textContent="v8.3";
renderNotebookGalleryV82();


/* =========================
   v8.4 — toggle dictation + live text + exact planner date
   ========================= */

/* Notebook pages no longer change on horizontal swipe. */
if($("#notebookPager")){
  $("#notebookPager").ontouchstart=null;
  $("#notebookPager").ontouchend=null;
}

/* Live recognition panel. */
(function(){
  if($("#voiceLivePanel"))return;
  const panel=document.createElement("div");
  panel.id="voiceLivePanel";
  panel.className="voice-live-panel";
  panel.innerHTML=`
    <div class="voice-live-title">
      <span id="voiceLiveState">Слушаю…</span>
      <button id="voiceDeleteWord" class="voice-delete-word">⌫ слово</button>
    </div>
    <div id="voiceLiveText" class="voice-live-text">Говорите…</div>`;
  document.body.appendChild(panel);
})();

let v84Rec=null;
let v84Listening=false;
let v84Stopping=false;
let v84Final="";
let v84Interim="";
let v84RestartTimer=null;

function v84Text(){
  return (v84Final+(v84Final&&v84Interim?" ":"")+v84Interim).trim();
}
function v84UpdateLive(){
  const panel=$("#voiceLivePanel"), live=$("#voiceLiveText"), state=$("#voiceLiveState");
  panel?.classList.toggle("open",v84Listening||v84Stopping);
  if(live)live.textContent=v84Text()||"Говорите…";
  if(state)state.textContent=v84Stopping?"Завершаю…":"Слушаю…";
  const status=$("#voiceStatus");
  if(status)status.textContent=v84Text()||"Говорите…";
}
function v84DeleteLastWord(){
  if(v84Interim.trim()){
    v84Interim=v84Interim.trim().replace(/\s+\S+$/,"");
    if(!/\s/.test(v84Interim))v84Interim="";
  }else{
    v84Final=v84Final.trim().replace(/\s+\S+$/,"");
    if(!/\s/.test(v84Final))v84Final="";
  }
  v84UpdateLive();
}
$("#voiceDeleteWord")?.addEventListener("click",e=>{
  e.preventDefault();e.stopPropagation();v84DeleteLastWord();
});

function v84ResetUI(){
  clearTimeout(v84RestartTimer);
  v84Listening=false;v84Stopping=false;
  v77Listening=false;v77Rec=null;
  const bar=$("#voiceBar");
  bar?.classList.remove("listening","processing");
  $("#voiceLivePanel")?.classList.remove("open");
  if($("#voiceTitle"))$("#voiceTitle").textContent="Голосовой ввод";
  if($("#voiceStatus"))$("#voiceStatus").textContent="Нажмите для записи";
}
function v84CommitAndReset(){
  const text=v84Text();
  v84Final="";v84Interim="";
  v84ResetUI();
  if(text)v77Commit(text);
}
function v84StartRecognition(){
  const R=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!R){
    if($("#voiceStatus"))$("#voiceStatus").textContent="Распознавание речи недоступно";
    return;
  }
  clearTimeout(v84RestartTimer);
  v84Rec=new R();
  v77Rec=v84Rec;
  v84Rec.lang="ru-RU";
  v84Rec.interimResults=true;
  v84Rec.continuous=true;
  v84Rec.maxAlternatives=1;

  v84Rec.onresult=e=>{
    let interim="";
    for(let i=e.resultIndex;i<e.results.length;i++){
      const txt=e.results[i][0]?.transcript?.trim()||"";
      if(e.results[i].isFinal){
        if(txt)v84Final+=(v84Final?" ":"")+txt;
      }else{
        interim=txt;
      }
    }
    v84Interim=interim;
    v84UpdateLive();
  };
  v84Rec.onerror=e=>{
    if(e.error==="aborted")return;
    if(e.error==="not-allowed"||e.error==="service-not-allowed"){
      v84ResetUI();
      if($("#voiceStatus"))$("#voiceStatus").textContent="Разрешите микрофон";
      return;
    }
    if(e.error==="audio-capture"){
      v84ResetUI();
      if($("#voiceStatus"))$("#voiceStatus").textContent="Микрофон недоступен";
      return;
    }
    /* no-speech is normal during a long toggle session: restart. */
  };
  v84Rec.onend=()=>{
    if(v84Stopping){
      v84CommitAndReset();
      return;
    }
    if(v84Listening){
      v84RestartTimer=setTimeout(()=>{
        if(v84Listening&&!v84Stopping){
          try{v84StartRecognition()}catch{}
        }
      },120);
    }
  };
  try{v84Rec.start()}catch{
    v84RestartTimer=setTimeout(()=>{if(v84Listening)v84StartRecognition()},180);
  }
}
function v84Start(){
  if(v84Listening)return;
  v84Final="";v84Interim="";v84Stopping=false;v84Listening=true;
  v77Listening=true;
  $("#voiceBar")?.classList.add("listening");
  if($("#voiceTitle"))$("#voiceTitle").textContent="Слушаю…";
  v84UpdateLive();
  v84StartRecognition();
}
function v84Stop(commit=true){
  if(!v84Listening&&!v84Rec){v84ResetUI();return}
  v84Stopping=true;v84Listening=false;v77Listening=false;
  clearTimeout(v84RestartTimer);
  v84UpdateLive();
  if(!commit){v84Final="";v84Interim=""}
  if(v84Rec){
    try{
      v84Rec.onend=()=>commit?v84CommitAndReset():v84ResetUI();
      commit?v84Rec.stop():v84Rec.abort();
    }catch{
      commit?v84CommitAndReset():v84ResetUI();
    }
  }else{
    commit?v84CommitAndReset():v84ResetUI();
  }
  setTimeout(()=>{if(v84Stopping)(commit?v84CommitAndReset():v84ResetUI())},700);
}

/* Replace microphone with simple tap-to-start / tap-to-stop. */
(function(){
  const old=$("#micBtn"); if(!old)return;
  const mic=old.cloneNode(true);
  old.replaceWith(mic);
  mic.addEventListener("click",e=>{
    e.preventDefault();e.stopPropagation();
    v84Listening?v84Stop(true):v84Start();
  });
  ["pointerdown","pointerup","pointercancel","contextmenu","selectstart"].forEach(ev=>{
    mic.addEventListener(ev,e=>{ if(ev!=="pointerup")e.preventDefault(); });
  });
})();

/* Any navigation cancels an active unfinished dictation, never locks the UI. */
v83BeforeNavigate=function(){
  if(v84Listening||v84Rec)v84Stop(false);
  else if(v77Listening||v77Rec)v83ForceStopVoice(true);
};

/* Exact selected date in planner.
   Calendar selection becomes the first/active day of the 7-day strip. */
let v84PlannerAnchor=iso();

function v84RenderWeekFrom(anchor,selected=anchor){
  const s=$("#weekStrip"); if(!s)return;
  const start=new Date(anchor+"T12:00:00");
  s.innerHTML="";
  let chosenIndex=0;
  for(let i=0;i<7;i++){
    const d=new Date(start);d.setDate(start.getDate()+i);
    const x=iso(d);
    if(x===selected)chosenIndex=i;
    s.insertAdjacentHTML("beforeend",
      `<button class="day-chip ${x===selected?"active":""}" data-day="${x}">${d.toLocaleDateString("ru-RU",{weekday:"short",day:"numeric"})}</button>`);
  }
  selectedWeekIndex=chosenIndex;
  renderWeekDay(selected);
  $$(".day-chip").forEach((b,i)=>b.onclick=()=>{
    selectedWeekIndex=i;
    $$(".day-chip").forEach(x=>x.classList.remove("active"));
    b.classList.add("active");
    renderWeekDay(b.dataset.day);
  });
}
renderWeek=function(){
  v84RenderWeekFrom(v84PlannerAnchor,v84PlannerAnchor);
};
selectWeekIndex=function(index){
  const chips=$$(".day-chip");if(!chips.length)return;
  selectedWeekIndex=Math.max(0,Math.min(chips.length-1,index));
  chips.forEach((b,i)=>b.classList.toggle("active",i===selectedWeekIndex));
  renderWeekDay(chips[selectedWeekIndex].dataset.day);
};

calendar=function(){
  const n=new Date(),y=n.getFullYear(),m=n.getMonth(),
    f=new Date(y,m,1),l=new Date(y,m+1,0),lead=(f.getDay()+6)%7;
  let h=`<h2>${n.toLocaleDateString("ru-RU",{month:"long",year:"numeric"})}</h2><div class="calendar-grid">`;
  for(let i=0;i<lead;i++)h+="<span></span>";
  for(let d=1;d<=l.getDate();d++){
    const x=iso(new Date(y,m,d,12));
    h+=`<button class="cal-day ${d===n.getDate()?"today":""}" data-cal="${x}">${d}</button>`;
  }
  h+="</div>";modal(h);
  $$("[data-cal]").forEach(b=>b.onclick=()=>{
    const selected=b.dataset.cal;
    hideModal();
    v84PlannerAnchor=selected;
    $("#swipeStage").classList.remove("show-overdue");
    $("#swipeStage").classList.add("show-week");
    v84RenderWeekFrom(selected,selected);
    v82UpdateNavButton?.();
  });
};

/* Rebind calendar buttons because previous onclick properties point at the old function. */
if($("#calendarBtn"))$("#calendarBtn").onclick=()=>calendar();
if($("#weekCalendarBtn"))$("#weekCalendarBtn").onclick=()=>calendar();

/* Ensure notes with assigned dates do not retain spoken scheduling words. */
const cleanCommandWordsV84Base=cleanCommandWords;
cleanCommandWords=function(text){
  return cleanCommandWordsV84Base(text)
    .replace(/\b(в|на)\s+(понедельник|понедельника|вторник|вторника|среду|среда|среды|четверг|четверга|пятницу|пятница|пятницы|субботу|суббота|субботы|воскресенье|воскресенья)\b/gi,"")
    .replace(/\b(на\s+)?\d{1,2}\s+(января|февраля|марта|апреля|мая|июня|июля|августа|сентября|октября|ноября|декабря)\b/gi,"")
    .replace(/\s{2,}/g," ")
    .trim();
};

if($("#versionBadge"))$("#versionBadge").textContent="v8.4";
renderAll();
