const defaultEvents = [
  {id:"charli-xcx-cdmx",day:"24",month:"MAY",title:"Charli XCX",venue:"Pepsi Center WTC · CDMX",type:"CONCIERTO"},
  {id:"ca7riel-paco-cdmx",day:"30",month:"MAY",title:"Ca7riel & Paco Amoroso",venue:"Foro Indie Rocks · CDMX",type:"CONCIERTO"},
  {id:"tyler-cdmx",day:"07",month:"JUN",title:"Tyler, The Creator",venue:"Palacio de los Deportes · CDMX",type:"CONCIERTO"},
  {id:"arca-cdmx",day:"14",month:"JUN",title:"Arca",venue:"Auditorio BB · CDMX",type:"CONCIERTO"},
  {id:"ceremonia-cdmx",day:"21",month:"JUN",title:"Festival Ceremonia",venue:"Parque Bicentenario · CDMX",type:"FESTIVAL"}
];

let fb = null;
let articles = [];
let events = [];
let hero = {
  featured: [],
  autoFeatured:false,
  topics: [],
  rotation: []
};

let articleTab = "all";
let articleSearch = "";
let selectContext = null;
let draggedFeaturedIndex = null;
let isReady = false;

const $ = (id) => document.getElementById(id);

function slugify(value){
  return String(value || "")
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g,"")
    .replace(/[^a-z0-9]+/g,"-")
    .replace(/(^-|-$)/g,"");
}

