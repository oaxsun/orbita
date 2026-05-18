const STORAGE = {
  articles:"orbita-admin-articles",
  events:"orbita-admin-events",
  hero:"orbita-admin-hero"
};

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
let isReady = false;

const $ = (id) => document.getElementById(id);
const slugify = (value) => value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"");

function initLogin(){
  const loginScreen = document.getElementById("loginScreen");
  const adminApp = document.getElementById("adminApp");
  const loginForm = document.getElementById("loginForm");
  const loginError = document.getElementById("loginError");

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
      if(user){
        await showApp();
      }else{
        showLogin();
      }
    });

    loginForm.addEventListener("submit", async (e)=>{
      e.preventDefault();
      const email = document.getElementById("loginUser").value.trim();
      const password = document.getElementById("loginPass").value;
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

initLogin();

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

function purgePastEvents(){
  const before = events.length;
  events = events.filter(ev => eventTime(ev) >= todayComparable());
  if(events.length !== before) saveHeroOnly();
}

function isPublished(article){
  const publishTime = article.publishAt ? new Date(article.publishAt).getTime() : null;
  if(publishTime && publishTime <= Date.now()) return true;
  if(article.published === false) return false;
  if(publishTime && publishTime > Date.now()) return false;
  return true;
}

function statusOf(article){
  if(article.publishAt && new Date(article.publishAt).getTime() > Date.now()) return "scheduled";
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
  if(article.publishAt) return new Date(article.publishAt).getTime() || 0;
  if(article.createdAt) return new Date(article.createdAt).getTime() || 0;
  return 0;
}

function sortedArticles(list=articles){
  return [...list].sort((a,b)=> parseArticleDate(b) - parseArticleDate(a));
}

function publishedArticles(){
  return sortedArticles(articles.filter(isPublished));
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
      featured: publishedArticles().slice(0,3).map(a=>a.id),
      autoFeatured:false,
      topics: [],
      rotation: articles.filter(a=>a.category==="RESEÑA").slice(0,5).map(a=>a.id)
    };
    await saveHeroOnly();
  }

  if(typeof hero.autoFeatured === "undefined") hero.autoFeatured = false;
  if(!Array.isArray(hero.featured)) hero.featured = publishedArticles().slice(0,3).map(a=>a.id);
  if(hero.featured.length < 3) hero.featured = publishedArticles().slice(0,3).map(a=>a.id);
  if(hero.featured.length > 5) hero.featured = hero.featured.slice(0,5);
  if(!Array.isArray(hero.rotation)) hero.rotation = [];
}

async function seedArticles(){
  await Promise.all(articles.map(a => saveArticleDoc(a)));
}

async function seedEvents(){
  await Promise.all(events.map(e => saveEventDoc(e)));
}

async function saveHeroOnly(){
  if(!fb) return;
  await fb.setDoc(fb.doc(fb.db, "siteConfig", "hero"), {
    featured: hero.autoFeatured ? getAutoFeaturedIds() : hero.featured,
    autoFeatured: hero.autoFeatured,
    topics: publishedArticles().slice(0,10).map(a=>a.id),
    rotation: hero.rotation
  }, { merge:true });
}

async function saveArticleDoc(article){
  await fb.setDoc(fb.doc(fb.db, "articles", article.id), article, { merge:true });
}

async function deleteArticleDoc(id){
  await fb.deleteDoc(fb.doc(fb.db, "articles", id));
}

async function saveEventDoc(ev){
  await fb.setDoc(fb.doc(fb.db, "events", ev.id), {...ev, sortDate:eventSortDate(ev)}, { merge:true });
}

