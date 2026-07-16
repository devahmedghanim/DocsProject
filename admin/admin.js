/* =========================================================
   Nexus PMS Documentation — Admin Panel Logic
   ========================================================= */
(function () {
  "use strict";

  //#region Edit By AI
  const state = {
    sections: [],
    activeRoute: null,
    guides: [],
    editingSectionRoute: null,
    editingGuideId: null,
  };

  const sectionsListEl = document.getElementById("sectionsList");
  const guidesListEl = document.getElementById("guidesList");
  const guidesPanelTitle = document.getElementById("guidesPanelTitle");
  const noSectionSelected = document.getElementById("noSectionSelected");
  const btnNewGuide = document.getElementById("btnNewGuide");
  const sectionForm = document.getElementById("sectionForm");
  const sectionIconSelect = document.getElementById("sectionIconSelect");
  const sectionModalTitle = document.getElementById("sectionModalTitle");
  const sectionSubmitBtn = document.getElementById("sectionSubmitBtn");
  const guideForm = document.getElementById("guideForm");
  const guideModalTitle = document.getElementById("guideModalTitle");
  const guideSubmitBtn = document.getElementById("guideSubmitBtn");
  const uploadProgress = document.getElementById("uploadProgress");
  const uploadFill = document.getElementById("uploadFill");
  const uploadPct = document.getElementById("uploadPct");
  const guideEditors = {
    ar: {
      toolbar: guideForm.querySelector('[data-editor-toolbar="ar"]'),
      surface: guideForm.querySelector('[data-editor-surface="ar"]'),
      input: guideForm.querySelector('[data-editor-input="ar"]'),
    },
    en: {
      toolbar: guideForm.querySelector('[data-editor-toolbar="en"]'),
      surface: guideForm.querySelector('[data-editor-surface="en"]'),
      input: guideForm.querySelector('[data-editor-input="en"]'),
    },
  };

  const SECTION_ICON_OPTIONS = [
    { value: "📄", label: "📄 مستندات عامة" },
    { value: "🧾", label: "🧾 أوامر العمل" },
    { value: "🛠️", label: "🛠️ الصيانة" },
    { value: "🔧", label: "🔧 الأعمال الفنية" },
    { value: "🧱", label: "🧱 الإنشاءات" },
    { value: "🏗️", label: "🏗️ المشاريع" },
    { value: "📐", label: "📐 الهندسة" },
    { value: "🏭", label: "🏭 التشغيل" },
    { value: "📦", label: "📦 المخزون" },
    { value: "🏷️", label: "🏷️ الأصناف والتصنيفات" },
    { value: "🚚", label: "🚚 الحركة والنقل" },
    { value: "🚛", label: "🚛 الأسطول" },
    { value: "🗺️", label: "🗺️ المواقع" },
    { value: "📍", label: "📍 الفروع والمواقع" },
    { value: "🏬", label: "🏬 الفروع" },
    { value: "📊", label: "📊 التقارير" },
    { value: "📈", label: "📈 الأداء" },
    { value: "📉", label: "📉 المتابعة" },
    { value: "🧮", label: "🧮 التحليلات" },
    { value: "📋", label: "📋 النماذج والقوائم" },
    { value: "✅", label: "✅ الاعتمادات" },
    { value: "🗂️", label: "🗂️ الملفات المنظمة" },
    { value: "📚", label: "📚 الأدلة والإجراءات" },
    { value: "📝", label: "📝 الملاحظات" },
    { value: "💰", label: "💰 المالية" },
    { value: "💳", label: "💳 المدفوعات" },
    { value: "📃", label: "📃 الفواتير" },
    { value: "🏦", label: "🏦 الحسابات" },
    { value: "💼", label: "💼 الأعمال والعقود" },
    { value: "📑", label: "📑 العقود" },
    { value: "🛒", label: "🛒 المشتريات" },
    { value: "🤝", label: "🤝 الموردون" },
    { value: "🏪", label: "🏪 المبيعات والخدمات" },
    { value: "👥", label: "👥 الموارد البشرية" },
    { value: "👤", label: "👤 المستخدمون" },
    { value: "🪪", label: "🪪 بيانات الموظفين" },
    { value: "🎓", label: "🎓 التدريب" },
    { value: "🕒", label: "🕒 الحضور والانصراف" },
    { value: "📅", label: "📅 الجداول" },
    { value: "🧑‍💼", label: "🧑‍💼 الإدارة التنفيذية" },
    { value: "🏢", label: "🏢 الإدارة" },
    { value: "🧰", label: "🧰 الدعم الفني" },
    { value: "💻", label: "💻 الأنظمة" },
    { value: "🖥️", label: "🖥️ الأجهزة" },
    { value: "📡", label: "📡 الشبكات" },
    { value: "☎️", label: "☎️ الاتصالات" },
    { value: "🔐", label: "🔐 الأمن والصلاحيات" },
    { value: "🔔", label: "🔔 التنبيهات" },
    { value: "⚠️", label: "⚠️ البلاغات" },
    { value: "🆘", label: "🆘 الدعم الطارئ" },
    { value: "⚙️", label: "⚙️ الإعدادات" },
    { value: "🌐", label: "🌐 البوابة العامة" },
    { value: "📨", label: "📨 المراسلات" },
    { value: "✉️", label: "✉️ البريد" },
    { value: "📞", label: "📞 خدمة العملاء" },
    { value: "👨‍💻", label: "👨‍💻 التطوير" },
    { value: "🧪", label: "🧪 الاختبارات" },
    { value: "🏥", label: "🏥 السلامة والصحة" },
    { value: "🛡️", label: "🛡️ الجودة والالتزام" },
    { value: "🔍", label: "🔍 المراجعة والتفتيش" },
    { value: "📸", label: "📸 التوثيق المصور" },
    { value: "🎯", label: "🎯 الأهداف" },
    { value: "🚀", label: "🚀 المبادرات" },
    { value: "🏆", label: "🏆 الإنجازات" },
    { value: "📁", label: "📁 الأرشيف" },
    { value: "🗄️", label: "🗄️ السجلات" },
    { value: "🔖", label: "🔖 السياسات" },
    { value: "📌", label: "📌 العناصر المهمة" },
    { value: "🏠", label: "🏠 الخدمات العامة" },
    { value: "🌳", label: "🌳 المواقع الخارجية" },
    { value: "🏫", label: "🏫 التدريب والمراكز" },
    { value: "🧹", label: "🧹 النظافة والخدمات" },
    { value: "💡", label: "💡 الأفكار والتحسين" },
    { value: "📂", label: "📂 المجلدات" },
  ];

  function toast(msg, isError) {
    const el = document.getElementById("toast");
    el.textContent = msg;
    el.className = "toast show" + (isError ? " error" : "");
    setTimeout(() => (el.className = "toast"), 2600);
  }

  function htmlToPlainText(html) {
    const temp = document.createElement("div");
    temp.innerHTML = html || "";
    return (temp.textContent || temp.innerText || "")
      .replace(/\u00a0/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function syncGuideEditor(lang) {
    const editor = guideEditors[lang];
    if (!editor) return;
    editor.input.value = (editor.surface.innerHTML || "").trim();
  }

  function syncGuideEditors() {
    Object.keys(guideEditors).forEach((lang) => syncGuideEditor(lang));
  }

  function setGuideEditorHtml(lang, html) {
    const editor = guideEditors[lang];
    if (!editor) return;
    const normalizedHtml = html || "";
    editor.surface.innerHTML = normalizedHtml;
    editor.input.value = normalizedHtml;
  }

  function runEditorCommand(lang, command, value) {
    const editor = guideEditors[lang];
    if (!editor) return;

    editor.surface.focus();
    document.execCommand("styleWithCSS", false, true);
    document.execCommand(command, false, value || null);
    syncGuideEditor(lang);
  }

  function initGuideEditors() {
    Object.entries(guideEditors).forEach(([lang, editor]) => {
      if (!editor.toolbar || !editor.surface || !editor.input) return;

      editor.surface.addEventListener("input", () => syncGuideEditor(lang));
      editor.surface.addEventListener("blur", () => syncGuideEditor(lang));

      editor.toolbar.querySelectorAll("[data-command]").forEach((tool) => {
        tool.addEventListener("mousedown", (e) => {
          e.preventDefault();
          runEditorCommand(
            lang,
            tool.getAttribute("data-command"),
            tool.getAttribute("data-value"),
          );
        });
      });
    });
  }

  function switchLangTab(target) {
    document.querySelectorAll(".lang-tab").forEach((tab) => {
      tab.classList.toggle("active", tab.getAttribute("data-tab") === target);
    });
    document.querySelectorAll(".lang-panel").forEach((panel) => {
      panel.style.display =
        panel.getAttribute("data-panel") === target ? "block" : "none";
    });
  }

  function fillSectionIconOptions(selectedValue = "📄") {
    const normalizedValue = selectedValue || "📄";
    const knownValues = new Set(
      SECTION_ICON_OPTIONS.map((option) => option.value),
    );

    sectionIconSelect.innerHTML = SECTION_ICON_OPTIONS.map(
      (option) => `<option value="${option.value}">${option.label}</option>`,
    ).join("");

    if (!knownValues.has(normalizedValue)) {
      const customOption = document.createElement("option");
      customOption.value = normalizedValue;
      customOption.textContent = `${normalizedValue} أيقونة محفوظة`;
      sectionIconSelect.appendChild(customOption);
    }

    sectionIconSelect.value = normalizedValue;
  }

  function resetSectionForm() {
    state.editingSectionRoute = null;
    sectionModalTitle.textContent = "إضافة قسم جديد";
    sectionSubmitBtn.textContent = "حفظ القسم";
    sectionForm.reset();
    fillSectionIconOptions("📄");
  }

  function resetGuideForm() {
    state.editingGuideId = null;
    guideModalTitle.textContent = "إضافة دليل جديد";
    guideSubmitBtn.textContent = "حفظ الدليل";
    guideForm.reset();
    setGuideEditorHtml("ar", "");
    setGuideEditorHtml("en", "");
    uploadProgress.style.display = "none";
    uploadFill.style.width = "0%";
    uploadPct.textContent = "0%";
    switchLangTab("ar");
  }

  function openModal(id) {
    document.getElementById(id).classList.add("show");
  }

  function closeModal(id) {
    document.getElementById(id).classList.remove("show");
    if (id === "sectionModal") resetSectionForm();
    if (id === "guideModal") resetGuideForm();
  }

  document.querySelectorAll("[data-close]").forEach((btn) => {
    btn.addEventListener("click", () =>
      closeModal(btn.getAttribute("data-close")),
    );
  });

  document.querySelectorAll(".modal-overlay").forEach((overlay) => {
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) closeModal(overlay.id);
    });
  });

  async function loadSections() {
    try {
      const res = await fetch("../data/sections.json", { cache: "no-store" });
      state.sections = await res.json();
      if (
        state.activeRoute &&
        !state.sections.some((section) => section.route === state.activeRoute)
      ) {
        state.activeRoute = null;
        state.guides = [];
        guidesPanelTitle.textContent = "أدلة القسم";
        btnNewGuide.disabled = true;
        noSectionSelected.style.display = "block";
        guidesListEl.innerHTML = "";
      }
      renderSections();
    } catch (e) {
      toast("تعذر تحميل الأقسام", true);
    }
  }

  function renderSections() {
    if (!state.sections.length) {
      sectionsListEl.innerHTML = `<div class="empty-hint">لا توجد أقسام بعد — ابدأ بإضافة قسم جديد</div>`;
      return;
    }

    sectionsListEl.innerHTML = state.sections
      .slice()
      .sort((a, b) => (a.order || 0) - (b.order || 0))
      .map(
        (section) => `
        <div class="admin-item ${state.activeRoute === section.route ? "active" : ""}" data-route="${section.route}">
          <div class="badge-num">${section.icon || "📄"}</div>
          <div class="info">
            <b>${section.title.ar} <span style="opacity:.5">/ ${section.title.en}</span></b>
            <span class="route-tag">/${section.route}</span>
          </div>
          <div class="admin-item-actions">
            <button type="button" class="btn-secondary" data-edit-section="${section.route}">تعديل</button>
          </div>
        </div>
      `,
      )
      .join("");

    sectionsListEl
      .querySelectorAll(".admin-item[data-route]")
      .forEach((item) => {
        item.addEventListener("click", (e) => {
          if (e.target.closest("button")) return;
          selectSection(item.getAttribute("data-route"));
        });
      });

    sectionsListEl.querySelectorAll("[data-edit-section]").forEach((button) => {
      button.addEventListener("click", (e) => {
        e.stopPropagation();
        openSectionEditor(button.getAttribute("data-edit-section"));
      });
    });
  }

  async function selectSection(route) {
    state.activeRoute = route;
    renderSections();
    const section = state.sections.find((item) => item.route === route);
    guidesPanelTitle.textContent = `أدلة قسم: ${section ? section.title.ar : route}`;
    btnNewGuide.disabled = false;
    noSectionSelected.style.display = "none";

    try {
      const res = await fetch(`../data/guides/${route}.json`, {
        cache: "no-store",
      });
      const guides = await res.json();
      state.guides = Array.isArray(guides) ? guides : [];
    } catch (e) {
      state.guides = [];
    }

    renderGuides();
  }

  function renderGuides() {
    if (!state.guides.length) {
      guidesListEl.innerHTML = `<div class="empty-hint">لا توجد أدلة في هذا القسم بعد</div>`;
      return;
    }

    guidesListEl.innerHTML = state.guides
      .slice()
      .sort((a, b) => (a.number || 0) - (b.number || 0))
      .map((guide) => {
        const guidePreview = htmlToPlainText(guide.desc.ar || "");
        return `
        <div class="admin-item" style="cursor:default">
          <div class="badge-num">${String(guide.number).padStart(2, "0")}</div>
          <div class="info">
            <b>${guide.title.ar} <span style="opacity:.5">/ ${guide.title.en || "—"}</span></b>
            <span>${guidePreview.slice(0, 90)}${guidePreview.length > 90 ? "…" : ""}</span>
          </div>
          <div class="admin-item-actions">
            <button type="button" class="btn-secondary" data-edit-guide="${guide.id}">تعديل</button>
            <button type="button" class="btn-danger" data-del="${guide.id}">حذف</button>
          </div>
        </div>
      `;
      })
      .join("");

    guidesListEl.querySelectorAll("[data-edit-guide]").forEach((button) => {
      button.addEventListener("click", () =>
        openGuideEditor(button.getAttribute("data-edit-guide")),
      );
    });

    guidesListEl.querySelectorAll("[data-del]").forEach((button) => {
      button.addEventListener("click", async () => {
        if (!confirm("هل أنت متأكد من حذف هذا الدليل؟")) return;
        const fd = new FormData();
        fd.append("route", state.activeRoute);
        fd.append("id", button.getAttribute("data-del"));

        try {
          const res = await fetch("../api/delete_guide.php", {
            method: "POST",
            body: fd,
          });
          const data = await res.json();
          if (data.ok) {
            toast("تم الحذف بنجاح");
            selectSection(state.activeRoute);
          } else {
            toast(data.error || "حدث خطأ", true);
          }
        } catch (e) {
          toast("تعذر الاتصال بالخادم (API)", true);
        }
      });
    });
  }

  function openSectionEditor(route) {
    const section = state.sections.find((item) => item.route === route);
    if (!section) return;

    resetSectionForm();
    state.editingSectionRoute = route;
    sectionModalTitle.textContent = "تعديل القسم";
    sectionSubmitBtn.textContent = "حفظ التعديلات";
    fillSectionIconOptions(section.icon || "📄");
    sectionForm.elements.route.value = section.route || "";
    sectionForm.elements.title_ar.value = section.title?.ar || "";
    sectionForm.elements.title_en.value = section.title?.en || "";
    sectionForm.elements.desc_ar.value = section.desc?.ar || "";
    sectionForm.elements.desc_en.value = section.desc?.en || "";
    openModal("sectionModal");
  }

  function openGuideEditor(id) {
    const guide = state.guides.find((item) => String(item.id) === String(id));
    if (!guide) return;

    resetGuideForm();
    state.editingGuideId = String(id);
    guideModalTitle.textContent = "تعديل الدليل";
    guideSubmitBtn.textContent = "حفظ التعديلات";
    guideForm.elements.number.value = guide.number || "";
    guideForm.elements.title_ar.value = guide.title?.ar || "";
    guideForm.elements.title_en.value = guide.title?.en || "";
    setGuideEditorHtml("ar", guide.desc?.ar || "");
    setGuideEditorHtml("en", guide.desc?.en || "");
    openModal("guideModal");
  }

  document.getElementById("btnNewSection").addEventListener("click", () => {
    resetSectionForm();
    openModal("sectionModal");
  });

  sectionForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const isEditing = !!state.editingSectionRoute;
    const fd = new FormData(sectionForm);

    if (isEditing) {
      fd.append("original_route", state.editingSectionRoute);
    }

    try {
      const res = await fetch("../api/save_section.php", {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!data.ok) {
        toast(data.error || "حدث خطأ أثناء الحفظ", true);
        return;
      }

      const nextRoute = data.section?.route || fd.get("route");
      toast(isEditing ? "تم تحديث القسم بنجاح" : "تم إضافة القسم بنجاح");
      closeModal("sectionModal");
      await loadSections();
      if (nextRoute) await selectSection(String(nextRoute));
    } catch (e) {
      toast("تعذر الاتصال بالخادم — تأكد من تشغيل PHP على IIS", true);
    }
  });

  document.getElementById("btnNewGuide").addEventListener("click", () => {
    if (!state.activeRoute) return;
    resetGuideForm();
    openModal("guideModal");
  });

  document.querySelectorAll(".lang-tab").forEach((tab) => {
    tab.addEventListener("click", () =>
      switchLangTab(tab.getAttribute("data-tab")),
    );
  });

  guideForm.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!state.activeRoute) return;

    const isEditing = !!state.editingGuideId;
    syncGuideEditors();

    if (!htmlToPlainText(guideEditors.ar.input.value)) {
      toast("شرح الدليل بالعربي مطلوب على الأقل", true);
      switchLangTab("ar");
      guideEditors.ar.surface.focus();
      return;
    }

    const fd = new FormData(guideForm);
    fd.append("route", state.activeRoute);
    if (isEditing) {
      fd.append("id", state.editingGuideId);
    }

    uploadProgress.style.display = "flex";
    uploadFill.style.width = "0%";
    uploadPct.textContent = "0%";

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "../api/save_guide.php");
    xhr.upload.onprogress = (ev) => {
      if (ev.lengthComputable) {
        const pct = Math.round((ev.loaded / ev.total) * 100);
        uploadFill.style.width = pct + "%";
        uploadPct.textContent = pct + "%";
      }
    };
    xhr.onload = () => {
      uploadProgress.style.display = "none";
      let data;
      try {
        data = JSON.parse(xhr.responseText);
      } catch (_) {
        data = { ok: false, error: "استجابة غير صالحة من الخادم" };
      }

      if (!data.ok) {
        toast(data.error || "حدث خطأ أثناء الحفظ", true);
        return;
      }

      toast(isEditing ? "تم تحديث الدليل بنجاح" : "تم إضافة الدليل بنجاح");
      closeModal("guideModal");
      selectSection(state.activeRoute);
    };
    xhr.onerror = () => {
      uploadProgress.style.display = "none";
      toast("تعذر الاتصال بالخادم — تأكد من تشغيل PHP على IIS", true);
    };
    xhr.send(fd);
  });

  resetSectionForm();
  resetGuideForm();
  initGuideEditors();
  loadSections();
  //#endregion Edit By AI
})();
