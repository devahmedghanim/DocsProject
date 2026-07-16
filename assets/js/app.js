/* =========================================================
   Nexus PMS Documentation — Public App Logic
   No build step, no framework — vanilla JS.
   ========================================================= */
(function () {
  "use strict";

  const LS = {
    lang: "npms_lang",
    route: "npms_last_route",
    open: (sectionRoute) => `npms_open_${sectionRoute}`,
    scroll: (route) => `npms_scroll_${route}`,
  };

  const state = {
    lang: localStorage.getItem(LS.lang) || "ar",
    sections: [],
    guidesCache: {}, // route -> guides array
  };

  const appEl = document.getElementById("app");
  const breadcrumbEl = document.getElementById("breadcrumb");
  const htmlRoot = document.getElementById("htmlRoot");

  function t(key) {
    return (I18N[state.lang] && I18N[state.lang][key]) || key;
  }

  function applyLangChrome() {
    htmlRoot.setAttribute("lang", state.lang);
    htmlRoot.setAttribute("dir", I18N[state.lang].dir);
    document.querySelectorAll("[data-i18n]").forEach((el) => {
      el.textContent = t(el.getAttribute("data-i18n"));
    });
    document.querySelectorAll(".lang-switch button").forEach((b) => {
      b.classList.toggle("active", b.getAttribute("data-lang") === state.lang);
    });
  }

  function localized(field) {
    // field = {ar: "...", en: "..."} -> returns current lang, falls back to other lang
    if (!field) return "";
    return field[state.lang] || field.ar || field.en || "";
  }

  function hasLocalized(field) {
    if (!field) return false;
    return !!field[state.lang];
  }

  /* ---------------- Data loading ---------------- */
  async function loadSections() {
    try {
      const res = await fetch("data/sections.json", { cache: "no-store" });
      state.sections = await res.json();
    } catch (e) {
      state.sections = [];
    }
  }

  async function loadGuides(route) {
    if (state.guidesCache[route]) return state.guidesCache[route];
    try {
      const res = await fetch(`data/guides/${route}.json`, {
        cache: "no-store",
      });
      const data = await res.json();
      state.guidesCache[route] = data;
      return data;
    } catch (e) {
      return [];
    }
  }

  //#region Edit By AI
  /* ---------------- Router ---------------- */
  function normalizePath(path) {
    const rawPath = (path || "").trim();
    if (!rawPath || rawPath === "#") return "/";

    const withoutHash = rawPath.replace(/^#/, "");
    const withoutQuery = withoutHash.split("?")[0] || "/";
    const withLeadingSlash = withoutQuery.startsWith("/")
      ? withoutQuery
      : `/${withoutQuery}`;
    const compactPath = withLeadingSlash.replace(/\/+/g, "/");
    return compactPath.replace(/\/+$/, "") || "/";
  }

  function parsePath(pathname = location.pathname) {
    const currentPath = normalizePath(pathname);
    if (currentPath === "/" || currentPath === "/index.html")
      return { view: "home", path: "/" };

    const parts = currentPath.replace(/^\//, "").split("/").filter(Boolean);
    if (parts.length === 1)
      return { view: "section", route: parts[0], path: currentPath };
    if (parts.length >= 2)
      return {
        view: "guide",
        route: parts[0],
        guideId: parts[1],
        path: `/${parts[0]}/${parts[1]}`,
      };
    return { view: "home", path: "/" };
  }

  function navigate(path, options = {}) {
    const nextPath = normalizePath(path);
    const currentPath = normalizePath(location.pathname);
    const historyMethod = options.replace ? "replaceState" : "pushState";

    if (nextPath !== currentPath || options.replace) {
      history[historyMethod](null, "", nextPath);
    }

    render();
  }

  window.addEventListener("popstate", render);
  //#endregion Edit By AI

  /* ---------------- Rendering: Home ---------------- */
  function renderHome() {
    breadcrumbEl.innerHTML = "";
    const totalGuides = Object.values(state.guidesCache);
    const sectionsHtml = state.sections.length
      ? state.sections
          .sort((a, b) => (a.order || 0) - (b.order || 0))
          .map(
            (s, i) => `
            <div class="section-card reveal" style="animation-delay:${i * 60}ms" data-route="${s.route}">
              <span class="arrow">${state.lang === "ar" ? "←" : "→"}</span>
              <div class="icon">${s.icon || "📄"}</div>
              <h3>${localized(s.title)}</h3>
              <p>${localized(s.desc)}</p>
              <span class="count" data-count-for="${s.route}">…</span>
            </div>
          `,
          )
          .join("")
      : `<div class="empty-state">
          <div class="emoji">🗂️</div>
          <div>${t("noSections")}</div>
          <div style="font-size:12.5px;margin-top:6px;opacity:.7">${t("noSectionsSub")}</div>
        </div>`;

    //#region Edit By AI
    appEl.innerHTML = `
      <div class="hero hero-home">
        <div class="hero-card">
          <h1>${t("heroTitle")}</h1>
          <p>${t("heroDesc")}</p>
          <div class="hero-stats">
            <div class="stat"><b>${state.sections.length}</b>${t("statsSections")}</div>
            <div class="stat" id="totalGuidesStat"><b>…</b>${t("statsGuides")}</div>
          </div>
        </div>
      </div>
      <div class="grid-wrap">
        <div class="grid-title">${t("sectionsTitle")}</div>
        <div class="sections-grid">${sectionsHtml}</div>
      </div>
    `;
    //#endregion Edit By AI

    document.querySelectorAll(".section-card[data-route]").forEach((card) => {
      card.addEventListener("click", () =>
        navigate(`/${card.getAttribute("data-route")}`),
      );
    });

    // async guide counts
    let grandTotal = 0;
    Promise.all(
      state.sections.map(async (s) => {
        const guides = await loadGuides(s.route);
        const el = document.querySelector(`[data-count-for="${s.route}"]`);
        if (el) el.textContent = `${guides.length} ${t("guidesCountSuffix")}`;
        grandTotal += guides.length;
      }),
    ).then(() => {
      const totalEl = document.getElementById("totalGuidesStat");
      if (totalEl)
        totalEl.innerHTML = `<b>${grandTotal}</b>${t("statsGuides")}`;
    });

    initReveal();
  }

  /* ---------------- Rendering: Section page ---------------- */
  async function renderSection(route, focusGuideId) {
    const section = state.sections.find((s) => s.route === route);
    //#region Edit By AI
    breadcrumbEl.innerHTML = `
      <a href="/" data-i18n-inline="home" data-nav="home">${t("home")}</a>
      <span class="sep">/</span>
      <span>${section ? localized(section.title) : route}</span>
    `;
    //#endregion Edit By AI

    if (!section) {
      appEl.innerHTML = `<div class="empty-state"><div class="emoji">❓</div><div>Section not found</div></div>`;
      return;
    }

    //#region Edit By AI
    appEl.innerHTML = `
      <div class="hero">
        <div class="hero-card">
          <h1>${section.icon || "📄"} ${localized(section.title)}</h1>
          <p>${localized(section.desc)}</p>
        </div>
      </div>
      <div class="section-layout">
        <div class="guides-main" id="guidesMain">
          <div class="skeleton" style="height:120px;margin-bottom:16px;"></div>
          <div class="skeleton" style="height:120px;"></div>
        </div>
        <aside class="guide-list-panel">
          <h4>${t("guideListTitle")}</h4>
          <div id="guideNavList"></div>
        </aside>
      </div>
    `;
    //#endregion Edit By AI

    //#region Edit By AI
    const guides = (await loadGuides(route))
      .slice()
      .sort((a, b) => (a.number || 0) - (b.number || 0));
    const guidesMain = document.getElementById("guidesMain");
    const guideNavList = document.getElementById("guideNavList");

    if (!guides.length) {
      guidesMain.innerHTML = `<div class="empty-state"><div class="emoji">📭</div><div>${t("noGuides")}</div></div>`;
      guideNavList.innerHTML = "";
      return;
    }

    const openKey = LS.open(route);
    const guideIds = guides.map((g) => g.id);
    const savedOpen = JSON.parse(localStorage.getItem(openKey) || "null");
    let openIds = new Set(
      Array.isArray(savedOpen)
        ? savedOpen.filter((id) => guideIds.includes(id))
        : guideIds,
    );
    if (!openIds.size) openIds = new Set(guideIds);
    if (focusGuideId) openIds.add(focusGuideId);
    //#endregion Edit By AI

    function persistOpen() {
      localStorage.setItem(openKey, JSON.stringify(Array.from(openIds)));
    }

    function mediaHtml(g) {
      const m =
        g.media && g.media[state.lang]
          ? g.media[state.lang]
          : g.media && (g.media.ar || g.media.en);
      if (!m || !m.src) return `<div class="no-media">${t("noMedia")}</div>`;
      if (m.type === "video") {
        return `<div class="guide-media"><video src="${m.src}" controls playsinline></video></div>`;
      }
      return `<div class="guide-media"><img src="${m.src}" alt="${localized(g.title)}" loading="lazy"></div>`;
    }

    guidesMain.innerHTML = guides
      .map(
        (g, i) => `
      <article class="guide-card ${openIds.has(g.id) ? "open" : ""} reveal" style="animation-delay:${i * 50}ms" id="guide-${g.id}" data-id="${g.id}">
        <div class="guide-card-head">
          <div class="num-badge">${String(g.number).padStart(2, "0")}</div>
          <h3>${localized(g.title)}</h3>
          <div class="chev">⌄</div>
        </div>
        <div class="guide-card-body">
          <div class="guide-card-inner">
            <!-- //#region Edit By AI -->
            <div class="desc">${localized(g.desc)}</div>
            <!-- //#endregion Edit By AI -->
            ${mediaHtml(g)}
          </div>
        </div>
      </article>
    `,
      )
      .join("");

    //#region Edit By AI
    guideNavList.innerHTML = guides
      .map(
        (g) => `
      <a class="guide-nav-item ${String(g.id) === String(focusGuideId) ? "active" : ""}" data-id="${g.id}" href="/${route}/${g.id}">
        <span class="num">${String(g.number).padStart(2, "0")}</span>
        <span>${localized(g.title)}</span>
      </a>
    `,
      )
      .join("");
    //#endregion Edit By AI

    //#region Edit By AI
    function setOpenState(id, open) {
      const card = document.getElementById(`guide-${id}`);
      if (!card) return;

      if (open) {
        openIds.add(id);
        card.classList.add("open");
      } else {
        openIds.delete(id);
        card.classList.remove("open");
      }

      persistOpen();
    }
    //#endregion Edit By AI

    //#region Edit By AI
    guideNavList.querySelectorAll(".guide-nav-item").forEach((item) => {
      item.addEventListener("click", (e) => {
        e.preventDefault();
        navigate(`/${route}/${item.getAttribute("data-id")}`);
      });
    });
    //#endregion Edit By AI

    guidesMain.querySelectorAll(".guide-card-head").forEach((head) => {
      head.addEventListener("click", () => {
        const card = head.closest(".guide-card");
        const id = card.getAttribute("data-id");
        const willOpen = !card.classList.contains("open");
        setOpenState(id, willOpen);
      });
    });

    if (focusGuideId) {
      const card = document.getElementById(`guide-${focusGuideId}`);
      if (card)
        setTimeout(
          () => card.scrollIntoView({ behavior: "smooth", block: "start" }),
          120,
        );
    } else {
      restoreScroll(route);
    }

    initReveal();
  }

  /* ---------------- Scroll persistence ---------------- */
  let scrollSaveTimer;
  window.addEventListener(
    "scroll",
    () => {
      clearTimeout(scrollSaveTimer);
      scrollSaveTimer = setTimeout(() => {
        //#region Edit By AI
        const r = parsePath();
        const key =
          r.view === "section" || r.view === "guide" ? r.route : "home";
        //#endregion Edit By AI
        localStorage.setItem(LS.scroll(key), String(window.scrollY));
      }, 150);
    },
    { passive: true },
  );

  function restoreScroll(routeKey) {
    const y = localStorage.getItem(LS.scroll(routeKey));
    if (y)
      requestAnimationFrame(() => window.scrollTo(0, parseInt(y, 10) || 0));
  }

  /* ---------------- Reveal-on-scroll animation ---------------- */
  function initReveal() {
    const els = document.querySelectorAll(".reveal");
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.08 },
    );
    els.forEach((el) => io.observe(el));
  }

  //#region Edit By AI
  /* ---------------- Main render dispatcher ---------------- */
  async function render() {
    const r = parsePath();
    localStorage.setItem(LS.route, r.path || "/");
    if (r.view === "home") {
      renderHome();
      restoreScroll("home");
    } else if (r.view === "section") {
      await renderSection(r.route);
    } else if (r.view === "guide") {
      await renderSection(r.route, r.guideId);
    }
  }
  //#endregion Edit By AI

  /* ---------------- Language switch ---------------- */
  document.querySelectorAll(".lang-switch button").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.lang = btn.getAttribute("data-lang");
      localStorage.setItem(LS.lang, state.lang);
      applyLangChrome();
      render();
    });
  });

  document.querySelectorAll('[data-nav="home"]').forEach((el) => {
    el.addEventListener("click", (e) => {
      e.preventDefault();
      navigate("/");
    });
  });

  //#region Edit By AI
  document.addEventListener("click", (e) => {
    const homeLink = e.target.closest('[data-nav="home"]');
    if (!homeLink) return;

    e.preventDefault();
    navigate("/");
  });

  /* ---------------- Boot ---------------- */
  (async function init() {
    applyLangChrome();
    await loadSections();

    const legacyHashPath = location.hash
      ? normalizePath(location.hash.replace(/^#/, ""))
      : null;
    if (legacyHashPath && legacyHashPath !== normalizePath(location.pathname)) {
      navigate(legacyHashPath, { replace: true });
      return;
    }

    if (normalizePath(location.pathname) === "/") {
      const last = localStorage.getItem(LS.route);
      if (last && last !== "/") {
        navigate(last, { replace: true });
        return;
      }
    }

    render();
  })();
  //#endregion Edit By AI
})();
