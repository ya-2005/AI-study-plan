/* =========================================================
   الدفعة 4: ترتيب المواد المتاحة بالأولوية (بلا واجهة)
   1) عدد المواد غير المنجزة التي تتطلّب هذه المادة مباشرةً (الأكثر أولاً)
   2) فصل المادة: الحالي، ثم المتأخرة، ثم القادمة، ثم الاختيارية
   3) هامش التأجيل (الأقل أولاً) ثم طول السلسلة اللاحقة   4) ترتيبها الأصلي في الخطة

   المسار الحرج: إن كان أطول تسلسل متبقٍ يبدأ بالمادة (كل مادة تتطلب التي
   قبلها) يساوي عدد الفصول المتبقية في الخطة أو يزيد، فتأجيلها يؤخّر التخرج
   حتماً، فتُقدَّم على غيرها قبل عدد المواد التي تفتحها.

   لكل مادة متاحة يُحسب أيضاً (كلها من بيانات الخطة):
   - slack   : عدد الفصول التي تتحمل تأجيلها دون تأخير التخرج (الفصول المتبقية − طول التسلسل).
   - path    : أطول تسلسل يلي المادة بأسماء المواد.
   - solo    : مواد تُتاح فور نجاحك فيها وحدها (مع مراعاة شرط الساعات).
   - joint   : مواد تتوقف عليها لكنها تحتاج معها متطلبات أخرى (شريك) أو ساعات أكثر.
   - tracksDown : مسارات الخطة التي تمتد إليها سلسلة المادة.
========================================================= */
(function () {
    "use strict";

    var ST = window.AIState;
    var ASSUMED_HOURS = 3;

    function hoursOf(c) { return c.hoursKnown ? c.hours : ASSUMED_HOURS; }

    function chainOf(m, name, set) {
        var seen = {}, stack = [name], out = 0;
        while (stack.length) {
            var cur = stack.pop();
            m.courses[cur].unlocks.forEach(function (d) {
                if (seen[d]) { return; }
                seen[d] = true;
                if (!set[d]) { out++; }
                stack.push(d);
            });
        }
        return out;
    }

    /* كل المواد غير المنجزة اللاحقة للمادة (مباشرة وغير مباشرة) */
    function descendants(m, name, set) {
        var seen = {}, stack = [name], out = [];
        while (stack.length) {
            var cur = stack.pop();
            m.courses[cur].unlocks.forEach(function (d) {
                if (seen[d]) { return; }
                seen[d] = true;
                if (!set[d]) { out.push(d); stack.push(d); }
            });
        }
        return out;
    }

    /* 0 = الفصل الحالي، 1 = فصل سابق (متأخرة)، 2 = فصل قادم، 3 = خارج الجدول */
    function termGroup(c, cur) {
        if (!c.term) { return 3; }
        if (c.term === cur) { return 0; }
        return c.term < cur ? 1 : 2;
    }

    /* أطول تسلسل من المواد غير المنجزة يبدأ بالمادة (تُحسب المادة نفسها) */
    function depthMap(m, set) {
        var memo = {};
        function d(n) {
            if (memo[n] !== undefined) { return memo[n]; }
            memo[n] = 1;                       /* حماية من الحلقات */
            var best = 0;
            m.courses[n].unlocks.forEach(function (k) {
                if (!set[k]) { best = Math.max(best, d(k)); }
            });
            memo[n] = 1 + best;
            return memo[n];
        }
        m.order.forEach(function (n) { if (!set[n]) { d(n); } });
        return memo;
    }

    /* أطول تسلسل يلي المادة بأسماء المواد (دون المادة نفسها) */
    function bestPath(m, set, depth, pos, name) {
        var out = [], cur = name, guard = 0;
        while (guard++ < 40) {
            var kids = m.courses[cur].unlocks.filter(function (k) { return !set[k]; });
            if (!kids.length) { break; }
            kids.sort(function (a, b) {
                var da = depth[a] || 1, db = depth[b] || 1;
                if (da !== db) { return db - da; }
                var ta = m.courses[a].term || 99, tb = m.courses[b].term || 99;
                if (ta !== tb) { return ta - tb; }
                return pos[a] - pos[b];
            });
            cur = kids[0];
            out.push(cur);
        }
        return out;
    }

    function rankWith(m, set, extra, cur) {
        var res = ST.computeWith(m, set, extra);
        var depth = depthMap(m, set);
        var remaining = Math.max(1, (m.totalTerms || 10) - cur + 1);
        var pos = {};
        m.order.forEach(function (n, i) { pos[n] = i; });

        var availSet = {};
        res.available.forEach(function (c) { availSet[c.name] = true; });

        var list = res.available.map(function (c) {
            var deps = c.unlocksDirect.filter(function (d) { return !set[d]; });
            var afterHours = res.totalHours + hoursOf(c);

            /* لكل مادة تعتمد عليها: هل تُتاح بنجاحك وحدها، أم تحتاج شريكاً أو ساعات؟ */
            var solo = [], joint = [];
            deps.forEach(function (d) {
                var dc = m.courses[d];
                var missing = dc.prereqs.filter(function (p) { return p !== c.name && !set[p]; });
                var hourShort = (dc.hourReq && afterHours <= dc.hourReq) ? (dc.hourReq + 1 - afterHours) : 0;
                if (!missing.length && !hourShort) {
                    solo.push(d);
                } else {
                    joint.push({
                        name: d,
                        partners: missing,
                        partnersNow: missing.filter(function (p) { return !!availSet[p]; }),
                        hourReq: dc.hourReq,
                        hourShort: hourShort
                    });
                }
            });

            var desc = descendants(m, c.name, set);
            var own = {};
            c.tracks.forEach(function (t) { own[t] = true; });
            var tracksDown = [];
            desc.forEach(function (d) {
                m.courses[d].tracks.forEach(function (t) {
                    if (!own[t] && tracksDown.indexOf(t) === -1) { tracksDown.push(t); }
                });
            });

            var dep = depth[c.name] || 1;
            return {
                course: c,
                direct: deps,
                opensNow: solo,
                joint: joint,
                chain: desc.length,
                depth: dep,
                slack: remaining - dep,
                path: bestPath(m, set, depth, pos, c.name),
                tracksDown: tracksDown,
                leadsToProject: desc.some(function (d) { return /^مشروع/.test(d); }),
                remaining: remaining,
                critical: dep >= remaining && dep > 1,
                group: termGroup(c, cur)
            };
        });

        list.sort(function (a, b) {
            if (a.critical !== b.critical) { return a.critical ? -1 : 1; }
            if (a.critical && b.critical && b.depth !== a.depth) { return b.depth - a.depth; }
            if (b.direct.length !== a.direct.length) { return b.direct.length - a.direct.length; }
            if (a.group !== b.group) { return a.group - b.group; }
            if (a.group === 1 || a.group === 2) {
                if (a.course.term !== b.course.term) { return a.course.term - b.course.term; }
            }
            if (a.slack !== b.slack) { return a.slack - b.slack; }
            if (b.chain !== a.chain) { return b.chain - a.chain; }
            return pos[a.course.name] - pos[b.course.name];
        });

        list.forEach(function (x, i) { x.rank = i + 1; });

        /* أطول تسلسل متبقٍ في الخطة كلها (مواد الجدول الفصلي فقط) */
        var longest = null;
        m.order.forEach(function (n) {
            var c = m.courses[n];
            if (set[n] || !c.term) { return; }
            var d = depth[n] || 1;
            if (!longest || d > longest.depth ||
                (d === longest.depth && c.term < m.courses[longest.name].term)) {
                longest = { name: n, depth: d };
            }
        });
        var meta = {
            remaining: remaining,
            maxDepth: longest ? longest.depth : 0,
            longest: longest ? [longest.name].concat(bestPath(m, set, depth, pos, longest.name)) : [],
            margin: longest ? remaining - longest.depth : remaining,
            totalHours: res.totalHours
        };

        return { ranked: list, locked: res.locked, doneHours: res.doneHours, meta: meta };
    }

    window.AIRank = {
        rankWith: rankWith,
        run: function () {
            return rankWith(ST.model(), ST.done(), ST.extra(), ST.currentTerm());
        },
        debug: function () {
            var r = this.run();
            console.table(r.ranked.map(function (x) {
                return { "#": x.rank, "المادة": x.course.name, "تفتح": x.direct.length,
                         "فوراً": x.opensNow.length, "تنتظر شريكاً": x.joint.length,
                         "السلسلة": x.chain, "الطول": x.depth, "هامش التأجيل": x.slack,
                         "الفصل": x.course.term || "اختيارية" };
            }));
            return r;
        }
    };
})();