async function deleteEventDoc(id){
  await fb.deleteDoc(fb.doc(fb.db, "events", id));
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

function articleMatches(a, q){
  if(!q) return true;
  const text = `${a.title} ${a.category} ${a.excerpt} ${(a.tags||[]).join(" ")}`.toLowerCase();
  return text.includes(q.toLowerCase());
}

document.querySelectorAll("nav button").forEach(btn=>{
  btn.addEventListener("click",()=>{
    document.querySelectorAll("nav button").forEach(b=>b.classList.remove("active"));
    document.querySelectorAll(".panel").forEach(p=>p.classList.remove("active"));
    btn.classList.add("active");
    $(btn.dataset.section).classList.add("active");
    $("pageTitle").textContent = btn.textContent;
  });
});

function getArticle(id){
  return articles.find(a=>a.id===id);
}

function renderSlotList(boxId, key, count, filterFn){
  const box = $(boxId);
  box.innerHTML = "";
  for(let i=0;i<count;i++){
    const a = getArticle(hero[key][i]);
    const canRemove = key === "featured" && hero.featured.length > 3;
    const card = document.createElement("article");
    card.className = "slot-card";
    if(key === "featured"){
      card.draggable = !hero.autoFeatured;
      card.dataset.featuredIndex = i;
    }
    card.innerHTML = `
      <strong>${String(i+1).padStart(2,"0")}</strong>
      <div>
        <h4>${a ? a.title : "Sin seleccionar"}</h4>
        <p>${a ? `${a.category} · ${a.date}` : "Selecciona una entrada"}</p>
      </div>
      <button class="primary" data-select-slot="${key}" data-index="${i}" data-filter="${filterFn || ""}">Seleccionar</button>
      ${key === "featured" ? `<button class="slot-remove" data-remove-featured="${i}" ${canRemove ? "" : "disabled"} title="${canRemove ? "Eliminar de destacadas" : "Mínimo 3 destacadas"}">×</button>` : ""}
    `;
    box.appendChild(card);
  }
}

function getAutoFeaturedIds(){
  return publishedArticles().slice(0,3).map(a=>a.id);
}

function syncAutoFeatured(){
  if(hero.autoFeatured){
    hero.featured = getAutoFeaturedIds();
  }
}

function renderHero(){
  syncAutoFeatured();
  $("heroAutoFeatured").checked = !!hero.autoFeatured;
  renderSlotList("heroFeatured","featured",hero.featured.length,"published");
  renderSlotList("heroRotation","rotation",5,"review");
  $("addFeaturedSlot").disabled = hero.autoFeatured || hero.featured.length >= 5;
  $("addFeaturedSlot").textContent = hero.featured.length >= 5 ? "Máximo 5 destacadas" : "Agregar destacada";

  const auto = publishedArticles().slice(0,10);
  $("heroTopicsAuto").innerHTML = auto.map((a,i)=>`
    <article class="list-item">
      <img src="${a.image}" alt="">
      <div>
        <h4>${String(i+1).padStart(2,"0")} · ${a.title}</h4>
        <p>${a.excerpt}</p>
        <span class="pill">${a.category}</span>
      </div>
    </article>
  `).join("");
}

$("heroAutoFeatured").addEventListener("change", async e=>{
  hero.autoFeatured = e.target.checked;
  if(hero.autoFeatured){
    hero.featured = getAutoFeaturedIds();
  }
  const previousScroll = window.scrollY;
  await saveHeroOnly();
  renderHero();
  window.scrollTo({ top: previousScroll, behavior: "instant" });
});

$("addFeaturedSlot").addEventListener("click", ()=>{
  if(hero.autoFeatured || hero.featured.length >= 5) return;
  selectContext = { key:"featured", index:hero.featured.length, filter:"published", isNewSlot:true };
  $("selectDialogTitle").textContent = "Agregar destacada";
  $("selectArticleSearch").value = "";
  renderSelectList();
  $("selectArticleDialog").showModal();
});

$("hero").addEventListener("click", async e=>{
  const remove = e.target.closest("[data-remove-featured]");
  if(remove && !remove.disabled){
    const index = Number(remove.dataset.removeFeatured);
    if(hero.featured.length > 3){
      hero.featured.splice(index, 1);
      await saveHeroOnly();
      renderHero();
    }
    return;
  }

  const btn = e.target.closest("[data-select-slot]");
  if(!btn) return;
  if(btn.dataset.selectSlot === "featured" && hero.autoFeatured) return;

  selectContext = { key:btn.dataset.selectSlot, index:Number(btn.dataset.index), filter:btn.dataset.filter };
  $("selectDialogTitle").textContent = selectContext.key === "rotation" ? "Seleccionar reseña" : "Seleccionar artículo";
  $("selectArticleSearch").value = "";
  renderSelectList();
  $("selectArticleDialog").showModal();
});

let draggedFeaturedIndex = null;

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
  if(targetIndex === draggedFeaturedIndex) return;
  const [moved] = hero.featured.splice(draggedFeaturedIndex, 1);
  hero.featured.splice(targetIndex, 0, moved);
  await saveHeroOnly();
  renderHero();
});

function eligibleForSelect(a){
  if(selectContext?.filter === "review") return a.category === "RESEÑA" && isPublished(a);
  return isPublished(a);
}

function renderSelectList(){
  const q = $("selectArticleSearch").value || "";
  const list = sortedArticles(articles).filter(eligibleForSelect).filter(a=>articleMatches(a,q)).slice(0,10);
  $("selectDialogHint").textContent = q ? "Resultados de búsqueda." : "Últimos 10 artículos creados.";
  $("selectArticleList").innerHTML = list.map(a=>`
    <article class="list-item">
      <img src="${a.image}" alt="">
      <div>
        <h4>${a.title}</h4>
        <p>${a.excerpt}</p>
        <span class="pill">${a.category}</span>
      </div>
      <button class="primary" data-pick-article="${a.id}">Elegir</button>
    </article>
  `).join("");
}

