import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore,
  collection,
  doc,
  getDocs,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBF7dI6cLaec1hMO6sRYyKTbgmhptq0OEM",
  authDomain: "orbita-727cd.firebaseapp.com",
  projectId: "orbita-727cd",
  storageBucket: "orbita-727cd.firebasestorage.app",
  messagingSenderId: "823174769372",
  appId: "1:823174769372:web:c0b62f90917c035dbb6219"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);


function truthyPublished(value){
  return value === true || value === "true" || value === 1 || value === "1";
}

function falseyPublished(value){
  return value === false || value === "false" || value === 0 || value === "0";
}

function parsePublishTime(value){
  if(!value) return null;
  if(typeof value === "object" && typeof value.toDate === "function") return value.toDate().getTime();
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : null;
}

function isArticlePublic(article){
  const publishTime = parsePublishTime(article.publishAt);
  const isDue = !publishTime || publishTime <= Date.now();

  if(publishTime && publishTime > Date.now()) return false;
  if(falseyPublished(article.published) && !isDue) return false;
  if(falseyPublished(article.published) && publishTime && isDue) return true;

  return !falseyPublished(article.published) && isDue;
}



function normalizeBool(value){
  if(value === true || value === "true" || value === 1 || value === "1" || value === "published" || value === "Publicado") return true;
  if(value === false || value === "false" || value === 0 || value === "0" || value === "draft" || value === "No publicado") return false;
  return null;
}

function isArticleVisibleOnPublic(article){
  const publishTime = parsePublishTime(article.publishAt);
  if(publishTime && publishTime > Date.now()) return false;

  const published = normalizeBool(article.published);
  const status = normalizeBool(article.status);

  if(published === false && publishTime && publishTime <= Date.now()) return true;
  if(published === false && !publishTime) return false;
  if(status === false && !publishTime) return false;

  return true;
}

function articleTime(a){
  if(a.publishAt) return new Date(a.publishAt).getTime() || 0;
  if(a.createdAt) return new Date(a.createdAt).getTime() || 0;
  return 0;
}

async function loadFirebaseContent(){
  try{
    const articlesSnap = await getDocs(collection(db, "articles"));
    const eventsSnap = await getDocs(collection(db, "events"));
    const heroSnap = await getDoc(doc(db, "siteConfig", "hero"));

    const rawArticles = articlesSnap.docs.map(d => ({ id:d.id, ...d.data() }));

    window.ORBITA_ARTICLES = rawArticles
      .filter(isArticleVisibleOnPublic)
      .sort((a,b) => articleTime(b) - articleTime(a));

    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();

    window.ORBITA_EVENTS = eventsSnap.docs.map(d => ({ id:d.id, ...d.data() }))
      .filter(e => !e.sortDate || Number(e.sortDate) >= Number(todayStart))
      .sort((a,b) => Number(a.sortDate || 0) - Number(b.sortDate || 0));

    window.ORBITA_HERO = heroSnap.exists() ? heroSnap.data() : null;

    window.DRKPRTY_DEBUG_DATA = { rawArticles: rawArticles.length, visibleArticles: window.ORBITA_ARTICLES.length, rawArticlesSample: rawArticles.slice(0,5) };
    console.info("DRKPRTY Firebase loaded", {
      articles: window.ORBITA_ARTICLES.length,
      events: window.ORBITA_EVENTS.length,
      hero: window.ORBITA_HERO
    });
  }catch(err){
    window.ORBITA_ARTICLES = [];
    window.ORBITA_EVENTS = [];
    window.ORBITA_HERO = null;
    console.error("DRKPRTY Firebase failed", err);
  }
}



function setMetaAttr(selector, attr, value){
  let el = document.querySelector(selector);
  if(!el){
    el = document.createElement("meta");
    if(selector.includes("property=")){
      const prop = selector.match(/property="([^"]+)"/)?.[1];
      if(prop) el.setAttribute("property", prop);
    }else{
      const name = selector.match(/name="([^"]+)"/)?.[1];
      if(name) el.setAttribute("name", name);
    }
    document.head.appendChild(el);
  }
  el.setAttribute(attr, value || "");
}

