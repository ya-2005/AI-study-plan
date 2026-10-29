/* =========================================================
   الدفعة 5: اختيار المواد وكتابة سبب كل مادة ونصائح الفصل (بلا واجهة)

   القاعدة:
   - نمرّ على المواد المتاحة بترتيب الأولوية (من ai.js) ونضم المادة
     إذا بقي بعدها حلٌّ ممكن يجعل مجموع الساعات بين الحد الأدنى والأعلى.
     هذا يضمن أن الأولوية تُحترم تماماً، وأن الحدّين يُحترمان كلما أمكن.
   - الموازنة: سقف لعدد المواد "الثقيلة" (تقديري بحسب نوع المادة)،
     ويُرفع السقف تلقائياً فقط إذا تعذّر بلوغ الحد الأدنى به.
   - ساعات المادة غير المعروفة في الخطة (تظهر "-") تُفترض 3 للحساب
     وتُنبَّه الواجهة إلى ذلك.
   - الأسباب والنصائح كلها مشتقة من بيانات الخطة (تسلسل المتطلبات، ما تفتحه
     المادة وحدها أو مع شريك، هامش التأجيل، المسار، شرط الساعات)، وليست تخميناً.
   - كل سبب يُرجَع كبنود منظّمة {kind, label, text, names, path, lines, tone}
     لتعرضها الواجهة بشكل مرتب بدل فقرة طويلة. البند الأول من نوع verdict
     وهو خلاصة "لماذا هذه المادة الآن".
========================================================= */
(function () {
    "use strict";

    var ST = window.AIState;
    var ASSUMED_HOURS = 3;
    var NAMES_SHOWN = 6;

    /* ---------- تصنيف الحمل (ثقيلة / خفيفة / متوسطة) - تقديري ---------- */

    var HEAVY_RE = /التحليل|الفيزياء|فيزياء|الجبر|الرياضيات|الرياضية|الإحصاء|الاحتمالات|الدارات|دارات|الإشارات|الكهرومغناطيس|الأمواج|المكروية|الهوائيات|الخوارزميات|نظرية|التحكم|الإلكترونيات|الإلكترونية|الميكانيك|الديناميك|مشروع|تعلم الآلة|الرؤية|العصبونية|معالجة|التشفير|نظم التشغيل|بنيان الحواسيب|الاتصالات الرقمية/;
    var LIGHT_RE = /اللغة|الإنكليزية|الإنجليزية|مهارات|نظم المعلومات الإدارية|الإدارة|إدارة|أخلاقيات|ثقافة|الاقتصاد|توثيق/;

    function loadOf(c) {
        if (LIGHT_RE.test(c.name) || (c.hoursKnown && c.hours <= 2)) { return "light"; }
        if (HEAVY_RE.test(c.name)) { return "heavy"; }
        return "mid";
    }

    function hoursOf(c) {
        return c.hoursKnown ? c.hours : ASSUMED_HOURS;
    }

    /* ---------- صياغة عربية ---------- */

    function cnt(n) {
        if (n === 1) { return "مادة واحدة"; }
        if (n === 2) { return "مادتين"; }
        if (n >= 3 && n <= 10) { return n + " مواد"; }
        return n + " مادة";
    }

    function cntNom(n) {            /* للرفع: مادتان */
        return n === 2 ? "مادتان" : cnt(n);
    }

    function hoursWord(h) {
        if (h === 1) { return "ساعة واحدة"; }
        if (h === 2) { return "ساعتان"; }
        if (h >= 3 && h <= 10) { return h + " ساعات"; }
        return h + " ساعة";
    }

    function semWord(n) {
        if (n === 1) { return "فصل واحد"; }
        if (n === 2) { return "فصلان"; }
        if (n >= 3 && n <= 10) { return n + " فصول"; }
        return n + " فصلاً";
    }

    function seq(n) {               /* تسلسل من N: مادتين متتابعتين / 5 مواد متتابعة */
        return n === 2 ? "مادتين متتابعتين" : cnt(n) + " متتابعة";
    }

    function semGen(n) {            /* بعد حرف جر: حتى فصلين */
        if (n === 1) { return "فصل واحد"; }
        if (n === 2) { return "فصلين"; }
        if (n >= 3 && n <= 10) { return n + " فصول"; }
        return n + " فصلاً";
    }

    function extraSem(n) {          /* فصل إضافي واحد / فصلين إضافيين / 3 فصول إضافية */
        if (n === 1) { return "فصل إضافي واحد"; }
        if (n === 2) { return "فصلين إضافيين"; }
        if (n >= 3 && n <= 10) { return n + " فصول إضافية"; }
        return n + " فصلاً إضافياً";
    }

    function where(c) {
        var s = "الفصل " + c.term;
        if (c.year && c.semester) { s += " (" + c.year + "، " + c.semester + ")"; }
        return s;
    }

    function q(n) { return "«" + n + "»"; }

    function listNames(arr, limit) {
        limit = limit || NAMES_SHOWN;
        var s = arr.slice(0, limit).map(q).join("، ");
        if (arr.length > limit) { s += " (+" + (arr.length - limit) + " أخرى)"; }
        return s;
    }

    /* ---------- سياق الحساب المشترك بين الأسباب والنصائح ---------- */

    function makeCtx(m, ranked, pickedNames, totalHours) {
        var availSet = {}, pickSet = {}, pickHours = 0;
        ranked.forEach(function (e) { availSet[e.course.name] = true; });
        pickedNames.forEach(function (n) {
            pickSet[n] = true;
            if (m.courses[n]) { pickHours += hoursOf(m.courses[n]); }
        });
        return {
            m: m,
            set: ST.done(),
            availSet: availSet,
            pickSet: pickSet,
            totalHours: totalHours,
            pickHours: pickHours,
            afterHours: totalHours + pickHours
        };
    }

    /* ---------- الأسباب (بنود منظّمة) ---------- */

    function pathFor(entry) {
        var full = [entry.course.name].concat(entry.path || []);
        if (full.length <= 6) { return full; }
        /* نختصر الوسط ونُبقي البداية والنهاية */
        return full.slice(0, 4).concat(["…"], full.slice(full.length - 1));
    }

    /* خلاصة: لماذا هذه المادة الآن؟ */
    function verdict(entry) {
        var c = entry.course;
        var d = entry.direct.length;
        var tone, label, text = [];

        if (entry.critical) {
            tone = "danger"; label = "اختيار ضروري";
            text.push("تأجيلها يؤخّر تخرجك: يليها تسلسل من " + seq(entry.depth - 1) +
                      " وتبقّى " + semWord(entry.remaining) + " فقط.");
        } else if (d >= 3) {
            tone = "hot"; label = "بوابة رئيسية";
            text.push("هي المتطلب الذي يفتح لك " + listNames(entry.direct, 3) + ".");
        } else if (d >= 1) {
            tone = "hot"; label = "تفتح لك مواد";
            text.push("إنجازها شرط لفتح " + listNames(entry.direct, 3) + ".");
        } else if (entry.group === 1) {
            tone = "warn"; label = "تعويض مادة متأخرة";
            text.push("من فصل سابق في خطتك، فإنجازها يعيدك إلى مسارك، ولا يتوقف عليها غيرها.");
        } else if (entry.group === 0) {
            tone = "good"; label = "من خطة فصلك";
            text.push("من مواد فصلك الحالي ولا يتوقف عليها غيرها، فهي تكمّل ساعاتك دون أن تعطّل شيئاً.");
        } else {
            tone = "info"; label = "مادة داعمة";
            text.push("لا يتوقف عليها غيرها، وهي متاحة لإكمال ساعاتك.");
        }

        if (!entry.critical && d >= 1 && entry.opensNow.length) {
            text.push(entry.opensNow.length === d
                ? (d === 1 ? "وتُتاح لك في الفصل القادم إن نجحت فيها." : "وتُتاح لك كلها في الفصل القادم إن نجحت فيها.")
                : "وتُتاح لك " + cnt(entry.opensNow.length) + " منها في الفصل القادم إن نجحت فيها.");
        }

        if (!entry.critical && entry.depth > 1 && entry.slack === 1) {
            text.push("هامش تأجيلها فصل واحد فقط قبل أن يتأخر تخرجك.");
        }

        return { kind: "verdict", tone: tone, label: label, text: text.join(" ") };
    }

    /* سطر واحد بلغة واضحة: لماذا اختيرت هذه المادة؟ */
    function brief(entry) {
        var d = entry.direct.length;
        if (entry.critical) {
            return { tone: "danger", label: "لا يصح تأجيلها",
                     text: "تأجيلها يؤخّر تخرجك، لذا يُنصح بتسجيلها في هذا الفصل." };
        }
        if (d >= 1) {
            var names = entry.direct.slice(0, 2).map(q).join(" و");
            var more = d > 2 ? " وغيرهما" : "";
            return { tone: "hot", label: "شرط لمواد لاحقة",
                     text: "النجاح فيها شرط لتسجيل " + names + more + " في الفصول القادمة." };
        }
        if (entry.group === 1) {
            return { tone: "warn", label: "متأخرة عن خطتك",
                     text: "فصلها في الخطة سابق لفصلك الحالي، وتسجيلها يعيدك إلى المسار الصحيح." };
        }
        if (entry.group === 0) {
            return { tone: "good", label: "من خطة فصلك",
                     text: "من مواد هذا الفصل في الخطة الدراسية." };
        }
        return { tone: "info", label: "مادة مكمّلة", text: "تكمّل ساعاتك دون أن تعطّل مادة أخرى." };
    }

    /* هل يمكن تأجيل المادة؟ (للقائمة التي يختار منها الطالب بنفسه) */
    function postponeInfo(entry) {
        if (entry.critical) {
            return { tone: "danger", text: "لا يصح تأجيلها: تأجيلها يؤخّر تخرجك" };
        }
        if (entry.depth > 1 && entry.slack === 1) {
            return { tone: "warn", text: "يمكن تأجيلها فصلاً واحداً فقط" };
        }
        return { tone: "ok", text: "يمكن تأجيلها دون تأخير التخرج" };
    }

    function explain(entry, curTerm, totalHours, ctx) {
        var c = entry.course;
        var items = [];

        items.push(verdict(entry));

        /* 1) موقعها في تسلسل المواد */
        if (entry.critical) {
            var crit = entry.depth === entry.remaining
                ? "يبدأ بها تسلسل من " + seq(entry.depth) + " (كل مادة تتطلب التي قبلها)، وتبقّى في الخطة " +
                  semWord(entry.remaining) + ". أي تأجيل لها يؤخّر تخرجك."
                : "تسلسلها " + seq(entry.depth) + "، وهو أطول من الفصول المتبقية في الخطة (" +
                  entry.remaining + ")، فتسجيلها الآن يحدّ من التأخر.";
            items.push({ kind: "critical", tone: "danger", label: "المسار الحرج", text: crit, path: pathFor(entry) });
        } else if (entry.depth > 1) {
            var tail = entry.path[entry.path.length - 1];
            items.push({
                kind: "chain", tone: entry.slack <= 1 ? "warn" : "info", label: "موقعها في التسلسل",
                text: "يبدأ بها تسلسل من " + seq(entry.depth) + "، أطولها ينتهي بـ " + q(tail) +
                      ". وتبقّى " + semWord(entry.remaining) + "، فتتحمل تأجيلها حتى " + semGen(entry.slack) +
                      " دون أن يتأخر تخرجك، لكن كل فصل تؤجّلها فيه يؤخّر المواد التي بعدها فصلاً كاملاً.",
                path: pathFor(entry)
            });
        }

        /* 2) ما تفتحه (نحسب شرط الساعات على المواد كلها لا على المادة وحدها) */
        var hourOnly = (entry.joint || []).filter(function (j) {
            return !j.partners.length && j.hourReq && ctx.afterHours > j.hourReq;
        });
        var jointReal = (entry.joint || []).filter(function (j) { return hourOnly.indexOf(j) === -1; });
        var opensAll = entry.opensNow.length + hourOnly.length;

        if (entry.direct.length > 0) {
            var extra = [];
            if (opensAll === entry.direct.length) {
                extra.push(entry.direct.length === 1 ? "تُتاح فور نجاحك فيها." : "كلها تُتاح فور نجاحك فيها.");
            } else if (opensAll > 0) {
                extra.push(cntNom(opensAll) + " منها تُتاح فور نجاحك، والباقي ينتظر متطلبات أخرى (مبيّنة أدناه).");
            } else {
                extra.push("لا تُتاح أي منها وحدها، فلكل منها متطلبات أخرى أو شرط ساعات (مبيّن أدناه).");
            }
            if (hourOnly.length) {
                extra.push("شرط الساعات في " + listNames(hourOnly.map(function (j) { return j.name; }), 3) +
                           " يتحقق بعد نجاحك في موادك كلها.");
            }
            if (entry.chain > entry.direct.length) {
                extra.push("وتمتد السلسلة إلى " + cnt(entry.chain) + " لاحقة في المجموع.");
            }
            if (entry.leadsToProject) {
                extra.push("وهي من المواد التي تؤدي في النهاية إلى مشاريع التخرج.");
            }
            items.push({
                kind: "opens", tone: "hot",
                label: "تفتح لك " + cnt(entry.direct.length),
                names: entry.direct,
                text: extra.join(" ")
            });
        } else {
            items.push({
                kind: "opens", tone: "muted", label: "لا تفتح مواد",
                text: "لا يتوقف عليها أي مادة أخرى في الخطة."
            });
        }

        /* 3) مواد تحتاج معها شريكاً: هنا تظهر قيمة التسجيل المتزامن */
        if (jointReal.length) {
            var lines = jointReal.slice(0, 3).map(function (j) {
                var parts = [];
                if (j.partners.length) {
                    var ps = j.partners.map(function (p) {
                        return q(p) + (ctx.pickSet[p] ? " (ضمن موادك)" :
                                       ctx.availSet[p] ? " (متاحة لك الآن)" : " (غير متاحة بعد)");
                    }).join(" و");
                    parts.push(q(j.name) + " لا تُتاح بهذه المادة وحدها، تحتاج معها " + ps + ".");
                }
                if (j.hourReq && ctx.afterHours <= j.hourReq) {
                    parts.push((j.partners.length ? "وتتطلب" : q(j.name) + " تتطلب") +
                               " أيضاً أكثر من " + j.hourReq + " ساعة منجزة، وساعاتك بعد هذه المواد " + ctx.afterHours + ".");
                }
                return parts.join(" ");
            });
            if (jointReal.length > 3) { lines.push("(+" + (jointReal.length - 3) + " أخرى)"); }
            items.push({ kind: "joint", tone: "info", label: "تنتظر شريكاً", lines: lines });
        }

        /* 4) ما بُنيت عليه */
        var pre = c.prereqsDirect || c.prereqs;
        if (!pre.length) {
            items.push({ kind: "base", tone: "good", label: "نقطة بداية",
                text: "لا تتطلب أي مادة سابقة، فهي أول حلقة في تسلسلها ويمكن البدء بها مباشرة." });
        } else {
            items.push({ kind: "base", tone: "muted", label: "تبني على",
                text: "متطلباتها المنجزة لديك:", names: pre });
        }

        /* 5) المسار */
        if (c.isFoundation) {
            items.push({
                kind: "track", tone: "muted", label: "مادة تأسيسية",
                text: entry.tracksDown.length
                    ? "تقوم عليها مواد في مسارات: " + listNames(entry.tracksDown, 4) + "."
                    : "من المواد التأسيسية التي تقوم عليها بقية الخطة."
            });
        } else if (c.rootOf && c.rootOf.length) {
            items.push({
                kind: "track", tone: "muted", label: "بداية مسار",
                text: "هي جذر مسار " + listNames(c.rootOf, 2) + " في خريطة الخطة" +
                      (entry.chain ? "، وبعدها " + cnt(entry.chain) + " تعتمد عليها." : ".")
            });
        } else if (c.tracks && c.tracks.length) {
            items.push({
                kind: "track", tone: "muted", label: "مسارها",
                text: "تنتمي إلى مسار " + listNames(c.tracks, 2) + "." +
                      (entry.tracksDown.length ? " وتمتد سلسلتها إلى مواد في مسار " + listNames(entry.tracksDown, 3) + "." : "")
            });
        }

        /* 6) موقعها في الخطة */
        if (entry.group === 0) {
            items.push({ kind: "term", tone: "good", label: "موقعها في الخطة",
                text: "من مواد فصلك الحالي: " + where(c) + "." });
        } else if (entry.group === 1) {
            items.push({ kind: "term", tone: "warn", label: "موقعها في الخطة",
                text: "متأخرة عن مسارك: فصلها الأصلي " + where(c) + "، وفصلك الحالي هو الفصل " + curTerm + "." });
        } else if (entry.group === 2) {
            items.push({ kind: "term", tone: "info", label: "موقعها في الخطة",
                text: "فصلها الأصلي قادم: " + where(c) + "، لكنها متاحة لك الآن لاكتمال متطلباتها." });
        } else {
            items.push({ kind: "term", tone: "info", label: "موقعها في الخطة",
                text: "مادة اختيارية أو خارج الجدول الفصلي للخطة." });
        }

        if (c.hourReq) {
            items.push({ kind: "hours", tone: "info", label: "شرط الساعات",
                text: "متحقق: ساعاتك المنجزة " + totalHours + " وهي أكثر من " + c.hourReq + "." });
        }

        if (!c.hoursKnown) {
            items.push({ kind: "warn", tone: "warn", label: "تنبيه",
                text: "عدد ساعاتها غير محدد في الخطة، وافترضنا " + ASSUMED_HOURS + " ساعات للحساب." });
        }

        return items;
    }

    /* لماذا لم تدخل المادة ضمن المقترحة؟ */
    function whyNot(entry, h, load, total, heavy, cap, max, relaxed) {
        var safe = "";
        if (!entry.critical && entry.depth > 1) {
            safe = " ويمكنك تأجيلها حتى " + semGen(entry.slack) + " دون تأخير تخرجك.";
        } else if (entry.direct.length === 0) {
            safe = " ولا يتوقف عليها أي مادة أخرى، فتأجيلها لا يعطّل غيرها.";
        }
        if (total + h > max) {
            return "لا تتسع ساعاتها (" + hoursWord(h) + "): سيصبح المجموع " + (total + h) + " والحد الأعلى " + max + "." + safe;
        }
        if (load === "heavy" && !relaxed && heavy >= cap) {
            return "اكتفينا بـ " + cnt(cap) + " ثقيلة كحد أقصى للحفاظ على توازن الفصل." + safe;
        }
        return "اكتملت ساعاتك بمواد أعلى منها أولوية" +
               (entry.direct.length ? " (هذه تفتح " + cnt(entry.direct.length) + ")." : ".") + safe;
    }

    /* ---------- الاختيار ---------- */

    /* يرجع مصفوفة فهارس المواد المختارة أو null إن تعذّر بلوغ الحد الأدنى */
    function selectIdx(items, min, max, cap) {
        var N = items.length;
        var memo = {};

        function ok(i, h, k) {
            if (h > max || k > cap) { return false; }
            if (i === N) { return h >= min; }
            var key = i + "|" + h + "|" + k;
            if (memo[key] !== undefined) { return memo[key]; }
            var r = ok(i + 1, h, k) ||
                    ok(i + 1, h + items[i].h, k + (items[i].load === "heavy" ? 1 : 0));
            memo[key] = r;
            return r;
        }

        if (!ok(0, 0, 0)) { return null; }

        var chosen = [], h = 0, k = 0;
        for (var i = 0; i < N; i++) {
            var nh = h + items[i].h;
            var nk = k + (items[i].load === "heavy" ? 1 : 0);
            if (ok(i + 1, nh, nk)) {
                chosen.push(i);
                h = nh;
                k = nk;
            }
        }
        return chosen;
    }

    /* المواد التي تُفتح بعد إنجاز هذه المواد (حساب دقيق من المتطلبات وشرط الساعات) */
    function nextOpens(m, picksNames, availNames) {
        var set = ST.done();
        picksNames.forEach(function (n) { set[n] = true; });
        var res = ST.computeWith(m, set, ST.extra());
        var before = {};
        availNames.forEach(function (n) { before[n] = true; });
        return res.available.map(function (c) { return c.name; })
            .filter(function (n) { return !before[n]; });
    }

    /* الساعات المتبقية من مواد الخطة (الجدول الفصلي فقط) */
    function paceInfo(m, curTerm) {
        var set = ST.done();
        var hours = 0, unknown = 0;
        m.order.forEach(function (n) {
            var c = m.courses[n];
            if (!c.term || set[n]) { return; }
            if (c.hoursKnown) { hours += c.hours; } else { unknown++; }
        });
        var remainingTerms = Math.max(1, (m.totalTerms || 10) - curTerm + 1);
        return {
            hours: hours,
            unknown: unknown,
            terms: remainingTerms,
            perTerm: Math.ceil(hours / remainingTerms)
        };
    }

    /* توقّع الفصل القادم: إن نجح الطالب في المواد المختارة، كم ساعة ستتاح له؟
       (المواد المتاحة التي لم يختَرها الآن + المواد التي ستُفتح بنجاحه) */
    function forecast(m, ranked, chosenNames) {
        var chosen = {};
        chosenNames.forEach(function (n) { chosen[n] = true; });
        var avail = ranked.map(function (e) { return e.course.name; });
        var opened = nextOpens(m, chosenNames, avail);
        var hours = 0;
        avail.forEach(function (n) { if (!chosen[n]) { hours += hoursOf(m.courses[n]); } });
        opened.forEach(function (n) { hours += hoursOf(m.courses[n]); });
        return { opened: opened, hours: hours };
    }

    /* هل سيتأخر التخرج؟ أقل عدد فصول يحتاجه الطالب = الأكبر من:
       (أطول سلسلة مواد متبقية) و(الساعات المتبقية ÷ حدّه الأعلى) */
    function gradStatus(m, meta, curTerm, max) {
        var pace = paceInfo(m, curTerm);
        var byChain = meta ? meta.maxDepth : 0;
        var byHours = pace.hours > 0 ? Math.ceil(pace.hours / max) : 0;
        var need = Math.max(byChain, byHours);
        var remaining = meta ? meta.remaining : pace.terms;
        return { need: need, remaining: remaining, spare: remaining - need,
                 byChain: byChain, byHours: byHours, pace: pace };
    }

    /* إضافة مادة متاحة الآن تجعل مادة أخرى قابلة للتسجيل في الفصل القادم (فقط إن اتسع لها الحد الأعلى) */
    function partnerAdvice(m, ctx, picks, total, max) {
        var out = [], seen = {};
        picks.forEach(function (p) {
            p.course.unlocksDirect.forEach(function (d) {
                if (seen[d] || ctx.set[d] || ctx.pickSet[d]) { return; }
                var dc = m.courses[d];
                var missing = dc.prereqs.filter(function (x) { return !ctx.set[x] && !ctx.pickSet[x]; });
                if (!missing.length) { return; }
                if (!missing.every(function (x) { return ctx.availSet[x]; })) { return; }
                var addHours = missing.reduce(function (s, x) { return s + hoursOf(m.courses[x]); }, 0);
                if (dc.hourReq && !(ctx.afterHours + addHours > dc.hourReq)) { return; }
                if (total + addHours > max) { return; }
                seen[d] = true;
                out.push({ d: d, add: missing, addHours: addHours });
            });
        });
        out.sort(function (a, b) { return a.add.length - b.add.length; });
        return out.slice(0, 1).map(function (o) {
            var names = "«" + o.add.join("» و«") + "»";
            return {
                tone: "info",
                title: "اقتراح لتسريع خطتك",
                text: "يمكنك إضافة " + names + " إلى موادك دون تجاوز حدّك الأعلى (يصبح المجموع " + (total + o.addHours) +
                      " ساعة)، وبذلك تستطيع تسجيل " + q(o.d) + " في الفصل القادم بدلاً من تأجيلها فصلاً."
            };
        });
    }

    /* مواد متوقفة على شرط الساعات فقط (متطلباتها متحققة بعد هذه المواد) */
    function hoursGateAdvice(m, ctx) {
        var gated = [];
        m.order.forEach(function (n) {
            var c = m.courses[n];
            if (!c.hourReq || ctx.set[n] || ctx.pickSet[n]) { return; }
            var missing = c.prereqs.filter(function (p) { return !ctx.set[p] && !ctx.pickSet[p]; });
            if (missing.length) { return; }
            if (ctx.afterHours > c.hourReq) { return; }
            gated.push({ c: c, short: c.hourReq + 1 - ctx.afterHours });
        });
        gated.sort(function (a, b) { return a.short - b.short; });
        return gated.slice(0, 1).map(function (g) {
            return {
                tone: "warn",
                title: "شرط الساعات يؤخّر تسجيل " + q(g.c.name),
                text: "ستكتمل متطلباتها السابقة بعد هذه المواد، لكنها تشترط إنجاز أكثر من " + g.c.hourReq +
                      " ساعة، وساعاتك بعد هذه المواد " + ctx.afterHours + "، أي ينقصك " + hoursWord(g.short) +
                      ". وتُحتسب المواد الإضافية (غير المذكورة في الخطة) في خانة «ساعات إضافية منجزة»."
            };
        });
    }

    function pick(ranked, min, max, curTerm, totalHours, meta) {
        var m = ST.model();
        var items = ranked.map(function (e) {
            return { e: e, h: hoursOf(e.course), load: loadOf(e.course) };
        });

        var heavyCap = Math.max(2, Math.floor(max / 4));
        var idx = null, relaxed = false;

        /* 1) بسقف الثقيلة، 2) بدونه، ثم نخفض الحد الأدنى تدريجياً إن لزم */
        for (var t = min; t >= 1 && idx === null; t--) {
            idx = selectIdx(items, t, max, heavyCap);
            if (idx === null) {
                idx = selectIdx(items, t, max, Infinity);
                if (idx !== null) { relaxed = true; }
            }
        }
        if (idx === null) { idx = []; }

        var chosenFlag = {};
        idx.forEach(function (i) { chosenFlag[i] = true; });

        var pickedNames = idx.map(function (i) { return items[i].e.course.name; });
        var ctx = makeCtx(m, ranked, pickedNames, totalHours);

        var picks = idx.map(function (i) {
            var it = items[i];
            return {
                entry: it.e,
                course: it.e.course,
                hours: it.h,
                assumed: !it.e.course.hoursKnown,
                load: it.load,
                reasons: explain(it.e, curTerm, totalHours, ctx)
            };
        });

        var total = 0, heavy = 0, light = 0, mid = 0, assumedCount = 0;
        picks.forEach(function (p) {
            total += p.hours;
            if (p.load === "heavy") { heavy++; } else if (p.load === "light") { light++; } else { mid++; }
            if (p.assumed) { assumedCount++; }
        });

        /* سبب استبعاد كل مادة متاحة لم تدخل ضمن المواد المقترحة */
        var excluded = {};
        items.forEach(function (it, i) {
            if (!chosenFlag[i]) {
                excluded[it.e.course.name] = whyNot(it.e, it.h, it.load, total, heavy, heavyCap, max, relaxed);
            }
        });

        var availableHours = items.reduce(function (s, x) { return s + x.h; }, 0);
        var belowMin = total < min;

        /* ---------- النصائح (عملية وبلغة واضحة) ---------- */
        var advice = [];
        var picked = {};
        picks.forEach(function (p) { picked[p.course.name] = true; });
        var pickedNames = picks.map(function (p) { return p.course.name; });

        /* 1) الساعات */
        if (belowMin) {
            advice.push(availableHours < min ? {
                tone: "warn", title: "الساعات المتاحة لا تبلغ حدّك الأدنى",
                text: "مجموع ساعات المواد المتاحة لك الآن " + availableHours + " ساعة وحدّك الأدنى " + min +
                      "؛ لأن بعض المواد تنتظر متطلبات سابقة. خفّض الحد الأدنى، أو تأكد من تحديد كل المواد التي أنهيتها."
            } : {
                tone: "warn", title: "تعذّر بلوغ الحد الأدنى للساعات",
                text: "لم نجد توليفة تبلغ " + min + " ساعة دون تجاوز " + max + " بسبب توزيع ساعات المواد المتاحة. جرّب تعديل الحدّين."
            });
        }

        /* 2) المواد التي لا يصح تأجيلها */
        var critAll = ranked.filter(function (e) { return e.critical; });
        var critMissed = critAll.filter(function (e) { return !picked[e.course.name]; });
        if (critMissed.length) {
            advice.push({
                tone: "danger", title: "مواد لا يصح تأجيلها لم تدخل ضمن المواد المقترحة",
                text: listNames(critMissed.map(function (e) { return e.course.name; })) +
                      ": تأجيلها يؤخّر تخرجك. ارفع الحد الأعلى للساعات، أو استبدل بها مادة أقل أهمية."
            });
        }

        /* 3) موعد التخرج */
        if (m) {
            var g = gradStatus(m, meta, curTerm, max);
            if (g.need > 0) {
                if (g.spare < 0) {
                    var why = g.byChain >= g.byHours
                        ? "أطول سلسلة مواد متبقية تحتاج " + semWord(g.byChain) + " لأن كل مادة فيها تتطلب التي قبلها"
                        : "المتبقي من الخطة " + g.pace.hours + " ساعة، وبحدّك الأعلى (" + max + ") تحتاج " + semWord(g.byHours);
                    advice.push({
                        tone: "danger", title: "من المتوقع أن يتأخر تخرجك",
                        text: why + "، بينما المتبقي في خطتك " + semWord(g.remaining) + "؛ فستحتاج إلى " + extraSem(-g.spare) +
                              " على الأقل. للحدّ من التأخر: سجّل الحد الأعلى من الساعات في كل فصل، وابدأ بالمواد التي لا يصح تأجيلها."
                    });
                } else if (g.spare === 0) {
                    advice.push({
                        tone: "warn", title: "تخرجك في موعده، لكن دون أي فصل احتياطي",
                        text: "تحتاج " + semWord(g.need) + " على الأقل وقد بقي لك " + semWord(g.remaining) +
                              "، أي أنه لا يوجد فصل زائد عن حاجتك. الرسوب في مادة مهمة أو تقليل ساعاتك في أي فصل سيؤخّر تخرجك."
                    });
                } else {
                    advice.push({
                        tone: "success", title: "تخرجك في موعده",
                        text: "تحتاج " + semWord(g.need) + " على الأقل وقد بقي لك " + semWord(g.remaining) +
                              "، أي أن لديك مجالاً لتأجيل المواد بمقدار " + semGen(g.spare) +
                              " دون أن يتأخر تخرجك. ولا يزال الأفضل ألا تؤجّل المواد التي تفتح لك مواد لاحقة."
                    });
                }

                /* معدل الساعات (إن لم يكن التأخر محسوماً) */
                if (g.spare >= 0 && g.pace.hours > 0 && total > 0 && g.pace.perTerm > total) {
                    advice.push({
                        tone: g.spare === 0 ? "warn" : "info", title: "ساعاتك أقل من المعدل اللازم",
                        text: "لإنهاء المتبقي (" + g.pace.hours + " ساعة) خلال " + semWord(g.pace.terms) + " تحتاج في المتوسط " +
                              g.pace.perTerm + " ساعة في كل فصل، وساعاتك الآن " + total + " ساعة. رفع ساعاتك قدر المستطاع يمنحك مرونة أكبر لاحقاً."
                    });
                }
            }
        }

        /* 4) الفصل القادم: هل ستجد مواد كافية؟ */
        var opened = [];
        if (m && picks.length) {
            var fc = forecast(m, ranked, pickedNames);
            opened = fc.opened;
            if (fc.hours < min) {
                var better = ranked.filter(function (e) { return !picked[e.course.name] && e.direct.length > 0; })
                                   .slice(0, 2).map(function (e) { return e.course.name; });
                advice.push({
                    tone: "warn", title: "قد لا تجد مواد كافية في الفصل القادم",
                    text: "إن نجحت في هذه المواد فستتاح لك في الفصل القادم مواد بمجموع " + fc.hours + " ساعة فقط، وحدّك الأدنى " + min + "." +
                          (better.length ? " ولتفادي ذلك فكّر في استبدال إحدى المواد بـ " + better.map(q).join(" أو ") +
                                          " لأنها شرط لمواد لاحقة." : "")
                });
            } else {
                advice.push({
                    tone: "success", title: "الفصل القادم مضمون نسبياً",
                    text: "إن نجحت في هذه المواد فستتاح لك في الفصل القادم مواد بمجموع " + fc.hours +
                          " ساعة، وهو يكفي لتسجيل فصل كامل."
                });
            }
        }

        /* 5) مواد يجب النجاح فيها (لأن غيرها يعتمد عليها) */
        var keyPicks = picks.filter(function (p) { return p.entry.chain >= 3; })
                            .sort(function (a, b) { return b.entry.chain - a.entry.chain; }).slice(0, 2);
        if (keyPicks.length) {
            advice.push({
                tone: "info", title: "مواد تستحق أكبر قدر من الاهتمام",
                text: keyPicks.map(function (p) {
                          return q(p.course.name) + " (تعتمد عليها " + cnt(p.entry.chain) + " لاحقة)";
                      }).join(" و") +
                      ". الرسوب في إحداها يؤخّر المواد المبنية عليها فصلاً كاملاً على الأقل، فاجعلها أولوية في المذاكرة."
            });
        }

        /* 6) اقتراحات تسريع + شرط الساعات */
        if (m && picks.length) {
            partnerAdvice(m, ctx, picks, total, max).forEach(function (a) { advice.push(a); });
            hoursGateAdvice(m, ctx).forEach(function (a) { advice.push(a); });
        }

        /* 7) مواد متأخرة عن الفصل */
        var lateMissed = ranked.filter(function (e) {
            return e.group === 1 && !picked[e.course.name] && !e.critical;
        });
        if (lateMissed.length) {
            advice.push({
                tone: "warn", title: "مواد متأخرة عن فصلك لم تدخل ضمن المواد المقترحة",
                text: listNames(lateMissed.map(function (e) { return e.course.name; }), 3) +
                      ". فصلها في الخطة سابق لفصلك الحالي، فاحرص على تعويضها في الفصول القادمة."
            });
        }

        if (relaxed && !belowMin) {
            advice.push({
                tone: "warn", title: "حمل دراسي مرتفع نسبياً",
                text: "تعذّر بلوغ الحد الأدنى مع توزيع متوازن، فزاد عدد المواد الثقيلة. راجع وقتك قبل التسجيل."
            });
        }

        if (assumedCount > 0) {
            advice.push({
                tone: "warn", title: "ساعات غير محددة في الخطة",
                text: (assumedCount === 1 ? "ساعات إحدى المواد المقترحة" : "ساعات " + assumedCount + " من المواد المقترحة") +
                      " غير محددة، وافترضنا " + ASSUMED_HOURS + " ساعات لكل منها. راجع ساعاتها الفعلية قبل التسجيل."
            });
        }

        var rank = { danger: 0, warn: 1, info: 2, success: 3 };
        advice = advice.map(function (a, i) { a.i = i; return a; })
                       .sort(function (a, b) { return (rank[a.tone] - rank[b.tone]) || (a.i - b.i); });
        /* نُبقي كل التحذيرات المهمة، ونكمل حتى 4 نصائح فقط حتى لا تتشتت */
        var important = advice.filter(function (a) { return a.tone === "danger" || a.tone === "warn"; }).length;
        advice = advice.slice(0, Math.max(4, important));

        return {
            picks: picks,
            ctx: ctx,
            total: total,
            heavy: heavy, light: light, mid: mid,
            heavyCap: heavyCap,
            min: min, max: max,
            belowMin: belowMin,
            relaxed: relaxed,
            availableHours: availableHours,
            excluded: excluded,
            opened: opened,
            advice: advice,
            footnote: "الاقتراح مبني على متطلبات الخطة الدراسية. راجع مرشدك الأكاديمي قبل التسجيل."
        };
    }

    window.AIPick = {
        pick: pick,
        explain: explain,
        brief: brief,
        forecast: function (ranked, names) { return forecast(ST.model(), ranked, names); },
        postponeInfo: postponeInfo,
        makeCtx: makeCtx,
        loadOf: loadOf,
        hoursOf: hoursOf,
        hoursWord: hoursWord,
        semWord: semWord,
        cnt: cnt,
        where: where,
        ASSUMED_HOURS: ASSUMED_HOURS
    };
})();
