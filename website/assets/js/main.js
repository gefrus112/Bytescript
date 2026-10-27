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

  /* ---------- Bytescript syntax highlighting ----------
   * Single-pass tokenizer. (The old version ran successive regex
   * replacements over already-generated HTML, so e.g. the `num` type
   * pattern matched inside class="tok-num" and produced broken spans.) */
  function esc(s) { return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
  var TOKEN_RE = /(--.*$)|("(?:\\.|[^"\\])*")|\b(Number|num|String|str|Table|table|Function|CData|File)\b|\b(if|then|elseif|else|for|while|repeat|in|break|continue|return|end|func|class|static|import|from|require|as|alloc|and|or|not|var)\b|\b(print|input|free|exec|disassemble|self|NIL|true|false)\b|\b(\d+(?:\.\d+)?)\b|\b([A-Za-z_]\w*)(?=\s*\()/gm;
  function highlight(src) {
    var out = "", last = 0, m;
    TOKEN_RE.lastIndex = 0;
    while ((m = TOKEN_RE.exec(src))) {
      out += esc(src.slice(last, m.index));
      var cls = m[1] ? "tok-com" : m[2] ? "tok-str" : m[3] ? "tok-typ" : m[4] ? "tok-kw" : m[5] ? "tok-fn" : m[6] ? "tok-num" : "tok-fn";
      out += '<span class="' + cls + '">' + esc(m[0]) + "</span>";
      last = m.index + m[0].length;
      if (m[0].length === 0) TOKEN_RE.lastIndex++;
    }
    return out + esc(src.slice(last));
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

  /* ---------- motion helpers ---------- */
  var reducedMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var finePointer = window.matchMedia && window.matchMedia("(pointer: fine)").matches;

  /* scroll progress + back-to-top */
  var progress = document.createElement("div"); progress.className = "scroll-progress";
  var backTop = document.createElement("button"); backTop.className = "back-top"; backTop.type = "button";
  backTop.setAttribute("aria-label", "Back to top"); backTop.textContent = "↑";
  backTop.addEventListener("click", function () { window.scrollTo({ top: 0, behavior: reducedMotion ? "auto" : "smooth" }); });
  document.body.appendChild(progress); document.body.appendChild(backTop);
  var ticking = false;
  function onScroll() {
    var max = document.documentElement.scrollHeight - window.innerHeight;
    var y = window.scrollY || 0;
    progress.style.width = (max > 0 ? Math.min(100, y / max * 100) : 0) + "%";
    backTop.classList.toggle("show", y > 650);
    ticking = false;
  }
  window.addEventListener("scroll", function () { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();

  /* reveal-on-scroll (elements are visible by default without JS) */
  var revealEls = document.querySelectorAll(".card, .step, .stat, .pipe-step, .faq details, .cta-panel, section.doc > h2, main.wrap > h2");
  revealEls.forEach(function (el, i) {
    el.classList.add("reveal");
    el.style.setProperty("--d", ((i % 4) * 0.07) + "s");
  });
  if ("IntersectionObserver" in window && !reducedMotion) {
    var revealObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add("in"); revealObs.unobserve(en.target); } });
    }, { threshold: 0.12 });
    revealEls.forEach(function (el) { revealObs.observe(el); });
  } else revealEls.forEach(function (el) { el.classList.add("in"); });

  /* animated counters */
  function animateCount(el) {
    var target = parseFloat(el.getAttribute("data-count")) || 0;
    var suffix = el.getAttribute("data-suffix") || "";
    if (reducedMotion) { el.textContent = target + suffix; return; }
    var start = null;
    function frame(ts) {
      if (!start) start = ts;
      var t = Math.min(1, (ts - start) / 1300);
      var eased = 1 - Math.pow(1 - t, 3);
      el.textContent = Math.round(target * eased) + suffix;
      if (t < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }
  var counters = document.querySelectorAll("[data-count]");
  if ("IntersectionObserver" in window) {
    var countObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { animateCount(en.target); countObs.unobserve(en.target); } });
    }, { threshold: 0.5 });
    counters.forEach(function (el) { countObs.observe(el); });
  } else counters.forEach(animateCount);

  /* card spotlight + gentle tilt */
  if (finePointer && !reducedMotion) {
    document.querySelectorAll(".card").forEach(function (card) {
      card.addEventListener("pointermove", function (ev) {
        var r = card.getBoundingClientRect();
        var x = (ev.clientX - r.left) / r.width, y = (ev.clientY - r.top) / r.height;
        card.style.setProperty("--mx", (x * 100) + "%"); card.style.setProperty("--my", (y * 100) + "%");
        card.style.transform = "translateY(-6px) perspective(900px) rotateX(" + ((0.5 - y) * 3.2) + "deg) rotateY(" + ((x - 0.5) * 3.2) + "deg)";
      });
      card.addEventListener("pointerleave", function () { card.style.transform = ""; });
    });
  }

  /* hero byte-rain canvas */
  var rain = document.querySelector(".byte-rain");
  if (rain && rain.getContext && !reducedMotion) {
    var ctx = rain.getContext("2d"), cols = [], glyphs = "01<>/{}=+*";
    var colors = ["#8b5cf6", "#22d3ee", "#fb923c", "#f472b6", "#facc15"];
    function sizeRain() {
      var r = rain.parentElement.getBoundingClientRect();
      rain.width = Math.max(1, Math.floor(r.width)); rain.height = Math.max(1, Math.floor(r.height));
      var n = Math.min(46, Math.floor(rain.width / 34));
      cols = Array.from({ length: n }, function (_, i) {
        return { x: (i + 0.5) * rain.width / n, y: Math.random() * rain.height, s: 0.35 + Math.random() * 0.9, c: colors[i % colors.length] };
      });
    }
    sizeRain(); window.addEventListener("resize", sizeRain);
    (function drawRain() {
      requestAnimationFrame(drawRain);
      if (document.hidden) return;
      ctx.clearRect(0, 0, rain.width, rain.height);
      ctx.font = "15px monospace"; ctx.textAlign = "center";
      cols.forEach(function (c) {
        ctx.globalAlpha = 0.34; ctx.fillStyle = c.c;
        ctx.fillText(glyphs[Math.floor(Math.random() * glyphs.length)], c.x, c.y);
        ctx.globalAlpha = 0.12;
        ctx.fillText(glyphs[Math.floor(Math.random() * glyphs.length)], c.x, c.y - 22);
        c.y += c.s * 2.1; if (c.y > rain.height + 24) { c.y = -12; c.x = Math.random() * rain.width; }
      });
      ctx.globalAlpha = 1;
    })();
  }

  /* hero terminal typing demo */
  var term = document.getElementById("typed-terminal");
  if (term && !reducedMotion) {
    var scenes = [
      [{ p: "$ ", t: "bytescript hello.bs" }, { o: "Hello, World!" }, { o: "Welcome to Bytescript" }],
      [{ p: "$ ", t: "bytescript exemples/demo.bs" }, { o: "fib(10) is:" }, { o: "55" }, { o: "sum of the table is:" }, { o: "24" }],
      [{ p: "$ ", t: "bytescript -e \"print(6 * 7)\"" }, { o: "42" }, { p: "$ ", t: "bytescript --version" }, { o: "Bytescript 1.1.0" }]
    ];
    var scene = 0;
    function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
    function line(cls, text) { var d = document.createElement("div"); if (cls) d.className = cls; d.textContent = text; term.appendChild(d); return d; }
    function play() {
      term.innerHTML = "";
      var steps = scenes[scene % scenes.length]; scene++;
      var chain = Promise.resolve();
      steps.forEach(function (st) {
        chain = chain.then(function () {
          if (st.o) { line("term-out", st.o); return wait(260); }
          var d = line("", "");
          var prompt = document.createElement("span"); prompt.className = "term-prompt"; prompt.textContent = st.p;
          var cmd = document.createElement("span"); cmd.className = "term-cmd";
          var cur = document.createElement("span"); cur.className = "cursor";
          d.appendChild(prompt); d.appendChild(cmd); d.appendChild(cur);
          var i = 0;
          return new Promise(function (resolve) {
            (function typeChar() {
              if (i <= st.t.length) { cmd.textContent = st.t.slice(0, i++); setTimeout(typeChar, 28 + Math.random() * 34); }
              else { cur.remove(); resolve(); }
            })();
          }).then(function () { return wait(300); });
        });
      });
      chain.then(function () { return wait(2600); }).then(play);
    }
    play();
  }

})();