function setCanonical(url){
  let link = document.querySelector('link[rel="canonical"]');
  if(!link){
    link = document.createElement("link");
    link.setAttribute("rel", "canonical");
    document.head.appendChild(link);
  }
  link.setAttribute("href", url);
}

function setDynamicSEO(article){
  if(!article) return;

  const url = `${window.location.origin}${window.location.pathname}?id=${encodeURIComponent(article.id)}`;
  const title = `${article.title} — DRKPRTY`;
  const description = article.excerpt || "Lee la nota completa en DRKPRTY.";
  const image = article.image || `${window.location.origin}/orbita/assets/drkprty-logo.png`;

  document.title = title;
  setCanonical(url);

  setMetaAttr('meta[name="description"]', "content", description);
  setMetaAttr('meta[property="og:type"]', "content", "article");
  setMetaAttr('meta[property="og:title"]', "content", title);
  setMetaAttr('meta[property="og:description"]', "content", description);
  setMetaAttr('meta[property="og:url"]', "content", url);
  setMetaAttr('meta[property="og:image"]', "content", image);
  setMetaAttr('meta[property="og:image:alt"]', "content", article.title);
  setMetaAttr('meta[name="twitter:card"]', "content", "summary_large_image");
  setMetaAttr('meta[name="twitter:title"]', "content", title);
  setMetaAttr('meta[name="twitter:description"]', "content", description);
  setMetaAttr('meta[name="twitter:image"]', "content", image);

  const oldSchema = document.getElementById("drkprty-article-schema");
  if(oldSchema) oldSchema.remove();

  const schema = document.createElement("script");
  schema.type = "application/ld+json";
  schema.id = "drkprty-article-schema";
  schema.textContent = JSON.stringify({
    "@context":"https://schema.org",
    "@type":"NewsArticle",
    "headline":article.title,
    "description":description,
    "image":image ? [image] : [],
    "datePublished":article.publishAt || article.createdAt || new Date().toISOString(),
    "dateModified":article.updatedAt || article.createdAt || article.publishAt || new Date().toISOString(),
    "author":{"@type":"Person","name":article.author || "DRKPRTY"},
    "publisher":{
      "@type":"Organization",
      "name":"DRKPRTY",
      "logo":{
        "@type":"ImageObject",
        "url":`${window.location.origin}/orbita/assets/drkprty-logo.png`
      }
    },
    "mainEntityOfPage":{"@type":"WebPage","@id":url}
  });
  document.head.appendChild(schema);
}

function setListingSEO(){
  const params = new URLSearchParams(window.location.search);
  const category = params.get("category");
  const tag = params.get("tag");

  if(!window.location.pathname.includes("news.html")) return;

  let title = "News — DRKPRTY";
  let description = "Todas las noticias de música, cultura, lanzamientos, festivales y escenas emergentes en DRKPRTY.";

  if(category === "RESEÑA"){
    title = "Reviews — DRKPRTY";
    description = "Reseñas de discos, canciones, lanzamientos y cultura musical en DRKPRTY.";
  }

  if(category === "ENTREVISTA"){
    title = "Interviews — DRKPRTY";
    description = "Entrevistas con artistas, escenas emergentes y voces de la cultura musical en DRKPRTY.";
  }

  if(tag){
    title = `${tag} — DRKPRTY`;
    description = `Archivo de artículos relacionados con ${tag} en DRKPRTY.`;
  }

  document.title = title;
  setMetaAttr('meta[name="description"]', "content", description);
  setMetaAttr('meta[property="og:title"]', "content", title);
  setMetaAttr('meta[property="og:description"]', "content", description);
  setMetaAttr('meta[name="twitter:title"]', "content", title);
  setMetaAttr('meta[name="twitter:description"]', "content", description);
}


function getArticles(){
  return Array.isArray(window.ORBITA_ARTICLES) ? window.ORBITA_ARTICLES : [];
}

function getEvents(){
  return Array.isArray(window.ORBITA_EVENTS) ? window.ORBITA_EVENTS : [];
}

