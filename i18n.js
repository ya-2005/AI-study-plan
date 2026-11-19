/* =========================================================
   i18n.js  —  محرّك التبديل بين العربية والإنجليزية
   - لا يغيّر بيانات الموقع (تبقى بالعربي داخلياً كما هي)
   - يترجم النصوص الظاهرة فقط عند العرض، ويعيدها كما كانت عند الرجوع للعربي
   - الخيار يُحفظ في المتصفح (localStorage: lang)
   - يعمل أيضاً على المحتوى الذي تنشئه الجافاسكربت لاحقاً (MutationObserver)
========================================================= */
(function () {
    "use strict";

    var KEY = "lang";
    var lang = "ar";
    try { if (localStorage.getItem(KEY) === "en") lang = "en"; } catch (e) { /* ignore */ }

    var root = document.documentElement;

    function applyDir() {
        root.setAttribute("lang", lang);
        root.setAttribute("dir", lang === "en" ? "ltr" : "rtl");
        root.classList.toggle("lang-en", lang === "en");
    }
    applyDir();           /* مبكراً قبل الرسم لتفادي الوميض */

    /* ---------- تطبيع المفاتيح ---------- */
    function norm(s) {
        return String(s)
            .replace(/[ً-ٰٟـ]/g, "")      /* تشكيل + تطويل */
            .replace(/[أإآ]/g, "ا")
            .replace(/ى/g, "ي")
            .replace(/\s+/g, " ")
            .replace(/ و (?=\S)/g, " و")                       /* "و علوم" = "وعلوم" */
            .trim();
    }

    var DICT = Object.create(null);

    function addDict(obj) {
        if (!obj) return;
        Object.keys(obj).forEach(function (k) { DICT[norm(k)] = obj[k]; });
    }

    addDict(window.I18N_COURSES);
    addDict(window.I18N_UI);

    /* أنماط فيها أرقام أو أجزاء متغيّرة */
    var PATTERNS = [
        [/^(\d+)\s*ساعات?$/, function (m) { return m[1] + (m[1] === "1" ? " credit hour" : " credit hours"); }],
        [/^الساعات:\s*(.+)$/, function (m) { return "Hours: " + m[1]; }],
        [/^عدد الساعات:\s*(.+)$/, function (m) { return "Hours: " + m[1]; }],
        [/^(\d+)\s*ساعة$/, function (m) { return m[1] + " credit hours"; }]
    ];
    if (window.I18N_PATTERNS) PATTERNS = PATTERNS.concat(window.I18N_PATTERNS);

    /* قوالب: ["عربي {c} ... {n}", "English {1} ... {2}"]
       {c} = اسم مادة/نص معروف (يُترجم)   {n} = رقم   {x} = نص يبقى كما هو */
    (window.I18N_TEMPLATES || []).forEach(function (t) {
        var src = norm(t[0].replace(/\{c\}/g, "\u00A7C\u00A7").replace(/\{n\}/g, "\u00A7N\u00A7").replace(/\{x\}/g, "\u00A7X\u00A7"));
        var kinds = [];
        var re = src.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\u00A7([CNX])\u00A7/g, function (m, k) {
            kinds.push(k);
            return k === "N" ? "(\\d+)" : "(.+?)";
        });
        var rx = new RegExp("^" + re + "$");
        PATTERNS.push([rx, function (m, look) {
            var out = t[1];
            for (var i = 0; i < kinds.length; i++) {
                var v = m[i + 1];
                if (kinds[i] === "C") {
                    var tr = look(v);
                    if (tr === null) return null;
                    v = tr;
                }
                out = out.split("{" + (i + 1) + "}").join(v);
            }
            return out;
        }]);
    });

    var AR = /[؀-ۿ]/;

    /* يترجم نصاً كاملاً أو يرجع null إن لم يعرفه */
    function translate(text) {
        if (!AR.test(text) && text.trim() !== "\u2190") return null;
        var lead = (text.match(/^\s*/) || [""])[0];
        var trail = (text.match(/\s*$/) || [""])[0];
        var core = text.trim();
        if (!core) return null;

        var out = lookup(core);
        if (out === null) return null;
        return lead + out + trail;
    }

    function lookup(core) {
        var n = norm(core);
        if (n === "\u2190") return "\u2192";
        if (n in DICT) return DICT[n];

        for (var i = 0; i < PATTERNS.length; i++) {
            var m = n.match(PATTERNS[i][0]);
            if (m) {
                var r = PATTERNS[i][1](m, lookup);
                if (r !== null && r !== undefined) return r;
            }
        }

        /* أسماء مركبة: "أ + ب" */
        if (n.indexOf(" + ") > -1) {
            var parts = n.split(" + "), res = [];
            for (var j = 0; j < parts.length; j++) {
                var t = lookup(parts[j]);
                if (t === null) return null;
                res.push(t);
            }
            return res.join(" + ");
        }
        /* جمل متعددة: "جملة. جملة." */
        if (/\.\s+\S/.test(n)) {
            var sents = n.split(/(?<=\.)\s+/), r3 = [];
            if (sents.length > 1) {
                for (var q = 0; q < sents.length; q++) {
                    var t3 = lookup(sents[q]);
                    if (t3 === null) return null;
                    r3.push(t3);
                }
                return r3.join(" ");
            }
        }
        /* قوائم مفصولة بفاصلة عربية/لاتينية: "أ، ب" */
        if (/[،,]\s/.test(n)) {
            var segs = n.split(/\s*[،,]\s*/), r2 = [];
            for (var k = 0; k < segs.length; k++) {
                var t2 = lookup(segs[k]);
                if (t2 === null) return null;
                r2.push(t2);
            }
            return r2.join(", ");
        }
        return null;
    }

    /* ---------- تخزين النص الأصلي ---------- */
    var origText = new WeakMap();    /* عقدة نص -> الأصل العربي */
    var lastSet = new WeakMap();     /* عقدة نص -> آخر قيمة وضعناها نحن */
    var ATTRS = ["placeholder", "title", "aria-label", "alt", "data-tip"];
    var SKIP = { SCRIPT: 1, STYLE: 1, NOSCRIPT: 1, TEXTAREA: 1, CODE: 1 };

    function handleText(node) {
        var cur = node.nodeValue;
        if (lang === "en") {
            if (lastSet.get(node) === cur) return;          /* قيمتنا نحن */
            var t = translate(cur);
            if (t !== null && t !== cur) {
                origText.set(node, cur);
                lastSet.set(node, t);
                node.nodeValue = t;
            } else {
                origText.delete(node);
                lastSet.delete(node);
            }
        } else if (origText.has(node)) {
            if (lastSet.get(node) === cur) node.nodeValue = origText.get(node);
            origText.delete(node);
            lastSet.delete(node);
        }
    }

    function handleAttrs(el) {
        for (var i = 0; i < ATTRS.length; i++) {
            var a = ATTRS[i];
            if (!el.hasAttribute(a)) continue;
            var ok = "data-i18n-o-" + a;
            var cur = el.getAttribute(a);
            if (lang === "en") {
                var saved = el.getAttribute(ok);
                if (saved !== null && cur === el.getAttribute("data-i18n-t-" + a)) continue;
                var t = translate(cur);
                if (t !== null && t !== cur) {
                    el.setAttribute(ok, cur);
                    el.setAttribute("data-i18n-t-" + a, t);
                    el.setAttribute(a, t);
                }
            } else if (el.hasAttribute(ok)) {
                if (cur === el.getAttribute("data-i18n-t-" + a)) el.setAttribute(a, el.getAttribute(ok));
                el.removeAttribute(ok);
                el.removeAttribute("data-i18n-t-" + a);
            }
        }
    }

    function walk(node) {
        if (node.nodeType === 3) { handleText(node); return; }
        if (node.nodeType !== 1 || SKIP[node.nodeName]) return;
        handleAttrs(node);
        for (var c = node.firstChild; c; c = c.nextSibling) walk(c);
    }

    var titleOrig = null;
    function handleTitle() {
        if (lang === "en") {
            if (titleOrig === null) titleOrig = document.title;
            var t = translate(titleOrig);
            if (t) document.title = t;
        } else if (titleOrig !== null) {
            document.title = titleOrig;
            titleOrig = null;
        }
    }

    /* ---------- المراقب ---------- */
    var obs = null, busy = false;

    function startObserver() {
        if (obs || !document.body) return;
        obs = new MutationObserver(function (list) {
            if (busy) return;
            busy = true;
            try {
                list.forEach(function (m) {
                    if (m.type === "characterData") handleText(m.target);
                    else if (m.type === "attributes") handleAttrs(m.target);
                    else m.addedNodes.forEach(function (n) { walk(n); });
                });
            } finally { busy = false; }
        });
        obs.observe(document.body, {
            childList: true, subtree: true, characterData: true,
            attributes: true, attributeFilter: ATTRS
        });
    }

    function run() {
        busy = true;
        try { walk(document.body); handleTitle(); } finally { busy = false; }
        updateButton();
    }

    /* ---------- زر التبديل ---------- */
    function updateButton() {
        var btns = document.querySelectorAll(".lang-toggle");
        btns.forEach(function (b) {
            b.textContent = lang === "en" ? "عربي" : "EN";
            b.setAttribute("aria-label", lang === "en" ? "Switch to Arabic" : "التبديل إلى الإنجليزية");
            b.setAttribute("title", lang === "en" ? "Switch to Arabic" : "Switch to English");
            b.setAttribute("lang", lang === "en" ? "ar" : "en");
        });
    }

    function injectButton() {
        if (document.querySelector(".lang-toggle")) return;
        var box = document.querySelector(".header-actions");
        if (!box) return;
        var b = document.createElement("button");
        b.type = "button";
        b.className = "lang-toggle";
        b.addEventListener("click", function () { setLang(lang === "en" ? "ar" : "en"); });
        box.insertBefore(b, box.firstChild);
    }

    function setLang(l) {
        lang = l === "en" ? "en" : "ar";
        try { localStorage.setItem(KEY, lang); } catch (e) { /* ignore */ }
        applyDir();
        run();
        try { document.dispatchEvent(new CustomEvent("langchange", { detail: { lang: lang } })); } catch (e) { /* ignore */ }
    }

    /* ---------- واجهة للاستعمال من باقي الملفات ---------- */
    window.I18N = {
        get lang() { return lang; },
        setLang: setLang,
        /* يترجم نصاً عند الطلب (يرجع النص نفسه إن لم يكن إنجليزياً أو غير معروف) */
        t: function (s) {
            if (lang !== "en") return s;
            var r = translate(String(s));
            return r === null ? s : r;
        },
        /* الإنجليزي دائماً بغض النظر عن اللغة الحالية (للبحث مثلاً) */
        en: function (s) {
            var r = translate(String(s));
            return r === null ? String(s) : r;
        },
        /* يرجع النص الأصلي (العربي) لعنصر، حتى لو كان معروضاً بالإنجليزي */
        orig: function (el) {
            if (!el) return "";
            var out = "";
            (function rec(n) {
                if (n.nodeType === 3) out += origText.has(n) ? origText.get(n) : n.nodeValue;
                else for (var c = n.firstChild; c; c = c.nextSibling) rec(c);
            })(el);
            return out.trim();
        },
        refresh: run
    };

    /* ---------- التشغيل ---------- */
    function init() {
        injectButton();
        run();
        startObserver();
    }
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
    else init();
})();
