/* =========================================================
   الدفعة 6: ربط الواجهة وعرض النتائج
   يعتمد على: script.js ثم ai-core.js ثم ai.js ثم ai-pick.js
   لا يستخدم أي خادم ولا مفتاح.
   كل النصوص تُدرج بـ textContent (لا innerHTML) لأمان العرض،
   عدا أيقونات SVG الثابتة.
========================================================= */
(function () {
    "use strict";

    var ST = window.AIState, RK = window.AIRank, PK = window.AIPick;
    if (!ST || !RK || !PK) { return; }

    var NAMES_SHOWN = 8;

    function $(id) { return document.getElementById(id); }

    function el(tag, cls, text) {
        var e = document.createElement(tag);
        if (cls) { e.className = cls; }
        if (text !== undefined && text !== null) { e.textContent = text; }
        return e;
    }

    function clear(node) { while (node.firstChild) { node.removeChild(node.firstChild); } }

    /* بحث عربي متسامح: يتجاهل التشكيل والهمزات والتاء المربوطة */
    function key(s) {
        return String(s || "")
            .replace(/[ً-ْـ]/g, "")
            .replace(/[أإآ]/g, "ا").replace(/ى/g, "ي").replace(/ة/g, "ه")
            .replace(/\s+/g, " ").trim().toLowerCase();
    }

    function hoursText(h, known) {
        if (known === false) { return "ساعات غير محددة"; }
        return PK.hoursWord(h);
    }

    function doneText(n) {
        if (n === 0) { return "لا مواد منجزة"; }
        if (n === 1) { return "مادة منجزة واحدة"; }
        if (n === 2) { return "مادتان منجزتان"; }
        if (n <= 10) { return n + " مواد منجزة"; }
        return n + " مادة منجزة";
    }

    var els = {};
    var model = null;
    var resultsShown = false;

    /* =====================================================
       رسائل منسّقة (تنبيه / خطأ / نجاح)
    ===================================================== */

    var ICONS = {
        error:   '<path d="M12 8v5"/><path d="M12 16.5h.01"/><circle cx="12" cy="12" r="9"/>',
        danger:  '<path d="M12 8v5"/><path d="M12 16.5h.01"/><circle cx="12" cy="12" r="9"/>',
        warn:    '<path d="M12 9v4"/><path d="M12 17h.01"/><path d="M10.3 3.9 2.4 17.5A2 2 0 0 0 4.1 20.5h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/>',
        info:    '<circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><path d="M12 7.5h.01"/>',
        success: '<circle cx="12" cy="12" r="9"/><path d="m8.5 12.5 2.5 2.5 4.5-5"/>'
    };

    function alertBox(tone, title, text, link) {
        var box = el("div", "ai-alert ai-alert-" + tone);

        var ic = el("span", "ai-alert-icon");
        ic.setAttribute("aria-hidden", "true");
        ic.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" ' +
                       'stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">' +
                       (ICONS[tone] || ICONS.info) + '</svg>';
        box.appendChild(ic);

        var body = el("div", "ai-alert-body");
        if (title) { body.appendChild(el("strong", "ai-alert-title", title)); }
        if (text) {
            var t = el("span", "ai-alert-text", text);
            body.appendChild(t);
        }
        if (link) {
            body.appendChild(document.createTextNode(" "));
            var a = el("a", null, link.text);
            a.href = link.href;
            body.appendChild(a);
        }
        box.appendChild(body);
        return box;
    }

    function showMsg(tone, title, text, link) {
        clear(els.err);
        els.err.appendChild(alertBox(tone, title, text, link));
        try { els.err.scrollIntoView({ behavior: "smooth", block: "center" }); }
        catch (e) { els.err.scrollIntoView(); }
    }

    function clearMsg() { clear(els.err); }

    function setInfo(tone, text) {
        clear(els.info);
        if (text) { els.info.appendChild(alertBox(tone, null, text)); }
    }

    /* =====================================================
       نافذة تأكيد منسّقة (بدل confirm الافتراضية)
    ===================================================== */

    function confirmDialog(title, text, okLabel, onOk) {
        if (document.getElementById("ai-confirm")) { return; }
        var prev = document.activeElement;

        var overlay = el("div", "app-dialog-overlay");
        overlay.id = "ai-confirm";

        var box = el("div", "app-dialog");
        box.setAttribute("role", "alertdialog");
        box.setAttribute("aria-modal", "true");
        box.setAttribute("aria-labelledby", "ai-confirm-title");

        var ic = el("div", "app-dialog-icon");
        ic.innerHTML = '<svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" ' +
                       'stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + ICONS.warn + '</svg>';
        box.appendChild(ic);

        var h = el("h3", null, title);
        h.id = "ai-confirm-title";
        box.appendChild(h);
        box.appendChild(el("p", null, text));

        var actions = el("div", "ai-dialog-actions");
        var cancel = el("button", "app-dialog-btn ghost", "إلغاء");
        cancel.type = "button";
        var ok = el("button", "app-dialog-btn danger", okLabel);
        ok.type = "button";
        actions.appendChild(cancel);
        actions.appendChild(ok);
        box.appendChild(actions);
        overlay.appendChild(box);
        document.body.appendChild(overlay);

        function close() {
            document.removeEventListener("keydown", onKey);
            overlay.classList.remove("visible");
            overlay.classList.add("closing");
            setTimeout(function () { if (overlay.parentNode) { overlay.parentNode.removeChild(overlay); } }, 220);
            if (prev && prev.focus) { prev.focus({ preventScroll: true }); }
        }
        function onKey(e) { if (e.key === "Escape") { e.preventDefault(); close(); } }

        cancel.addEventListener("click", close);
        ok.addEventListener("click", function () { close(); onOk(); });
        overlay.addEventListener("click", function (e) { if (e.target === overlay) { close(); } });
        document.addEventListener("keydown", onKey);

        requestAnimationFrame(function () {
            overlay.classList.add("visible");
            cancel.focus({ preventScroll: true });
        });
    }

    /* =====================================================
       التهيئة: الفصول وقائمة المنجز
    ===================================================== */

    function termLabel(n) {
        var label = "الفصل " + n;
        var any = null;
        model.order.some(function (nm) {
            if (model.courses[nm].term === n) { any = model.courses[nm]; return true; }
            return false;
        });
        if (any && any.year && any.semester) { label += " — " + any.year + "، " + any.semester; }
        return label;
    }

    function fillTerms() {
        clear(els.term);
        for (var i = 1; i <= model.totalTerms; i++) {
            var o = el("option", null, termLabel(i));
            o.value = String(i);
            els.term.appendChild(o);
        }
        els.term.value = String(ST.currentTerm());
    }

    function groupCourses(g) {
        return model.order.filter(function (n) { return (model.courses[n].term || 0) === g; });
    }

    function buildDoneList() {
        clear(els.list);
        var groups = {};
        var order = [];
        model.order.forEach(function (n) {
            var g = model.courses[n].term || 0;
            if (!groups[g]) { groups[g] = []; order.push(g); }
            groups[g].push(model.courses[n]);
        });
        order.sort(function (a, b) {
            if (a === 0) { return 1; }
            if (b === 0) { return -1; }
            return a - b;
        });

        order.forEach(function (g) {
            var wrap = el("div", "ai-group");
            wrap.setAttribute("data-group", String(g));

            var head = el("div", "ai-term-head");
            head.appendChild(el("div", "ai-term-title", g === 0 ? "مواد اختيارية أو خارج الجدول" : termLabel(g)));
            var btn = el("button", "ai-term-btn", "تحديد الكل");
            btn.type = "button";
            btn.setAttribute("data-group-btn", String(g));
            head.appendChild(btn);
            wrap.appendChild(head);

            groups[g].forEach(function (c) {
                var lab = el("label", "ai-check");
                lab.setAttribute("data-key", key(c.name));
                var cb = document.createElement("input");
                cb.type = "checkbox";
                cb.setAttribute("data-name", c.name);
                lab.appendChild(cb);
                lab.appendChild(el("span", null, c.name));
                lab.appendChild(el("small", null, c.hoursKnown ? hoursText(c.hours) : "ساعات غير محددة"));
                wrap.appendChild(lab);
            });
            els.list.appendChild(wrap);
        });
        syncChecks();
        applySearch();
    }

    function syncChecks() {
        var set = ST.done();
        var boxes = els.list.querySelectorAll("input[type=checkbox]");
        var count = 0;
        for (var i = 0; i < boxes.length; i++) {
            var on = !!set[boxes[i].getAttribute("data-name")];
            boxes[i].checked = on;
            if (on) { count++; }
        }
        var res = ST.compute();
        els.count.textContent = doneText(count) + " — " + (res ? res.doneHours : 0) + " ساعة من الخطة";

        /* أزرار الفصول: تحديد الكل / إلغاء الكل */
        var btns = els.list.querySelectorAll("[data-group-btn]");
        for (var j = 0; j < btns.length; j++) {
            var g = parseInt(btns[j].getAttribute("data-group-btn"), 10);
            var names = groupCourses(g);
            var doneN = names.filter(function (n) { return set[n]; }).length;
            btns[j].textContent = doneN === names.length ? "إلغاء الكل" : "تحديد الكل (" + doneN + "/" + names.length + ")";
            btns[j].setAttribute("data-all", doneN === names.length ? "1" : "0");
        }
    }

    function applySearch() {
        var q = key(els.search.value);
        var groups = els.list.querySelectorAll(".ai-group");
        var shownAny = false;
        for (var i = 0; i < groups.length; i++) {
            var labs = groups[i].querySelectorAll(".ai-check");
            var vis = 0;
            for (var j = 0; j < labs.length; j++) {
                var show = !q || labs[j].getAttribute("data-key").indexOf(q) !== -1;
                labs[j].hidden = !show;
                if (show) { vis++; }
            }
            groups[i].hidden = vis === 0;
            if (vis) { shownAny = true; }
        }
        var emptyMsg = els.list.querySelector(".ai-empty");
        if (!shownAny && !emptyMsg) {
            els.list.appendChild(el("p", "ai-empty", "لا توجد مادة بهذا الاسم. جرّب كلمة أخرى."));
        } else if (shownAny && emptyMsg) {
            emptyMsg.parentNode.removeChild(emptyMsg);
        }
    }

    function afterChange(beforeCount) {
        var afterCount = Object.keys(ST.done()).length;
        syncChecks();
        var diff = afterCount - beforeCount;
        if (diff > 1) {
            setInfo("info", "أُضيفت " + PK.cnt(diff) + " إلى المنجز، منها المتطلبات السابقة تلقائياً، لأنه لا تُنجَز مادة دون متطلباتها.");
        } else if (diff < -1) {
            setInfo("info", "أُلغيت " + PK.cnt(-diff) + "، منها مواد لاحقة كانت مبنية على المادة الملغاة.");
        } else {
            setInfo("info", "");
        }
        if (resultsShown) { run(true); }
    }

    function onToggle(e) {
        var t = e.target;
        if (!t || t.type !== "checkbox") { return; }
        var before = Object.keys(ST.done()).length;
        ST.setDone(t.getAttribute("data-name"), t.checked);
        afterChange(before);
    }

    function onGroupBtn(e) {
        var btn = e.target.closest ? e.target.closest("[data-group-btn]") : null;
        if (!btn) { return; }
        var g = parseInt(btn.getAttribute("data-group-btn"), 10);
        var all = btn.getAttribute("data-all") === "1";
        var before = Object.keys(ST.done()).length;
        groupCourses(g).forEach(function (n) { ST.setDone(n, !all); });
        afterChange(before);
    }

    /* =====================================================
       قراءة المدخلات
    ===================================================== */

    function readInputs() {
        var mn = parseInt(els.min.value, 10);
        var mx = parseInt(els.max.value, 10);
        var ex = els.extra.value === "" ? 0 : parseInt(els.extra.value, 10);
        if (isNaN(mn) || isNaN(mx) || mn < 1 || mx < 1 || mn > 30 || mx > 30) {
            return { error: ["بيانات الساعات غير صحيحة", "أدخل الحدّين الأدنى والأعلى للساعات بأرقام بين 1 و30."] };
        }
        if (mn > mx) {
            return { error: ["الحدّان متعارضان", "الحد الأدنى للساعات (" + mn + ") أكبر من الحد الأعلى (" + mx + ")، صحّح القيمتين."] };
        }
        if (isNaN(ex) || ex < 0 || ex > 180) {
            return { error: ["الساعات الإضافية غير صحيحة", "الساعات الإضافية المنجزة يجب أن تكون بين 0 و180."] };
        }
        return { min: mn, max: mx, extra: ex, term: parseInt(els.term.value, 10) || 1 };
    }

    function save(inp) {
        ST.setHours(inp.min, inp.max);
        ST.setExtra(inp.extra);
        ST.setCurrentTerm(inp.term);
    }

    /* =====================================================
       بناء البطاقات
    ===================================================== */

    function badge(text, cls) { return el("span", "ai-badge" + (cls ? " " + cls : ""), text); }

    function loadBadge(load) {
        if (load === "heavy") { return badge("ثقيلة", "heavy"); }
        if (load === "light") { return badge("خفيفة", "light"); }
        return null;
    }

    function pills(names, limit) {
        var box = el("div", "ai-pills");
        names.slice(0, limit).forEach(function (n) { box.appendChild(el("span", "ai-pill", n)); });
        if (names.length > limit) {
            box.appendChild(el("span", "ai-pill more", "+ " + (names.length - limit) + " أخرى"));
        }
        return box;
    }

    /* سلسلة المواد بأسهم: الأولى هي المادة نفسها ثم ما يليها */
    function pathEl(names) {
        var box = el("div", "ai-path");
        names.forEach(function (n, i) {
            if (i > 0) { box.appendChild(el("span", "ai-path-arrow", "←")); }
            box.appendChild(el("span", "ai-path-step" + (i === 0 ? " first" : "") + (n === "…" ? " gap" : ""), n));
        });
        return box;
    }

    function rowsList(items) {
        var ul = el("ul", "ai-rows");
        items.forEach(function (it) {
            var li = el("li", "ai-row tone-" + (it.tone || "info"));
            li.appendChild(el("span", "ai-row-label", it.label));
            var body = el("div", "ai-row-body");
            if (it.text) { body.appendChild(el("p", null, it.text)); }
            if (it.lines && it.lines.length) {
                it.lines.forEach(function (ln) { body.appendChild(el("p", null, ln)); });
            }
            if (it.path && it.path.length) { body.appendChild(pathEl(it.path)); }
            if (it.names && it.names.length) { body.appendChild(pills(it.names, NAMES_SHOWN)); }
            if (it.pills && it.pills.length) {
                var box = el("div", "ai-pills");
                it.pills.forEach(function (p) { box.appendChild(el("span", "ai-pill " + (p.cls || ""), p.text)); });
                body.appendChild(box);
            }
            li.appendChild(body);
            ul.appendChild(li);
        });
        return ul;
    }

    /* خلاصة "لماذا هذه المادة؟" تظهر أعلى البطاقة */
    function verdictBox(v) {
        var box = el("div", "ai-verdict tone-" + (v.tone || "info"));
        box.appendChild(el("strong", "ai-verdict-label", v.label));
        box.appendChild(el("p", null, v.text));
        return box;
    }

    /* o: {rank, name, term, meta, hours, items, badges, locked, pick, note} */
    function courseCard(o) {
        var card = el("article", "ai-course" + (o.locked ? " locked" : "") + (o.pick ? " is-pick" : ""));

        var head = el("div", "ai-course-head");
        head.appendChild(el("div", "ai-rank", o.rank));
        var title = el("div", "ai-title");
        title.appendChild(el("h3", null, o.name));
        if (o.meta) { title.appendChild(el("div", "ai-meta", o.meta)); }
        head.appendChild(title);
        head.appendChild(el("span", "ai-hours", o.hours));
        card.appendChild(head);

        var rows = o.items || [];
        if (rows.length && rows[0].kind === "verdict") {
            card.appendChild(verdictBox(rows[0]));
            rows = rows.slice(1);
        }
        if (rows.length) { card.appendChild(rowsList(rows)); }

        var badges = el("div", "ai-badges");
        (o.badges || []).forEach(function (b) { if (b) { badges.appendChild(b); } });
        if (badges.childNodes.length) { card.appendChild(badges); }

        if (o.note) { card.appendChild(el("div", "ai-whynot", o.note)); }
        return card;
    }

    function metaFor(c, extra) {
        var parts = [];
        if (c.term) { parts.push("الفصل " + c.term + (c.year ? " · " + c.year : "")); }
        else { parts.push("اختيارية / خارج الجدول"); }
        if (extra) { parts.push(extra); }
        return parts.join(" · ");
    }

    function statBox(label, value, sub) {
        var b = el("div", "tool-res", label);
        b.appendChild(el("b", null, String(value)));
        if (sub) { b.appendChild(el("small", null, sub)); }
        return b;
    }

    /* =====================================================
       العرض
    ===================================================== */

    function renderSummary(ranked, locked, sel, res, inp) {
        clear(els.summary);
        var crit = ranked.filter(function (e) { return e.critical; }).length;

        els.summary.appendChild(statBox("ساعات المواد", sel.total, "حدّك " + inp.min + "–" + inp.max));
        els.summary.appendChild(statBox("عدد المواد المقترحة", sel.picks.length));
        els.summary.appendChild(statBox("ساعاتك المنجزة", res.totalHours,
            inp.extra ? "منها " + inp.extra + " إضافية" : "من مواد الخطة"));
        if (crit) { els.summary.appendChild(statBox("مواد لا يصح تأجيلها", crit, "تأجيلها يؤخّر تخرجك")); }
    }

    function renderPicks(ranked, locked, sel) {
        clear(els.balance);
        clear(els.advice);
        clear(els.picks);
        els.footnote.textContent = "";

        if (!sel.picks.length) {
            var allDone = !ranked.length && !locked.length;
            els.picks.appendChild(allDone
                ? alertBox("success", "ما شاء الله، أنهيت كل مواد الخطة", "لا توجد مواد متبقية لاقتراحها.")
                : alertBox("warn", "لا توجد مواد متاحة لك الآن",
                    ranked.length ? "تعذّر اقتراح مواد ضمن حدّي الساعات، عدّلهما وحاول مجدداً."
                                  : "كل المواد المتبقية تنتظر متطلبات سابقة. راجع قسم «مواد غير متاحة لك الآن» أدناه، وتأكد أنك حدّدت كل ما أنهيته."));
            return;
        }

        [ "المجموع: " + hoursText(sel.total),
          "عدد المواد: " + sel.picks.length ].forEach(function (t) { els.balance.appendChild(el("span", null, t)); });

        sel.advice.forEach(function (a) { els.advice.appendChild(alertBox(a.tone, a.title, a.text)); });

        sel.picks.forEach(function (p, i) {
            var b = PK.brief(p.entry);
            els.picks.appendChild(courseCard({
                rank: String(i + 1),
                name: p.course.name,
                meta: metaFor(p.course),
                hours: hoursText(p.hours, !p.assumed),
                items: [{ kind: "verdict", tone: b.tone, label: b.label, text: b.text }],
                pick: true
            }));
        });

        els.footnote.textContent = sel.footnote;
    }

    /* ---------- الاختيار اليدوي: الطالب يبدّل المواد بنفسه ---------- */

    var swapCtx = null;

    function updateSwapStatus() {
        if (!swapCtx) { return; }
        clear(els.swapStatus);
        var boxes = els.all.querySelectorAll("input[type=checkbox]");
        var total = 0, count = 0, chosenNames = [];
        var skippedCrit = [], skippedTight = [];
        for (var i = 0; i < boxes.length; i++) {
            var name = boxes[i].getAttribute("data-name");
            var e = swapCtx.byName[name];
            if (boxes[i].checked) { total += e.h; count++; chosenNames.push(name); }
            else if (e.entry.critical) { skippedCrit.push(name); }
            else if (e.entry.depth > 1 && e.entry.slack === 1) { skippedTight.push(name); }
        }
        var min = swapCtx.min, max = swapCtx.max;

        function names(arr) { return arr.map(function (n) { return "«" + n + "»"; }).join("، "); }

        if (!count) {
            els.swapStatus.appendChild(alertBox("info", "لم تختر أي مادة بعد", "حدّد المواد التي تريد تسجيلها لنخبرك بمدى مناسبتها."));
            return;
        }

        /* 1) هل مجموع الساعات مناسب؟ */
        var head = "اخترت " + PK.cnt(count) + " ومجموعها " + hoursText(total) + " (حدّك بين " + min + " و" + max + ").";
        if (total > max) {
            els.swapStatus.appendChild(alertBox("warn", "المجموع أعلى من حدّك الأقصى", head + " ألغِ مواد بمجموع " + hoursWord(total - max) + " على الأقل."));
        } else if (total < min) {
            els.swapStatus.appendChild(alertBox("warn", "المجموع أقل من حدّك الأدنى", head + " ينقصك " + hoursWord(min - total) + " على الأقل."));
        } else {
            els.swapStatus.appendChild(alertBox("success", "مجموع ساعاتك مناسب", head));
        }

        /* 2) هل تأجيل المواد غير المختارة يؤثر على التخرج؟ (تظهر الإجابة دائماً) */
        if (skippedCrit.length) {
            els.swapStatus.appendChild(alertBox("danger", "تأجيل بعض المواد سيؤخّر تخرجك",
                "لا يصح تأجيل: " + names(skippedCrit) + ". أضفها إلى اختيارك، أو استبدل بها مادة أخرى."));
        } else if (skippedTight.length) {
            els.swapStatus.appendChild(alertBox("warn", "يمكن تأجيل بعض المواد فصلاً واحداً فقط",
                names(skippedTight) + ": إن أجّلتها فصلاً آخر بعد هذا الفصل فسيتأخر تخرجك."));
        } else {
            els.swapStatus.appendChild(alertBox("success", "تأجيل المواد التي لم تخترها لا يؤثر على تخرجك",
                "لا توجد بين المواد غير المختارة مادة يؤخّر تأجيلها موعد تخرجك."));
        }

        /* 3) هل ستجد مواد كافية في الفصل القادم؟ */
        var fc = PK.forecast(swapCtx.ranked, chosenNames);
        if (fc.hours < min) {
            els.swapStatus.appendChild(alertBox("warn", "قد لا تجد مواد كافية في الفصل القادم",
                "إن نجحت في هذا الاختيار فستتاح لك مواد بمجموع " + hoursWord(fc.hours) + " فقط، وحدّك الأدنى " + min +
                ". الأفضل أن يتضمن اختيارك مواد تُعدّ شرطاً لمواد لاحقة."));
        } else {
            els.swapStatus.appendChild(alertBox("info", "الفصل القادم",
                "إن نجحت في هذا الاختيار فستتاح لك مواد بمجموع " + hoursWord(fc.hours) + "، وهو يكفي لفصل كامل."));
        }
    }

    function hoursWord(h) { return PK.hoursWord(h); }

    function renderAll(ranked, sel, res, inp) {
        clear(els.all);
        clear(els.swapStatus);
        swapCtx = null;
        if (!ranked.length) {
            els.all.appendChild(el("p", "ai-empty", "لا توجد مواد متاحة لك حالياً."));
            return;
        }
        var chosen = {};
        sel.picks.forEach(function (p) { chosen[p.course.name] = true; });
        swapCtx = { byName: {}, chosen: chosen, min: inp.min, max: inp.max, ranked: ranked };

        ranked.forEach(function (e) {
            var h = PK.hoursOf(e.course);
            swapCtx.byName[e.course.name] = { entry: e, h: h };
            var info = PK.postponeInfo(e);

            var lab = el("label", "ai-swap-row");
            var cb = document.createElement("input");
            cb.type = "checkbox";
            cb.checked = !!chosen[e.course.name];
            cb.setAttribute("data-name", e.course.name);
            lab.appendChild(cb);

            var mid = el("span", "ai-swap-main");
            mid.appendChild(el("b", null, e.course.name));
            mid.appendChild(el("em", "ai-swap-tag " + info.tone, info.text));
            lab.appendChild(mid);

            lab.appendChild(el("small", null, hoursText(h, e.course.hoursKnown)));
            els.all.appendChild(lab);
        });
        updateSwapStatus();
    }

    function resetSwap() {
        if (!swapCtx) { return; }
        var boxes = els.all.querySelectorAll("input[type=checkbox]");
        for (var i = 0; i < boxes.length; i++) {
            boxes[i].checked = !!swapCtx.chosen[boxes[i].getAttribute("data-name")];
        }
        updateSwapStatus();
    }

    function renderLocked(locked, availableSet) {
        clear(els.locked);
        els.lockedCount.textContent = locked.length ? "(" + locked.length + ")" : "";
        if (!locked.length) {
            els.locked.appendChild(alertBox("success", "لا توجد مواد مقفلة", "كل المواد المتبقية متاحة لك."));
            return;
        }

        var list = locked.slice().sort(function (a, b) {
            var ta = a.course.term || 99, tb = b.course.term || 99;
            if (ta !== tb) { return ta - tb; }
            return a.missing.length - b.missing.length;
        });

        list.forEach(function (x) {
            var items = [];
            if (x.missing.length) {
                items.push({
                    kind: "missing", tone: "warn", label: "ينقصك إنجاز",
                    pills: x.missing.map(function (n) {
                        return availableSet[n]
                            ? { text: n + " · متاحة لك الآن", cls: "ok" }
                            : { text: n + " · غير متاحة بعد", cls: "no" };
                    })
                });
            }
            if (x.hourShort) {
                items.push({
                    kind: "hours", tone: "warn", label: "ساعات ناقصة",
                    text: "تحتاج " + PK.hoursWord(x.hourShort) + " منجزة إضافية (المادة تشترط أكثر من " + x.course.hourReq + " ساعة)."
                });
            }
            els.locked.appendChild(courseCard({
                rank: "—",
                name: x.course.name,
                meta: metaFor(x.course),
                hours: hoursText(PK.hoursOf(x.course), x.course.hoursKnown),
                items: items,
                locked: true
            }));
        });
    }

    /* =====================================================
       التشغيل
    ===================================================== */

    function run(silent) {
        clearMsg();
        var inp = readInputs();
        if (inp.error) {
            showMsg("error", inp.error[0], inp.error[1]);
            return;
        }
        save(inp);

        var res = ST.compute();
        var r = RK.run();
        var sel = PK.pick(r.ranked, inp.min, inp.max, inp.term, res.totalHours, r.meta);
        var availableSet = {};
        r.ranked.forEach(function (e) { availableSet[e.course.name] = true; });

        renderSummary(r.ranked, r.locked, sel, res, inp);
        renderPicks(r.ranked, r.locked, sel);
        renderAll(r.ranked, sel, res, inp);
        renderLocked(r.locked, availableSet);

        els.summaryCard.hidden = false;
        els.pickCard.hidden = false;
        els.allCard.hidden = false;
        els.lockedCard.hidden = false;
        resultsShown = true;

        if (!silent) {
            try { els.summaryCard.scrollIntoView({ behavior: "smooth", block: "start" }); }
            catch (e) { els.summaryCard.scrollIntoView(); }
        }
    }

    function hideResults() {
        [els.summaryCard, els.pickCard, els.allCard, els.lockedCard].forEach(function (c) { c.hidden = true; });
        resultsShown = false;
    }

    /* =====================================================
       الربط
    ===================================================== */

    /* ترتيب التخصصات كما في الصفحة الرئيسية */
    var MAJOR_ORDER = [
        "هندسة الذكاء الاصطناعي و علوم البيانات",
        "هندسة البرمجيات ونظم المعلومات الذكية",
        "هندسة نظم أمن المعلومات الذكية",
        "هندسة الروبوت والنظم الذكية",
        "هندسة الإتصالات الذكية",
        "الهندسة الطبية الذكية والمعلوماتية الحيوية"
    ];

    function majorLabel(name) { return String(name).replace(/\sو\s/g, " و"); }

    function fillMajors() {
        clear(els.major);
        var ph = el("option", null, "اختر تخصصك...");
        ph.value = "";
        els.major.appendChild(ph);

        var all = ST.majors();
        var ordered = MAJOR_ORDER.filter(function (n) { return all.indexOf(n) !== -1; });
        all.forEach(function (n) { if (ordered.indexOf(n) === -1) { ordered.push(n); } });
        ordered.forEach(function (n) {
            var o = el("option", null, majorLabel(n));
            o.value = n;
            els.major.appendChild(o);
        });
    }

        /* قائمة اختيار التخصص: واجهة أنيقة فوق <select> (يبقى الـselect مخفياً ويحمل القيمة).
       تستعمل أنماط .cs من tools.css نفسها المستعملة في صفحة المقارنة. */
    var majorDD = null;
    var PLACEHOLDER = "اختر تخصصك...";

    function enhanceMajor() {
        var sel = els.major;
        if (!sel || majorDD) { return; }

        var wrap = el("div", "cs ai-dd");
        var btn = el("button", "cs-btn");
        btn.type = "button";
        btn.id = "ai-major-btn";
        btn.setAttribute("aria-haspopup", "listbox");
        btn.setAttribute("aria-expanded", "false");
        btn.setAttribute("aria-controls", "ai-major-list");
        btn.setAttribute("aria-describedby", "ai-major-help");

        var lab = document.querySelector('label[for="ai-major"]');
        if (lab) {
            if (!lab.id) { lab.id = "ai-major-label"; }
            lab.setAttribute("for", "ai-major-btn");
            btn.setAttribute("aria-labelledby", lab.id + " ai-major-btn");
        }

        var txt = el("span", "cs-txt");
        var arrow = el("span", "cs-arrow");
        arrow.setAttribute("aria-hidden", "true");
        btn.appendChild(txt);
        btn.appendChild(arrow);

        var list = el("ul", "cs-list");
        list.id = "ai-major-list";
        list.setAttribute("role", "listbox");
        list.tabIndex = -1;

        var items = [];
        Array.prototype.forEach.call(sel.options, function (o) {
            if (!o.value) { return; }
            var li = el("li", "cs-opt", o.textContent);
            li.setAttribute("role", "option");
            li.dataset.v = o.value;
            list.appendChild(li);
            items.push(li);
        });

        var act = -1;

        function sync() {
            var label = PLACEHOLDER;
            items.forEach(function (li) {
                var on = !!sel.value && li.dataset.v === sel.value;
                li.classList.toggle("on", on);
                li.setAttribute("aria-selected", on ? "true" : "false");
                if (on) { label = li.textContent; }
            });
            txt.textContent = label;
            wrap.classList.toggle("ph", !sel.value);
        }
        function mark(i) {
            act = i;
            items.forEach(function (li, k) { li.classList.toggle("act", k === i); });
            if (items[i]) {
                btn.setAttribute("aria-activedescendant", items[i].id || "");
                items[i].scrollIntoView({ block: "nearest" });
            }
        }
        function isOpen() { return wrap.classList.contains("open"); }
        function open() {
            wrap.classList.add("open");
            btn.setAttribute("aria-expanded", "true");
            var cur = -1;
            items.forEach(function (li, k) { if (li.dataset.v === sel.value) { cur = k; } });
            mark(cur);
        }
        function close() {
            wrap.classList.remove("open");
            btn.setAttribute("aria-expanded", "false");
            act = -1;
        }
        function pick(i) {
            if (!items[i]) { return; }
            var changed = sel.value !== items[i].dataset.v;
            sel.value = items[i].dataset.v;
            sync();
            close();
            btn.focus({ preventScroll: true });
            if (changed) { sel.dispatchEvent(new Event("change")); }
        }

        items.forEach(function (li, k) { li.id = "ai-major-opt-" + k; });

        btn.addEventListener("click", function () { if (isOpen()) { close(); } else { open(); } });
        list.addEventListener("click", function (e) {
            var li = e.target.closest ? e.target.closest(".cs-opt") : null;
            if (li) { pick(items.indexOf(li)); }
        });
        list.addEventListener("mousedown", function (e) { e.preventDefault(); });
        btn.addEventListener("keydown", function (e) {
            var k = e.key;
            if (k === "ArrowDown" || k === "ArrowUp") {
                e.preventDefault();
                if (!isOpen()) { open(); return; }
                var step = k === "ArrowDown" ? 1 : -1;
                mark(act < 0 ? (step > 0 ? 0 : items.length - 1) : (act + step + items.length) % items.length);
            } else if (k === "Home" || k === "End") {
                if (isOpen()) { e.preventDefault(); mark(k === "Home" ? 0 : items.length - 1); }
            } else if (k === "Enter" || k === " ") {
                if (isOpen()) { e.preventDefault(); if (act >= 0) { pick(act); } else { close(); } }
            } else if (k === "Escape") {
                if (isOpen()) { e.preventDefault(); close(); }
            } else if (k === "Tab") {
                close();
            }
        });
        document.addEventListener("click", function (e) { if (!wrap.contains(e.target)) { close(); } });

        wrap.appendChild(btn);
        wrap.appendChild(list);
        sel.classList.add("cs-native");
        sel.tabIndex = -1;
        sel.setAttribute("aria-hidden", "true");
        sel.parentNode.insertBefore(wrap, sel.nextSibling);

        majorDD = { sync: sync };
        sync();
    }

    function syncMajorDD() { if (majorDD) { majorDD.sync(); } }

    function setControlsEnabled(on) {
        [els.run, els.reset, els.search, els.term, els.min, els.max, els.extra].forEach(function (c) {
            c.disabled = !on;
        });
    }

    /* رسالة ثابتة دون تمرير الصفحة (للتحميل الأولي وتغيير التخصص) */
    function putMsg(tone, title, text, link) {
        clear(els.err);
        if (tone) { els.err.appendChild(alertBox(tone, title, text, link)); }
    }

    /* يحمّل كل ما يخص التخصص الحالي: الفصول والساعات والمواد المنجزة */
    function loadMajor() {
        putMsg(null);
        hideResults();
        setInfo("info", "");
        els.search.value = "";
        clear(els.list);

        var major = ST.major();
        var known = !!major && ST.majors().indexOf(major) !== -1;
        els.major.value = known ? major : "";
        syncMajorDD();
        model = known ? ST.model() : null;

        if (!known || !model) {
            setControlsEnabled(false);
            clear(els.term);
            els.count.textContent = "";
            els.list.appendChild(el("p", "ai-empty", !major
                ? "اختر تخصصك من القائمة أعلاه لتظهر مواد الخطة هنا."
                : "لا تتوفر بيانات لهذا التخصص."));
            if (!major) {
                putMsg("info", "اختر تخصصك للبدء", "حدّد تخصصك من قائمة «التخصص» أدناه، ثم حدّد المواد التي أنهيتها.");
            } else {
                putMsg("error", "لا تتوفر بيانات متطلبات لهذا التخصص حالياً",
                    "لا يمكن اقتراح مواد بدون خطة المتطلبات. اختر تخصصاً آخر من القائمة.");
            }
            return;
        }

        setControlsEnabled(true);
        fillTerms();
        els.min.value = ST.minHours();
        els.max.value = ST.maxHours();
        els.extra.value = ST.extra();
        buildDoneList();
    }

    function init() {
        ["ai-major", "ai-term", "ai-min", "ai-max", "ai-extra", "ai-search", "ai-done-count",
         "ai-done-list", "ai-run", "ai-reset", "ai-err", "ai-summary-card", "ai-summary",
         "ai-pick-card", "ai-balance", "ai-advice", "ai-picks", "ai-footnote", "ai-all-card",
         "ai-all", "ai-locked-card", "ai-locked", "ai-locked-count", "ai-swap-status", "ai-swap-reset"].forEach(function (id) {
            els[id.replace(/^ai-/, "").replace(/-(\w)/g, function (m, c) { return c.toUpperCase(); })] = $(id);
        });

        els.list = els.doneList;
        els.count = els.doneCount;

        /* مكان رسالة تغيّر المنجز (فوق القائمة) */
        els.info = el("div", "ai-info-line");
        els.info.setAttribute("aria-live", "polite");
        els.list.parentNode.insertBefore(els.info, els.list);

        fillMajors();
        enhanceMajor();

        /* الأحداث تُربط مرة واحدة، وتعمل على التخصص الحالي دائماً */
        els.major.addEventListener("change", function () {
            if (!els.major.value) { return; }
            if (!ST.setMajor(els.major.value)) { return; }
            loadMajor();
            var n = Object.keys(ST.done()).length;
            if (n > 0) {
                setInfo("info", "تم تحميل خطة هذا التخصص، واستُعيدت " + doneText(n) + " كنت قد حدّدتها له سابقاً.");
            }
        });

        els.list.addEventListener("change", onToggle);
        els.list.addEventListener("click", onGroupBtn);
        els.search.addEventListener("input", applySearch);
        els.all.addEventListener("change", updateSwapStatus);
        els.swapReset.addEventListener("click", resetSwap);
        els.run.addEventListener("click", function () { run(false); });

        els.reset.addEventListener("click", function () {
            confirmDialog("مسح المواد المنجزة؟",
                "سيُحذف كل ما حدّدته كمنجز لهذا التخصص، وسيتأثر أيضاً عرض صفحة الخطة. لا يمكن التراجع عن ذلك.",
                "نعم، امسح", function () {
                    ST.clearDone();
                    syncChecks();
                    setInfo("info", "");
                    hideResults();
                });
        });

        /* تغيير الإعدادات يحدّث النتائج إن كانت معروضة */
        [els.term, els.min, els.max, els.extra].forEach(function (c) {
            c.addEventListener("change", function () { if (resultsShown) { run(true); } });
        });

        loadMajor();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