function getHeroConfig(){
  return window.ORBITA_HERO || null;
}

const TAGS = [
  { label:"#MÚSICA", emoji:"😎" },
  { label:"#FESTIVALES", emoji:"🔥" },
  { label:"#NOTICIAS", emoji:"🎧" },
  { label:"#LANZAMIENTOS", emoji:"💿" },
  { label:"#ENTREVISTAS", emoji:"📣" },
  { label:"#R&B", emoji:"⚡" },
  { label:"#INDIE", emoji:"🎸" },
  { label:"#HIPHOP", emoji:"🎙️" },
  { label:"#ELECTRÓNICA", emoji:"🎛️" },
  { label:"#RESEÑAS", emoji:"⭐" },
  { label:"#AGENDA", emoji:"🗓️" },
  { label:"#EN VIVO", emoji:"🪩" }
];

function toggleMenu(){
  document.getElementById('overlay')?.classList.toggle('active');
}

window.toggleMenu = toggleMenu;

function setupTheme(){
  const saved = localStorage.getItem("orbita-theme");
  const hour = new Date().getHours();
  const autoTheme = hour >= 19 || hour < 7 ? "dark" : "light";
  const theme = saved || autoTheme;

  document.body.classList.toggle("dark", theme === "dark");

  const btn = document.getElementById("themeToggle");
  if(btn){
    btn.textContent = theme === "dark" ? "☀" : "☾";
    btn.addEventListener("click", () => {
      const isDark = document.body.classList.toggle("dark");
      localStorage.setItem("orbita-theme", isDark ? "dark" : "light");
      btn.textContent = isDark ? "☀" : "☾";
    });
  }
}

function getCurrentFilter(){
  return new URLSearchParams(window.location.search).get("tag");
}

function getCurrentCategory(){
  return new URLSearchParams(window.location.search).get("category");
}

function getCurrentSearchQuery(){
  return new URLSearchParams(window.location.search).get("search");
}

function getArchiveTitle(){
  const category = getCurrentCategory();
  if(category === "RESEÑA") return "TODAS LAS REVIEWS";
  if(category === "ENTREVISTA") return "TODAS LAS INTERVIEWS";
  return "TODAS LAS NEWS";
}

function updateArchiveTitle(){
  const title = document.getElementById("archiveTitle");
  if(title) title.textContent = getArchiveTitle();
}

function renderHashtags(){
  const track = document.getElementById("hashtagTrack");
  if(!track) return;

  const current = getCurrentFilter();
  const fullList = TAGS.concat(TAGS);

  track.innerHTML = fullList.map(tag => {
    const active = current === tag.label ? "active" : "";
    const href = `news.html?tag=${encodeURIComponent(tag.label)}#tags`;

    return `<a class="hashtag-pill ${active}" href="${href}" data-tag="${tag.label}">
      <span class="emoji">${tag.emoji}</span><span>${tag.label}</span>
    </a>`;
  }).join("");
}

