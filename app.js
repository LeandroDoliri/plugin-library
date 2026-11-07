(function () {
  "use strict";

  var DATA = window.PLUGINS || [];
  var app = document.getElementById("app");
  var CHECK_KEY = "plugin-library-compu-nueva";
  var COLLATE = { numeric: true, sensitivity: "base" };

  var COLUMNS = [
    { key: "nombre", label: "Plugin" },
    { key: "fabricante", label: "Fabricante" },
    { key: "tipo", label: "Tipo" },
    { key: "estado", label: "Estado" },
    { key: "precio", label: "Precio" },
    { key: "vst2", label: "VST2 x64" },
    { key: "vst3", label: "VST3 x64" },
    { key: "proyectos", label: "Proyectos", numeric: true }
  ];
  var GROUPS = [
    { key: "", label: "Sin agrupar" },
    { key: "tipo", label: "Tipo" },
    { key: "fabricante", label: "Fabricante" },
    { key: "categoria", label: "Categoría" },
    { key: "estado", label: "Estado" },
    { key: "precio", label: "Precio" },
    { key: "formato", label: "Formato" },
    { key: "conseguir", label: "Cómo conseguirlo" }
  ];
  var FILTERS = [
    { key: "estado", label: "Estado" },
    { key: "precio", label: "Precio" },
    { key: "tipo", label: "Tipo" },
    { key: "fabricante", label: "Fabricante" },
    { key: "formato", label: "Formato" },
    { key: "conseguir", label: "Cómo conseguirlo" }
  ];
  var ACQUIRE_ORDER = ["Descarga directa", "Con cuenta o gestor", "De pago", "Precio por confirmar", "Sin fuente confiable"];
  var ACQUIRE_HINT = {
    "Descarga directa": "Se bajan de la web del fabricante, sin cuenta.",
    "Con cuenta o gestor": "Necesitan iniciar sesión o pasar por la app del fabricante.",
    "De pago": "Si ya los compraste, quizá puedas volver a bajarlos desde tu cuenta.",
    "Precio por confirmar": "Revisá el precio en la web antes de decidir.",
    "Sin fuente confiable": "No hay descarga oficial. Evitá sitios espejo y archivos sin firma."
  };

  DATA.forEach(function (p) {
    p.formato = p.vst2 && p.vst3 ? "VST2 y VST3" : p.vst2 ? "Solo VST2" : p.vst3 ? "Solo VST3" : "Sin instalar";
  });

  var state = { q: "", estado: "", precio: "", tipo: "", fabricante: "", formato: "", conseguir: "", group: "", sort: "proyectos", dir: -1, incluirSinUso: false };

  function esc(s) {
    return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function uniq(key) {
    var seen = {};
    DATA.forEach(function (p) { seen[p[key]] = (seen[p[key]] || 0) + 1; });
    return Object.keys(seen).sort(function (a, b) { return a.localeCompare(b, "es", COLLATE); }).map(function (v) { return { value: v, count: seen[v] }; });
  }
  function count(fn) { return DATA.filter(fn).length; }
  function loadChecks() {
    try { return JSON.parse(localStorage.getItem(CHECK_KEY)) || {}; } catch (e) { return {}; }
  }
  function saveChecks(c) {
    try { localStorage.setItem(CHECK_KEY, JSON.stringify(c)); } catch (e) { /* el navegador no permite guardar */ }
  }
  function link(p) {
    if (!p.enlace) return '<span class="muted">Sin enlace</span>';
    return '<a class="go" href="' + esc(p.enlace) + '" target="_blank" rel="noopener">' + (p.enlaceTercero ? "Referencia" : "Web") + " ↗</a>";
  }

  function compare(a, b) {
    var k = state.sort, x = a[k], y = b[k];
    if (k === "proyectos") return (x - y) * state.dir || a.nombre.localeCompare(b.nombre, "es", COLLATE);
    if (!x && y) return 1;
    if (x && !y) return -1;
    return String(x || "").localeCompare(String(y || ""), "es", COLLATE) * state.dir || b.proyectos - a.proyectos;
  }
  function visible() {
    var q = state.q;
    return DATA.filter(function (p) {
      if (q && (p.nombre + " " + p.fabricante + " " + p.tipo).toLowerCase().indexOf(q) === -1) return false;
      return FILTERS.every(function (f) { return !state[f.key] || p[f.key] === state[f.key]; });
    });
  }
  function header() {
    return "<thead><tr>" + COLUMNS.map(function (c) {
      var on = state.sort === c.key;
      var aria = on ? (state.dir === 1 ? "ascending" : "descending") : "none";
      return '<th' + (c.numeric ? ' class="num"' : "") + ' aria-sort="' + aria + '"><button type="button" class="sort" data-sort="' + c.key + '"' + (c.numeric ? ' style="text-align:right"' : "") + ">" + c.label + (on ? (state.dir === 1 ? " ▲" : " ▼") : "") + "</button></th>";
    }).join("") + '<th class="plain">Notas</th><th class="plain">Enlace</th></tr></thead>';
  }
  function row(p) {
    return '<tr><td class="n">' + esc(p.nombre) + "</td><td>" + esc(p.fabricante) + "</td><td>" + esc(p.tipo) + '</td><td><span class="pill e-' + esc(p.estado.replace(/\s/g, "")) + '">' + esc(p.estado) + '</span></td><td class="p p-' + esc(p.precio.replace(/\s/g, "")) + '">' + esc(p.precio) + "</td>" +
      '<td class="v' + (p.vst2 ? "" : " none") + '">' + esc(p.vst2 || "—") + '</td><td class="v' + (p.vst3 ? "" : " none") + '">' + esc(p.vst3 || "—") + '</td><td class="num">' + p.proyectos + '</td><td class="note">' + esc(p.nota) + "</td><td>" + link(p) + "</td></tr>";
  }
  function tableHtml(items) {
    return '<div class="tbl"><table>' + header() + "<tbody>" + items.slice().sort(compare).map(row).join("") + "</tbody></table></div>";
  }
  function renderResults() {
    var items = visible();
    document.getElementById("count").textContent = items.length + " de " + DATA.length + " plugins";
    var box = document.getElementById("results");
    if (!items.length) {
      box.innerHTML = '<div class="empty">Ningún plugin coincide. Tocá Limpiar para ver todos.</div>';
      return;
    }
    if (!state.group) {
      box.innerHTML = tableHtml(items);
      return;
    }
    var groups = {};
    items.forEach(function (p) { (groups[p[state.group]] = groups[p[state.group]] || []).push(p); });
    var names = Object.keys(groups).sort(function (a, b) {
      if (state.group === "conseguir") return ACQUIRE_ORDER.indexOf(a) - ACQUIRE_ORDER.indexOf(b);
      return groups[b].length - groups[a].length || a.localeCompare(b, "es", COLLATE);
    });
    box.innerHTML = names.map(function (n) {
      return '<section class="group"><div class="group-title"><h2>' + esc(n) + "</h2><span>" + groups[n].length + "</span></div>" + tableHtml(groups[n]) + "</section>";
    }).join("");
  }
  function renderLibrary() {
    var filters = FILTERS.map(function (f) {
      var options = uniq(f.key).map(function (o) {
        return '<option value="' + esc(o.value) + '"' + (state[f.key] === o.value ? " selected" : "") + ">" + esc(o.value) + " (" + o.count + ")</option>";
      }).join("");
      return '<label class="field">' + f.label + '<select id="f-' + f.key + '" data-filter="' + f.key + '"><option value="">Todos</option>' + options + "</select></label>";
    }).join("");
    var groupOptions = GROUPS.map(function (g) {
      return '<option value="' + g.key + '"' + (state.group === g.key ? " selected" : "") + ">" + g.label + "</option>";
    }).join("");
    app.innerHTML = '<div class="group">' +
      '<div class="filters"><label class="field grow">Buscar<input id="q" type="search" placeholder="Plugin, fabricante o tipo" value="' + esc(state.q) + '"></label>' +
      '<label class="field">Agrupar por<select id="group">' + groupOptions + "</select></label>" + filters + "</div>" +
      '<div class="barra"><span class="count" id="count" aria-live="polite"></span><button type="button" class="btn" id="clear">Limpiar filtros</button></div>' +
      '<div class="results" id="results"></div></div>';
    document.getElementById("q").addEventListener("input", function (e) { state.q = e.target.value.trim().toLowerCase(); renderResults(); });
    document.getElementById("group").addEventListener("change", function (e) { state.group = e.target.value; renderResults(); });
    app.querySelectorAll("[data-filter]").forEach(function (s) {
      s.addEventListener("change", function () { state[s.getAttribute("data-filter")] = s.value; renderResults(); });
    });
    document.getElementById("clear").addEventListener("click", function () {
      state.q = ""; state.group = "";
      FILTERS.forEach(function (f) { state[f.key] = ""; });
      renderLibrary();
    });
    document.getElementById("results").addEventListener("click", function (e) {
      var b = e.target.closest ? e.target.closest("[data-sort]") : null;
      if (!b) return;
      var k = b.getAttribute("data-sort");
      if (state.sort === k) { state.dir = -state.dir; } else { state.sort = k; state.dir = k === "proyectos" ? -1 : 1; }
      renderResults();
    });
    renderResults();
  }

  function renderNewPc() {
    var checks = loadChecks();
    var list = DATA.filter(function (p) { return state.incluirSinUso || p.proyectos > 0; });
    var done = list.filter(function (p) { return checks[p.nombre]; }).length;
    var pct = list.length ? Math.round(done / list.length * 100) : 0;
    var sections = ACQUIRE_ORDER.map(function (name) {
      var items = list.filter(function (p) { return p.conseguir === name; }).sort(function (a, b) { return b.proyectos - a.proyectos || a.nombre.localeCompare(b.nombre, "es", COLLATE); });
      if (!items.length) return "";
      return '<section class="group"><div class="group-title"><h2>' + esc(name) + "</h2><span>" + items.length + '</span></div><p class="muted">' + esc(ACQUIRE_HINT[name]) + '</p><ul class="check-list">' + items.map(function (p, i) {
        var id = "c-" + name.replace(/\W/g, "") + "-" + i;
        var meta = [p.fabricante, p.tipo, p.proyectos + (p.proyectos === 1 ? " proyecto" : " proyectos"), p.requiere].filter(Boolean).join(" · ");
        return '<li class="' + (checks[p.nombre] ? "done" : "") + '"><input type="checkbox" id="' + id + '" data-check="' + esc(p.nombre) + '"' + (checks[p.nombre] ? " checked" : "") + '><div><label class="check-name" for="' + id + '">' + esc(p.nombre) + '</label><div class="check-meta">' + esc(meta) + "</div></div><div>" + link(p) + "</div></li>";
      }).join("") + "</ul></section>";
    }).join("");
    app.innerHTML = '<div class="group"><section class="guide"><h2>Cómo instalar en una compu nueva</h2><ol>' +
      "<li>Instalá Ableton Live y creá la carpeta <code>C:\\Program Files\\VstPlugins</code>.</li>" +
      "<li>En Ableton, andá a <b>Options → Preferences → Plug-Ins</b> y elegí esa carpeta como VST2 Custom Folder. Los VST3 van en <code>C:\\Program Files\\Common Files\\VST3</code>.</li>" +
      "<li>Instalá solo <b>VST2 de 64 bits y VST3</b>. Evitá 32 bits, AAX, CLAP y apps independientes.</li>" +
      "<li>Si un instalador deja el VST2 en otra carpeta, movelo a <code>VstPlugins</code>.</li>" +
      "<li>Al terminar, tocá <b>Rescan</b> en Ableton y abrí un proyecto viejo para probar.</li></ol></section>" +
      '<div class="progress"><div class="barra"><span class="count">' + done + " de " + list.length + ' instalados en esta compu</span><label class="toggle"><input type="checkbox" id="incluir"' + (state.incluirSinUso ? " checked" : "") + '> Incluir los que no usa ningún proyecto</label></div><div class="track" role="img" aria-label="' + pct + '% completado"><i style="width:' + pct + '%"></i></div>' +
      '<div class="barra"><span class="muted">Las marcas se guardan solo en este navegador.</span><button type="button" class="btn" id="reset">' + (state.confirmReset ? "Tocá de nuevo para desmarcar todo" : "Desmarcar todo") + "</button></div></div>" + sections + "</div>";
    document.getElementById("incluir").addEventListener("change", function (e) { state.incluirSinUso = e.target.checked; state.confirmReset = false; renderNewPc(); });
    document.getElementById("reset").addEventListener("click", function () {
      if (!state.confirmReset) { state.confirmReset = true; renderNewPc(); return; }
      state.confirmReset = false; saveChecks({}); renderNewPc();
    });
    app.querySelectorAll("[data-check]").forEach(function (c) {
      c.addEventListener("change", function () {
        var cur = loadChecks(), n = c.getAttribute("data-check");
        if (c.checked) { cur[n] = true; } else { delete cur[n]; }
        saveChecks(cur); state.confirmReset = false; renderNewPc();
        var again = document.getElementById(c.id);
        if (again) again.focus();
      });
    });
  }

  function route() {
    var view = location.hash === "#compu-nueva" ? "compu-nueva" : "biblioteca";
    ["biblioteca", "compu-nueva"].forEach(function (v) {
      var t = document.getElementById("tab-" + v);
      if (v === view) { t.setAttribute("aria-current", "page"); } else { t.removeAttribute("aria-current"); }
    });
    if (view === "compu-nueva") { renderNewPc(); } else { renderLibrary(); }
    window.scrollTo(0, 0);
  }
  document.getElementById("summary").textContent = count(function (p) { return p.estado === "Instalado"; }) + " instalados · " + count(function (p) { return p.estado === "Falta"; }) + " faltan · " + count(function (p) { return p.estado === "Sin uso"; }) + " sin uso";
  window.addEventListener("hashchange", route);
  route();
})();
