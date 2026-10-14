/* tools.js: حاسبة المعدل + مقارنة التخصصات. ملف مستقل ولا يعدّل script.js */
(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; }
  function norm(s) { return String(s || "").replace(/\s+/g, " ").trim(); }

  /* ---------------- حاسبة المعدل ---------------- */
  /* سلّم التقدير الرسمي (min = الحد الأدنى للعلامة، pts = النقاط، l = التقدير الحرفي) */
  var SCALE = [
    { min: 98, pts: 4.00, l: "A+" }, { min: 95, pts: 3.75, l: "A" }, { min: 90, pts: 3.50, l: "A-" },
    { min: 85, pts: 3.25, l: "B+" }, { min: 80, pts: 3.00, l: "B" }, { min: 75, pts: 2.75, l: "B-" },
    { min: 70, pts: 2.50, l: "C+" }, { min: 65, pts: 2.25, l: "C" }, { min: 60, pts: 2.00, l: "C-" },
    { min: 55, pts: 1.75, l: "D+" }, { min: 50, pts: 1.50, l: "D" }, { min: 0, pts: 0, l: "F" }
  ];

  /* النسبة المئوية تُشتق من المعدل النقطي بالتدرج الخطي بين حدود الجدول (نقاط ← الحد الأدنى للعلامة) */
  function toPercent(gpa) {
    var pts = [[0, 0]].concat(SCALE.slice().reverse().filter(function (s) { return s.pts > 0; }).map(function (s) { return [s.pts, s.min]; }));
    if (gpa >= 4) return 98;
    for (var i = 1; i < pts.length; i++) {
      if (gpa <= pts[i][0]) {
        var a = pts[i - 1], b = pts[i];
        return a[1] + (gpa - a[0]) / (b[0] - a[0]) * (b[1] - a[1]);
      }
    }
    return 98;
  }

  var GPA_KEY = "studyplan:gpa:v1";

  function initGpa() {
    var rows = $("gpa-rows"), scaleBox = $("gpa-scale");
    if (!rows) return;

    function addRow(v) {
      v = v || {};
      var r = el("div", "tool-row");
      var n = el("input", "nm"); n.placeholder = "اسم المادة (اختياري)"; n.maxLength = 60; n.value = v.n || "";
      var m = el("input"); m.type = "number"; m.min = 0; m.max = 100; m.placeholder = "العلامة /100"; m.className = "g-mark"; m.value = v.m || "";
      var h = el("input"); h.type = "number"; h.min = 1; h.max = 10; h.placeholder = "الساعات"; h.className = "g-hours"; h.value = v.h || "";
      var x = el("button", "tool-btn light", "حذف"); x.type = "button";
      x.onclick = function () { if (rows.children.length > 1) r.remove(); else { n.value = m.value = h.value = ""; } save(); };
      r.append(n, m, h, x); rows.appendChild(r);
    }

    /* ---- الحفظ في المتصفح ---- */
    function save() {
      try {
        var data = {
          rows: Array.prototype.map.call(rows.children, function (r) {
            return { n: r.querySelector(".nm").value, m: r.querySelector(".g-mark").value, h: r.querySelector(".g-hours").value };
          }),
          ph: $("prev-hours").value, pg: $("prev-gpa").value,
          cum: { g: $("r-cum-gpa").textContent, a: $("r-cum-avg").textContent, h: $("r-cum-h").textContent }
        };
        localStorage.setItem(GPA_KEY, JSON.stringify(data));
      } catch (e) { /* التخزين غير متاح */ }
    }
    function load() {
      try {
        var d = JSON.parse(localStorage.getItem(GPA_KEY) || "null");
        if (!d || !Array.isArray(d.rows)) return null;
        return d;
      } catch (e) { return null; }
    }

    var saved = load();
    var n0 = saved ? Math.max(5, Math.min(saved.rows.length, 30)) : 5;
    for (var i = 0; i < n0; i++) addRow(saved && saved.rows[i] ? {
      n: String(saved.rows[i].n || "").slice(0, 60), m: String(saved.rows[i].m || ""), h: String(saved.rows[i].h || "")
    } : null);
    if (saved) {
      $("prev-hours").value = String(saved.ph || ""); $("prev-gpa").value = String(saved.pg || "");
      if (saved.cum) {
        var ok = function (v) { return /^[0-9.\-%]{1,8}$/.test(String(v)) ? String(v) : "-"; };
        $("r-cum-gpa").textContent = ok(saved.cum.g); $("r-cum-avg").textContent = ok(saved.cum.a); $("r-cum-h").textContent = ok(saved.cum.h);
      }
    }
    $("gpa-add").onclick = function () { addRow(); save(); };
    document.querySelector(".tool-main").addEventListener("input", save);

    SCALE.forEach(function (s, i) {
      var f = el("div", "scale-row");
      var hi = i === 0 ? "100" : "<" + SCALE[i - 1].min;
      f.append(el("span", "", s.min + " ≤ X " + (i === 0 ? "≤ 100" : hi)), el("span", "", s.l), el("b", "", s.pts.toFixed(2)));
      scaleBox.appendChild(f);
    });

    function pointsOf(mark) {
      for (var i = 0; i < SCALE.length; i++) if (mark >= SCALE[i].min) return SCALE[i].pts;
      return 0;
    }
    function num(v) { return v === "" ? NaN : Number(v); }
    function fmt(v, d) { return isFinite(v) ? v.toFixed(d) : "-"; }
    function pct(g) { return Number(toPercent(g).toFixed(1)) + "%"; }

    function calc() {
      var err = $("gpa-err"); err.textContent = "";
      var H = 0, P = 0, used = 0;
      for (var i = 0; i < rows.children.length; i++) {
        var r = rows.children[i], mk = num(r.querySelector(".g-mark").value), hr = num(r.querySelector(".g-hours").value);
        var empty = r.querySelector(".g-mark").value === "" && r.querySelector(".g-hours").value === "";
        if (empty) continue;
        if (!isFinite(mk) || !isFinite(hr) || mk < 0 || mk > 100 || hr <= 0) { err.textContent = "تحقق من الصف " + (i + 1) + ": العلامة بين 0 و100 والساعات أكبر من صفر."; return; }
        H += hr; P += pointsOf(mk) * hr; used++;
      }
      if (!used) { err.textContent = "أدخل مادة واحدة على الأقل."; return; }

      var semGpa = P / H;
      $("r-sem-gpa").textContent = fmt(semGpa, 2);
      $("r-sem-avg").textContent = pct(semGpa);
      $("r-sem-h").textContent = H;

      var ph = num($("prev-hours").value), pg = num($("prev-gpa").value);
      var hasPrev = isFinite(ph) && ph > 0;
      if (hasPrev && isFinite(pg) && (pg < 0 || pg > 4)) { err.textContent = "المعدل التراكمي السابق يجب أن يكون بين 0 و4."; return; }
      if (hasPrev && !isFinite(pg)) {
        err.textContent = "أدخل معدلك التراكمي السابق لحساب التراكمي.";
        $("r-cum-gpa").textContent = $("r-cum-avg").textContent = $("r-cum-h").textContent = "-";
        return;
      }
      var cum = hasPrev ? (pg * ph + P) / (ph + H) : semGpa;
      $("r-cum-gpa").textContent = fmt(cum, 2);
      $("r-cum-avg").textContent = pct(cum);
      $("r-cum-h").textContent = hasPrev ? ph + H : H;
    }
    $("gpa-calc").onclick = function () { calc(); save(); };

    function resetSemester() {
      ["r-sem-gpa", "r-sem-avg", "r-sem-h"].forEach(function (id) { $(id).textContent = "-"; });
      $("gpa-err").textContent = "";
    }
    function resetCumulative() {
      ["r-cum-gpa", "r-cum-avg", "r-cum-h"].forEach(function (id) { $(id).textContent = "-"; });
    }
    function resetRows() {
      rows.textContent = "";
      for (var i = 0; i < 5; i++) addRow();
      resetSemester();
    }

    /* مسح درجات الفصل فقط: يبقى المعدل التراكمي ومعدلك وساعاتك السابقة كما هي */
    $("gpa-clear-grades").onclick = function () { resetRows(); save(); };

    /* مسح كل شيء بما فيه المعدل السابق والمحفوظ */
    $("gpa-clear").onclick = function () {
      try { localStorage.removeItem(GPA_KEY); } catch (e) { }
      $("prev-hours").value = $("prev-gpa").value = "";
      resetRows();
      resetCumulative();
    };

    /* بعد التحديث: نعرض النتيجة المحفوظة تلقائياً إذا كانت هناك بيانات */
    if (saved && saved.rows.some(function (r) { return r.m || r.h; })) calc();
  }

  /* ---------------- مقارنة التخصصات ---------------- */
  var MAJORS = [
    "هندسة الذكاء الاصطناعي و علوم البيانات",
    "هندسة البرمجيات ونظم المعلومات الذكية",
    "هندسة نظم أمن المعلومات الذكية",
    "هندسة الروبوت والنظم الذكية",
    "هندسة الإتصالات الذكية",
    "الهندسة الطبية الذكية والمعلوماتية الحيوية"
  ];

  function coursesOf(major) {
    var map = new Map();
    var plan = typeof getMajorPlan === "function" ? getMajorPlan(major) : null;
    if (!plan || !plan.curriculum) return map;
    plan.curriculum.forEach(function (y) {
      (y.semesters || []).forEach(function (s) {
        (s.courses || []).forEach(function (c) {
          var k = norm(c);
          if (!map.has(k)) map.set(k, y.year + " - " + s.name);
        });
      });
    });
    return map;
  }

  function fillList(ul, items) {
    ul.textContent = "";
    if (!items.length) { ul.appendChild(el("li", "", "لا يوجد")); return; }
    items.forEach(function (it) { var li = el("li"); li.appendChild(el("span", "", it[0])); li.appendChild(el("small", "", it[1])); ul.appendChild(li); });
  }

  function initCompare() {
    var a = $("cmp-a"), b = $("cmp-b");
    if (!a || !b) return;
    MAJORS.forEach(function (m, i) {
      [a, b].forEach(function (s, j) { var o = el("option", "", norm(m)); o.value = m; if (i === j) o.selected = true; s.appendChild(o); });
    });
    function render() {
      var err = $("cmp-err"); err.textContent = "";
      if (a.value === b.value) { err.textContent = "اختر تخصصين مختلفين."; $("cmp-out").style.display = "none"; return; }
      var A = coursesOf(a.value), B = coursesOf(b.value);
      if (!A.size || !B.size) { err.textContent = "تعذّر تحميل بيانات أحد التخصصين."; $("cmp-out").style.display = "none"; return; }
      var shared = [], onlyA = [], onlyB = [];
      A.forEach(function (v, k) { if (B.has(k)) shared.push([k, "أ: " + v.split(" - ")[0] + " | ب: " + B.get(k).split(" - ")[0]]); else onlyA.push([k, v.split(" - ")[0]]); });
      B.forEach(function (v, k) { if (!A.has(k)) onlyB.push([k, v.split(" - ")[0]]); });
      $("cmp-out").style.display = "";
      $("cmp-stats").textContent = "";
      ["مشتركة: " + shared.length, "فقط في أ: " + onlyA.length, "فقط في ب: " + onlyB.length].forEach(function (t) { $("cmp-stats").appendChild(el("span", "", t)); });
      $("cmp-ta").textContent = "مواد خاصة بـ: " + norm(a.value);
      $("cmp-tb").textContent = "مواد خاصة بـ: " + norm(b.value);
      fillList($("cmp-la"), onlyA); fillList($("cmp-lb"), onlyB); fillList($("cmp-ls"), shared);
    }
    a.onchange = b.onchange = render; render();
  }

  function run() { try { initGpa(); } catch (e) { console.error(e); } try { initCompare(); } catch (e) { console.error(e); } }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run); else run();
})();
