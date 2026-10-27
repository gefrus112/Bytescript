/* Bytescript website — vanilla JS, no dependencies. */
(function () {
  "use strict";
  var REPO = "gefrus112/Bytescript";

  /* ---------- theme ---------- */
  var saved = null;
  try { saved = localStorage.getItem("bs-theme"); } catch (e) {}
  if (saved) document.documentElement.setAttribute("data-theme", saved);
  document.querySelectorAll(".theme-toggle").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var next = document.documentElement.getAttribute("data-theme") === "light" ? "dark" : "light";
      document.documentElement.setAttribute("data-theme", next);
      try { localStorage.setItem("bs-theme", next); } catch (e) {}
    });
  });

  /* ---------- mobile nav + active link ---------- */
  var toggle = document.querySelector(".nav-toggle");
  var nav = document.querySelector("nav.main");
  if (toggle && nav) toggle.addEventListener("click", function () { nav.classList.toggle("open"); });
  var page = (location.pathname.split("/").pop() || "index.html").toLowerCase();
  document.querySelectorAll("nav.main a").forEach(function (a) {
    if ((a.getAttribute("href") || "").toLowerCase() === page) a.classList.add("active");
  });

  /* ---------- Bytescript syntax highlighting ---------- */
  function esc(s) { return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
  var KW = /\b(if|then|elseif|else|for|while|repeat|in|break|continue|return|end|func|class|static|import|from|require|as|alloc|and|or|not|var)\b/g;
  var TYPES = /\b(Number|num|String|str|Table|table|Function|CData|File)\b/g;
  var BUILTIN = /\b(print|input|free|exec|disassemble|self|NIL|true|false)\b/g;
  function highlight(src) {
    /* tokenise comments & strings first so keywords inside them stay untouched */
    var parts = src.split(/(--.*$|"(?:\\.|[^"\\])*")/m);
    return parts.map(function (part) {
      if (/^--/.test(part)) return '<span class="tok-com">' + esc(part) + "</span>";
      if (/^"/.test(part)) return '<span class="tok-str">' + esc(part) + "</span>";
      var h = esc(part);
      h = h.replace(/\b(\d+(?:\.\d+)?)\b/g, '<span class="tok-num">$1</span>');
      h = h.replace(KW, '<span class="tok-kw">$1</span>');
      h = h.replace(TYPES, '<span class="tok-typ">$1</span>');
      h = h.replace(BUILTIN, '<span class="tok-fn">$1</span>');
      h = h.replace(/\b([A-Za-z_]\w*)(?=\s*\()/g, '<span class="tok-fn">$1</span>');
      return h;
    }).join("");
  }
  document.querySelectorAll("code.lang-bytescript, code.language-bytescript").forEach(function (el) {
    el.innerHTML = highlight(el.textContent);
  });

  /* ---------- copy buttons on <pre> ---------- */
  document.querySelectorAll("pre").forEach(function (pre) {
    if (pre.classList.contains("output")) return;
    var btn = document.createElement("button");
    btn.className = "copy-btn"; btn.type = "button"; btn.textContent = "Copy";
    btn.addEventListener("click", function () {
      var code = pre.querySelector("code");
      var text = code ? code.textContent : pre.textContent;
      function done() { btn.textContent = "Copied!"; setTimeout(function () { btn.textContent = "Copy"; }, 1400); }
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, done);
      else {
        var ta = document.createElement("textarea"); ta.value = text; document.body.appendChild(ta);
        ta.select(); try { document.execCommand("copy"); } catch (e) {} document.body.removeChild(ta); done();
      }
    });
    pre.appendChild(btn);
  });

  /* ---------- tabs (install page OS picker + home demos) ---------- */
  document.querySelectorAll("[data-tabs]").forEach(function (group) {
    var btns = group.querySelectorAll(".tab-btn");
    var panels = group.querySelectorAll(".tab-panel");
    function activate(id) {
      btns.forEach(function (b) { b.classList.toggle("active", b.getAttribute("data-tab") === id); });
      panels.forEach(function (p) { p.classList.toggle("active", p.id === id); });
    }
    btns.forEach(function (b) { b.addEventListener("click", function () { activate(b.getAttribute("data-tab")); }); });
    /* auto-pick the visitor's OS on the install page */
    var osTab = group.getAttribute("data-tabs");
    if (osTab === "os") {
      var ua = navigator.userAgent || "";
      activate(/win/i.test(ua) ? "os-windows" : /mac/i.test(ua) ? "os-macos" : "os-linux");
    }
  });

  /* ---------- docs search + scrollspy ---------- */
  var search = document.getElementById("docs-search");
  if (search) {
    var sections = document.querySelectorAll("section.doc");
    var noResults = document.getElementById("docs-noresults");
    search.addEventListener("input", function () {
      var q = search.value.trim().toLowerCase();
      var visible = 0;
      sections.forEach(function (s) {
        var hit = !q || s.textContent.toLowerCase().indexOf(q) !== -1;
        s.classList.toggle("hidden-by-search", !hit);
        if (hit) visible++;
      });
      if (noResults) noResults.style.display = visible ? "none" : "block";
    });
    var links = document.querySelectorAll(".toc a[href^='#']");
    if ("IntersectionObserver" in window && links.length) {
      var map = {};
      links.forEach(function (a) { map[a.getAttribute("href").slice(1)] = a; });
      var obs = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting && map[en.target.id]) {
            links.forEach(function (a) { a.classList.remove("active"); });
            map[en.target.id].classList.add("active");
          }
        });
      }, { rootMargin: "-30% 0px -60% 0px" });
      sections.forEach(function (s) { if (s.id) obs.observe(s); });
    }
  }

  /* ---------- GitHub API: contributors (progressive enhancement) ---------- */
  var contribBox = document.getElementById("contributors-live");
  if (contribBox) {
    fetch("https://api.github.com/repos/" + REPO + "/contributors")
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (list) {
        if (!Array.isArray(list) || !list.length) return;
        contribBox.innerHTML = "";
        list.forEach(function (c) {
          var card = document.createElement("div");
          card.className = "card person";
          card.innerHTML =
            '<img class="avatar" src="' + c.avatar_url + '" alt="' + c.login + '">' +
            "<h3>" + c.login + "</h3>" +
            '<p class="muted">' + c.contributions + " contributions</p>" +
            '<p><a href="' + c.html_url + '">GitHub profile</a></p>';
          contribBox.appendChild(card);
        });
        var note = document.getElementById("contributors-note");
        if (note) note.textContent = "Live from the GitHub API — refreshed just now.";
      })
      .catch(function () { /* baked-in fallback cards stay visible */ });
  }

  /* ---------- GitHub API: latest release (progressive enhancement) ---------- */
  var relBox = document.getElementById("latest-release");
  if (relBox) {
    fetch("https://api.github.com/repos/" + REPO + "/releases/latest")
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (rel) {
        var assets = (rel.assets || []).map(function (a) {
          return '<li><a href="' + a.browser_download_url + '">' + a.name + "</a> <span class=\"muted\">(" + Math.max(1, Math.round(a.size / 1024)) + " KB)</span></li>";
        }).join("");
        relBox.innerHTML = "<strong>Latest release: " + (rel.name || rel.tag_name) + "</strong>" +
          (rel.published_at ? ' <span class="muted">— published ' + rel.published_at.slice(0, 10) + "</span>" : "") +
          (assets ? "<ul>" + assets + "</ul>" : '<p><a href="' + rel.html_url + '">Open the release page</a></p>');
      })
      .catch(function () { /* fallback text in the HTML stays */ });
  }
})();
