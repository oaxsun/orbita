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
  const isNewsPage = window.location.pathname.includes("news.html");

  let filtered = current ? articles.filter(a => Array.isArray(a.tags) && a.tags.includes(current)) : articles;

  if(!isNewsPage){
    const topics = getHeroConfig()?.topics || [];
    if(topics.length){
      filtered = topics.map(id => articles.find(a => a.id === id)).filter(Boolean);
    }else{
      filtered = filtered.slice(0, 10);
    }
  }

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

  document.title = `${article.title} — Órbita`;

  const related = articles.filter(a => a.id !== article.id).slice(0,2);

  shell.innerHTML = `
    <div class="article-main">
      <span class="article-kicker">${article.category || "NOTICIA"}</span>
      <h1>${article.title || ""}</h1>
      <p class="desc">${article.excerpt || ""}</p>
      <div class="article-meta">
        <span>☻ POR ${article.author || "ÓRBITA"}</span>
        <span>${article.date || ""}</span>
        <span>${article.read || "3 MIN DE LECTURA"}</span>
      </div>

      <img class="article-image" src="${article.image || ""}" alt="${article.title || ""}">

      <div class="article-body">
        ${(article.body || []).map(p => `<p>${p}</p>`).join("")}
        ${article.quote ? `<blockquote class="article-quote">“${article.quote}”</blockquote>` : ""}
      </div>
    </div>

    <aside class="article-sidebar">
      <h3>COMPARTIR</h3>
      <div class="share">
        <a href="#">𝕏</a>
        <a href="#">f</a>
        <a href="#">↗</a>
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
  const selected = featuredIds.map(id => articles.find(a => a.id === id)).filter(Boolean);

  if(!selected.length){
    track.innerHTML = `
      <div class="featured-slide active empty-featured">
        <span class="pickup">ÓRBITA</span>
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

function renderRotation(){
  const selector = document.getElementById("rotationSelector");
  const title = document.getElementById("rotationTitle");
  const artist = document.getElementById("rotationArtist");
  const desc = document.getElementById("rotationDesc");
  const label = document.getElementById("rotationLabel");
  const cover = document.getElementById("rotationCover");
  const read = document.getElementById("rotationRead");

  if(!selector) return;

  const articles = getArticles();
  const rotationIds = getHeroConfig()?.rotation || [];
  const rotationArticles = rotationIds.map(id => articles.find(a => a.id === id)).filter(Boolean).slice(0,5);

  selector.innerHTML = rotationArticles.map((a, i) => `
    <button type="button" class="${i === 0 ? "active" : ""}" data-title="${escapeAttr(a.title)}" data-artist="${escapeAttr(a.author || 'ÓRBITA')}" data-desc="${escapeAttr(a.excerpt)}" data-label="${escapeAttr(a.category)}" data-link="article.html?id=${a.id}" data-cover="${escapeAttr(a.image)}">
      <strong>${String(i + 1).padStart(2,"0")}</strong><div><h4>${a.title}</h4><p>${a.category}</p></div>
    </button>
  `).join("");

  if(rotationArticles.length){
    const first = rotationArticles[0];
    if(title) title.textContent = first.title || "";
    if(artist) artist.textContent = first.author || "ÓRBITA";
    if(desc) desc.textContent = first.excerpt || "";
    if(label) label.textContent = first.category || "RESEÑA";
    if(cover) cover.style.setProperty("--cover", `url('${first.image || ""}')`);
    if(read) read.href = `article.html?id=${first.id}`;
  }
}

function setupRotationSelector(){
  const selector = document.getElementById("rotationSelector");
  if(!selector) return;

  const title = document.getElementById("rotationTitle");
  const artist = document.getElementById("rotationArtist");
  const desc = document.getElementById("rotationDesc");
  const label = document.getElementById("rotationLabel");
  const cover = document.getElementById("rotationCover");
  const read = document.getElementById("rotationRead");

  selector.querySelectorAll("button").forEach(button => {
    button.addEventListener("click", () => {
      selector.querySelectorAll("button").forEach(b => b.classList.remove("active"));
      button.classList.add("active");

      if(title) title.textContent = button.dataset.title;
      if(artist) artist.textContent = button.dataset.artist;
      if(desc) desc.textContent = button.dataset.desc;
      if(label) label.textContent = button.dataset.label;
      if(cover) cover.style.setProperty("--cover", `url('${button.dataset.cover}')`);
      if(read) read.href = button.dataset.link;
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

async function initOrbitaSite(){
  setupTheme();

  if(window.orbitaLoadFirebaseContent){
    await window.orbitaLoadFirebaseContent();
  }else{
    console.error("No existe window.orbitaLoadFirebaseContent. Revisa que el módulo Firebase esté cargando en el HTML.");
  }

  console.info("Órbita render data", {
    articles:getArticles().length,
    events:getEvents().length,
    hero:getHeroConfig()
  });

  renderHashtags();
  renderFeatured();
  renderArticles();
  renderArticlePage();
  renderDynamicEvents();
  renderRotation();
  setupFeaturedCarousel();
  setupRotationSelector();
}

initOrbitaSite();
