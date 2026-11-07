(function () {
  "use strict";

  var DATA = window.PLUGINS || [];
  var MAKERS = window.MAKERS || {};
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
    { key: "conseguir", label: "Cómo conseguirlo" },
    { key: "vigencia", label: "Vigencia" }
  ];
  var FILTERS = [
    { key: "estado", label: "Estado" },
    { key: "precio", label: "Precio" },
    { key: "tipo", label: "Tipo" },
    { key: "fabricante", label: "Fabricante" },
    { key: "formato", label: "Formato" },
    { key: "conseguir", label: "Cómo conseguirlo" },
    { key: "vigencia", label: "Vigencia" }
  ];
  var TYPE_CODES = {
    "Amp y guitarra": "AMP", "Batería": "DRM", "Delay": "DLY", "Dinámica": "DYN", "EQ": "EQ", "Efecto creativo": "FX", "Filtro": "FLT", "Host y utilidades": "HST", "Imagen estéreo": "IMG", "Medición": "MTR", "Mezcla y mastering": "MIX", "Modulación": "MOD", "Piano y teclas": "KEY", "Reverb": "REV", "Sampler y librerías": "SMP", "Saturación": "SAT", "Sintetizador": "SYN", "Voz y afinación": "VOX"
  };
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
    p.vigencia = p.deprecado ? "Deprecado" : "Vigente";
  });

  var state = { q: "", estado: "", precio: "", tipo: "", fabricante: "", formato: "", conseguir: "", vigencia: "", group: "", sort: "proyectos", dir: -1, incluirSinUso: false, foldersBy: "cantidad", folderQ: "" };

  function esc(s) {
    return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function slugify(s) {
    return String(s).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }
  function hue(s) {
    var h = 0;
    for (var i = 0; i < s.length; i++) { h = (h * 31 + s.charCodeAt(i)) >>> 0; }
    return "f" + (h % 7);
  }
  function by(a, b) { return a.localeCompare(b, "es", COLLATE); }
  function uniq(key) {
    var seen = {};
    DATA.forEach(function (p) { seen[p[key]] = (seen[p[key]] || 0) + 1; });
    return Object.keys(seen).sort(by).map(function (v) { return { value: v, count: seen[v] }; });
  }
  function count(list, fn) { return list.filter(fn).length; }
  function isIn(p) { return p.estado === "Instalado"; }
  function isOut(p) { return p.estado === "Falta"; }
  function isIdle(p) { return p.estado === "Sin uso"; }
  function hasPlugin(p) { return p.estado !== "Falta"; }
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
  function pill(p) { return '<span class="pill e-' + esc(p.estado.replace(/\s/g, "")) + '">' + esc(p.estado) + "</span>"; }
  function deprBadge(p) { return p.deprecado ? ' <span class="pill depr">Deprecado</span>' : ""; }
  function notes(p) {
    var d = p.deprecado ? p.deprecadoMotivo + (p.reemplazo ? " Reemplazo: " + p.reemplazo + "." : "") : "";
    return esc([d, p.nota].filter(Boolean).join(" "));
  }
  function price(p) { return '<span class="p p-' + esc(p.precio.replace(/\s/g, "")) + '">' + esc(p.precio) + "</span>"; }

  /* Tabla de plugins */
  function compare(a, b) {
    var k = state.sort, x = a[k], y = b[k];
    if (k === "proyectos") return (x - y) * state.dir || by(a.nombre, b.nombre);
    if (!x && y) return 1;
    if (x && !y) return -1;
    return by(String(x || ""), String(y || "")) * state.dir || b.proyectos - a.proyectos;
  }
  function tableHtml(items, hide) {
    var cols = COLUMNS.filter(function (c) { return c.key !== hide; });
    var head = "<thead><tr>" + cols.map(function (c) {
      var on = state.sort === c.key;
      var aria = on ? (state.dir === 1 ? "ascending" : "descending") : "none";
      return "<th" + (c.numeric ? ' class="num"' : "") + ' aria-sort="' + aria + '"><button type="button" class="sort" data-sort="' + c.key + '">' + c.label + (on ? (state.dir === 1 ? " ▲" : " ▼") : "") + "</button></th>";
    }).join("") + '<th class="plain">Notas</th><th class="plain">Enlace</th></tr></thead>';
    var body = items.slice().sort(compare).map(function (p) {
      return "<tr>" + cols.map(function (c) {
        if (c.key === "nombre") return '<td class="n">' + esc(p.nombre) + deprBadge(p) + "</td>";
        if (c.key === "estado") return "<td>" + pill(p) + "</td>";
        if (c.key === "precio") return "<td>" + price(p) + "</td>";
        if (c.key === "vst2" || c.key === "vst3") return '<td class="v' + (p[c.key] ? "" : " none") + '">' + esc(p[c.key] || "—") + "</td>";
        if (c.key === "proyectos") return '<td class="num">' + p.proyectos + "</td>";
        if (c.key === "fabricante") return '<td><a href="#fabricantes/' + esc(makerSlug(p.fabricante)) + '">' + esc(p.fabricante) + "</a></td>";
        if (c.key === "tipo") return '<td><a href="#tipos/' + esc(slugify(p.tipo)) + '">' + esc(p.tipo) + "</a></td>";
        return "<td>" + esc(p[c.key]) + "</td>";
      }).join("") + '<td class="note">' + notes(p) + "</td><td>" + link(p) + "</td></tr>";
    }).join("");
    return '<div class="tbl"><table class="' + (hide ? "inside" : "full") + '">' + head + "<tbody>" + body + "</tbody></table></div>";
  }

  /* Biblioteca */
  function visible() {
    var q = state.q;
    return DATA.filter(function (p) {
      if (q && (p.nombre + " " + p.fabricante + " " + p.tipo).toLowerCase().indexOf(q) === -1) return false;
      return FILTERS.every(function (f) { return !state[f.key] || p[f.key] === state[f.key]; });
    });
  }
  function renderResults() {
    var box = document.getElementById("results");
    if (!box) return;
    var items = visible();
    document.getElementById("count").textContent = items.length + " de " + DATA.length + " plugins";
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
      return groups[b].length - groups[a].length || by(a, b);
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
    app.innerHTML = '<div class="stack">' +
      '<div class="filters"><label class="field grow">Buscar<input id="q" type="search" placeholder="Plugin, fabricante o tipo" value="' + esc(state.q) + '"></label>' +
      '<label class="field">Agrupar por<select id="group">' + groupOptions + "</select></label>" + filters + "</div>" +
      '<div class="barra"><span class="count" id="count" aria-live="polite"></span><button type="button" class="btn" id="clear">Limpiar filtros</button></div>' +
      '<div id="results" class="stack"></div></div>';
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
    renderResults();
  }

  /* Carpetas */
  function makerSlug(name) { return (MAKERS[name] && MAKERS[name].slug) || slugify(name); }
  function makerBySlug(s) {
    return Object.keys(MAKERS).filter(function (k) { return makerSlug(k) === s; })[0] || null;
  }
  function typeBySlug(s) {
    return uniq("tipo").map(function (t) { return t.value; }).filter(function (t) { return slugify(t) === s; })[0] || null;
  }
  function makerSticker(name) {
    var m = MAKERS[name] || {};
    if (m.logo) return '<span class="sticker' + (m.oscuro ? " dark" : "") + '"><img src="' + esc(m.logo) + '" alt="Logo de ' + esc(name) + '" loading="lazy"></span>';
    return '<span class="sticker" aria-hidden="true"><b>' + esc(name.charAt(0).toUpperCase()) + "</b></span>";
  }
  function typeSticker(t) {
    return '<span class="sticker code" aria-hidden="true"><b>' + esc(TYPE_CODES[t] || t.slice(0, 3).toUpperCase()) + "</b></span>";
  }
  function folderCard(o) {
    var total = o.items.length, have = count(o.items, hasPlugin);
    var pct = total ? Math.round(have / total * 100) : 0;
    var web = o.web ? '<a class="folder-web" href="' + esc(o.web) + '" target="_blank" rel="noopener" aria-label="Web de ' + esc(o.name) + '">Web ↗</a>' : "";
    return '<article class="folder ' + hue(o.name) + '"><a class="folder-link" href="' + esc(o.href) + '">' + o.sticker + '<span class="folder-name">' + esc(o.name) + '</span><span class="folder-meta">' + total + (total === 1 ? " plugin" : " plugins") + " · " + have + " en la compu<span class=\"folder-bar\"><i style=\"width:" + pct + '%"></i></span></span></a>' + web + "</article>";
  }
  function folderList(kind) {
    var key = kind === "fabricantes" ? "fabricante" : "tipo";
    var names = uniq(key).map(function (u) { return u.value; });
    var q = state.folderQ;
    return names.map(function (n) {
      return { name: n, items: DATA.filter(function (p) { return p[key] === n; }) };
    }).filter(function (f) {
      if (!q) return true;
      if (f.name.toLowerCase().indexOf(q) !== -1) return true;
      return f.items.some(function (p) { return p.nombre.toLowerCase().indexOf(q) !== -1; });
    }).sort(function (a, b) {
      if (state.foldersBy === "az") return by(a.name, b.name);
      if (state.foldersBy === "proyectos") {
        var pa = a.items.reduce(function (s, p) { return s + p.proyectos; }, 0), pb = b.items.reduce(function (s, p) { return s + p.proyectos; }, 0);
        return pb - pa || by(a.name, b.name);
      }
      return b.items.length - a.items.length || by(a.name, b.name);
    });
  }
  function renderFolderGrid(kind) {
    var box = document.getElementById("folders");
    if (!box) return;
    var list = folderList(kind);
    document.getElementById("count").textContent = list.length + (kind === "fabricantes" ? " fabricantes" : " tipos");
    box.innerHTML = list.length ? list.map(function (f) {
      if (kind === "fabricantes") {
        var m = MAKERS[f.name] || {};
        return folderCard({ name: f.name, items: f.items, web: m.web, href: "#fabricantes/" + makerSlug(f.name), sticker: makerSticker(f.name) });
      }
      return folderCard({ name: f.name, items: f.items, href: "#tipos/" + slugify(f.name), sticker: typeSticker(f.name) });
    }).join("") : '<div class="empty" style="grid-column:1/-1">Ninguna carpeta coincide con esa búsqueda.</div>';
  }
  function renderFolders(kind) {
    var isMaker = kind === "fabricantes";
    var opt = [["cantidad", "Más plugins"], ["proyectos", "Más usados en proyectos"], ["az", "A–Z"]].map(function (o) {
      return '<option value="' + o[0] + '"' + (state.foldersBy === o[0] ? " selected" : "") + ">" + o[1] + "</option>";
    }).join("");
    app.innerHTML = '<div class="stack"><div class="intro"><div><h1>' + (isMaker ? "Fabricantes" : "Tipos") + '</h1><p class="muted">' + (isMaker ? "Abrí una carpeta para ver todos los plugins de ese fabricante." : "Abrí una carpeta para ver todos los plugins de ese tipo.") + "</p></div></div>" +
      '<div class="filters"><label class="field grow">Buscar<input id="fq" type="search" placeholder="' + (isMaker ? "Fabricante o plugin" : "Tipo o plugin") + '" value="' + esc(state.folderQ) + '"></label><label class="field">Ordenar por<select id="fby">' + opt + "</select></label></div>" +
      '<span class="count" id="count" aria-live="polite"></span><div class="folders" id="folders"></div></div>';
    document.getElementById("fq").addEventListener("input", function (e) { state.folderQ = e.target.value.trim().toLowerCase(); renderFolderGrid(kind); });
    document.getElementById("fby").addEventListener("change", function (e) { state.foldersBy = e.target.value; renderFolderGrid(kind); });
    renderFolderGrid(kind);
  }
  function renderOpenFolder(kind, name) {
    var isMaker = kind === "fabricantes";
    var key = isMaker ? "fabricante" : "tipo";
    var items = DATA.filter(function (p) { return p[key] === name; });
    var m = isMaker ? (MAKERS[name] || {}) : {};
    var sub = items.length + (items.length === 1 ? " plugin" : " plugins") + " · " + count(items, isIn) + " instalados · " + count(items, isOut) + " faltan" + (count(items, isIdle) ? " · " + count(items, isIdle) + " sin uso" : "");
    var actions = '<a class="btn on-color" href="#' + kind + '">← ' + (isMaker ? "Todos los fabricantes" : "Todos los tipos") + "</a>";
    if (m.web) actions += '<a class="btn on-color" href="' + esc(m.web) + '" target="_blank" rel="noopener">Web de ' + esc(name) + " ↗</a>";
    app.innerHTML = '<div class="stack"><section class="folder-open ' + hue(name) + '">' + (isMaker ? makerSticker(name) : typeSticker(name)) + "<div><h1>" + esc(name) + "</h1><p>" + esc(sub) + (m.nota ? " · " + esc(m.nota) : "") + '</p><div class="folder-actions">' + actions + "</div></div></section>" +
      tableHtml(items, key) + "</div>";
  }

  /* Resumen */
  function splitBar(list) {
    var t = list.length || 1;
    return '<div class="split" role="img" aria-label="' + count(list, isIn) + " instalados, " + count(list, isOut) + " faltan, " + count(list, isIdle) + ' sin uso"><i class="a" style="width:' + (count(list, isIn) / t * 100).toFixed(1) + '%"></i><i class="b" style="width:' + (count(list, isOut) / t * 100).toFixed(1) + '%"></i><i class="c" style="width:' + (count(list, isIdle) / t * 100).toFixed(1) + '%"></i></div>';
  }
  function smallTable(title, sub, head, rows) {
    return '<section class="group"><div class="group-title"><h2>' + esc(title) + "</h2></div>" + (sub ? '<p class="muted">' + esc(sub) + "</p>" : "") + '<div class="tbl"><table class="small"><thead><tr>' + head.map(function (h) {
      return '<th class="plain' + (h.num ? " num" : "") + '">' + esc(h.t) + "</th>";
    }).join("") + "</tr></thead><tbody>" + rows.join("") + "</tbody></table></div></section>";
  }
  function topRows(list, n) {
    return list.slice().sort(function (a, b) { return b.proyectos - a.proyectos || by(a.nombre, b.nombre); }).slice(0, n).map(function (p) {
      return '<tr><td class="n">' + esc(p.nombre) + "</td><td>" + esc(p.requiere || p.fabricante) + '</td><td class="num">' + p.proyectos + "</td><td>" + link(p) + "</td></tr>";
    });
  }
  function renderSummary() {
    var used = DATA.filter(function (p) { return p.proyectos > 0; });
    var totalProjectsCovered = used.filter(isIn).reduce(function (s, p) { return s + p.proyectos; }, 0);
    var totalUses = used.reduce(function (s, p) { return s + p.proyectos; }, 0);
    var prices = ["Gratis", "Voluntario", "Pago", "Sin confirmar"];
    var priceRows = prices.map(function (x) {
      var l = DATA.filter(function (p) { return p.precio === x; });
      return "<tr><td>" + price({ precio: x }) + '</td><td class="num">' + count(l, isIn) + '</td><td class="num">' + count(l, isOut) + '</td><td class="num">' + count(l, isIdle) + '</td><td class="num"><b>' + l.length + "</b></td></tr>";
    });
    var formatRows = ["VST2 y VST3", "Solo VST2", "Solo VST3"].map(function (f) {
      var l = DATA.filter(function (p) { return p.formato === f; });
      return "<tr><td>" + esc(f) + '</td><td class="num">' + l.length + "</td></tr>";
    });
    var typeRows = uniq("tipo").sort(function (a, b) { return b.count - a.count || by(a.value, b.value); }).map(function (t) {
      var l = DATA.filter(function (p) { return p.tipo === t.value; });
      return '<tr><td class="n"><a href="#tipos/' + slugify(t.value) + '">' + esc(t.value) + '</a></td><td class="bar-cell">' + splitBar(l) + '</td><td class="num">' + count(l, hasPlugin) + "/" + l.length + "</td></tr>";
    });
    var makerRows = uniq("fabricante").sort(function (a, b) { return b.count - a.count || by(a.value, b.value); }).slice(0, 12).map(function (t) {
      var l = DATA.filter(function (p) { return p.fabricante === t.value; });
      return '<tr><td class="n"><a href="#fabricantes/' + makerSlug(t.value) + '">' + esc(t.value) + '</a></td><td class="bar-cell">' + splitBar(l) + '</td><td class="num">' + count(l, hasPlugin) + "/" + l.length + "</td></tr>";
    });
    var free = used.filter(function (p) { return isOut(p) && (p.precio === "Gratis" || p.precio === "Voluntario"); });
    var paid = used.filter(function (p) { return isOut(p) && p.precio === "Pago"; });
    var depr = DATA.filter(function (p) { return p.deprecado; }).sort(function (a, b) { return b.proyectos - a.proyectos || by(a.nombre, b.nombre); });
    var deprRows = depr.map(function (p) {
      return '<tr><td class="n">' + esc(p.nombre) + "</td><td>" + esc(p.reemplazo || "Sin reemplazo") + '</td><td class="num">' + p.proyectos + "</td><td>" + pill(p) + "</td></tr>";
    });
    var only3 = used.filter(function (p) { return isIn(p) && p.formato === "Solo VST3"; });
    var topHead = [{ t: "Plugin" }, { t: "Fabricante o requisito" }, { t: "Proyectos", num: true }, { t: "Enlace" }];
    app.innerHTML = '<div class="stack"><div class="intro"><div><h1>Resumen</h1><p class="muted">Lo que tenés, lo que falta y qué conviene conseguir primero.</p></div></div>' +
      '<div class="tiles"><div class="tile"><b>' + used.length + '</b><span>plugins usados en proyectos</span></div><div class="tile ok"><b>' + count(DATA, isIn) + '</b><span>instalados</span></div><div class="tile no"><b>' + count(DATA, isOut) + '</b><span>faltan</span></div><div class="tile"><b>' + (totalUses ? Math.round(totalProjectsCovered / totalUses * 100) : 0) + '%</b><span>de los usos en proyectos ya cubiertos</span></div></div>' +
      '<div class="columns">' +
      smallTable("Por precio", "", [{ t: "Precio" }, { t: "Instalados", num: true }, { t: "Faltan", num: true }, { t: "Sin uso", num: true }, { t: "Total", num: true }], priceRows) +
      smallTable("Por formato", "Solo cuenta los plugins instalados.", [{ t: "Formato" }, { t: "Plugins", num: true }], formatRows) +
      smallTable("Gratis que faltan", "Los más usados primero.", topHead, topRows(free, 10)) +
      smallTable("De pago que faltan", "Si ya los compraste, quizá puedas volver a bajarlos.", topHead, topRows(paid, 10)) +
      smallTable("Por tipo", "Verde: instalados. Naranja: faltan. Gris: sin uso.", [{ t: "Tipo" }, { t: "Estado" }, { t: "En la compu", num: true }], typeRows) +
      smallTable("Fabricantes con más plugins", "", [{ t: "Fabricante" }, { t: "Estado" }, { t: "En la compu", num: true }], makerRows) +
      smallTable("Deprecados", "Siguen haciendo falta para abrir tus temas viejos: no los borres sin revisar.", [{ t: "Plugin" }, { t: "Reemplazo" }, { t: "Proyectos", num: true }, { t: "Estado" }], deprRows) +
      smallTable("Instalados solo en VST3", "Tus proyectos los usan en otro formato: quizá no abran solos en temas viejos.", topHead, topRows(only3, 20)) +
      "</div></div>";
  }

  /* Compu nueva */
  function renderNewPc() {
    var checks = loadChecks();
    var list = DATA.filter(function (p) { return state.incluirSinUso || p.proyectos > 0; });
    var done = list.filter(function (p) { return checks[p.nombre]; }).length;
    var pct = list.length ? Math.round(done / list.length * 100) : 0;
    var sections = ACQUIRE_ORDER.map(function (name) {
      var items = list.filter(function (p) { return p.conseguir === name; }).sort(function (a, b) { return b.proyectos - a.proyectos || by(a.nombre, b.nombre); });
      if (!items.length) return "";
      return '<section class="group"><div class="group-title"><h2>' + esc(name) + "</h2><span>" + items.length + '</span></div><p class="muted">' + esc(ACQUIRE_HINT[name]) + '</p><ul class="check-list">' + items.map(function (p, i) {
        var id = "c-" + slugify(name) + "-" + i;
        var meta = [p.deprecado ? "Deprecado" : "", p.fabricante, p.tipo, p.proyectos + (p.proyectos === 1 ? " proyecto" : " proyectos"), p.requiere].filter(Boolean).join(" · ");
        return '<li class="' + (checks[p.nombre] ? "done" : "") + '"><input type="checkbox" id="' + id + '" data-check="' + esc(p.nombre) + '"' + (checks[p.nombre] ? " checked" : "") + '><div><label class="check-name" for="' + id + '">' + esc(p.nombre) + '</label><div class="check-meta">' + esc(meta) + "</div></div><div>" + link(p) + "</div></li>";
      }).join("") + "</ul></section>";
    }).join("");
    app.innerHTML = '<div class="stack"><div class="intro"><div><h1>Compu nueva</h1><p class="muted">Una lista para reinstalar todo en orden.</p></div></div><section class="guide"><h2>Cómo instalar</h2><ol>' +
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
        saveChecks(cur); state.confirmReset = false;
        var y = window.scrollY, id = c.id;
        renderNewPc();
        window.scrollTo(0, y);
        var again = document.getElementById(id);
        if (again) again.focus();
      });
    });
  }

  /* Rutas */
  function parseHash() {
    var parts = location.hash.replace(/^#/, "").split("/");
    return { view: parts[0] || "biblioteca", sub: parts[1] ? decodeURIComponent(parts[1]) : "" };
  }
  function render() {
    var r = parseHash(), view = r.view;
    if (["biblioteca", "fabricantes", "tipos", "resumen", "compu-nueva"].indexOf(view) === -1) { view = "biblioteca"; }
    document.querySelectorAll(".tab").forEach(function (t) {
      if (t.getAttribute("data-view") === view) { t.setAttribute("aria-current", "page"); } else { t.removeAttribute("aria-current"); }
    });
    if (view === "fabricantes" || view === "tipos") {
      var name = r.sub ? (view === "fabricantes" ? makerBySlug(r.sub) : typeBySlug(r.sub)) : null;
      if (name) { renderOpenFolder(view, name); } else { renderFolders(view); }
    } else if (view === "resumen") { renderSummary(); }
    else if (view === "compu-nueva") { renderNewPc(); }
    else { renderLibrary(); }
  }
  function renderMeter() {
    var t = DATA.length || 1, a = count(DATA, isIn), b = count(DATA, isOut), c = count(DATA, isIdle);
    document.getElementById("meter").innerHTML = '<div class="meter-bar" role="img" aria-label="' + a + " instalados, " + b + " faltan, " + c + ' sin uso"><i class="m-ok" style="width:' + (a / t * 100).toFixed(1) + '%"></i><i class="m-no" style="width:' + (b / t * 100).toFixed(1) + '%"></i><i class="m-un" style="width:' + (c / t * 100).toFixed(1) + '%"></i></div><div class="meter-legend"><span><b>' + a + "</b> instalados</span><span><b>" + b + "</b> faltan</span><span><b>" + c + "</b> sin uso</span></div>";
  }
  app.addEventListener("click", function (e) {
    var b = e.target.closest ? e.target.closest("[data-sort]") : null;
    if (!b) return;
    var k = b.getAttribute("data-sort");
    if (state.sort === k) { state.dir = -state.dir; } else { state.sort = k; state.dir = k === "proyectos" ? -1 : 1; }
    var y = window.scrollY;
    if (document.getElementById("results")) { renderResults(); } else { render(); }
    window.scrollTo(0, y);
  });
  window.addEventListener("hashchange", function () { render(); window.scrollTo(0, 0); });
  renderMeter();
  render();
})();
