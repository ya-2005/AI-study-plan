/* whatsnew.js: رسالة "ما الجديد" تظهر مرة واحدة فقط لكل مستخدم.
   لإظهارها من جديد بعد تحديث قادم: غيّر VERSION (مثلاً v2) وعدّل القائمة. */
(function () {
  "use strict";
  var VERSION = "v3";
  var KEY = "studyplan:whatsnew:" + VERSION;
  var ITEMS = [
    ["حاسبة المعدل", "احسب معدلك الفصلي والتراكمي بحسب سلّم التقدير المعتمد.", "gpa.html"],
    ["مقارنة بين تخصصين", "اعرض المواد المشتركة والمختلفة بين أي تخصصين جنباً إلى جنب.", "compare.html"],
    ["تتبّع تقدمك الدراسي", "علّم المواد التي أنهيتها وتابع نسبة إنجازك، واطّلع على مسار أي مادة (ما قبلها وما بعدها)، وابحث عن أي مادة بالاسم. تجد ذلك في صفحة الخطة الدراسية بعد اختيار تخصصك."]
  ];

  try { if (localStorage.getItem(KEY)) return; } catch (e) { /* التخزين غير متاح: نعرضها */ }

  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; }

  function show() {
    if (document.getElementById("wn-overlay")) return;
    var prev = document.activeElement;
    var ov = el("div", "wn-overlay"); ov.id = "wn-overlay";
    var box = el("div", "wn-box"); box.setAttribute("role", "dialog"); box.setAttribute("aria-modal", "true"); box.setAttribute("aria-labelledby", "wn-title");
    box.appendChild(el("span", "tag", "جديد"));
    var h = el("h2", "", "ما الجديد في الموقع"); h.id = "wn-title"; box.appendChild(h);
    var ul = el("ul");
    ITEMS.forEach(function (it) {
      var li = el("li"); li.appendChild(el("b", "", it[0])); li.appendChild(document.createTextNode(it[1])); ul.appendChild(li);
    });
    box.appendChild(ul);
    var act = el("div", "wn-actions");
    ITEMS.forEach(function (it) { if (!it[2]) return; var a = el("a", "tool-btn", it[0]); a.href = it[2]; act.appendChild(a); });
    var ok = el("button", "tool-btn light", "حسناً"); ok.type = "button"; act.appendChild(ok);
    box.appendChild(act);
    var help = el("div", "wn-help");
    help.appendChild(el("b", "", "الدعم الفني"));
    help.appendChild(document.createTextNode("هل تحتاج إلى مساعدة؟ واجهتك مشكلة أو لديك اقتراح؟"));
    var ha = el("a", "tool-btn", "تواصل معنا"); ha.href = "https://t.me/yara_dev"; ha.target = "_blank"; ha.rel = "noopener noreferrer";
    help.appendChild(ha); box.appendChild(help);
    ov.appendChild(box); document.body.appendChild(ov);

    function close() {
      try { localStorage.setItem(KEY, "1"); } catch (e) { /* ignore */ }
      document.removeEventListener("keydown", onKey);
      ov.classList.remove("show");
      setTimeout(function () { ov.remove(); }, 250);
      if (prev && prev.focus) prev.focus({ preventScroll: true });
    }
    function onKey(e) { if (e.key === "Escape") close(); }
    ok.onclick = close;
    ov.addEventListener("click", function (e) { if (e.target === ov) close(); });
    /* الضغط على رابط أداة يعني أنه رآها: نسجّل ذلك قبل الانتقال */
    act.querySelectorAll("a").forEach(function (a) { a.addEventListener("click", function () { try { localStorage.setItem(KEY, "1"); } catch (e) { } }); });
    document.addEventListener("keydown", onKey);
    requestAnimationFrame(function () { ov.classList.add("show"); ok.focus({ preventScroll: true }); });
  }

  /* ننتظر انتهاء شاشة التحميل حتى لا تظهر الرسالة فوقها */
  function start() { setTimeout(show, 900); }
  if (document.readyState === "complete") start(); else window.addEventListener("load", start);
})();
