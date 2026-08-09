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
    {id:"completed",name:"Выполненные",icon:"✓",meta:`${db.completed.length}`}
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
      done(t,sec.name);save();renderAll();
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
function calendar(){let n=new Date(),y=n.getFullYear(),m=n.getMonth(),f=new Date(y,m,1),l=new Date(y,m+1,0),lead=(f.getDay()+6)%7,h=`<h2>${n.toLocaleDateString("ru-RU",{month:"long",year:"numeric"})}</h2><div class="calendar-grid">`;for(let i=0;i<lead;i++)h+="<span></span>";for(let d=1;d<=l.getDate();d++){let x=iso(new Date(y,m,d,12));h+=`<button class="cal-day ${d===n.getDate()?"today":""}" data-cal="${x}">${d}</button>`}h+="</div>";modal(h);$$("[data-cal]").forEach(b=>b.onclick=()=>{hideModal();$("#swipeStage").classList.add("show-week");renderWeekDay(b.dataset.cal)})}
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
  let low=text.toLowerCase();
  if(/послезавтра/.test(low))return plus(2);
  if(/завтра/.test(low))return plus(1);
  if(/сегодня/.test(low))return iso();
  const months={января:0,февраля:1,марта:2,апреля:3,мая:4,июня:5,июля:6,августа:7,сентября:8,октября:9,ноября:10,декабря:11};
  let m=low.match(/(\d{1,2})\s+(января|февраля|марта|апреля|мая|июня|июля|августа|сентября|октября|ноября|декабря)/);
  if(m){let d=new Date();let y=d.getFullYear(),candidate=new Date(y,months[m[2]],+m[1],12);if(candidate<new Date(new Date().setHours(0,0,0,0)))candidate.setFullYear(y+1);return iso(candidate)}
  return null;
}
function cleanCommandWords(text){
  return text.replace(/\b(добавь|добавить|задача|поставь|поставить|напомни|напоминание|на сегодня|сегодня|на завтра|завтра|послезавтра)\b/gi,"").replace(/\s{2,}/g," ").trim();
}
function voice(text){
  let low=text.toLowerCase().trim();

  if(/^(удалить|удали)( последнее слово)?$/.test(low)){
    let n=db.notes[0];
    if(n){n.text=n.text.trim().replace(/\s+\S+$/,"");if(!n.text)db.notes.shift()}
    save();renderAll();return;
  }
  if(/^(сделано|выполнено|готово)/.test(low)){
    let n=db.notes.shift();if(n)done(n.text,"Заметки");save();renderAll();return;
  }

  let date=extractDate(text);
  let emp=findEmployeeByVoiceV73(text);
  if(emp){
    let clean=cleanCommandWords(text).replace(new RegExp(emp.name.split(" ")[0],"i"),"").trim()||text;
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
stopVoice()}));["contextmenu","selectstart"].forEach(x=>$("#micBtn").addEventListener(x,e=>e.preventDefault()));
let sx=0;$("#swipeStage").ontouchstart=e=>{if(e.target.closest(".group,.note,.voice-bar"))return;sx=e.touches[0].clientX};$("#swipeStage").ontouchend=e=>{if(!sx)return;let d=e.changedTouches[0].clientX-sx;if(Math.abs(d)>70){$("#swipeStage").classList.remove("show-overdue","show-week");d>0?$("#swipeStage").classList.add("show-overdue"):$("#swipeStage").classList.add("show-week")}sx=0};
renderAll();renderNotebook();if("serviceWorker"in navigator)navigator.serviceWorker.register("./sw.js").catch(()=>{});

if(localStorage.getItem("assistant-theme")==="light")document.body.classList.add("light");
\n/* v7.2: whole voice tile toggles; mic remains hold-to-talk */\nconst voiceTileV72=$("#voiceBar"), micV72=$("#micBtn");\nvoiceTileV72.addEventListener("click",e=>{if(e.target.closest("#micBtn"))return;listening?stopVoice():startVoice()});\nmicV72.addEventListener("pointerdown",e=>{e.preventDefault();e.stopPropagation();try{micV72.setPointerCapture(e.pointerId)}catch{};startVoice()});\n["pointerup","pointercancel"].forEach(ev=>micV72.addEventListener(ev,e=>{e.preventDefault();e.stopPropagation();stopVoice()}));\n[voiceTileV72,micV72].forEach(el=>["contextmenu","selectstart","dragstart"].forEach(ev=>el.addEventListener(ev,e=>{e.preventDefault();e.stopPropagation()})));\n
/* v7.3 alias recognition */
const EMP_ALIASES_V73={
  "Артём Мишин":["артём","артем","тёма","тема"],
  "Алексей":["алексей","лёха","леха","лёша","леша"],
  "Дима":["дима","дмитрий","димон","митя"]
};
function normV73(s){return String(s||"").toLowerCase().replace(/ё/g,"е").replace(/[.,!?;:]/g," ").replace(/\s+/g," ").trim()}
function findEmployeeByVoiceV73(text){
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