$("selectArticleSearch").addEventListener("input", renderSelectList);
$("selectArticleList").addEventListener("click", async e=>{
  const btn = e.target.closest("[data-pick-article]");
  if(!btn || !selectContext) return;
  hero[selectContext.key][selectContext.index] = btn.dataset.pickArticle;
  if(selectContext.key === "featured") hero.featured = hero.featured.filter(Boolean).slice(0,5);
  await saveHeroOnly();
  renderHero();
  $("selectArticleDialog").close();
});

$("saveHero").addEventListener("click", async ()=>{await saveHeroOnly(); alert("Configuración Hero guardada.");});

function renderArticles(){
  let list = sortedArticles(articles).filter(a=>articleMatches(a, articleSearch));
  if(articleTab === "published") list = list.filter(isPublished);
  if(articleTab === "unpublished") list = list.filter(a=>!isPublished(a));
  if(articleTab === "scheduled") list = list.filter(a=>a.publishAt && new Date(a.publishAt).getTime() > Date.now());

  $("articleList").innerHTML = list.map(a=>{
    const s = statusOf(a);
    return `
    <article class="list-item">
      <img src="${a.image}" alt="">
      <div>
        <h4>${a.title}</h4>
        <p>${a.excerpt}</p>
        <span class="pill">${a.category}</span>
        <span class="plain-status ${s}">${statusLabel(a)}</span>
      </div>
      <button class="primary" data-edit-article="${a.id}">Editar</button>
    </article>
  `}).join("");
}

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
    reader.onload = () => {
      const result = String(reader.result || "");
      resolve(result.split(",")[1] || "");
    };
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
  const cleanId = safeFileName(articleId);
  const fileName = `${cleanId}-${Date.now()}.${ext}`;
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
  const a = id ? articles.find(x=>x.id===id) : null;
  $("articleDialogTitle").textContent = a ? "Editar artículo" : "Crear artículo";
  $("articleId").value = a?.id || "";
  $("articleImage").value = a?.image || "";
  if($("articleImageFile")) $("articleImageFile").value = "";
  $("articleTitle").value = a?.title || "";
  $("articleExcerpt").value = a?.excerpt || "";
  $("articleBody").value = a?.body?.join("\n\n") || "";
  $("articleSpotifyEmbed").value = a?.spotifyEmbed || "";
  $("articleAuthor").value = a?.author || "ÓRBITA";
  $("articleDate").value = a?.date || "";
  $("articleTags").value = a?.tags?.join(", ") || "";
  $("articleCategory").value = a?.category || "NOTICIA";
  $("articlePublishAt").value = a?.publishAt || "";
  $("articlePublished").checked = a?.published !== false;
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
    author: raw.author || raw.autor || "ÓRBITA",
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
    published: raw.published ?? true,
    spotifyEmbed: raw.spotifyEmbed || raw.spotify || ""
  };
}

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
      if(!confirm("Ya existe un artículo con ese ID. ¿Sobrescribir?")) return;
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
    alert("No se pudo importar. Revisa que sea un JSON válido.");
  }finally{
    e.target.value = "";
  }
});



$("articleImageFile")?.addEventListener("change", () => {
  const file = $("articleImageFile")?.files?.[0];
  if(!file) return;
  const previewUrl = URL.createObjectURL(file);
  $("articleImage").value = previewUrl;
});



