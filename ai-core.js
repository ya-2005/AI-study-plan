/* =========================================================
   المساعد الذكي - الدفعتان 2 و3 (بلا واجهة)
   الدفعة 2: قراءة المواد ومتطلباتها من script.js وفحصها.
   الدفعة 3: حفظ المواد المنجزة وحساب المواد المتاحة.

   مصادر المتطلبات (تُدمج معاً حتى لا يفوت أي متطلب):
     1) plan.next      : خريطة "المادة ← ما تفتحه".
     2) plan.prereqs   : نص "أ + ب" المكتوب تحت بعض المواد.
     3) ملاحظة المادة  : "أكثر من N ساعة" (شرط ساعات).
   يشارك مفتاح الحفظ نفسه مع صفحة الخطة (progress.js)،
   فما تعلّمه هناك يظهر هنا والعكس.
========================================================= */
(function () {
    "use strict";

    var DONE_PREFIX = "studyplan:done:v1:";   /* نفس مفتاح progress.js */
    var PREF_PREFIX = "studyplan:ai:prefs:v1:";

    var cache = { major: null, model: null };
    var memory = {};                           /* احتياط إن تعذّر localStorage */

    /* ---------- أدوات صغيرة ---------- */

    function norm(s) {
        return String(s || "").replace(/\s+/g, " ").trim();
    }

    function lsGet(k) {
        try { return localStorage.getItem(k); } catch (e) { return memory[k] || null; }
    }

    function lsSet(k, v) {
        try { localStorage.setItem(k, v); } catch (e) { memory[k] = v; }
    }

    function selectedMajor() {
        return norm(lsGet("selectedMajor"));
    }

    function pushUnique(arr, v) {
        if (arr.indexOf(v) === -1) { arr.push(v); }
    }

    /* =====================================================
       الدفعة 2: بناء النموذج
    ===================================================== */

    function hourRequirement(plan, major, name) {
        var m = /أكثر من\s*(\d+)\s*ساعة/.exec(noteText(plan, major, name));
        return m ? parseInt(m[1], 10) : 0;
    }

    function noteText(plan, major, name) {
        if (plan.notes && plan.notes[name]) { return plan.notes[name]; }
        if (typeof extraMajorNotes !== "undefined" &&
            extraMajorNotes[major] && extraMajorNotes[major][name]) {
            return extraMajorNotes[major][name];
        }
        return "";
    }

    /* المقررات المطلوبة المكتوبة في ملاحظة المادة، مثل:
       "يجب إنجاز مقرر أ ومقرر ب بالإضافة إلى إنجاز أكثر من 70 ساعة." */
    function notePrereqNames(note) {
        var head = String(note || "").split("بالإضافة")[0];
        var parts = head.split(/(?:^|\s)و?مقرر\s+/);
        var out = [];
        for (var i = 1; i < parts.length; i++) {
            var t = norm(parts[i]).replace(/[.،,]+$/, "").trim();
            if (t) { out.push(t); }
        }
        return out;
    }

    function buildModel(major) {
        if (typeof getMajorPlan !== "function" || typeof getCourseHours !== "function") {
            return null;
        }
        var plan = getMajorPlan(major);
        if (!plan || !plan.next) { return null; }

        var courses = {};
        var order = [];
        var warnings = [];

        function ensure(name) {
            name = norm(name);
            if (!name) { return null; }
            if (!courses[name]) {
                courses[name] = {
                    name: name, prereqs: [], unlocks: [],
                    term: null, year: null, semester: null,
                    hours: 0, hoursKnown: true, hourReq: 0
                };
                order.push(name);
            }
            return courses[name];
        }

        /* 1) مواد الخطة السنوية بترتيبها، ورقم الفصل التسلسلي (1..10) */
        var termNo = 0;
        (plan.curriculum || []).forEach(function (year) {
            (year.semesters || []).forEach(function (sem) {
                termNo++;
                (sem.courses || []).forEach(function (n) {
                    var c = ensure(n);
                    if (c.term === null) {
                        c.term = termNo;
                        c.year = year.year;
                        c.semester = sem.name;
                    } else {
                        warnings.push("مادة مكرّرة في الخطة: " + c.name);
                    }
                });
            });
        });
        var totalTerms = termNo;

        /* 2) باقي المواد (اختيارية أو مستقلة) من الخريطة */
        [].concat(plan.foundation || [], plan.independent || [], plan.mindMapRoots || [])
            .forEach(ensure);

        /* 3) المتطلبات من next */
        Object.keys(plan.next).forEach(function (p) {
            var parent = ensure(p);
            (plan.next[p] || []).forEach(function (ch) {
                var child = ensure(ch);
                if (child.name === parent.name) {
                    warnings.push("مادة تتطلب نفسها: " + child.name);
                    return;
                }
                pushUnique(child.prereqs, parent.name);
            });
        });

        /* 4) المتطلبات من نص prereqs ("أ + ب") */
        var fromText = 0;
        Object.keys(plan.prereqs || {}).forEach(function (n) {
            var child = ensure(n);
            String(plan.prereqs[n]).split("+").forEach(function (part) {
                var pn = norm(part);
                if (!pn) { return; }
                /* اسم غير موجود في الخطة: لا نصنع منه مادة وهمية، بل نكتفي بتحذير */
                if (!courses[pn]) {
                    warnings.push("متطلب غير معروف في الخطة: «" + pn + "» لمادة «" + child.name + "» (تم تجاهله)");
                    return;
                }
                var parent = courses[pn];
                if (parent.name !== child.name && child.prereqs.indexOf(parent.name) === -1) {
                    child.prereqs.push(parent.name);
                    fromText++;
                }
            });
        });

        /* 4ب) المتطلبات المكتوبة في ملاحظة المادة ("يجب إنجاز مقرر أ ومقرر ب ...").
           بعضها غير مذكور في next ولا في prereqs (مثل «مدخل إلى الروبوتية» لتطبيقات الروبوتية)،
           وبعضها يشير إلى "مشروع تخرج 1" باسم عام فنحوّله إلى اسم المادة الفعلي في الخطة. */
        var fromNotes = 0;
        var noteOwners = Object.keys(plan.notes || {});
        if (typeof extraMajorNotes !== "undefined" && extraMajorNotes[major]) {
            Object.keys(extraMajorNotes[major]).forEach(function (n) { pushUnique(noteOwners, n); });
        }
        noteOwners.forEach(function (owner) {
            var child = courses[norm(owner)];
            if (!child) { return; }
            notePrereqNames(noteText(plan, major, owner)).forEach(function (raw) {
                var target = courses[raw] ? raw : null;
                if (!target) {
                    var pm = /^مشروع تخرج\s*(\d+)$/.exec(raw);
                    if (pm) {
                        var re = new RegExp("^مشروع تخرج.*\\s" + pm[1] + "$");
                        var found = order.filter(function (n) { return n !== child.name && re.test(n); });
                        if (found.length === 1) { target = found[0]; }
                    }
                }
                if (!target) {
                    warnings.push("متطلب في ملاحظة «" + child.name + "» غير معروف في الخطة: «" + raw + "» (تم تجاهله)");
                    return;
                }
                if (target !== child.name && child.prereqs.indexOf(target) === -1) {
                    child.prereqs.push(target);
                    fromNotes++;
                }
            });
        });

        /* 4ج) قاعدة ثابتة: «اللغة الإنجليزية 2» لا تُفتح إلا بعد إنجاز «اللغة الإنجليزية 1».
           هذا المتطلب غير مكتوب في بيانات الخطة، فنضيفه هنا لتخصصات الخطة التي فيها المادتان. */
        var ENG1 = "اللغة الإنجليزية 1", ENG2 = "اللغة الإنجليزية 2";
        if (courses[ENG1] && courses[ENG2] && courses[ENG2].prereqs.indexOf(ENG1) === -1) {
            courses[ENG2].prereqs.push(ENG1);
        }

        /* 5) التفتّحات (عكس المتطلبات) + الساعات + شرط الساعات */
        order.forEach(function (n) {
            var c = courses[n];
            c.prereqs.forEach(function (p) { pushUnique(courses[p].unlocks, c.name); });
            var h = getCourseHours(c.name);
            c.hoursKnown = typeof h === "number";
            c.hours = c.hoursKnown ? h : 0;
            c.hourReq = hourRequirement(plan, major, c.name);
        });

        /* 5ب) المتطلبات المباشرة فعلاً: نحذف الحافة التي يغطيها مسار آخر
           (إن كانت أ تسبق ب وب تسبق ج، فأ ليست متطلباً مباشراً لـ ج) */
        order.forEach(function (n) {
            var c = courses[n];
            c.prereqsDirect = c.prereqs.filter(function (p) {
                return !c.prereqs.some(function (q) {
                    return q !== p && ancestorsOf(courses, q).indexOf(p) !== -1;
                });
            });
            c.unlocksDirect = [];
        });
        order.forEach(function (n) {
            courses[n].prereqsDirect.forEach(function (p) { pushUnique(courses[p].unlocksDirect, n); });
        });

        /* 5ج) المسارات (أعمدة الخريطة): كل مسار ينطلق من جذوره ويتفرع عبر next */
        var trackRoots = {};
        order.forEach(function (n) { courses[n].tracks = []; courses[n].isFoundation = false; });
        (plan.foundation || []).forEach(function (n) {
            if (courses[norm(n)]) { courses[norm(n)].isFoundation = true; }
        });
        (plan.columns || []).forEach(function (col) {
            var title = norm(col.title);
            if (!title) { return; }
            var skip = {};
            (col.skip || []).forEach(function (n) { skip[norm(n)] = true; });
            var roots = (col.roots || []).map(norm).filter(function (n) { return courses[n]; });
            var seen = {}, stack = roots.slice();
            roots.forEach(function (r) { seen[r] = true; trackRoots[r] = trackRoots[r] || []; trackRoots[r].push(title); });
            while (stack.length) {
                var cur = stack.pop();
                pushUnique(courses[cur].tracks, title);
                (plan.next[cur] || []).forEach(function (ch) {
                    ch = norm(ch);
                    if (!courses[ch] || seen[ch] || skip[ch]) { return; }
                    seen[ch] = true;
                    stack.push(ch);
                });
            }
        });
        order.forEach(function (n) { courses[n].rootOf = trackRoots[n] || []; });

        /* 6) فحص الدورات (مادة تتطلب نفسها بشكل غير مباشر) */
        var state = {};
        function visit(n, path) {
            if (state[n] === 2) { return; }
            if (state[n] === 1) {
                warnings.push("حلقة في المتطلبات: " + path.concat(n).join(" ← "));
                return;
            }
            state[n] = 1;
            courses[n].prereqs.forEach(function (p) { visit(p, path.concat(n)); });
            state[n] = 2;
        }
        order.forEach(function (n) { visit(n, []); });

        return {
            major: major, courses: courses, order: order,
            totalTerms: totalTerms, warnings: warnings,
            fromTextCount: fromText, fromNotesCount: fromNotes
        };
    }

    /* كل المتطلبات (المباشرة وغير المباشرة) لمادة داخل خريطة مواد (تُستعمل أثناء البناء) */
    function ancestorsOf(courses, name) {
        var seen = {}, stack = [name], out = [];
        while (stack.length) {
            var cur = stack.pop();
            courses[cur].prereqs.forEach(function (p) {
                if (!seen[p]) { seen[p] = true; out.push(p); stack.push(p); }
            });
        }
        return out;
    }

    function model() {
        var major = selectedMajor();
        if (!major) { return null; }
        if (cache.major !== major || !cache.model) {
            cache.major = major;
            cache.model = buildModel(major);
        }
        return cache.model;
    }

    /* كل المتطلبات (المباشرة وغير المباشرة) لمادة */
    function ancestors(m, name) {
        var seen = {}, stack = [name], out = [];
        while (stack.length) {
            var cur = stack.pop();
            m.courses[cur].prereqs.forEach(function (p) {
                if (!seen[p]) { seen[p] = true; out.push(p); stack.push(p); }
            });
        }
        return out;
    }

    /* =====================================================
       الدفعة 3: الحفظ
    ===================================================== */

    function doneKey(m) { return DONE_PREFIX + norm(m.major); }
    function prefKey(m) { return PREF_PREFIX + norm(m.major); }

    function done() {
        var m = model();
        var set = {};
        if (!m) { return set; }
        try {
            var arr = JSON.parse(lsGet(doneKey(m)) || "[]");
            if (Array.isArray(arr)) {
                arr.forEach(function (n) {
                    if (typeof n === "string" && m.courses[n]) { set[n] = true; }
                });
            }
        } catch (e) { /* نبدأ من الصفر */ }
        return set;
    }

    function saveDone(m, set) {
        lsSet(doneKey(m), JSON.stringify(Object.keys(set)));
    }

    /* عند تحديد مادة منجزة تُحدَّد متطلباتها تلقائياً (لا تُنجَز مادة دون متطلباتها) */
    function setDone(name, value) {
        var m = model();
        if (!m || !m.courses[name]) { return done(); }
        var set = done();
        if (value) {
            set[name] = true;
            ancestors(m, name).forEach(function (p) { set[p] = true; });
        } else {
            delete set[name];
            /* إلغاء مادة يلغي ما بعدها مما كان مبنياً عليها */
            var stack = [name];
            while (stack.length) {
                var cur = stack.pop();
                m.courses[cur].unlocks.forEach(function (d) {
                    if (set[d]) { delete set[d]; stack.push(d); }
                });
            }
        }
        saveDone(m, set);
        return set;
    }

    function clearDone() {
        var m = model();
        if (m) { saveDone(m, {}); }
    }

    function readPrefs() {
        var m = model();
        var p = {};
        if (m) {
            try { p = JSON.parse(lsGet(prefKey(m)) || "{}") || {}; } catch (e) { p = {}; }
        }
        return p;
    }

    function writePref(key, val) {
        var m = model();
        if (!m) { return; }
        var p = readPrefs();
        p[key] = val;
        lsSet(prefKey(m), JSON.stringify(p));
    }

    function intIn(v, lo, hi, dflt) {
        v = parseInt(v, 10);
        if (isNaN(v)) { return dflt; }
        return Math.max(lo, Math.min(hi, v));
    }

    function extra() { return intIn(readPrefs().extra, 0, 180, 0); }

    function currentTerm() {
        var m = model();
        var cap = m ? m.totalTerms : 10;
        return intIn(readPrefs().term, 1, cap, 1);
    }

    /* =====================================================
       الدفعة 3: حساب المتاح والمقفل
    ===================================================== */

    function computeWith(m, set, extraHours) {
        var doneHours = 0;
        m.order.forEach(function (n) {
            if (set[n]) { doneHours += m.courses[n].hours; }
        });
        var total = doneHours + (extraHours || 0);

        var available = [], locked = [];

        m.order.forEach(function (n) {
            if (set[n]) { return; }
            var c = m.courses[n];
            var missing = c.prereqs.filter(function (p) { return !set[p]; });

            /* "أكثر من N ساعة" تعني أن المطلوب N+1 على الأقل */
            var hourShort = (c.hourReq && total <= c.hourReq) ? (c.hourReq + 1 - total) : 0;

            if (missing.length === 0 && hourShort === 0) {
                available.push(c);
            } else {
                locked.push({ course: c, missing: missing, hourShort: hourShort });
            }
        });

        return {
            available: available,
            locked: locked,
            doneHours: doneHours,
            totalHours: total
        };
    }

    /* التخصصات المتاحة (من خطط script.js) */
    function majorsList() {
        return (typeof majorPlans !== "undefined") ? Object.keys(majorPlans) : [];
    }

    function setMajor(name) {
        name = norm(name);
        if (name && majorsList().indexOf(name) === -1) { return false; }
        lsSet("selectedMajor", name);
        cache.major = null;
        cache.model = null;
        return true;
    }

    window.AIState = {
        major: selectedMajor,
        majors: majorsList,
        setMajor: setMajor,
        model: model,
        done: done,
        setDone: setDone,
        clearDone: clearDone,
        ancestors: function (name) { var m = model(); return m ? ancestors(m, name) : []; },
        extra: extra,
        setExtra: function (v) { writePref("extra", intIn(v, 0, 180, 0)); },
        currentTerm: currentTerm,
        setCurrentTerm: function (v) { writePref("term", intIn(v, 1, 20, 1)); },
        minHours: function () { return intIn(readPrefs().min, 1, 30, 15); },
        maxHours: function () { return intIn(readPrefs().max, 1, 30, 18); },
        setHours: function (mn, mx) { writePref("min", intIn(mn, 1, 30, 15)); writePref("max", intIn(mx, 1, 30, 18)); },
        computeWith: computeWith,
        compute: function () {
            var m = model();
            return m ? computeWith(m, done(), extra()) : null;
        },
        /* فحص سلامة البيانات (للاختبار من وحدة التحكم) */
        validate: function () {
            var m = model();
            return m ? m.warnings.slice() : ["لا يوجد تخصص محدد أو لا توجد خطة له"];
        },
        norm: norm
    };
})();
