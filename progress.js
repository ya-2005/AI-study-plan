/* =========================================================
   progress.js  —  ميزات إضافية لصفحة الخطة الدراسية
   1) متتبّع التقدّم ("مواد أنهيتها")
   2) تظليل مسار المادة (ما قبلها / ما بعدها)
   3) البحث عن مادة

   الملف مستقل: لا يعدّل script.js ولا style1.css، ويُحمَّل بعد
   script.js في plan.html. إذا حصل أي خطأ داخله، تبقى الخريطة
   الأصلية تعمل كما هي.
========================================================= */

(function () {
    "use strict";

    try {
        init();
    } catch (err) {
        if (window.console) {
            console.error("[progress.js] تعذّر تشغيل الميزات الإضافية:", err);
        }
    }


    function init() {

        /* نعتمد على دوال الموقع الأصلية؛ إن لم تكن موجودة لا نفعل شيئاً */
        if (
            typeof getMajorPlan !== "function" ||
            typeof getCourseHours !== "function" ||
            !document.getElementById("full-map-view")
        ) {
            return;
        }

        var major = safeGet("selectedMajor");
        var plan = major ? getMajorPlan(major) : null;

        if (!plan || !plan.next) {
            return;
        }


        /* ---------------------------------------------------------
           1) نموذج البيانات: المتطلبات (ما قبل) والتفتّحات (ما بعد)
        --------------------------------------------------------- */

        var model = buildModel(plan);

        var STORAGE_KEY = "studyplan:done:v1:" + normalizeSpaces(major);

        var done = new Set();
        var storageOk = true;

        var state = {
            sel: null            /* المادة المختارة لتظليل مسارها */
        };

        var REQUIRED_HOURS = 180;   /* الساعات المطلوبة للتخرج لكل تخصص */

        var stats = null;
        var reduceMotion =
            window.matchMedia &&
            window.matchMedia("(prefers-reduced-motion: reduce)").matches;

        loadDone();
        stats = computeStats();


        function normalizeSpaces(s) {
            return String(s || "").replace(/\s+/g, " ").trim();
        }

        function safeGet(key) {
            try {
                return localStorage.getItem(key);
            } catch (e) {
                return null;
            }
        }


        function buildModel(plan) {

            var next = plan.next || {};

            var names = new Set();
            var children = {};
            var parents = {};

            function addUnique(map, key, value) {
                if (!map[key]) {
                    map[key] = [];
                }
                if (map[key].indexOf(value) === -1) {
                    map[key].push(value);
                }
            }

            Object.keys(next).forEach(function (p) {

                names.add(p);

                (next[p] || []).forEach(function (c) {
                    names.add(c);
                    addUnique(children, p, c);
                    addUnique(parents, c, p);
                });
            });

            [].concat(
                plan.foundation || [],
                plan.independent || [],
                plan.mindMapRoots || []
            ).forEach(function (n) {
                names.add(n);
            });


            /* الخطة السنوية: ترتيب المواد + السنة والفصل لكل مادة */
            var curriculum = [];
            var place = {};

            (plan.curriculum || []).forEach(function (year) {
                (year.semesters || []).forEach(function (semester) {
                    (semester.courses || []).forEach(function (c) {

                        if (!place[c]) {
                            place[c] = {
                                year: year.year,
                                semester: semester.name
                            };
                            curriculum.push(c);
                        }

                        names.add(c);
                    });
                });
            });


            /* شرط الساعات المكتوب في ملاحظة المادة: "أكثر من N ساعة" */
            var hourReq = {};

            names.forEach(function (n) {

                var note = "";

                try {
                    note = typeof getCourseNote === "function"
                        ? getCourseNote(n)
                        : "";
                } catch (e) { /* ignore */ }

                var m = /أكثر من\s*(\d+)\s*ساعة/.exec(note || "");

                if (m) {
                    hourReq[n] = parseInt(m[1], 10);
                }
            });


            var unknownHours = curriculum.filter(function (n) {
                return getCourseHours(n) === "-";
            }).length;


            return {
                names: names,
                children: children,
                parents: parents,
                curriculum: curriculum,
                place: place,
                hourReq: hourReq,
                unknownHours: unknownHours
            };
        }


        /* كل المواد التي يمكن الوصول لها من مادة عبر الخريطة (بدون المادة نفسها) */
        var reachCache = { up: {}, down: {} };

        function reach(start, map, cache) {

            if (cache[start]) {
                return cache[start];
            }

            var seen = new Set();
            var stack = [start];

            while (stack.length) {

                var n = stack.pop();

                (map[n] || []).forEach(function (m) {

                    if (m !== start && !seen.has(m)) {
                        seen.add(m);
                        stack.push(m);
                    }
                });
            }

            cache[start] = seen;
            return seen;
        }

        function ancestorsOf(n) {
            return reach(n, model.parents, reachCache.up);
        }

        function descendantsOf(n) {
            return reach(n, model.children, reachCache.down);
        }


        function hoursOf(n) {
            var h = getCourseHours(n);
            return typeof h === "number" ? h : 0;
        }


        /* ---------------------------------------------------------
           حفظ العلامات في المتصفح (localStorage)
        --------------------------------------------------------- */

        function loadDone() {

            done = new Set();

            try {

                var raw = localStorage.getItem(STORAGE_KEY);
                var arr = raw ? JSON.parse(raw) : [];

                if (Array.isArray(arr)) {
                    arr.forEach(function (n) {
                        if (typeof n === "string") {
                            done.add(n);
                        }
                    });
                }

            } catch (e) { /* نبدأ من الصفر */ }
        }

        function saveDone() {

            try {
                localStorage.setItem(
                    STORAGE_KEY,
                    JSON.stringify(Array.from(done))
                );
                storageOk = true;
            } catch (e) {
                storageOk = false;
            }
        }


        /* ---------------------------------------------------------
           الإحصاءات وحالة كل مادة
        --------------------------------------------------------- */

        function computeStats() {

            var totalHours = 0;
            var doneHours = 0;
            var doneCourses = 0;

            model.curriculum.forEach(function (n) {

                var h = hoursOf(n);

                totalHours += h;

                if (done.has(n)) {
                    doneHours += h;
                    doneCourses += 1;
                }
            });


            /* مواد منجزة من خارج الخطة الأساسية (اختيارية مثلاً) */
            var extraCourses = 0;
            var extraHours = 0;

            done.forEach(function (n) {

                if (model.names.has(n) && !model.place[n]) {
                    extraCourses += 1;
                    extraHours += hoursOf(n);
                }
            });

            /* إجمالي الساعات المطلوبة للتخرج: 180 لكل التخصصات.
               (مجموع ساعات مواد الخطة السنوية تقريبي ويختلف من تخصص لآخر،
               لذلك لا نعتمد عليه كإجمالي). الاختياريات المنجزة تُحسب ضمن المنجز. */
            var doneForTotal = Math.min(REQUIRED_HOURS, doneHours + extraHours);

            var s = {
                totalHours: REQUIRED_HOURS,
                doneHours: doneForTotal,
                remainingHours: Math.max(0, REQUIRED_HOURS - doneForTotal),
                totalCourses: model.curriculum.length,
                doneCourses: doneCourses,
                extraCourses: extraCourses,
                extraHours: extraHours,
                allDoneHours: doneHours + extraHours,
                available: 0
            };

            stats = s;

            model.curriculum.forEach(function (n) {
                if (courseStatus(n).state === "available") {
                    s.available += 1;
                }
            });

            return s;
        }


        /* حالة المادة: منجزة / متاحة (كل متطلباتها السابقة منجزة) / مغلقة.
           شرط الساعات ("أكثر من N ساعة") لا يدخل في الحكم لأن ساعات المواد
           في الموقع تقريبية؛ نعرضه كمعلومة في تفاصيل المادة فقط. */
        function courseStatus(n) {

            if (done.has(n)) {
                return { state: "done" };
            }

            var missing = (model.parents[n] || []).filter(function (p) {
                return !done.has(p);
            });

            return {
                state: missing.length === 0 ? "available" : "locked",
                missing: missing
            };
        }


        function toggleDone(name) {

            if (done.has(name)) {
                done.delete(name);
            } else {
                done.add(name);
            }

            saveDone();
            refreshAll();
        }


        /* ---------------------------------------------------------
           بناء الواجهة (شريط البحث + لوحة التقدّم + مفتاح الألوان)
        --------------------------------------------------------- */

        function el(tag, cls, text) {

            var node = document.createElement(tag);

            if (cls) {
                node.className = cls;
            }

            if (text !== undefined) {
                node.textContent = text;
            }

            return node;
        }


        var tools = buildTools();

        var anchor = document.getElementById("full-map-view");
        anchor.parentNode.insertBefore(tools, anchor);


        function buildTools() {

            var root = el("div", "sp-tools");
            root.id = "sp-tools";

            /* ----- البحث ----- */

            var search = el("div", "sp-search");

            var box = el("div", "sp-search-box");

            box.innerHTML =
                '<svg class="sp-search-icon" viewBox="0 0 24 24" width="18" height="18" ' +
                'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" ' +
                'stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/>' +
                '<path d="m20 20-3.5-3.5"/></svg>';

            var input = el("input", "sp-search-input");
            input.id = "sp-search-input";
            input.type = "text";
            input.setAttribute("role", "combobox");
            input.setAttribute("aria-autocomplete", "list");
            input.setAttribute("aria-expanded", "false");
            input.setAttribute("aria-controls", "sp-search-list");
            input.setAttribute("aria-label", "ابحث عن مادة");
            input.setAttribute("autocomplete", "off");
            input.setAttribute("autocapitalize", "off");
            input.setAttribute("spellcheck", "false");
            input.setAttribute("enterkeyhint", "search");
            input.placeholder = "ابحث عن مادة بالاسم... مثال: تعلم الآلة";

            var clearBtn = el("button", "sp-search-clear", "×");
            clearBtn.type = "button";
            clearBtn.hidden = true;
            clearBtn.setAttribute("aria-label", "مسح البحث");

            var list = el("ul", "sp-search-list");
            list.id = "sp-search-list";
            list.setAttribute("role", "listbox");
            list.hidden = true;

            box.appendChild(input);
            box.appendChild(clearBtn);
            search.appendChild(box);
            search.appendChild(list);
            root.appendChild(search);


            /* ----- لوحة التقدّم ----- */

            var panel = el("section", "sp-progress");
            panel.setAttribute("aria-label", "تقدّمك الدراسي");

            var head = el("div", "sp-progress-head");

            var titleWrap = el("div", "sp-progress-titlewrap");
            titleWrap.appendChild(el("h3", "sp-progress-title", "تقدّمك الدراسي"));
            titleWrap.appendChild(
                el(
                    "p",
                    "sp-progress-sub",
                    "علّم المواد التي نجحت فيها بالضغط على الدائرة في زاوية بطاقة المادة."
                )
            );

            var resetBtn = el("button", "sp-btn sp-reset", "مسح كل العلامات");
            resetBtn.type = "button";

            head.appendChild(titleWrap);
            head.appendChild(resetBtn);
            panel.appendChild(head);


            var bar = el("div", "sp-bar");
            bar.setAttribute("role", "progressbar");
            bar.setAttribute("aria-valuemin", "0");
            bar.setAttribute("aria-valuemax", "100");
            bar.setAttribute("aria-label", "نسبة الساعات المنجزة");

            var fill = el("div", "sp-bar-fill");
            bar.appendChild(fill);

            var pct = el("span", "sp-bar-pct", "0%");
            bar.appendChild(pct);

            panel.appendChild(bar);


            var grid = el("div", "sp-stats");

            function tile(key, label, clickable) {

                var t = el(clickable ? "button" : "div", "sp-stat" + (clickable ? " sp-stat-btn" : ""));

                if (clickable) {
                    t.type = "button";
                    t.setAttribute("aria-expanded", "false");
                    t.setAttribute("aria-controls", "sp-done-list");
                    t.addEventListener("click", toggleDoneList);
                }

                var n = el("span", "sp-stat-num sp-num-" + key, "0");
                var l = el("span", "sp-stat-label", label);

                t.appendChild(n);
                t.appendChild(l);

                if (clickable) {
                    t.appendChild(el("span", "sp-stat-hint", "عرض القائمة ▾"));
                }

                grid.appendChild(t);
            }

            tile("done", "ساعة منجزة", true);
            tile("courses", "مواد منجزة", true);
            tile("available", "مادة متاحة لك الآن", false);

            panel.appendChild(grid);

            var listBox = el("div", "sp-done-list");
            listBox.id = "sp-done-list";
            listBox.hidden = true;
            panel.appendChild(listBox);

            var note = el("p", "sp-note");
            note.hidden = true;
            panel.appendChild(note);

            root.appendChild(panel);


            /* ----- مفتاح الألوان ----- */

            var legend = el("div", "sp-legend");
            legend.setAttribute("aria-label", "مفتاح الألوان");

            [
                ["sp-sw-done", "منجزة"],
                ["sp-sw-available", "متاحة لك الآن"],
                ["sp-sw-pre", "مطلوبة قبل المادة المختارة"],
                ["sp-sw-next", "تفتحها المادة المختارة"]
            ].forEach(function (item) {

                var chip = el("span", "sp-legend-item");
                chip.appendChild(el("i", "sp-sw " + item[0]));
                chip.appendChild(document.createTextNode(item[1]));
                legend.appendChild(chip);
            });

            root.appendChild(legend);


            /* ----- شريط المسار المظلّل ----- */

            var pathBar = el("div", "sp-pathbar");
            pathBar.hidden = true;
            pathBar.setAttribute("aria-live", "polite");

            var pathText = el("span", "sp-pathbar-text");
            var pathClear = el("button", "sp-btn sp-pathbar-clear", "إلغاء التظليل");
            pathClear.type = "button";

            pathBar.appendChild(pathText);
            pathBar.appendChild(pathClear);
            root.appendChild(pathBar);


            /* ----- أحداث ----- */

            var resetTimer = null;

            resetBtn.addEventListener("click", function () {

                if (!done.size) {
                    return;
                }

                if (resetBtn.classList.contains("confirm")) {

                    clearTimeout(resetTimer);
                    resetBtn.classList.remove("confirm");
                    resetBtn.textContent = "مسح كل العلامات";

                    done = new Set();
                    saveDone();
                    refreshAll();
                    return;
                }

                resetBtn.classList.add("confirm");
                resetBtn.textContent = "تأكيد المسح؟ اضغط مرة أخرى";

                resetTimer = setTimeout(function () {
                    resetBtn.classList.remove("confirm");
                    resetBtn.textContent = "مسح كل العلامات";
                }, 4000);
            });

            pathClear.addEventListener("click", clearPath);

            wireSearch(input, clearBtn, list);

            return root;
        }


        /* ---------------------------------------------------------
           تحديث لوحة التقدّم
        --------------------------------------------------------- */

        var listOpen = false;

        function toggleDoneList() {

            listOpen = !listOpen;
            renderDoneList();
        }


        /* قائمة بما أنجزه الطالب: مجمّعة حسب السنة والفصل، مع الساعات */
        function renderDoneList() {

            var box = tools.querySelector(".sp-done-list");

            if (!box) {
                return;
            }

            box.hidden = !listOpen;

            Array.prototype.forEach.call(
                tools.querySelectorAll(".sp-stat-btn"),
                function (btn) {

                    btn.setAttribute("aria-expanded", listOpen ? "true" : "false");

                    var hint = btn.querySelector(".sp-stat-hint");

                    if (hint) {
                        hint.textContent = listOpen ? "إخفاء القائمة ▴" : "عرض القائمة ▾";
                    }
                }
            );

            if (!listOpen) {
                return;
            }

            box.innerHTML = "";

            var groups = [];

            (plan.curriculum || []).forEach(function (year) {
                (year.semesters || []).forEach(function (semester) {

                    var items = (semester.courses || []).filter(function (c) {
                        return done.has(c);
                    });

                    if (items.length) {
                        groups.push({
                            title: year.year + " · " + semester.name,
                            items: items
                        });
                    }
                });
            });

            var extras = [];

            done.forEach(function (n) {
                if (model.names.has(n) && !model.place[n]) {
                    extras.push(n);
                }
            });

            if (extras.length) {
                groups.push({
                    title: "مواد اختيارية / خارج الخطة الأساسية",
                    items: extras
                });
            }

            if (!groups.length) {
                box.appendChild(
                    el("p", "sp-done-empty", "لم تعلّم أي مادة كمنجزة بعد.")
                );
                return;
            }

            var totalHours = 0;
            var totalCourses = 0;

            groups.forEach(function (g) {

                var sum = 0;

                g.items.forEach(function (n) {
                    sum += hoursOf(n);
                });

                totalHours += sum;
                totalCourses += g.items.length;

                var section = el("div", "sp-done-group");

                var head = el("div", "sp-done-group-head");
                head.appendChild(el("span", "sp-done-group-title", g.title));
                head.appendChild(
                    el("span", "sp-done-group-sum", g.items.length + " مواد · " + sum + " ساعة")
                );
                section.appendChild(head);

                var ul = el("ul", "sp-done-items");

                g.items.forEach(function (n) {

                    var li = el("li", "sp-done-item");

                    var go = el("button", "sp-done-name", n);
                    go.type = "button";
                    go.title = "الانتقال إلى المادة";
                    go.addEventListener("click", function () {
                        goTo(n);
                    });

                    var h = getCourseHours(n);
                    var hours = el("span", "sp-done-hours", h === "-" ? "—" : h + " ساعات");

                    var rm = el("button", "sp-done-remove", "×");
                    rm.type = "button";
                    rm.title = "إلغاء علامة الإنجاز";
                    rm.setAttribute("aria-label", "إلغاء علامة الإنجاز: " + n);
                    rm.addEventListener("click", function () {
                        toggleDone(n);
                    });

                    li.appendChild(go);
                    li.appendChild(hours);
                    li.appendChild(rm);
                    ul.appendChild(li);
                });

                section.appendChild(ul);
                box.appendChild(section);
            });

            box.appendChild(
                el(
                    "p",
                    "sp-done-total",
                    "المجموع: " + totalCourses + " مادة · " + totalHours + " ساعة"
                )
            );
        }


        function updatePanel() {

            var s = stats;

            function set(key, value) {
                var n = tools.querySelector(".sp-num-" + key);
                if (n) {
                    n.textContent = value;
                }
            }

            set("done", s.doneHours);
            set("remaining", s.remainingHours);
            set("courses", s.doneCourses + " / " + s.totalCourses);
            set("available", s.available);

            /* الشريط يعتمد على عدد المواد المنجزة من مواد الخطة (وليس الساعات) */
            var pct = s.totalCourses
                ? Math.round((s.doneCourses / s.totalCourses) * 100)
                : 0;

            var bar = tools.querySelector(".sp-bar");
            var fill = tools.querySelector(".sp-bar-fill");
            var pctEl = tools.querySelector(".sp-bar-pct");

            if (bar) {
                bar.setAttribute("aria-valuenow", String(pct));
                bar.setAttribute(
                    "aria-valuetext",
                    pct + "% — " + s.doneCourses + " من " + s.totalCourses + " مادة"
                );
            }

            if (fill) {
                fill.style.width = pct + "%";
            }

            if (pctEl) {
                pctEl.textContent =
                    pct + "%  (" + s.doneCourses + " من " + s.totalCourses + " مادة)";
            }


            var parts = ["المطلوب للتخرج: " + REQUIRED_HOURS + " ساعة معتمدة (حسب الخطة الرسمية للكلية)."];

            if (model.unknownHours > 0) {
                parts.push(
                    model.unknownHours +
                    " مواد ساعاتها غير محددة بعد في الموقع، لذلك لا تدخل في حساب الساعات."
                );
            }

            if (s.extraCourses > 0) {
                parts.push(
                    "مواد منجزة من خارج الخطة الأساسية (اختيارية): " +
                    s.extraCourses +
                    (s.extraHours ? " — " + s.extraHours + " ساعة" : "") +
                    "، وتدخل في حساب الساعات أعلاه."
                );
            }

            if (!storageOk) {
                parts.push(
                    "تعذّر حفظ علاماتك في هذا المتصفح (ربما بسبب وضع التصفح الخاص)، وستضيع عند إغلاق الصفحة."
                );
            } else {
                parts.push("تُحفظ علاماتك في متصفحك على هذا الجهاز فقط.");
            }

            var note = tools.querySelector(".sp-note");

            if (note) {
                note.textContent = parts.join(" ");
                note.hidden = parts.length === 0;
            }

            var resetBtn = tools.querySelector(".sp-reset");

            if (resetBtn) {
                resetBtn.disabled = done.size === 0;
            }

            renderDoneList();
        }


        function updatePathBar() {

            var bar = tools.querySelector(".sp-pathbar");
            var text = tools.querySelector(".sp-pathbar-text");

            if (!bar || !text) {
                return;
            }

            if (!state.sel) {
                bar.hidden = true;
                return;
            }

            var pre = ancestorsOf(state.sel).size;
            var nxt = descendantsOf(state.sel).size;

            text.textContent = "";

            var strong = el("strong", "", state.sel);

            text.appendChild(document.createTextNode("مسار المادة: "));
            text.appendChild(strong);
            text.appendChild(
                document.createTextNode(
                    " — مواد قبلها: " + pre + " · مواد تفتحها: " + nxt
                )
            );

            bar.hidden = false;
        }


        /* ---------------------------------------------------------
           2) تظليل المسار + علامات الإنجاز على بطاقات المواد
        --------------------------------------------------------- */

        var CARD_SELECTOR = [
            "#course-map .course-card[data-course]",
            "#years-container .year-course[data-course]",
            "#course-details .mini-course-card[data-course]",
            "#year-course-details .year-course[data-course]"
        ].join(", ");


        function decorate() {

            var pathOn = !!(state.sel && model.names.has(state.sel));

            var pre = pathOn ? ancestorsOf(state.sel) : null;
            var nxt = pathOn ? descendantsOf(state.sel) : null;

            var cards = document.querySelectorAll(CARD_SELECTOR);

            Array.prototype.forEach.call(cards, function (card) {

                var name = card.dataset.course;

                if (!model.names.has(name)) {
                    return;
                }

                var st = courseStatus(name);

                var isDone = st.state === "done";

                /* الهالة الذهبية تظهر فقط بعد أن يعلّم الطالب مادة واحدة على الأقل،
                   حتى تبقى الخريطة نظيفة كما كانت لمن لم يستخدم المتتبّع بعد */
                var isAvail = st.state === "available" && done.size > 0;

                /* بطاقات الخريطة والسنوات فقط تتأثر بالتظليل (وليس الخريطة المصغّرة) */
                var shaded = !card.classList.contains("mini-course-card");

                var isSel = pathOn && name === state.sel;
                var isPre = pathOn && pre.has(name);
                var isNext = pathOn && nxt.has(name);

                card.classList.toggle("sp-done", isDone);
                card.classList.toggle("sp-available", isAvail);
                card.classList.toggle("sp-sel", shaded && isSel);
                card.classList.toggle("sp-pre", shaded && isPre);
                card.classList.toggle("sp-next", shaded && isNext);
                card.classList.toggle(
                    "sp-dim",
                    shaded && pathOn && !isSel && !isPre && !isNext
                );

                ensureCheck(card, name, isDone);
            });

            decorateEdges(pathOn, pre, nxt);
        }


        function ensureCheck(card, name, isDone) {

            var check = null;

            for (var i = 0; i < card.children.length; i++) {
                if (card.children[i].classList.contains("sp-check")) {
                    check = card.children[i];
                    break;
                }
            }

            if (!check) {

                check = el("span", "sp-check");
                check.setAttribute("role", "checkbox");
                check.setAttribute("tabindex", "0");
                check.dataset.course = name;

                check.addEventListener("click", function (e) {
                    e.stopPropagation();
                    e.preventDefault();
                    toggleDone(check.dataset.course);
                });

                check.addEventListener("keydown", function (e) {

                    if (e.key === " " || e.key === "Enter") {
                        e.stopPropagation();
                        e.preventDefault();
                        toggleDone(check.dataset.course);
                    }
                });

                card.appendChild(check);
            }

            check.setAttribute("aria-checked", isDone ? "true" : "false");

            check.setAttribute(
                "aria-label",
                (isDone ? "مادة منجزة: " : "علّم كمنجزة: ") + name
            );

            check.title = isDone
                ? "منجزة — اضغط للإلغاء"
                : "علّمها كمادة منجزة";
        }


        /* خطوط الاتصال في الخريطة الذهنية: نلوّن الخطوط الواقعة على المسار */
        function visibleEdges() {

            if (
                typeof mindMapData === "undefined" ||
                !mindMapData ||
                typeof mindMapExpanded === "undefined"
            ) {
                return null;
            }

            var out = [];

            (function walk(node, isRoot) {

                if (!isRoot && !mindMapExpanded.has(node.name)) {
                    return;
                }

                node.children.forEach(function (child) {
                    out.push([node.name, child.name]);
                    walk(child, false);
                });

            })(mindMapData.root, true);

            return out;
        }


        function decorateEdges(pathOn, pre, nxt) {

            var links = document.querySelectorAll("#course-map .mindmap-link");

            if (!links.length) {
                return;
            }

            var edges = visibleEdges();

            /* إن لم يتطابق العدد (تغيّر في كود الرسم مثلاً) نترك الخطوط كما هي */
            if (!edges || edges.length !== links.length) {

                Array.prototype.forEach.call(links, function (link) {
                    link.classList.remove("sp-edge-pre", "sp-edge-next", "sp-edge-dim");
                });

                return;
            }

            Array.prototype.forEach.call(links, function (link, i) {

                var from = edges[i][0];
                var to = edges[i][1];

                var isPreEdge = false;
                var isNextEdge = false;

                if (pathOn) {

                    var inUp = function (n) {
                        return n === state.sel || pre.has(n);
                    };

                    var inDown = function (n) {
                        return n === state.sel || nxt.has(n);
                    };

                    isPreEdge = inUp(from) && inUp(to);
                    isNextEdge = !isPreEdge && inDown(from) && inDown(to);
                }

                link.classList.toggle("sp-edge-pre", isPreEdge);
                link.classList.toggle("sp-edge-next", isNextEdge);
                link.classList.toggle(
                    "sp-edge-dim",
                    pathOn && !isPreEdge && !isNextEdge
                );
            });
        }


        /* عند اختيار مادة نُظهر في الخريطة كل ما قبلها وكل ما بعدها */
        function expandForPath(name) {

            if (
                typeof mindMapData === "undefined" ||
                !mindMapData ||
                typeof mindMapExpanded === "undefined" ||
                typeof drawMindMap !== "function" ||
                !document.querySelector("#course-map .mindmap-wrapper")
            ) {
                return false;
            }

            var changed = false;
            var down = descendantsOf(name);

            var need = new Set([name]);

            ancestorsOf(name).forEach(function (n) { need.add(n); });
            down.forEach(function (n) { need.add(n); });

            need.forEach(function (n) {

                var node = mindMapData.byName[n];

                if (!node) {
                    return;
                }

                /* نفتح الفروع التي فوق المادة حتى تظهر على الخريطة */
                for (var p = node.parent; p && p.parent; p = p.parent) {

                    if (!mindMapExpanded.has(p.name)) {
                        mindMapExpanded.add(p.name);
                        changed = true;
                    }
                }

                /* ونفتح المادة المختارة وما بعدها لتظهر المواد التي تفتحها */
                if (
                    (n === name || down.has(n)) &&
                    node.children.length &&
                    !mindMapExpanded.has(n)
                ) {
                    mindMapExpanded.add(n);
                    changed = true;
                }
            });

            if (changed) {
                drawMindMap(name);
            }

            return changed;
        }


        function selectPath(name, allowExpand) {

            if (!name || !model.names.has(name)) {
                return;
            }

            state.sel = name;

            if (allowExpand !== false && currentView() === "map") {
                expandForPath(name);
            }

            decorate();
            updatePathBar();
        }


        function clearPath() {

            state.sel = null;

            decorate();
            updatePathBar();
        }


        /* ---------------------------------------------------------
           تفاصيل المادة: زر الإنجاز + المتطلبات
        --------------------------------------------------------- */

        function buildExtras(name) {

            var st = courseStatus(name);

            var wrap = el("div", "sp-extras");
            wrap.dataset.course = name;

            var btn = el(
                "button",
                "sp-done-btn" + (st.state === "done" ? " is-done" : ""),
                st.state === "done"
                    ? "✓ منجزة — اضغط للإلغاء"
                    : "علّمها كمادة منجزة"
            );

            btn.type = "button";
            btn.setAttribute("aria-pressed", st.state === "done" ? "true" : "false");

            btn.addEventListener("click", function () {
                toggleDone(name);
            });

            wrap.appendChild(btn);


            var line = el("p", "sp-status sp-status-" + st.state);

            var parents = model.parents[name] || [];

            if (st.state === "done") {

                line.textContent = "تم إنجاز هذه المادة.";

            } else if (st.state === "available") {

                line.textContent = parents.length
                    ? "متاحة لك الآن — كل متطلباتها السابقة مكتملة."
                    : "متاحة لك الآن — لا تحتاج متطلبات سابقة.";

            } else {

                line.textContent =
                    "غير متاحة بعد — ينقصك أولاً: " + st.missing.join("، ") + ".";
            }

            wrap.appendChild(line);


            var need = model.hourReq[name];

            if (need) {

                wrap.appendChild(
                    el(
                        "p",
                        "sp-hours-req",
                        "يُشترط أيضاً إنجاز أكثر من " + need +
                        " ساعة. المحسوب لديك: " + stats.allDoneHours +
                        " ساعة (حساب تقريبي من ساعات المواد المعروضة في الموقع)."
                    )
                );
            }


            if (parents.length) {

                var row = el("div", "sp-prereq");
                row.appendChild(el("span", "sp-prereq-label", "المتطلبات المباشرة:"));

                parents.forEach(function (p) {

                    var ok = done.has(p);

                    var chip = el(
                        "button",
                        "sp-chip " + (ok ? "ok" : "todo"),
                        (ok ? "✓ " : "○ ") + p
                    );

                    chip.type = "button";
                    chip.title = "الانتقال إلى المادة";

                    chip.addEventListener("click", function () {
                        goTo(p);
                    });

                    row.appendChild(chip);
                });

                wrap.appendChild(row);
            }


            var chain = ancestorsOf(name);

            if (chain.size) {

                var doneInChain = 0;

                chain.forEach(function (n) {
                    if (done.has(n)) {
                        doneInChain += 1;
                    }
                });

                wrap.appendChild(
                    el(
                        "p",
                        "sp-chain",
                        "المسار الكامل قبلها: " + doneInChain +
                        " من " + chain.size + " مادة منجزة."
                    )
                );
            }

            return wrap;
        }


        function injectExtras(containerId, name, where) {

            var details = document.getElementById(containerId);

            if (!details || !name || !model.names.has(name)) {
                return;
            }

            var old = details.querySelector(".sp-extras");

            if (old) {
                old.remove();
            }

            var extras = buildExtras(name);

            var ref = where === "beforeToggle"
                ? (details.querySelector(".mini-toggle-all") ||
                   details.querySelector(".mini-tree"))
                : null;

            if (ref) {
                details.insertBefore(extras, ref);
            } else {
                details.appendChild(extras);
            }
        }


        function updateExtras() {

            [
                ["course-details", "beforeToggle"],
                ["year-course-details", "append"]
            ].forEach(function (pair) {

                var box = document.getElementById(pair[0]);
                var old = box && box.querySelector(".sp-extras");

                if (old) {

                    var fresh = buildExtras(old.dataset.course);
                    old.parentNode.replaceChild(fresh, old);
                }
            });
        }


        /* ---------------------------------------------------------
           تحديث كل شيء
        --------------------------------------------------------- */

        function refreshAll() {

            computeStats();
            decorate();
            updatePanel();
            updateExtras();
            updatePathBar();
        }


        /* ---------------------------------------------------------
           ربط الميزات بالدوال الأصلية دون تعديلها
           (نغلّف الدالة: ننفّذ ما نريد ثم نستدعي الأصلية)
        --------------------------------------------------------- */

        function wrap(fnName, before, after) {

            var original = window[fnName];

            if (typeof original !== "function") {
                return;
            }

            window[fnName] = function () {

                var args = arguments;

                if (before) {
                    try { before.apply(this, args); }
                    catch (e) { logError(fnName, e); }
                }

                var result = original.apply(this, args);

                if (after) {
                    try { after.apply(this, args); }
                    catch (e) { logError(fnName, e); }
                }

                return result;
            };
        }

        function logError(where, e) {
            if (window.console) {
                console.error("[progress.js] " + where, e);
            }
        }


        /* ضغط مادة في الخريطة أو في الخريطة المصغّرة */
        wrap(
            "showCourseDetails",
            function (course) {
                if (course && course.name) {
                    selectPath(course.name, true);
                }
            },
            function (course) {
                if (course && course.name) {
                    injectExtras("course-details", course.name, "beforeToggle");
                    decorate();
                }
            }
        );

        /* ضغط مادة في عرض السنوات */
        wrap(
            "showYearCourseDetails",
            function (courseName) {
                selectPath(courseName, false);
            },
            function (courseName) {
                injectExtras("year-course-details", courseName, "append");
                decorate();
            }
        );

        /* زر "إعادة الخريطة" */
        wrap(
            "resetMap",
            function () {
                state.sel = null;
            },
            function () {
                decorate();
                updatePathBar();
            }
        );

        /* التنقّل بين العروض */
        wrap("showFullMap", null, function () {

            syncToolsVisibility();

            if (state.sel) {
                expandForPath(state.sel);
            }

            decorate();
        });

        wrap("showYears", null, function () {
            syncToolsVisibility();
            decorate();
        });

        wrap("showElectives", null, syncToolsVisibility);


        function currentView() {

            var years = document.getElementById("years-view");
            var electives = document.getElementById("electives-view");

            if (electives && electives.style.display === "block") {
                return "electives";
            }

            if (years && years.style.display === "block") {
                return "years";
            }

            return "map";
        }

        function syncToolsVisibility() {
            tools.hidden = currentView() === "electives";
        }


        /* الخريطة تُعاد رسمها كاملة عند كل ضغطة (فتح/طي فرع)، لذلك نعيد
           تلوين البطاقات الجديدة فوراً، قبل أن تُعرض على الشاشة. */
        var scheduled = false;

        function schedule() {

            if (scheduled) {
                return;
            }

            scheduled = true;

            Promise.resolve().then(function () {

                scheduled = false;

                try {
                    decorate();
                } catch (e) {
                    logError("decorate", e);
                }
            });
        }

        if (window.MutationObserver) {

            var observer = new MutationObserver(schedule);

            [
                "course-map",
                "years-container",
                "course-details",
                "year-course-details"
            ].forEach(function (id) {

                var node = document.getElementById(id);

                if (node) {
                    observer.observe(node, { childList: true, subtree: true });
                }
            });
        }


        /* Esc يلغي التظليل */
        document.addEventListener("keydown", function (e) {

            if (e.key !== "Escape" || !state.sel) {
                return;
            }

            if (document.getElementById("major-dialog")) {
                return;
            }

            var list = document.getElementById("sp-search-list");

            if (list && !list.hidden) {
                return;
            }

            clearPath();
        });


        /* مزامنة العلامات بين تبويبين مفتوحين */
        window.addEventListener("storage", function (e) {

            if (e.key === STORAGE_KEY) {
                loadDone();
                refreshAll();
            }
        });


        /* ---------------------------------------------------------
           3) البحث عن مادة
        --------------------------------------------------------- */

        function norm(s) {

            return String(s || "")
                .replace(/[ً-ٰٟـ]/g, "")
                .replace(/[أإآٱ]/g, "ا")
                .replace(/ى/g, "ي")
                .replace(/ة/g, "ه")
                .replace(/ؤ/g, "و")
                .replace(/ئ/g, "ي")
                .replace(/[٠-٩]/g, function (d) {
                    return String(d.charCodeAt(0) - 0x0660);
                })
                .replace(/[۰-۹]/g, function (d) {
                    return String(d.charCodeAt(0) - 0x06F0);
                })
                .replace(/\s+/g, " ")
                .trim()
                .toLowerCase();
        }


        /* قائمة المواد القابلة للبحث، مرتّبة بترتيب الخطة */
        var searchable = (function () {

            var ordered = model.curriculum.slice();

            model.names.forEach(function (n) {
                if (ordered.indexOf(n) === -1) {
                    ordered.push(n);
                }
            });

            return ordered.map(function (n, i) {
                return { name: n, key: norm(n), order: i };
            });
        })();


        function searchCourses(query) {

            var q = norm(query);

            if (!q) {
                return [];
            }

            var tokens = q.split(" ");
            var results = [];

            searchable.forEach(function (item) {

                var ok = tokens.every(function (t) {
                    return item.key.indexOf(t) !== -1;
                });

                if (!ok) {
                    return;
                }

                var score = 2;

                if (item.key.indexOf(q) === 0) {
                    score = 0;
                } else if (
                    item.key.indexOf(" " + q) !== -1 ||
                    item.key.indexOf(q) !== -1
                ) {
                    score = 1;
                }

                results.push({ item: item, score: score });
            });

            results.sort(function (a, b) {
                return a.score - b.score || a.item.order - b.item.order;
            });

            return results.slice(0, 8).map(function (r) {
                return r.item.name;
            });
        }


        function isInMap(name) {

            return !!(
                typeof mindMapData !== "undefined" &&
                mindMapData &&
                mindMapData.byName &&
                mindMapData.byName[name]
            );
        }


        function metaFor(name) {

            var place = model.place[name];
            var parts = [];

            if (place) {
                parts.push(place.year + " · " + place.semester);
            } else {
                parts.push("مادة اختيارية / خارج الخطة الأساسية");
            }

            var h = getCourseHours(name);
            parts.push("الساعات: " + h);

            if (!isInMap(name) && place) {
                parts.push("تظهر في عرض السنوات");
            }

            return parts.join(" — ");
        }


        function wireSearch(input, clearBtn, list) {

            var items = [];
            var active = -1;

            function setOpen(open) {

                list.hidden = !open;
                input.setAttribute("aria-expanded", open ? "true" : "false");

                if (!open) {
                    active = -1;
                    input.removeAttribute("aria-activedescendant");
                }
            }

            function setActive(i) {

                var nodes = list.querySelectorAll("[role=option]");

                if (!nodes.length) {
                    return;
                }

                active = (i + nodes.length) % nodes.length;

                Array.prototype.forEach.call(nodes, function (n, idx) {
                    n.classList.toggle("is-active", idx === active);
                    n.setAttribute("aria-selected", idx === active ? "true" : "false");
                });

                input.setAttribute("aria-activedescendant", nodes[active].id);
                nodes[active].scrollIntoView({ block: "nearest" });
            }

            function render() {

                var q = input.value;

                clearBtn.hidden = !q;

                list.innerHTML = "";

                if (!norm(q)) {
                    setOpen(false);
                    return;
                }

                items = searchCourses(q);

                if (!items.length) {

                    var empty = el("li", "sp-search-empty", "لا توجد مادة بهذا الاسم.");
                    empty.setAttribute("role", "presentation");
                    list.appendChild(empty);
                    setOpen(true);
                    return;
                }

                items.forEach(function (name, i) {

                    var li = el("li", "sp-search-item");
                    li.id = "sp-opt-" + i;
                    li.setAttribute("role", "option");
                    li.setAttribute("aria-selected", "false");

                    var main = el("span", "sp-search-main");
                    main.appendChild(el("span", "sp-search-name", name));
                    main.appendChild(el("span", "sp-search-meta", metaFor(name)));
                    li.appendChild(main);

                    var st = courseStatus(name).state;

                    if (st === "done") {
                        li.appendChild(el("span", "sp-badge done", "منجزة"));
                    } else if (st === "available") {
                        li.appendChild(el("span", "sp-badge available", "متاحة"));
                    }

                    /* mousedown حتى لا يفقد الحقل التركيز قبل الاختيار */
                    li.addEventListener("mousedown", function (e) {
                        e.preventDefault();
                    });

                    li.addEventListener("click", function () {
                        choose(name);
                    });

                    list.appendChild(li);
                });

                setOpen(true);
                setActive(0);
            }

            function choose(name) {

                input.value = name;
                clearBtn.hidden = false;
                setOpen(false);
                input.blur();

                goTo(name);
            }

            input.addEventListener("input", render);

            input.addEventListener("focus", function () {
                if (norm(input.value)) {
                    render();
                }
            });

            input.addEventListener("keydown", function (e) {

                if (e.key === "ArrowDown") {

                    e.preventDefault();

                    if (list.hidden) {
                        render();
                    } else {
                        setActive(active + 1);
                    }

                } else if (e.key === "ArrowUp") {

                    e.preventDefault();

                    if (!list.hidden) {
                        setActive(active - 1);
                    }

                } else if (e.key === "Enter") {

                    if (!list.hidden && items.length) {
                        e.preventDefault();
                        choose(items[active >= 0 ? active : 0]);
                    }

                } else if (e.key === "Escape") {

                    if (!list.hidden) {
                        e.preventDefault();
                        setOpen(false);
                    } else if (input.value) {
                        input.value = "";
                        clearBtn.hidden = true;
                    }
                }
            });

            clearBtn.addEventListener("click", function () {

                input.value = "";
                clearBtn.hidden = true;
                setOpen(false);
                input.focus();
            });

            document.addEventListener("click", function (e) {

                if (!tools.querySelector(".sp-search").contains(e.target)) {
                    setOpen(false);
                }
            });
        }


        /* ننتقل للمادة: نفتح الفروع التي فوقها، نختارها، ثم نمرّر الصفحة إليها */
        function goTo(name) {

            if (!model.names.has(name)) {
                return;
            }

            var view = currentView();
            var inMap = isInMap(name);
            var place = model.place[name];

            var target = view;

            if (view === "electives") {
                target = inMap ? "map" : (place ? "years" : "map");
            } else if (view === "map" && !inMap) {
                target = place ? "years" : "map";
            } else if (view === "years" && !place) {
                target = inMap ? "map" : "years";
            }

            if (target !== view) {

                if (target === "map" && typeof showFullMap === "function") {
                    showFullMap();
                } else if (target === "years" && typeof showYears === "function") {
                    showYears();
                }
            }

            if (target === "map") {

                if (inMap && typeof openCourseByName === "function") {
                    openCourseByName(name);
                }

            } else if (place && typeof showYearCourseDetails === "function") {

                showYearCourseDetails(name, place.year, place.semester);
            }

            var cardSelector = target === "map"
                ? "#course-map .course-card"
                : "#years-container .year-course";

            /* ننتظر قليلاً حتى تنتهي إعادة الرسم، ثم نمرّر إلى البطاقة */
            setTimeout(function () {

                var cards = document.querySelectorAll(cardSelector);
                var card = null;

                for (var i = 0; i < cards.length; i++) {
                    if (cards[i].dataset.course === name) {
                        card = cards[i];
                        break;
                    }
                }

                if (!card) {
                    return;
                }

                card.scrollIntoView({
                    behavior: reduceMotion ? "auto" : "smooth",
                    block: "center",
                    inline: "center"
                });

                card.classList.remove("sp-pulse");
                void card.offsetWidth;
                card.classList.add("sp-pulse");

                setTimeout(function () {
                    card.classList.remove("sp-pulse");
                }, 2400);

            }, 140);
        }


        /* ---------------------------------------------------------
           تشغيل أول مرة
        --------------------------------------------------------- */

        syncToolsVisibility();
        refreshAll();
    }

})();