$("githubImageConfig")?.addEventListener("click", () => {
  const cfg = getGitHubImageConfig();
  $("githubOwner").value = cfg.owner;
  $("githubRepo").value = cfg.repo;
  $("githubBranch").value = cfg.branch;
  $("githubUploadPath").value = cfg.uploadPath;
  $("githubPublicBaseUrl").value = cfg.publicBaseUrl;
  $("githubToken").value = cfg.token;
  $("githubDialog").showModal();
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



function setupImagePreviewInput(){
  const input = $("articleImageFile");
  if(!input || input.dataset.v8Bound) return;
  input.dataset.v8Bound = "true";
  input.addEventListener("change", () => {
    const file = input.files?.[0];
    if(!file) return;
    $("articleImage").value = URL.createObjectURL(file);
  });
}
setupImagePreviewInput();


$("createArticle").addEventListener("click",()=>openArticle());
$("articleList").addEventListener("click",e=>{
  const btn = e.target.closest("[data-edit-article]");
  if(btn) openArticle(btn.dataset.editArticle);
});

$("articleForm").addEventListener("submit", async e=>{
  e.preventDefault();
  const existingId = $("articleId").value;
  const id = existingId || slugify($("articleTitle").value);
  const previous = articles.find(a=>a.id===id);
  const imageUrl = await uploadArticleImageIfNeeded(id);

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
    published:$("articlePublished").checked,
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
      <button class="primary" data-edit-event="${ev.id}">Editar</button>
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

$("createEvent").addEventListener("click",()=>openEvent());
$("eventList").addEventListener("click",e=>{
  const btn = e.target.closest("[data-edit-event]");
  if(btn) openEvent(btn.dataset.editEvent);
});

$("eventForm").addEventListener("submit", async e=>{
  e.preventDefault();
  const id = $("eventId").value || slugify(`${$("eventTitle").value}-${$("eventDay").value}-${$("eventMonth").value}`);
  const ev = {id,day:$("eventDay").value,month:$("eventMonth").value,title:$("eventTitle").value,venue:$("eventVenue").value,type:$("eventType").value,sortDate:0};
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

document.querySelectorAll("[data-close]").forEach(btn=>{
  btn.addEventListener("click",() => $(btn.dataset.close).close());
});



/* v8: robust admin controls delegation
   Fixes dynamic buttons even if previous listeners fail after renders or new dialogs. */
function openArticleSelector(context){
  selectContext = context;
  $("selectDialogTitle").textContent = context.key === "rotation" ? "Seleccionar reseña" : (context.isNewSlot ? "Agregar destacada" : "Seleccionar artículo");
  $("selectArticleSearch").value = "";
  renderSelectList();
  $("selectArticleDialog").showModal();
}

function setupRobustAdminDelegation(){
  document.addEventListener("click", async (e) => {
    const closeBtn = e.target.closest("[data-close]");
    if(closeBtn){
      e.preventDefault();
      e.stopImmediatePropagation();
      const dialog = $(closeBtn.dataset.close);
      if(dialog?.close) dialog.close();
      return;
    }

    const configBtn = e.target.closest("#githubImageConfig");
    if(configBtn){
      e.preventDefault();
      e.stopImmediatePropagation();
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

    const editArticle = e.target.closest("[data-edit-article]");
    if(editArticle){
      e.preventDefault();
      e.stopImmediatePropagation();
      openArticle(editArticle.dataset.editArticle);
      return;
    }

    const addFeatured = e.target.closest("#addFeaturedSlot");
    if(addFeatured){
      e.preventDefault();
      e.stopImmediatePropagation();
      if(hero.autoFeatured || hero.featured.length >= 5) return;
      openArticleSelector({ key:"featured", index:hero.featured.length, filter:"published", isNewSlot:true });
      return;
    }

    const removeFeatured = e.target.closest("[data-remove-featured]");
    if(removeFeatured){
      e.preventDefault();
      e.stopImmediatePropagation();
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
      e.stopImmediatePropagation();
      if(selectSlot.dataset.selectSlot === "featured" && hero.autoFeatured) return;
      openArticleSelector({
        key: selectSlot.dataset.selectSlot,
        index: Number(selectSlot.dataset.index),
        filter: selectSlot.dataset.filter
      });
      return;
    }

    const pickArticle = e.target.closest("[data-pick-article]");
    if(pickArticle){
      e.preventDefault();
      e.stopImmediatePropagation();
      if(!selectContext) return;
      hero[selectContext.key][selectContext.index] = pickArticle.dataset.pickArticle;
      if(selectContext.key === "featured") hero.featured = hero.featured.filter(Boolean).slice(0,5);
      await saveHeroOnly();
      renderHero();
      $("selectArticleDialog").close();
      return;
    }
  }, true);

  const githubForm = $("githubForm");
  if(githubForm && !githubForm.dataset.v8Bound){
    githubForm.dataset.v8Bound = "true";
    githubForm.addEventListener("submit", (event) => {
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
  }
}

setupRobustAdminDelegation();


$("exportAll").addEventListener("click",()=>{
  download("orbita-content-export.json", {articles, events, hero:{
    featured: hero.autoFeatured ? getAutoFeaturedIds() : hero.featured,
    autoFeatured: hero.autoFeatured,
    topics: publishedArticles().slice(0,10).map(a=>a.id),
    rotation: hero.rotation
  }});
});

$("resetDemo").addEventListener("click", async ()=>{
  if(!confirm("Esto solo recarga los datos desde Firestore. ¿Continuar?")) return;
  await loadAllFromFirestore();
  renderAll();
});

$("logoutBtn")?.addEventListener("click", async ()=>{
  await fb.signOut(fb.auth);
});

function renderAll(){
  renderHero();
  renderArticles();
  renderEvents();
}
