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
  /* hero IDE window: wrap editor lines for CSS line numbers (tokens never
     contain newlines, so splitting highlighted HTML by \n is span-safe) */
  document.querySelectorAll(".ide .editor code").forEach(function (el) {
    el.innerHTML = el.innerHTML.split("\n").map(function (ln) {
      return '<span class="ln">' + (ln || " ") + "</span>";
    }).join("\n");
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

  /* ---------- GitHub API: contributor profiles (progressive enhancement) ----------
   * The HTML ships a baked snapshot (names, achievements, bios…) so the
   * pages work offline and from file://. When online we refresh the
   * numbers in place: followers/following/repos/gists, stars earned,
   * top repositories, languages, follower avatar stacks and this repo's
   * contribution counts/shares. Any failure (offline, rate limit) just
   * leaves the snapshot untouched. */
  var LANG_COLORS = { C: "#555555", "C++": "#f34b7d", Python: "#3572A5", JavaScript: "#f1e05a", TypeScript: "#3178c6", HTML: "#e34c26", CSS: "#663399", Shell: "#89e051", Rust: "#dea584", Go: "#00ADD8", Lua: "#000080" };
  function escHtml(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
  function ghJson(url) { return fetch(url).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }); }
  function langChip(name, extra) {
    var c = LANG_COLORS[name] || "#8b8b7d";
    return '<span><span class="lang-dot" style="background:' + c + '"></span>' + escHtml(name) + "</span>" + (extra || "");
  }

  var profileScopes = document.querySelectorAll("[data-login]");
  var seenLogins = {};
  profileScopes.forEach(function (scope) {
    var login = scope.getAttribute("data-login");
    if (!login || seenLogins[login]) return;
    seenLogins[login] = true;
    var api = "https://api.github.com/users/" + encodeURIComponent(login);
    /* user record: followers / following / repos / gists / name / bio */
    ghJson(api).then(function (u) {
      document.querySelectorAll('[data-login="' + login + '"] [data-gh]').forEach(function (el) {
        var key = el.getAttribute("data-gh");
        if (u[key] !== null && u[key] !== undefined && u[key] !== "") el.textContent = u[key];
      });
      var note = document.getElementById("contributors-note");
      if (note) note.textContent = "Live from the GitHub API — refreshed just now.";
    }).catch(function () {});
    /* repos: stars earned + top 3 + language mix */
    if (scope.querySelector("[data-gh-repos], [data-gh-langs], [data-gh='stars']")) {
      ghJson(api + "/repos?per_page=100").then(function (repos) {
        if (!Array.isArray(repos)) return;
        var own = repos.filter(function (r) { return !r.fork; });
        var stars = own.reduce(function (s, r) { return s + (r.stargazers_count || 0); }, 0);
        document.querySelectorAll('[data-login="' + login + '"] [data-gh="stars"]').forEach(function (el) { el.textContent = stars; });
        var top = own.slice().sort(function (a, b) {
          return (b.stargazers_count - a.stargazers_count) || String(b.pushed_at).localeCompare(String(a.pushed_at));
        }).slice(0, 3);
        document.querySelectorAll('[data-login="' + login + '"] [data-gh-repos]').forEach(function (box) {
          if (!top.length) return;
          box.innerHTML = top.map(function (r) {
            return '<a class="repo-card" href="' + r.html_url + '"><span class="r-name">' + escHtml(r.name) + '</span>' +
              '<span class="r-desc">' + escHtml(r.description || "No description yet") + '</span>' +
              '<span class="repo-meta">' + (r.language ? langChip(r.language) : "") +
              "<span>★ " + (r.stargazers_count || 0) + "</span><span>⑂ " + (r.forks_count || 0) + "</span></span></a>";
          }).join("");
        });
        var counts = {};
        own.forEach(function (r) { if (r.language) counts[r.language] = (counts[r.language] || 0) + 1; });
        var langs = Object.keys(counts).sort(function (a, b) { return counts[b] - counts[a]; });
        document.querySelectorAll('[data-login="' + login + '"] [data-gh-langs]').forEach(function (box) {
          if (!langs.length) return;
          box.innerHTML = langs.map(function (l) {
            return '<span class="lang-chip"><span class="lang-dot" style="background:' + (LANG_COLORS[l] || "#8b8b7d") + '"></span>' + escHtml(l) + " ×" + counts[l] + "</span>";
          }).join("");
        });
      }).catch(function () {});
    }
    /* follower avatar stack */
    if (scope.querySelector("[data-gh-followers]")) {
      ghJson(api + "/followers?per_page=12").then(function (fol) {
        if (!Array.isArray(fol)) return;
        document.querySelectorAll('[data-login="' + login + '"] [data-gh-followers]').forEach(function (box) {
          if (!fol.length) return;
          box.innerHTML = fol.slice(0, 8).map(function (f) {
            return '<a href="' + f.html_url + '" title="@' + escHtml(f.login) + '"><img src="' + f.avatar_url + '" alt="@' + escHtml(f.login) + '"></a>';
          }).join("") + (fol.length > 8 ? '<span class="more">+' + (fol.length - 8) + "</span>" : "");
        });
        if (fol.length) document.querySelectorAll('[data-login="' + login + '"] [data-gh-followers-empty]').forEach(function (el) { el.textContent = "Followed by"; });
      }).catch(function () {});
    }
  });

  /* this repo's contributor list: counts, shares, meters, landing total */
  var contribBox = document.getElementById("contributors-live");
  if (contribBox || document.querySelector("[data-contrib-for], [data-gh-total-contrib]")) {
    ghJson("https://api.github.com/repos/" + REPO + "/contributors")
      .then(function (list) {
        if (!Array.isArray(list) || !list.length) return;
        var total = list.reduce(function (s, c) { return s + (c.contributions || 0); }, 0);
        document.querySelectorAll("[data-gh-total-contrib]").forEach(function (el) {
          el.setAttribute("data-count", total); el.textContent = total;
        });
        list.forEach(function (c) {
          var pct = total ? (c.contributions / total * 100) : 0;
          var pctTxt = (Math.round(pct * 10) / 10) + "%";
          document.querySelectorAll('[data-contrib-for="' + c.login + '"], [data-login="' + c.login + '"] [data-gh-contrib]').forEach(function (el) { el.textContent = c.contributions; });
          document.querySelectorAll('[data-share-for="' + c.login + '"]').forEach(function (el) { el.style.width = pct + "%"; el.style.setProperty("--w", pct + "%"); });
          document.querySelectorAll('[data-sharepct-for="' + c.login + '"]').forEach(function (el) { el.textContent = pctTxt; });
          /* brand-new contributor not baked into the page yet? append a starter card */
          if (contribBox && !contribBox.querySelector('[data-login="' + c.login + '"]')) {
            var card = document.createElement("article");
            card.className = "person-card"; card.setAttribute("data-login", c.login);
            card.innerHTML =
              '<div class="person-head"><img class="avatar xl" src="' + c.avatar_url + '" alt="' + escHtml(c.login) + ' avatar">' +
              '<div class="person-id"><h3><a href="' + c.html_url + '">' + escHtml(c.login) + '</a></h3><p class="login">@' + escHtml(c.login) + '</p>' +
              '<span class="role-chip">Contributor</span></div>' +
              '<div class="person-actions"><a class="btn small primary" href="' + c.html_url + '">GitHub profile ↗</a></div></div>' +
              '<div class="contrib-meter"><div class="contrib-label"><span><b>' + c.contributions + '</b> contributions to Bytescript</span><span>' + pctTxt + '</span></div>' +
              '<div class="meter"><i style="width:' + pct + '%"></i></div></div>' +
              '<p class="bio">🎉 New face — this contributor joined after the page snapshot was taken. Welcome aboard!</p>';
            contribBox.appendChild(card);
            card.classList.add("reveal", "in");
          }
        });
        var note = document.getElementById("contributors-note");
        if (note) note.textContent = "Live from the GitHub API — refreshed just now.";
      })
      .catch(function () { /* baked-in snapshot stays visible */ });
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
  var revealEls = document.querySelectorAll(".card, .person-card, .step, .stat, .pipe-step, .faq details, .cta-panel, table.leaderboard, section.doc > h2, main.wrap > h2");
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

  /* card spotlight (flat terminal theme — glow follows the pointer, no tilt) */
  if (finePointer && !reducedMotion) {
    document.querySelectorAll(".card, .person-card").forEach(function (card) {
      card.addEventListener("pointermove", function (ev) {
        var r = card.getBoundingClientRect();
        card.style.setProperty("--mx", ((ev.clientX - r.left) / r.width * 100) + "%");
        card.style.setProperty("--my", ((ev.clientY - r.top) / r.height * 100) + "%");
      });
    });
  }

  /* hero byte-rain canvas */
  var rain = document.querySelector(".byte-rain");
  if (rain && rain.getContext && !reducedMotion) {
    var ctx = rain.getContext("2d"), cols = [], glyphs = "01<>/{}=+*";
    var colors = ["#ffdd00", "#8a8a7a", "#3f3f38", "#fff3a0", "#5d5d54"];
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