function escapeAttr(value){
  return String(value || "").replace(/"/g, "&quot;");
}

function renderArticles(){
  const grid = document.getElementById("articleGrid");
  if(!grid) return;

  const articles = getArticles();
  const current = getCurrentFilter();
  const category = getCurrentCategory();
  const isNewsPage = window.location.pathname.includes("news.html");

  let filtered = articles;
  const search = getCurrentSearchQuery();
  if(current) filtered = filtered.filter(a => Array.isArray(a.tags) && a.tags.includes(current));
  if(category) filtered = filtered.filter(a => String(a.category || "").toUpperCase() === category.toUpperCase());
  if(search){
    const q = search.toLowerCase();
    filtered = filtered.filter(a => `${a.title || ""} ${a.excerpt || ""} ${a.category || ""} ${(a.tags || []).join(" ")}`.toLowerCase().includes(q));
  }

  if(!isNewsPage){
    // New Topics on the main page must always show the latest published articles.
    // Do not use siteConfig.hero.topics because that document can keep stale IDs.
    filtered = articles.slice(0, 10);
  }

  console.info("DRKPRTY renderArticles", {
    isNewsPage,
    totalArticles: articles.length,
    renderedArticles: filtered.length,
    firstIds: filtered.slice(0,5).map(a => a.id)
  });

  grid.innerHTML = filtered.map((article, index) => `
    <a class="topic-card article-link news-style-card ${isNewsPage ? "archive-card" : ""}" href="article.html?id=${article.id}" style="--cardimg:url('${article.image || ""}')">
      ${isNewsPage ? "" : `<div class="number">${String(index + 1).padStart(2,"0")}</div>`}
      <div class="content">
        <span class="tag-mini">${article.category || "NOTICIA"}</span>
        <h3>${article.title || "Sin título"}</h3>
        <p>${article.excerpt || ""}</p>
        <small>${article.date || ""}</small>
      </div>
      <button>LEER →</button>
    </a>
  `).join("");

  const empty = document.getElementById("emptyState");
  if(empty) empty.style.display = filtered.length ? "none" : "block";
}


function renderArticleBody(article){
  const body = Array.isArray(article.body) ? article.body : [];
  const firstBlock = body.slice(0, 3);
  const secondBlock = body.slice(3);

  const quote = article.quote
    ? `<blockquote class="article-highlight-quote">“${article.quote.replace(/^“|”$/g, "")}”</blockquote>`
    : "";

  const spotify = article.spotifyEmbed
    ? `<div class="spotify-embed-wrap">
        <h3>ESCUCHA</h3>
        <iframe
          style="border-radius:18px"
          src="${article.spotifyEmbed}"
          width="100%"
          height="352"
          frameborder="0"
          allowfullscreen=""
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          loading="lazy">
        </iframe>
      </div>`
    : "";

  return `
    ${firstBlock.map(p => `<p>${p}</p>`).join("")}
    ${quote}
    ${secondBlock.map(p => `<p>${p}</p>`).join("")}
    ${spotify}
  `;
}


function renderArticlePage(){
  const shell = document.getElementById("articleShell");
  if(!shell) return;

  const articles = getArticles();
  const id = new URLSearchParams(window.location.search).get("id");
  const article = articles.find(a => a.id === id) || articles[0];

  if(!article){
    shell.innerHTML = `<div class="article-main"><h1>Artículo no encontrado</h1><p class="desc">No hay artículos publicados disponibles todavía.</p></div>`;
    return;
  }

  setDynamicSEO(article);

  const related = articles.filter(a => a.id !== article.id).slice(0,6);

  shell.innerHTML = `
    <div class="article-main">
      <span class="article-kicker">${article.category || "NOTICIA"}</span>
      <h1>${article.title || ""}</h1>
      <p class="desc">${article.excerpt || ""}</p>
      <div class="article-meta">
        <span>☻ POR ${article.author || "DRKPRTY"}</span>
        <span>${article.date || ""}</span>
        <span>${article.read || "3 MIN DE LECTURA"}</span>
      </div>

      <img class="article-image" src="${article.image || ""}" alt="${article.title || ""}">

      <div class="article-body">
        ${renderArticleBody(article)}
      </div>
    </div>

    <aside class="article-sidebar">
      <h3>COMPARTIR</h3>
      <div class="share">
        <a href="#" data-copy-link title="Copiar link">↗</a>
      </div>

      <h3>TAGS</h3>
      <div class="sidebar-tags">
        ${(article.tags || []).map(t => `<a href="news.html?tag=${encodeURIComponent(t)}#tags">${t}</a>`).join("")}
      </div>

      <h3>LO MÁS LEÍDO</h3>
      <div class="related">
        ${related.map(r => `
          <a href="article.html?id=${r.id}">
            <img src="${r.image || ""}" alt="${r.title || ""}">
            <div>
              <h4>${r.title || ""}</h4>
              <p>${r.date || ""}</p>
            </div>
          </a>
        `).join("")}
      </div>
    </aside>
  `;
}

function renderFeatured(){
  const track = document.getElementById("featuredTrack");
  if(!track) return;

  const articles = getArticles();
  const hero = getHeroConfig();
  const featuredIds = hero?.featured || [];
  let selected = featuredIds.map(id => articles.find(a => a.id === id)).filter(Boolean);

  // If the hero is automatic, empty, or has stale IDs, keep the main page alive with the latest 3.
  if(hero?.autoFeatured || selected.length < Math.min(3, articles.length)){
    selected = articles.slice(0, 3);
  }

  console.info("DRKPRTY renderFeatured", {
    totalArticles: articles.length,
    selected: selected.map(a => a.id),
    autoFeatured: !!hero?.autoFeatured
  });

  if(!selected.length){
    track.innerHTML = `
      <div class="featured-slide active empty-featured">
        <span class="pickup">DRKPRTY</span>
        <p class="tiny">SIN DESTACADAS</p>
        <h2>AGREGA ARTÍCULOS DESDE EL ADMINISTRADOR</h2>
        <p class="desc">Cuando selecciones destacadas en el CMS, aparecerán aquí automáticamente.</p>
      </div>
    `;
    return;
  }

  track.innerHTML = selected.map((article, index) => `
    <a class="featured-slide ${index === 0 ? "active" : ""}" href="article.html?id=${article.id}" style="--bgimg:url('${article.image || ""}')">
      <span class="pickup">PICKUP 🚀</span>
      <p class="tiny">${String(index + 1).padStart(2,"0")} · ${article.category || "NOTICIA"}</p>
      <h2>${article.title || ""}</h2>
      <p class="desc">${article.excerpt || ""}</p>
      <span class="read-btn">LEER ARTÍCULO →</span>
    </a>
  `).join("");
}

function getDailySeed(){
  const d = new Date();
  return Number(`${d.getFullYear()}${String(d.getMonth()+1).padStart(2,"0")}${String(d.getDate()).padStart(2,"0")}`);
}

function seededRandom(seed){
  let x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function getDailyRandomReviewIds(){
  const reviews = getArticles().filter(a => String(a.category || "").toUpperCase() === "RESEÑA");
  const seed = getDailySeed();

  return reviews
    .map((article, index) => ({
      article,
      score: seededRandom(seed + index + article.id.length)
    }))
    .sort((a,b) => a.score - b.score)
    .slice(0, 5)
    .map(item => item.article.id);
}

function setRotationCover(url){
  const cover = document.getElementById("rotationCover");
  if(!cover) return;
  cover.style.setProperty("--cover", `url("${url || ""}")`);
}

function renderRotation(){
  const selector = document.getElementById("rotationSelector");
  const title = document.getElementById("rotationTitle");
  const artist = document.getElementById("rotationArtist");
  const desc = document.getElementById("rotationDesc");
  const label = document.getElementById("rotationLabel");
  const read = document.getElementById("rotationRead");

  if(!selector) return;

  const articles = getArticles();
  const configuredIds = getHeroConfig()?.rotation || [];
  const dailyIds = configuredIds.length ? configuredIds : getDailyRandomReviewIds();

  const rotationArticles = dailyIds
    .map(id => articles.find(a => a.id === id))
    .filter(Boolean)
    .slice(0,5);

  selector.innerHTML = rotationArticles.map((a, i) => `
    <button type="button" class="${i === 0 ? "active" : ""}" data-title="${escapeAttr(a.title)}" data-artist="${escapeAttr(a.author || 'DRKPRTY')}" data-desc="${escapeAttr(a.excerpt)}" data-label="${escapeAttr(a.category)}" data-link="article.html?id=${a.id}" data-cover="${escapeAttr(a.image)}">
      <strong>${String(i + 1).padStart(2,"0")}</strong><div><h4>${a.title}</h4><p>${a.category}</p></div>
    </button>
  `).join("");

  if(rotationArticles.length){
    const first = rotationArticles[0];
    if(title) title.textContent = first.title || "";
    if(artist) artist.textContent = first.author || "DRKPRTY";
    if(desc) desc.textContent = first.excerpt || "";
    if(label) label.textContent = first.category || "RESEÑA";
    setRotationCover(first.image || "");
    if(read) read.href = `article.html?id=${first.id}`;
  }else{
    if(title) title.textContent = "Sin reseñas";
    if(artist) artist.textContent = "Agrega reseñas desde el administrador";
    if(desc) desc.textContent = "Cuando publiques artículos con categoría RESEÑA, aparecerán aquí automáticamente.";
    if(label) label.textContent = "EN ROTACIÓN";
    setRotationCover("");
    if(read) read.href = "#";
  }
}

function setupRotationSelector(){
  const selector = document.getElementById("rotationSelector");
  if(!selector) return;

  const title = document.getElementById("rotationTitle");
  const artist = document.getElementById("rotationArtist");
  const desc = document.getElementById("rotationDesc");
  const label = document.getElementById("rotationLabel");
  const read = document.getElementById("rotationRead");

  selector.querySelectorAll("button").forEach(button => {
    button.addEventListener("click", () => {
      selector.querySelectorAll("button").forEach(b => b.classList.remove("active"));
      button.classList.add("active");

      if(title) title.textContent = button.dataset.title || "";
      if(artist) artist.textContent = button.dataset.artist || "";
      if(desc) desc.textContent = button.dataset.desc || "";
      if(label) label.textContent = button.dataset.label || "RESEÑA";
      setRotationCover(button.dataset.cover || "");
      if(read) read.href = button.dataset.link || "#";
    });
  });
}

function renderDynamicEvents(){
  const events = getEvents();

  const homeEvents = document.querySelector(".events-list");
  if(homeEvents){
    homeEvents.innerHTML = events.length
      ? events.slice(0,4).map(ev => `
        <div class="event-row"><strong>${ev.day}<span>${ev.month}</span></strong><p>${ev.title}<br><small>${ev.venue}</small></p></div>
      `).join("")
      : `<p class="empty-events">Agrega eventos desde el administrador.</p>`;
  }

  const directory = document.querySelector(".events-directory");
  if(directory){
    directory.innerHTML = events.length
      ? events.map(ev => `
        <article class="event-directory-card">
          <strong>${ev.day}<span>${ev.month}</span></strong>
          <div><h3>${ev.title}</h3><p>${ev.venue}</p></div>
          <span>${ev.type}</span>
        </article>
      `).join("")
      : `<p class="empty-state" style="display:block">No hay eventos publicados todavía.</p>`;
  }
}

function setupFeaturedCarousel(){
  const carousel = document.getElementById("featuredCarousel");
  const slides = [...document.querySelectorAll(".featured-slide")];
  const dotsBox = document.getElementById("featuredDots");
  const prev = document.getElementById("prevFeatured");
  const next = document.getElementById("nextFeatured");
  if(!carousel || !slides.length || !dotsBox) return;

  let index = 0;
  let startX = 0;
  let timer;

  dotsBox.innerHTML = slides.map((_, i) => `<button type="button" data-slide="${i}" aria-label="Ir a nota ${i+1}"></button>`).join("");
  const dots = [...dotsBox.querySelectorAll("button")];

  function show(i){
    index = (i + slides.length) % slides.length;
    slides.forEach((slide, n) => slide.classList.toggle("active", n === index));
    dots.forEach((dot, n) => dot.classList.toggle("active", n === index));
  }

  function restart(){
    clearInterval(timer);
    timer = setInterval(() => show(index + 1), 15000);
  }

  prev?.addEventListener("click", (e) => { e.preventDefault(); show(index - 1); restart(); });
  next?.addEventListener("click", (e) => { e.preventDefault(); show(index + 1); restart(); });
  dots.forEach(dot => dot.addEventListener("click", (e) => {
    e.preventDefault();
    show(Number(dot.dataset.slide));
    restart();
  }));

  carousel.addEventListener("pointerdown", e => { startX = e.clientX; });
  carousel.addEventListener("pointerup", e => {
    const diff = e.clientX - startX;
    if(Math.abs(diff) > 60){
      show(diff < 0 ? index + 1 : index - 1);
      restart();
    }
  });

  show(0);
  restart();
}


function setupShareCopy(){
  document.addEventListener("click", async (event) => {
    const btn = event.target.closest("[data-copy-link]");
    if(!btn) return;

    event.preventDefault();

    const url = window.location.href;

    try{
      await navigator.clipboard.writeText(url);
      showCopyToast("LINK COPIADO");
    }catch(err){
      const temp = document.createElement("textarea");
      temp.value = url;
      document.body.appendChild(temp);
      temp.select();
      document.execCommand("copy");
      temp.remove();
      showCopyToast("LINK COPIADO");
    }
  });
}

function showCopyToast(message){
  let toast = document.querySelector(".share-copy-toast");
  if(!toast){
    toast = document.createElement("div");
    toast.className = "share-copy-toast";
    document.body.appendChild(toast);
  }

  toast.textContent = message;
  toast.classList.add("active");

  clearTimeout(window.__orbitaCopyToastTimer);
  window.__orbitaCopyToastTimer = setTimeout(() => {
    toast.classList.remove("active");
  }, 1800);
}



function setupScrollTopButton(){
  let btn = document.getElementById("scrollTopBtn");
  if(!btn){
    btn = document.createElement("button");
    btn.id = "scrollTopBtn";
    btn.className = "scroll-top-btn";
    btn.type = "button";
    btn.textContent = "↑";
    btn.setAttribute("aria-label", "Volver arriba");
    document.body.appendChild(btn);
  }

  const toggle = () => {
    btn.classList.toggle("active", window.scrollY > 520);
  };

  window.addEventListener("scroll", toggle, { passive:true });
  toggle();

  btn.addEventListener("click", () => {
    window.scrollTo({ top:0, behavior:"smooth" });
  });
}



function setupCookieBanner(){
  if(localStorage.getItem("drkprty-cookies-ok") === "true") return;

  const banner = document.createElement("div");
  banner.className = "cookie-banner";
  banner.innerHTML = `
    <div>
      <strong>COOKIES</strong>
      <p>Usamos cookies para mejorar la experiencia, medir tráfico y preparar futuras funciones editoriales.</p>
    </div>
    <button type="button" id="acceptCookiesBtn">ACEPTAR →</button>
  `;

  document.body.appendChild(banner);
  requestAnimationFrame(() => banner.classList.add("active"));

  document.getElementById("acceptCookiesBtn")?.addEventListener("click", () => {
    localStorage.setItem("drkprty-cookies-ok", "true");
    banner.classList.remove("active");
    setTimeout(() => banner.remove(), 260);
  });
}

function setupNewsletterFakeSubscribe(){
  document.querySelectorAll("form").forEach(form => {
    const email = form.querySelector('input[type="email"]');
    const button = form.querySelector("button");
    if(!email || !button) return;

    button.addEventListener("click", (event) => {
      event.preventDefault();

      const value = email.value.trim();
      if(!value || !value.includes("@")){
        showNewsletterToast("ESCRIBE UN EMAIL VÁLIDO");
        return;
      }

      email.value = "";
      showNewsletterToast("TE SUSCRIBISTE A DRKPRTY");
    });
  });
}

function showNewsletterToast(message){
  let toast = document.querySelector(".newsletter-toast");
  if(!toast){
    toast = document.createElement("div");
    toast.className = "newsletter-toast";
    document.body.appendChild(toast);
  }

  toast.textContent = message;
  toast.classList.add("active");

  clearTimeout(window.__drkprtyNewsletterTimer);
  window.__drkprtyNewsletterTimer = setTimeout(() => {
    toast.classList.remove("active");
  }, 2200);
}


async function initOrbitaSite(){
  setupTheme();

  await loadFirebaseContent();

  console.info("DRKPRTY V11 main latest fix");
  console.info("DRKPRTY render data", {
    articles:getArticles().length,
    events:getEvents().length,
    hero:getHeroConfig()
  });

  setListingSEO();
  renderHashtags();
  updateArchiveTitle();
  renderFeatured();
  renderArticles();
  renderArticlePage();
  renderDynamicEvents();
  renderRotation();
  setupFeaturedCarousel();
  setupRotationSelector();
  setupShareCopy();
  setupScrollTopButton();
  setupCookieBanner();
  setupNewsletterFakeSubscribe();
}

initOrbitaSite();