function todayComparable(){
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

const monthMap = {ENE:0,FEB:1,MAR:2,ABR:3,MAY:4,JUN:5,JUL:6,AGO:7,SEP:8,OCT:9,NOV:10,DIC:11};

function eventTime(ev){
  const year = new Date().getFullYear();
  return new Date(year, monthMap[(ev.month || "").toUpperCase()] ?? 0, Number(ev.day || 1)).getTime();
}

function eventSortDate(ev){
  return eventTime(ev);
}

function parsePublishTime(value){
  if(!value) return null;
  if(typeof value === "object" && typeof value.toDate === "function") return value.toDate().getTime();
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : null;
}

function isScheduled(article){
  const t = parsePublishTime(article.publishAt);
  return !!(t && t > Date.now());
}

function isPublished(article){
  if(isScheduled(article)) return false;
  return article.published === true || article.published === "true";
}

function isUnpublished(article){
  return !isPublished(article) && !isScheduled(article);
}

function statusOf(article){
  if(isScheduled(article)) return "scheduled";
  if(isPublished(article)) return "published";
  return "draft";
}

function statusLabel(article){
  const s = statusOf(article);
  if(s === "published") return "Publicado";
  if(s === "scheduled") return "Programado";
  return "No publicado";
}

function parseArticleDate(article){
  const publishTime = parsePublishTime(article.publishAt);
  if(publishTime) return publishTime;
  if(article.createdAt) return new Date(article.createdAt).getTime() || 0;
  return 0;
}

function sortedArticles(list=articles){
  return [...list].sort((a,b)=> parseArticleDate(b) - parseArticleDate(a));
}

function publishedArticles(){
  return sortedArticles(articles.filter(isPublished));
}

function articleMatches(a, q){
  if(!q) return true;
  const text = `${a.title || ""} ${a.category || ""} ${a.excerpt || ""} ${(a.tags || []).join(" ")}`.toLowerCase();
  return text.includes(String(q).toLowerCase());
}

function getArticle(id){
  return articles.find(a => a.id === id);
}

function getAutoFeaturedIds(){
  return publishedArticles().slice(0,3).map(a => a.id);
}

function syncAutoFeatured(){
  if(hero.autoFeatured){
    hero.featured = getAutoFeaturedIds();
  }
}

function normalizeHero(){
  if(typeof hero.autoFeatured === "undefined") hero.autoFeatured = false;
  if(!Array.isArray(hero.featured)) hero.featured = [];
  if(!Array.isArray(hero.rotation)) hero.rotation = [];
  if(!Array.isArray(hero.topics)) hero.topics = [];

  if(hero.featured.length < 3){
    const fallback = getAutoFeaturedIds();
    fallback.forEach(id => {
      if(hero.featured.length < 3 && !hero.featured.includes(id)) hero.featured.push(id);
    });
  }

  hero.featured = hero.featured.filter(Boolean).slice(0,5);
  hero.rotation = hero.rotation.filter(Boolean).slice(0,5);
}

async function publishDueScheduledArticles(){
  const due = articles.filter(a => {
    const t = parsePublishTime(a.publishAt);
    return t && t <= Date.now() && a.published === "scheduled";
  });

  if(!due.length) return;

  await Promise.all(due.map(a => {
    a.published = true;
    return saveArticleDoc(a);
  }));
}

async function loadAllFromFirestore(){
  if(!fb) return;

  const articleSnap = await fb.getDocs(fb.query(fb.collection(fb.db, "articles"), fb.orderBy("createdAt", "desc")));
  articles = articleSnap.docs.map(d => ({ id:d.id, ...d.data() }));

  if(!articles.length && window.ARTICLES){
    articles = window.ARTICLES.map(a => ({
      ...a,
      createdAt: a.createdAt || new Date().toISOString(),
      published: a.published !== false
    }));
    await seedArticles();
  }

  await publishDueScheduledArticles();

  const eventSnap = await fb.getDocs(fb.query(fb.collection(fb.db, "events"), fb.orderBy("sortDate", "asc")));
  events = eventSnap.docs.map(d => ({ id:d.id, ...d.data() }));

  if(!events.length){
    events = structuredClone(defaultEvents).map(e => ({...e, sortDate:eventSortDate(e)}));
    await seedEvents();
  }

  const heroDoc = await fb.getDoc(fb.doc(fb.db, "siteConfig", "hero"));
  if(heroDoc.exists()){
    hero = { ...hero, ...heroDoc.data() };
  }else{
    hero = {
      featured: getAutoFeaturedIds(),
      autoFeatured:false,
      topics: [],
      rotation: articles.filter(a => String(a.category || "").toUpperCase() === "RESEÑA").slice(0,5).map(a => a.id)
    };
    await saveHeroOnly();
  }

  normalizeHero();
}

async function seedArticles(){
  await Promise.all(articles.map(a => saveArticleDoc(a)));
}

async function seedEvents(){
  await Promise.all(events.map(e => saveEventDoc(e)));
}

async function saveHeroOnly(){
  if(!fb) return;

  normalizeHero();

  await fb.setDoc(fb.doc(fb.db, "siteConfig", "hero"), {
    featured: hero.autoFeatured ? getAutoFeaturedIds() : hero.featured,
    autoFeatured: hero.autoFeatured,
    topics: publishedArticles().slice(0,10).map(a => a.id),
    rotation: hero.rotation
  }, { merge:true });
}

async function saveArticleDoc(article){
  if(!fb) return;
  await fb.setDoc(fb.doc(fb.db, "articles", article.id), article, { merge:true });
}

async function deleteArticleDoc(id){
  if(!fb) return;
  await fb.deleteDoc(fb.doc(fb.db, "articles", id));
}

async function saveEventDoc(ev){
  if(!fb) return;
  await fb.setDoc(fb.doc(fb.db, "events", ev.id), {...ev, sortDate:eventSortDate(ev)}, { merge:true });
}

async function deleteEventDoc(id){
  if(!fb) return;
  await fb.deleteDoc(fb.doc(fb.db, "events", id));
}

function purgePastEvents(){
  const before = events.length;
  events = events.filter(ev => eventTime(ev) >= todayComparable());
  if(events.length !== before) saveHeroOnly();
}

function download(name, data){
  const blob = new Blob([JSON.stringify(data, null, 2)], {type:"application/json"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

function renderSlotList(boxId, key, count, filterFn){
  const box = $(boxId);
  if(!box) return;

  box.innerHTML = "";
  const slotCount = key === "featured" ? Math.max(3, count || 0) : count;

  for(let i=0; i<slotCount; i++){
    const a = getArticle(hero[key]?.[i]);
    const canRemove = key === "featured" && hero.featured.length > 3 && !hero.autoFeatured;
    const card = document.createElement("article");
    card.className = "slot-card";

    if(key === "featured"){
      card.draggable = !hero.autoFeatured;
      card.dataset.featuredIndex = String(i);
    }

    card.innerHTML = `
      <strong>${String(i+1).padStart(2,"0")}</strong>
      <div>
        <h4>${a ? a.title : "Sin seleccionar"}</h4>
        <p>${a ? `${a.category} · ${a.date}` : "Selecciona una entrada"}</p>
      </div>
      <button type="button" class="primary" data-select-slot="${key}" data-index="${i}" data-filter="${filterFn || ""}" ${key === "featured" && hero.autoFeatured ? "disabled" : ""}>Seleccionar</button>
      ${key === "featured" ? `<button type="button" class="slot-remove" data-remove-featured="${i}" ${canRemove ? "" : "disabled"} title="${canRemove ? "Eliminar de destacadas" : "Mínimo 3 destacadas"}">×</button>` : ""}
    `;
    box.appendChild(card);
  }
}

function renderHero(){
  syncAutoFeatured();
  normalizeHero();

  $("heroAutoFeatured").checked = !!hero.autoFeatured;
  renderSlotList("heroFeatured", "featured", hero.featured.length, "published");
  renderSlotList("heroRotation", "rotation", 5, "review");

  $("addFeaturedSlot").disabled = hero.autoFeatured || hero.featured.length >= 5;
  $("addFeaturedSlot").textContent = hero.featured.length >= 5 ? "Máximo 5 destacadas" : "Agregar destacada";

  const auto = publishedArticles().slice(0,10);
  $("heroTopicsAuto").innerHTML = auto.map((a,i)=>`
    <article class="list-item">
      <img src="${a.image || ""}" alt="">
      <div>
        <h4>${String(i+1).padStart(2,"0")} · ${a.title || "Sin título"}</h4>
        <p>${a.excerpt || ""}</p>
        <span class="pill">${a.category || "NOTICIA"}</span>
      </div>
    </article>
  `).join("");
}

function openArticleSelector(context){
  selectContext = context;
  $("selectDialogTitle").textContent = context.key === "rotation" ? "Seleccionar reseña" : (context.isNewSlot ? "Agregar destacada" : "Seleccionar artículo");
  $("selectArticleSearch").value = "";
  renderSelectList();
  $("selectArticleDialog").showModal();
}

function eligibleForSelect(article){
  if(selectContext?.filter === "review") return String(article.category || "").toUpperCase() === "RESEÑA" && isPublished(article);
  return isPublished(article);
}

function renderSelectList(){
  const q = $("selectArticleSearch").value || "";
  const list = sortedArticles(articles).filter(eligibleForSelect).filter(a => articleMatches(a, q)).slice(0,10);

  $("selectDialogHint").textContent = q ? "Resultados de búsqueda." : "Últimos 10 artículos creados.";
  $("selectArticleList").innerHTML = list.map(a=>`
    <article class="list-item">
      <img src="${a.image || ""}" alt="">
      <div>
        <h4>${a.title || "Sin título"}</h4>
        <p>${a.excerpt || ""}</p>
        <span class="pill">${a.category || "NOTICIA"}</span>
      </div>
      <button type="button" class="primary" data-pick-article="${a.id}">Elegir</button>
    </article>
  `).join("");
}

async function pickArticle(articleId){
  if(!selectContext) return;

  hero[selectContext.key][selectContext.index] = articleId;
  if(selectContext.key === "featured") hero.featured = hero.featured.filter(Boolean).slice(0,5);

  await saveHeroOnly();
  renderHero();
  $("selectArticleDialog").close();
}

function renderArticles(){
  let list = sortedArticles(articles).filter(a => articleMatches(a, articleSearch));

  if(articleTab === "published") list = list.filter(isPublished);
  if(articleTab === "unpublished") list = list.filter(isUnpublished);
  if(articleTab === "scheduled") list = list.filter(isScheduled);

  $("articleList").innerHTML = list.map(a=>{
    const s = statusOf(a);
    return `
      <article class="list-item">
        <img src="${a.image || ""}" alt="">
        <div>
          <h4>${a.title || "Sin título"}</h4>
          <p>${a.excerpt || ""}</p>
          <span class="pill">${a.category || "NOTICIA"}</span>
          <span class="plain-status ${s}">${statusLabel(a)}</span>
        </div>
        <button type="button" class="primary" data-edit-article="${a.id}">Editar</button>
      </article>
    `;
  }).join("");
}

function safeFileName(value){
  return String(value || "image")
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g,"")
    .replace(/[^a-z0-9.]+/g,"-")
    .replace(/(^-|-$)/g,"");
}

function getGitHubImageConfig(){
  return {
    owner: localStorage.getItem("drkprty-github-owner") || "oaxsun",
    repo: localStorage.getItem("drkprty-github-repo") || "orbita",
    branch: localStorage.getItem("drkprty-github-branch") || "main",
    uploadPath: localStorage.getItem("drkprty-github-upload-path") || "assets/uploads",
    publicBaseUrl: localStorage.getItem("drkprty-github-public-base-url") || "https://oaxsun.github.io/orbita",
    token: localStorage.getItem("drkprty-github-token") || ""
  };
}

function fileToBase64(file){
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || "").split(",")[1] || "");
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function uploadArticleImageIfNeeded(articleId){
  const input = $("articleImageFile");
  const file = input?.files?.[0];
  if(!file) return $("articleImage").value;

  const cfg = getGitHubImageConfig();
  if(!cfg.token){
    alert("Primero configura GitHub en el botón 'Configurar GitHub' del panel lateral.");
    throw new Error("Missing GitHub token");
  }

  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const fileName = `${safeFileName(articleId)}-${Date.now()}.${ext}`;
  const cleanPath = cfg.uploadPath.replace(/^\/|\/$/g, "");
  const repoPath = `${cleanPath}/${fileName}`;
  const apiUrl = `https://api.github.com/repos/${cfg.owner}/${cfg.repo}/contents/${repoPath}`;
  const publicUrl = `${cfg.publicBaseUrl.replace(/\/$/,"")}/${repoPath}`;
  const uploadButton = document.querySelector("#articleForm button[type='submit']");
  const previousText = uploadButton?.textContent;

  if(uploadButton){
    uploadButton.disabled = true;
    uploadButton.textContent = "Subiendo a GitHub...";
  }

  try{
    const content = await fileToBase64(file);
    const res = await fetch(apiUrl, {
      method:"PUT",
      headers:{
        "Authorization":`Bearer ${cfg.token}`,
        "Accept":"application/vnd.github+json",
        "X-GitHub-Api-Version":"2022-11-28",
        "Content-Type":"application/json"
      },
      body:JSON.stringify({
        message:`Upload article image: ${fileName}`,
        content,
        branch:cfg.branch
      })
    });

    if(!res.ok){
      const detail = await res.text();
      throw new Error(`GitHub upload failed: ${res.status} ${detail}`);
    }

    $("articleImage").value = publicUrl;
    return publicUrl;
  }finally{
    if(uploadButton){
      uploadButton.disabled = false;
      uploadButton.textContent = previousText || "Guardar artículo";
    }
  }
}

function openArticle(id=null){
  const a = id ? articles.find(x => x.id === id) : null;
  $("articleDialogTitle").textContent = a ? "Editar artículo" : "Crear artículo";
  $("articleId").value = a?.id || "";
  $("articleImage").value = a?.image || "";
  if($("articleImageFile")) $("articleImageFile").value = "";
  $("articleTitle").value = a?.title || "";
  $("articleExcerpt").value = a?.excerpt || "";
  $("articleBody").value = Array.isArray(a?.body) ? a.body.join("\n\n") : "";
  $("articleSpotifyEmbed").value = a?.spotifyEmbed || "";
  $("articleAuthor").value = a?.author || "DRKPRTY";
  $("articleDate").value = a?.date || "";
  $("articleTags").value = Array.isArray(a?.tags) ? a.tags.join(", ") : "";
  $("articleCategory").value = a?.category || "NOTICIA";
  $("articlePublishAt").value = a?.publishAt || "";
  $("articlePublished").checked = a ? isPublished(a) : true;
  $("deleteArticle").style.display = a ? "inline-block" : "none";
  $("articleDialog").showModal();
}

function normalizeImportedArticle(raw){
  const title = raw.title || raw.titulo || "";
  const id = raw.id || slugify(title);
  return {
    id,
    title,
    category: (raw.category || raw.categoria || "NOTICIA").toUpperCase(),
    date: raw.date || raw.fecha || "",
    read: raw.read || "3 MIN DE LECTURA",
    author: raw.author || raw.autor || "DRKPRTY",
    image: raw.image || raw.imagen || "",
    excerpt: raw.excerpt || raw.preview || raw.previewText || raw["preview text"] || "",
    tags: Array.isArray(raw.tags || raw.hashtags)
      ? (raw.tags || raw.hashtags)
      : String(raw.tags || raw.hashtags || "").split(",").map(t=>t.trim()).filter(Boolean),
    body: Array.isArray(raw.body || raw.cuerpo)
      ? (raw.body || raw.cuerpo)
      : String(raw.body || raw.cuerpo || "").split(/\n\s*\n/).map(p=>p.trim()).filter(Boolean),
    quote: raw.quote || raw.frase || "",
    createdAt: raw.createdAt || new Date().toISOString(),
    publishAt: raw.publishAt || "",
    published: raw.publishAt && parsePublishTime(raw.publishAt) > Date.now() ? "scheduled" : (raw.published ?? true),
    spotifyEmbed: raw.spotifyEmbed || raw.spotify || ""
  };
}

function renderEvents(){
  purgePastEvents();
  events.sort((a,b)=>eventSortDate(a)-eventSortDate(b));

  $("eventList").innerHTML = events.map(ev=>`
    <article class="list-item">
      <div class="pill">${ev.day} ${ev.month}</div>
      <div>
        <h4>${ev.title}</h4>
        <p>${ev.venue}</p>
        <span class="pill">${ev.type}</span>
      </div>
      <button type="button" class="primary" data-edit-event="${ev.id}">Editar</button>
    </article>
  `).join("");
}

function openEvent(id=null){
  const ev = id ? events.find(x=>x.id===id) : null;
  $("eventDialogTitle").textContent = ev ? "Editar evento" : "Crear evento";
  $("eventId").value = ev?.id || "";
  $("eventDay").value = ev?.day || "";
  $("eventMonth").value = ev?.month || "";
  $("eventTitle").value = ev?.title || "";
  $("eventVenue").value = ev?.venue || "";
  $("eventType").value = ev?.type || "CONCIERTO";
  $("deleteEvent").style.display = ev ? "inline-block" : "none";
  $("eventDialog").showModal();
}

function renderAll(){
  renderHero();
  renderArticles();
  renderEvents();
}

/* Login + Firebase */
function initLogin(){
  const loginScreen = $("loginScreen");
  const adminApp = $("adminApp");
  const loginForm = $("loginForm");
  const loginError = $("loginError");

  function showLogin(){
    document.body.classList.remove("admin-authenticated");
    loginScreen.style.display = "grid";
    adminApp.style.display = "none";
  }

  async function showApp(){
    document.body.classList.add("admin-authenticated");
    loginScreen.style.display = "none";
    adminApp.style.display = "grid";
    if(!isReady){
      await loadAllFromFirestore();
      isReady = true;
      renderAll();
    }
  }

  showLogin();

  const waitForFirebase = setInterval(()=>{
    if(!window.orbitaFirebase) return;
    clearInterval(waitForFirebase);
    fb = window.orbitaFirebase;

    fb.onAuthStateChanged(fb.auth, async (user)=>{
      if(user) await showApp();
      else showLogin();
    });

    loginForm.addEventListener("submit", async (e)=>{
      e.preventDefault();
      const email = $("loginUser").value.trim();
      const password = $("loginPass").value;
      loginError.style.display = "none";
      try{
        await fb.signInWithEmailAndPassword(fb.auth, email, password);
      }catch(err){
        console.error(err);
        loginError.style.display = "block";
      }
    });
  }, 100);
}

/* Events / clicks */
document.addEventListener("click", async (e)=>{
  const navBtn = e.target.closest("aside nav button");
  if(navBtn){
    document.querySelectorAll("aside nav button").forEach(b=>b.classList.remove("active"));
    document.querySelectorAll(".panel").forEach(p=>p.classList.remove("active"));
    navBtn.classList.add("active");
    $(navBtn.dataset.section).classList.add("active");
    $("pageTitle").textContent = navBtn.textContent;
    return;
  }

  const closeBtn = e.target.closest("[data-close]");
  if(closeBtn){
    $(closeBtn.dataset.close)?.close();
    return;
  }

  const addFeatured = e.target.closest("#addFeaturedSlot");
  if(addFeatured){
    e.preventDefault();
    if(hero.autoFeatured || hero.featured.length >= 5) return;
    openArticleSelector({ key:"featured", index:hero.featured.length, filter:"published", isNewSlot:true });
    return;
  }

  const removeFeatured = e.target.closest("[data-remove-featured]");
  if(removeFeatured){
    e.preventDefault();
    if(removeFeatured.disabled || hero.autoFeatured) return;
    const index = Number(removeFeatured.dataset.removeFeatured);
    if(hero.featured.length > 3){
      hero.featured.splice(index, 1);
      await saveHeroOnly();
      renderHero();
    }
    return;
  }

  const selectSlot = e.target.closest("[data-select-slot]");
  if(selectSlot){
    e.preventDefault();
    if(selectSlot.disabled) return;
    openArticleSelector({
      key:selectSlot.dataset.selectSlot,
      index:Number(selectSlot.dataset.index),
      filter:selectSlot.dataset.filter
    });
    return;
  }

  const pick = e.target.closest("[data-pick-article]");
  if(pick){
    e.preventDefault();
    await pickArticle(pick.dataset.pickArticle);
    return;
  }

  const editArticle = e.target.closest("[data-edit-article]");
  if(editArticle){
    e.preventDefault();
    openArticle(editArticle.dataset.editArticle);
    return;
  }

  const editEvent = e.target.closest("[data-edit-event]");
  if(editEvent){
    e.preventDefault();
    openEvent(editEvent.dataset.editEvent);
    return;
  }

  const githubConfig = e.target.closest("#githubImageConfig");
  if(githubConfig){
    const cfg = getGitHubImageConfig();
    $("githubOwner").value = cfg.owner;
    $("githubRepo").value = cfg.repo;
    $("githubBranch").value = cfg.branch;
    $("githubUploadPath").value = cfg.uploadPath;
    $("githubPublicBaseUrl").value = cfg.publicBaseUrl;
    $("githubToken").value = cfg.token;
    $("githubDialog").showModal();
    return;
  }
});

$("heroAutoFeatured").addEventListener("change", async (e)=>{
  hero.autoFeatured = e.target.checked;
  if(hero.autoFeatured) hero.featured = getAutoFeaturedIds();
  await saveHeroOnly();
  renderHero();
});

$("saveHero").addEventListener("click", async ()=>{
  await saveHeroOnly();
  alert("Configuración Hero guardada.");
});

$("selectArticleSearch").addEventListener("input", renderSelectList);

$("articleSearch").addEventListener("input", e=>{
  articleSearch = e.target.value;
  renderArticles();
});

document.querySelectorAll("[data-article-tab]").forEach(btn=>{
  btn.addEventListener("click",()=>{
    document.querySelectorAll("[data-article-tab]").forEach(b=>b.classList.remove("active"));
    btn.classList.add("active");
    articleTab = btn.dataset.articleTab;
    renderArticles();
  });
});

$("createArticle").addEventListener("click",()=>openArticle());

$("articleForm").addEventListener("submit", async e=>{
  e.preventDefault();

  const existingId = $("articleId").value;
  const id = existingId || slugify($("articleTitle").value);
  const previous = articles.find(a=>a.id===id);
  const imageUrl = await uploadArticleImageIfNeeded(id);
  const publishTime = parsePublishTime($("articlePublishAt").value);

  const article = {
    id,
    title:$("articleTitle").value,
    category:$("articleCategory").value,
    date:$("articleDate").value,
    read: previous?.read || "3 MIN DE LECTURA",
    author:$("articleAuthor").value,
    image:imageUrl,
    excerpt:$("articleExcerpt").value,
    tags:$("articleTags").value.split(",").map(t=>t.trim()).filter(Boolean),
    body:$("articleBody").value.split(/\n\s*\n/).map(p=>p.trim()).filter(Boolean),
    quote: previous?.quote || "",
    createdAt: previous?.createdAt || new Date().toISOString(),
    publishAt:$("articlePublishAt").value,
    published: publishTime && publishTime > Date.now() ? "scheduled" : $("articlePublished").checked,
    spotifyEmbed:$("articleSpotifyEmbed").value
  };

  const idx = articles.findIndex(a=>a.id===id);
  if(idx >= 0) articles[idx] = article;
  else articles.unshift(article);

  await saveArticleDoc(article);
  await saveHeroOnly();
  renderAll();
  $("articleDialog").close();
});

$("deleteArticle").addEventListener("click", async ()=>{
  const id = $("articleId").value;
  if(!confirm("¿Eliminar este artículo?")) return;
  articles = articles.filter(a=>a.id!==id);
  hero.featured = hero.featured.filter(x=>x!==id);
  hero.rotation = hero.rotation.filter(x=>x!==id);
  await deleteArticleDoc(id);
  await saveHeroOnly();
  renderAll();
  $("articleDialog").close();
});

$("importArticleBtn")?.addEventListener("click", () => {
  $("importArticleFile").click();
});

$("importArticleFile")?.addEventListener("change", async (e) => {
  const file = e.target.files?.[0];
  if(!file) return;

  try{
    const text = await file.text();
    const imported = normalizeImportedArticle(JSON.parse(text));
    const idx = articles.findIndex(a => a.id === imported.id);

    if(idx >= 0){
      if(!confirm("Ya existe un artículo con ese ID.\n¿Sobrescribir?")) return;
      articles[idx] = imported;
    }else{
      articles.unshift(imported);
    }

    await saveArticleDoc(imported);
    await saveHeroOnly();
    renderAll();
    alert("Artículo importado correctamente.");
  }catch(err){
    console.error(err);
    alert("No se pudo importar.\nRevisa que sea un JSON válido.");
  }finally{
    e.target.value = "";
  }
});

$("articleImageFile")?.addEventListener("change", () => {
  const file = $("articleImageFile")?.files?.[0];
  if(!file) return;
  $("articleImage").value = URL.createObjectURL(file);
});

$("githubForm")?.addEventListener("submit", (event) => {
  event.preventDefault();
  localStorage.setItem("drkprty-github-owner", $("githubOwner").value.trim());
  localStorage.setItem("drkprty-github-repo", $("githubRepo").value.trim());
  localStorage.setItem("drkprty-github-branch", $("githubBranch").value.trim() || "main");
  localStorage.setItem("drkprty-github-upload-path", $("githubUploadPath").value.trim() || "assets/uploads");
  localStorage.setItem("drkprty-github-public-base-url", $("githubPublicBaseUrl").value.trim());
  localStorage.setItem("drkprty-github-token", $("githubToken").value.trim());
  $("githubDialog").close();
  alert("Configuración de GitHub guardada en este navegador.");
});

$("createEvent").addEventListener("click",()=>openEvent());

$("eventForm").addEventListener("submit", async e=>{
  e.preventDefault();
  const id = $("eventId").value || slugify(`${$("eventTitle").value}-${$("eventDay").value}-${$("eventMonth").value}`);
  const ev = {
    id,
    day:$("eventDay").value,
    month:$("eventMonth").value,
    title:$("eventTitle").value,
    venue:$("eventVenue").value,
    type:$("eventType").value,
    sortDate:0
  };
  ev.sortDate = eventSortDate(ev);

  const idx = events.findIndex(x=>x.id===id);
  if(idx >= 0) events[idx] = ev;
  else events.unshift(ev);

  await saveEventDoc(ev);
  renderAll();
  $("eventDialog").close();
});

$("deleteEvent").addEventListener("click", async ()=>{
  const id = $("eventId").value;
  if(!confirm("¿Eliminar este evento?")) return;
  events = events.filter(e=>e.id!==id);
  await deleteEventDoc(id);
  renderAll();
  $("eventDialog").close();
});

$("exportAll").addEventListener("click",()=>{
  download("drkprty-content-export.json", {
    articles,
    events,
    hero:{
      featured: hero.autoFeatured ? getAutoFeaturedIds() : hero.featured,
      autoFeatured: hero.autoFeatured,
      topics: publishedArticles().slice(0,10).map(a=>a.id),
      rotation: hero.rotation
    }
  });
});

$("resetDemo").addEventListener("click", async ()=>{
  if(!confirm("Esto recarga datos desde Firestore. ¿Continuar?")) return;
  await loadAllFromFirestore();
  renderAll();
});

$("logoutBtn")?.addEventListener("click", async ()=>{
  await fb.signOut(fb.auth);
});

/* Drag & drop for featured */
$("heroFeatured").addEventListener("dragstart", e=>{
  const card = e.target.closest("[data-featured-index]");
  if(!card || hero.autoFeatured) return;
  draggedFeaturedIndex = Number(card.dataset.featuredIndex);
  card.classList.add("dragging");
  e.dataTransfer.effectAllowed = "move";
});

$("heroFeatured").addEventListener("dragend", e=>{
  const card = e.target.closest("[data-featured-index]");
  if(card) card.classList.remove("dragging");
  document.querySelectorAll(".slot-card").forEach(c=>c.classList.remove("drag-over"));
  draggedFeaturedIndex = null;
});

$("heroFeatured").addEventListener("dragover", e=>{
  const card = e.target.closest("[data-featured-index]");
  if(!card || draggedFeaturedIndex === null || hero.autoFeatured) return;
  e.preventDefault();
  document.querySelectorAll(".slot-card").forEach(c=>c.classList.remove("drag-over"));
  card.classList.add("drag-over");
});

$("heroFeatured").addEventListener("drop", async e=>{
  const card = e.target.closest("[data-featured-index]");
  if(!card || draggedFeaturedIndex === null || hero.autoFeatured) return;
  e.preventDefault();

  const targetIndex = Number(card.dataset.featuredIndex);
  if(targetIndex !== draggedFeaturedIndex){
    const [moved] = hero.featured.splice(draggedFeaturedIndex, 1);
    hero.featured.splice(targetIndex, 0, moved);
    await saveHeroOnly();
    renderHero();
  }

  draggedFeaturedIndex = null;
});

initLogin();
