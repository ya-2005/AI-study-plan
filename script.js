/* =========================================================
   Study Plan - Main JavaScript
   Cleaned and fixed version
========================================================= */


/* ---------- Read selected major from the link (?major=...) ---------- */

(function () {
    try {
        const linked = new URLSearchParams(window.location.search).get("major");
        if (linked) {
            localStorage.setItem("selectedMajor", linked);
        }
    } catch (e) { /* ignore */ }
})();


/* ---------- Elegant "choose a major first" dialog ---------- */

function showMajorRequiredDialog() {

    if (document.getElementById("major-dialog")) {
        return;
    }

    const previousFocus = document.activeElement;

    const overlay = document.createElement("div");
    overlay.className = "app-dialog-overlay";
    overlay.id = "major-dialog";

    overlay.innerHTML =
        '<div class="app-dialog" role="alertdialog" aria-modal="true" ' +
        'aria-labelledby="dialog-title" aria-describedby="dialog-text">' +
            '<div class="app-dialog-icon">' +
                '<svg viewBox="0 0 24 24" width="30" height="30" fill="none" ' +
                'stroke="currentColor" stroke-width="2" stroke-linecap="round" ' +
                'stroke-linejoin="round"><path d="M12 9v4"/><path d="M12 17h.01"/>' +
                '<path d="M10.3 3.9 2.4 17.5A2 2 0 0 0 4.1 20.5h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/></svg>' +
            '</div>' +
            '<h3 id="dialog-title">اختر تخصصك أولاً</h3>' +
            '<p id="dialog-text">لعرض الخطة الدراسية، يجب عليك اختيار تخصصك من القائمة أولاً.</p>' +
            '<button type="button" class="app-dialog-btn">حسناً، سأختار تخصصي</button>' +
        '</div>';

    document.body.appendChild(overlay);

    const okBtn = overlay.querySelector(".app-dialog-btn");

    function closeDialog() {

        document.removeEventListener("keydown", onKey);

        overlay.classList.add("closing");

        setTimeout(function () {
            overlay.remove();
        }, 220);

        const list = document.getElementById("majors-list");
        const card = document.querySelector(".major-card");

        if (list) {
            list.classList.add("show");
        }

        if (card) {
            card.scrollIntoView({ behavior: "smooth", block: "center" });
            card.classList.remove("attention");
            void card.offsetWidth;
            card.classList.add("attention");
        }

        if (previousFocus && previousFocus.focus) {
            previousFocus.focus({ preventScroll: true });
        }
    }

    function onKey(e) {
        if (e.key === "Escape" || e.key === "Enter") {
            e.preventDefault();
            closeDialog();
        }
    }

    okBtn.addEventListener("click", closeDialog);

    overlay.addEventListener("click", function (e) {
        if (e.target === overlay) {
            closeDialog();
        }
    });

    document.addEventListener("keydown", onKey);

    requestAnimationFrame(function () {
        overlay.classList.add("visible");
        okBtn.focus({ preventScroll: true });
    });
}


/* ---------- Page loading spinner ---------- */

(function () {

    const startTime = Date.now();
    const MIN_VISIBLE = 500;

    function hideLoader() {

        const loader = document.getElementById("page-loader");

        if (!loader || loader.classList.contains("hidden")) {
            return;
        }

        const wait = Math.max(0, MIN_VISIBLE - (Date.now() - startTime));

        setTimeout(function () {

            loader.classList.add("hidden");

            setTimeout(function () {
                loader.remove();
            }, 500);

        }, wait);
    }

    if (document.readyState === "complete") {
        hideLoader();
    } else {
        window.addEventListener("load", hideLoader);
    }

    /* safety net: never keep the page hidden if something loads slowly */
    setTimeout(hideLoader, 5000);

    /* bfcache (back button) restores the page without a new load */
    window.addEventListener("pageshow", function (e) {
        if (e.persisted) {
            hideLoader();
        }
    });
})();


/* =========================================================
   Course hours (shown in small text under each course name)
========================================================= */

const COMMUNICATIONS_MAJOR = "هندسة الإتصالات الذكية";

/* communications courses whose hours are not known yet -> "-" */
const unknownHoursCommunications = [
    "الإشارات والنظم",
    "الدارات الإلكترونية 1",
    "دارات إلكترونية 1",
    "الاتصالات الرقمية",
    "هندسة الأمواج المكروية",
    "الاتصالات الضوئية",
    "اتصالات الأقمار الصناعية",
    "الدارات والنظم المكروية",
    "الهوائيات وانتشار الأمواج الراديوية",
    "أمن الاتصالات",
    "الاتصالات النقالة واللاسلكية"
];

function getCourseHours(name) {

    let major = "";

    try {
        major = localStorage.getItem("selectedMajor") || "";
    } catch (e) { /* ignore */ }

    const n = String(name || "").trim();

    if (
        major === COMMUNICATIONS_MAJOR &&
        unknownHoursCommunications.includes(n)
    ) {
        return "-";
    }

    if (n === "مهارات اللغة العربية" || n === "الإنكليزية للمهندسين") {
        return 2;
    }

    if (/^مشروع تخرج.*2$/.test(n)) {
        return 5;
    }

    if (/^مشروع تخرج.*1$/.test(n) || /^مشروع فصلي/.test(n)) {
        return 4;
    }

    if (/^تطبيقات (?!.*(الويب|الموبايل))/.test(n)) {
        return 2;
    }

    return 3;
}

/* fills a course button: name + small hours line underneath */
function setCourseLabel(el, name) {

    el.textContent = "";
    el.dataset.course = name;

    const nameEl = document.createElement("span");
    nameEl.className = "course-name";
    nameEl.textContent = name;

    const hoursEl = document.createElement("span");
    hoursEl.className = "course-hours";

    const hours = getCourseHours(name);

    hoursEl.textContent =
        hours === "-" ? "الساعات: -" : "الساعات: " + hours;

    el.appendChild(nameEl);
    el.appendChild(hoursEl);
}


/* ---------- Major selection ---------- */

function toggleMajors() {
    const list = document.getElementById("majors-list");

    if (list) {
        list.classList.toggle("show");
    }
}

function selectMajor(name) {
    const selectedBox = document.getElementById("selected-major");
    const selectedName = document.getElementById("selected-name");
    const list = document.getElementById("majors-list");

    if (selectedName) {
        selectedName.textContent = name;
    }

    if (selectedBox) {
        selectedBox.classList.add("show");
    }

    if (list) {
        list.classList.remove("show");
    }
}

function explorePlan() {
    const selectedName = document.getElementById("selected-name");
    const name = selectedName
        ? selectedName.textContent.trim()
        : "";

    if (!name) {
        showMajorRequiredDialog();
        return false;
    }

    localStorage.setItem("selectedMajor", name);
    window.location.href =
        "plan.html?major=" + encodeURIComponent(name);

    return false;
}

function showSelectedMajor() {
    const name = localStorage.getItem("selectedMajor");
    const majorName = document.getElementById("major-name");

    if (majorName && name) {
        majorName.textContent = name;
    }
}


/* =========================================================
   Communications / shared course data
========================================================= */

const foundationCourses = [
    {
        name: "الرياضيات المتقطعة",
        next: ["مدخل إلى الخوارزميات والبرمجة"]
    },
    {
        name: "الجبر الخطي ونظرية المصفوفات",
        next: ["مدخل إلى الذكاء الاصطناعي"]
    },
    {
        name: "فيزياء 1",
        next: ["الدارات المنطقية"]
    },
    {
        name: "التحليل الرياضي 1",
        next: ["التحليل الرياضي 2"]
    }
];


const studyPaths = [
    {
        title: "مسار البرمجة والذكاء الاصطناعي",

        courses: [
            {
                name: "مدخل إلى الخوارزميات والبرمجة",
                next: ["البرمجة 1"]
            },

            {
                name: "البرمجة 1",
                next: ["أساسيات قواعد البيانات"]
            },

            {
                name: "أساسيات قواعد البيانات",
                next: ["الخوارزميات وبنى المعطيات"]
            },

            {
                name: "الخوارزميات وبنى المعطيات",
                next: ["مدخل إلى الذكاء الاصطناعي"]
            },

            {
                name: "مدخل إلى الذكاء الاصطناعي",
                next: [
                    "مدخل إلى تعلم الآلة",
                    "معالجة اللغات الطبيعية"
                ]
            },

            {
                name: "مدخل إلى تعلم الآلة",
                next: ["مدخل إلى التعلم العميق"]
            },

            {
                name: "مدخل إلى التعلم العميق",
                next: ["الذكاء الاصطناعي التوليدي"]
            },

            {
                name: "الذكاء الاصطناعي التوليدي",
                next: []
            },

            {
                name: "معالجة اللغات الطبيعية",
                next: []
            },

            {
                name: "البرمجة بلغة بايثون",
                next: []
            }
        ]
    },


    {
        title: "الرياضيات والإشارات",

        courses: [
            {
                name: "التحليل الرياضي 2",
                next: ["التحليل العددي"]
            },

            {
                name: "التحليل العددي",
                next: []
            },

            {
                name: "الإحصاء والاحتمالات",
                next: ["تقانات إحصائية في علوم البيانات"]
            },

            {
                name: "تقانات إحصائية في علوم البيانات",
                next: []
            },

            {
                name: "المعادلات التفاضلية والتحويلات",
                next: ["الإشارات والنظم"]
            },

            {
                name: "الإشارات والنظم",
                next: ["أسس نظم الاتصالات"]
            },

            {
                name: "معالجة الإشارة",
                next: ["معالجة الإشارة الرقمية"]
            },

            {
                name: "معالجة الإشارة الرقمية",
                next: []
            }
        ]
    },


    {
        title: "الاتصالات والشبكات",

        courses: [
            {
                name: "تصميم الدارات ذات التكامل الواسع النطاق",
                next: []
            },

            {
                name: "تراسل البيانات",
                next: [
                    "نظرية المعلومات",
                    "شبكات الحاسوب"
                ]
            },

            {
                name: "نظرية المعلومات",
                next: []
            },

            {
                name: "شبكات الحاسوب",
                next: []
            },

            {
                name: "أسس نظم الاتصالات",
                next: [
                    "الاتصالات الضوئية",
                    "اتصالات الأقمار الصناعية",
                    "أمن الاتصالات",
                    "الاتصالات الرقمية",
                    "الاتصالات النقالة واللاسلكية"
                ]
            },

            {
                name: "الاتصالات الضوئية",
                next: []
            },

            {
                name: "اتصالات الأقمار الصناعية",
                next: []
            },

            {
                name: "أمن الاتصالات",
                next: []
            },

            {
                name: "الاتصالات الرقمية",
                next: []
            },

            {
                name: "الاتصالات النقالة واللاسلكية",
                next: [
                    "تقانات الاتصالات الحديثة",
                    "أسس هندسة الرادار",
                    "نمذجة شبكات الاتصالات"
                ]
            },

            {
                name: "تقانات الاتصالات الحديثة",
                next: []
            },

            {
                name: "أسس هندسة الرادار",
                next: []
            },

            {
                name: "نمذجة شبكات الاتصالات",
                next: []
            }
        ]
    },


    {
        title: "الإلكترونيات والحواسيب",

        courses: [
            {
                name: "الدارات المنطقية",
                next: ["بنيان الحواسيب 1"]
            },

            {
                name: "بنيان الحواسيب 1",
                next: ["بنيان الحواسيب 2"]
            },

            {
                name: "بنيان الحواسيب 2",
                next: ["المتحكمات الصغرية والنظم المضمنة"]
            },

            {
                name: "المتحكمات الصغرية والنظم المضمنة",
                next: []
            },

            {
                name: "الدارات الكهربائية 1",
                next: [
                    "الدارات الكهربائية 2",
                    "مدخل إلى الإلكترونيات"
                ]
            },

            {
                name: "الدارات الكهربائية 2",
                next: []
            },

            {
                name: "مدخل إلى الإلكترونيات",
                next: ["دارات إلكترونية 1"]
            },

            {
                name: "دارات إلكترونية 1",
                next: ["دارات إلكترونية 2"]
            },

            {
                name: "دارات إلكترونية 2",
                next: []
            },

            {
                name: "الفيزياء 2",
                next: ["دارات إلكترونية 1"]
            }
        ]
    },


    {
        title: "التخصص والمشاريع",

        courses: [
            {
                name: "تطبيقات اتصالات",
                next: []
            },

            {
                name: "مشروع فصلي اتصالات",
                next: ["مشروع تخرج اتصالات 1"]
            },

            {
                name: "مشروع تخرج اتصالات 1",
                next: ["مشروع تخرج اتصالات 2"]
            },

            {
                name: "مشروع تخرج اتصالات 2",
                next: []
            },

            {
                name: "نظرية الحقول الكهرطيسية",
                next: ["هندسة الأمواج المكروية"]
            },

            {
                name: "هندسة الأمواج المكروية",
                next: [
                    "الهوائيات وانتشار الأمواج الراديوية",
                    "الدارات والنظم المكروية"
                ]
            },

            {
                name: "الهوائيات وانتشار الأمواج الراديوية",
                next: []
            },

            {
                name: "الدارات والنظم المكروية",
                next: []
            }
        ]
    }
];


/* =========================================================
   Generic helpers
========================================================= */

function getAllCourses() {
    let allCourses = [...foundationCourses];

    studyPaths.forEach(path => {
        allCourses = allCourses.concat(path.courses);
    });

    return allCourses;
}


function findPlanCourse(plan, name) {
    if (!plan) {
        return null;
    }

    for (const year of plan.curriculum || []) {

        for (const semester of year.semesters || []) {

            if ((semester.courses || []).includes(name)) {

                return {
                    name: name,
                    next: (plan.next && plan.next[name]) || []
                };
            }
        }
    }


    const allPlanNames = [
        ...(plan.foundation || []),
        ...(plan.independent || [])
    ];


    for (const column of plan.columns || []) {

        allPlanNames.push(...(column.roots || []));
    }


    if (allPlanNames.includes(name)) {

        return {
            name: name,
            next: (plan.next && plan.next[name]) || []
        };
    }


    if (
        plan.next &&
        Object.prototype.hasOwnProperty.call(plan.next, name)
    ) {

        return {
            name: name,
            next: plan.next[name] || []
        };
    }


    return null;
}



const extraMajorNotes = {

    "هندسة الإتصالات الذكية": {
        "تطبيقات اتصالات":
            "يجب إنجاز مقرر أسس نظم الاتصالات بالإضافة إلى إنجاز أكثر من 70 ساعة.",
        "مشروع فصلي اتصالات":
            "يجب اجتياز مقرر تطبيقات اتصالات بالإضافة إلى إنجاز أكثر من 100 ساعة.",
        "مشروع تخرج اتصالات 2":
            "يجب اجتياز مقرر مشروع تخرج 1 بالإضافة إلى إنجاز أكثر من 159 ساعة."
    }
};


function getCourseNote(name) {

    const major = localStorage.getItem("selectedMajor");

    const plan = getMajorPlan(major);

    if (plan && plan.notes && plan.notes[name]) {
        return plan.notes[name];
    }

    const extra = extraMajorNotes[major];

    return (extra && extra[name]) || "";
}


/* =========================================================
   Dark / light theme toggle
========================================================= */

function toggleTheme() {

    const isDark =
        document.documentElement.classList.toggle("dark");

    try {
        localStorage.setItem("theme", isDark ? "dark" : "light");
    } catch (e) { /* ignore */ }

    document
        .querySelectorAll(".theme-toggle")
        .forEach(btn => btn.setAttribute("aria-pressed", String(isDark)));
}

(function () {
    const isDark =
        document.documentElement.classList.contains("dark");

    document
        .querySelectorAll(".theme-toggle")
        .forEach(btn => btn.setAttribute("aria-pressed", String(isDark)));
})();


function findCourse(name) {

    const major = localStorage.getItem("selectedMajor");
    const plan = getMajorPlan(major);


    if (plan) {

        const planCourse = findPlanCourse(plan, name);

        if (planCourse) {
            return planCourse;
        }
    }


    return getAllCourses().find(
        course => course.name === name
    ) || null;
}


/* =========================================================
   Full map
========================================================= */

function showAllCourses() {

    const map = document.getElementById("course-map");

    if (!map) {
        return;
    }


    map.innerHTML = "";


    const major = localStorage.getItem("selectedMajor");
    const plan = getMajorPlan(major);


    if (isMindMapMajor(major) && plan) {

        renderCommunicationsMindMap(plan, major);
        return;
    }


    if (plan) {

        renderPlanMap(plan);
        return;
    }


    createCourseGroup(
        "المواد الأساسية",
        foundationCourses,
        true
    );


    createProgrammingFlow();


    studyPaths.slice(1).forEach(path => {

        if (path.title === "الاتصالات والشبكات") {

            createCommunicationFlow();

        } else {

            createCourseGroup(
                path.title,
                path.courses,
                false
            );
        }
    });
}


function createCourseGroup(
    title,
    courses,
    isFoundation
) {

    const map = document.getElementById("course-map");

    if (!map) {
        return;
    }


    const group = document.createElement("div");
    group.className = "course-group";


    const heading = document.createElement("h3");
    heading.className = "group-title";
    heading.textContent = title;

    group.appendChild(heading);


    courses.forEach(course => {

        const button = document.createElement("button");

        button.className = "course-card";

        if (isFoundation) {
            button.classList.add("foundation");
        }

        setCourseLabel(button, course.name);

        button.onclick = () => {
            showCourseDetails(course, button);
        };

        group.appendChild(button);
    });


    map.appendChild(group);
}


function createProgrammingFlow() {

    const map = document.getElementById("course-map");

    if (!map) {
        return;
    }


    const group = document.createElement("div");

    group.className =
        "course-group flow-group biomedical-flow";


    const title = document.createElement("h3");

    title.className = "group-title";
    title.textContent =
        "مسار البرمجة والذكاء الاصطناعي";

    group.appendChild(title);


    const names = [
        "مدخل إلى الخوارزميات والبرمجة",
        "البرمجة 1",
        "أساسيات قواعد البيانات",
        "الخوارزميات وبنى المعطيات",
        "مدخل إلى الذكاء الاصطناعي",
        "مدخل إلى تعلم الآلة",
        "مدخل إلى التعلم العميق",
        "الذكاء الاصطناعي التوليدي"
    ];


    names.forEach((name, index) => {

        const course = findCourse(name);


        if (course) {

            const button =
                document.createElement("button");

            button.className = "course-card";

            setCourseLabel(button, name);

            button.onclick = () => {
                showCourseDetails(course, button);
            };

            group.appendChild(button);
        }


        if (index < names.length - 1) {

            const arrow =
                document.createElement("div");

            arrow.className = "flow-arrow";

            arrow.textContent = "↓";

            group.appendChild(arrow);
        }
    });


    const independent =
        document.createElement("div");

    independent.className =
        "flow-independent";

    independent.textContent =
        "مادة ضمن المسار: ";


    const pythonCourse =
        findCourse("البرمجة بلغة بايثون");


    if (pythonCourse) {

        const button =
            document.createElement("button");

        button.className = "course-card";

        button.textContent =
            pythonCourse.name;

        button.onclick = () => {
            showCourseDetails(
                pythonCourse,
                button
            );
        };

        independent.appendChild(button);
    }


    group.appendChild(independent);

    map.appendChild(group);
}


function createCommunicationFlow() {

    const map =
        document.getElementById("course-map");

    if (!map) {
        return;
    }


    const group =
        document.createElement("div");

    group.className =
        "course-group flow-group biomedical-flow";


    const title =
        document.createElement("h3");

    title.className =
        "group-title";

    title.textContent =
        "مسار الاتصالات والشبكات";

    group.appendChild(title);


    const names = [
        "تراسل البيانات",
        "نظرية المعلومات",
        "شبكات الحاسوب",
        "الإشارات والنظم",
        "أسس نظم الاتصالات",
        "الاتصالات الضوئية",
        "اتصالات الأقمار الصناعية",
        "أمن الاتصالات",
        "الاتصالات الرقمية",
        "الاتصالات النقالة واللاسلكية",
        "تقانات الاتصالات الحديثة",
        "أسس هندسة الرادار",
        "نمذجة شبكات الاتصالات"
    ];


    names.forEach(name => {

        const course = findCourse(name);

        if (!course) {
            return;
        }


        const button =
            document.createElement("button");

        button.className =
            "course-card";

        setCourseLabel(button, name);

        button.onclick = () => {
            showCourseDetails(
                course,
                button
            );
        };

        group.appendChild(button);
    });


    map.appendChild(group);
}


/* =========================================================
   Course details / mini map
========================================================= */

function openCourseByName(name) {

    const course = findCourse(name);


    if (!course) {

        console.log(
            "Course not found:",
            name
        );

        return;
    }


    mindMapActiveName = name;

    revealMindMapCourse(name);


    document
        .querySelectorAll(
            ".course-card, .year-course, .mini-course-card"
        )
        .forEach(card => {

            card.classList.toggle(
                "active",
                (card.dataset.course || card.textContent.trim()) === name
            );
        });


    showCourseDetails(course);
}


function showCourseDetails(course) {

    const details =
        document.getElementById("course-details");


    if (!details || !course) {
        return;
    }


    details.innerHTML = "";


    const title =
        document.createElement("h2");

    title.className =
        "mini-map-title";

    title.textContent =
        "خريطة المواد التي تفتحها";

    details.appendChild(title);


    const subtitle =
        document.createElement("p");

    subtitle.className =
        "mini-map-subtitle";

    subtitle.textContent =
        "المادة المختارة: " + course.name;

    details.appendChild(subtitle);


    const courseNote = getCourseNote(course.name);

    if (courseNote) {

        const noteEl = document.createElement("p");

        noteEl.className = "mini-map-subtitle";

        noteEl.textContent = courseNote;

        details.appendChild(noteEl);
    }


    const toggleButton =
        document.createElement("button");

    toggleButton.className =
        "mini-toggle-all";

    toggleButton.textContent =
        "إخفاء جميع الفروع";


    toggleButton.onclick = function () {

        const branches =
            details.querySelectorAll(
                ".mini-children"
            );


        const isHidden =
            branches.length > 0 &&
            branches[0].classList.contains(
                "hidden-branch"
            );


        branches.forEach(branch => {

            branch.classList.toggle(
                "hidden-branch",
                !isHidden
            );
        });


        toggleButton.textContent =
            isHidden
                ? "إخفاء جميع الفروع"
                : "عرض جميع المواد";
    };


    details.appendChild(toggleButton);


    const tree =
        document.createElement("div");

    tree.className =
        "mini-tree";


    createMiniNode(
        course,
        tree,
        []
    );


    details.appendChild(tree);


    details.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
}


function createMiniNode(
    course,
    container,
    path
) {

    if (
        !course ||
        path.includes(course.name)
    ) {
        return;
    }


    const currentPath =
        [...path, course.name];


    const node =
        document.createElement("div");

    node.className =
        "mini-node";


    const card =
        document.createElement("button");

    card.className =
        "mini-course-card";

    setCourseLabel(card, course.name);


    card.onclick = () => {
        openCourseByName(
            course.name
        );
    };


    node.appendChild(card);


    const nextCourses =
        Array.isArray(course.next)
            ? course.next
            : [];


    if (nextCourses.length === 0) {

        container.appendChild(node);

        return;
    }


    const toggleButton =
        document.createElement("button");

    toggleButton.className =
        "mini-branch-toggle";

    toggleButton.textContent =
        "إخفاء المواد التالية";

    node.appendChild(toggleButton);


    const children =
        document.createElement("div");

    children.className =
        "mini-children";


    nextCourses.forEach(nextName => {

        const nextCourse =
            findCourse(nextName);


        if (
            !nextCourse ||
            currentPath.includes(nextName)
        ) {
            return;
        }


        const branch =
            document.createElement("div");

        branch.className =
            "mini-branch";


        const arrow =
            document.createElement("div");

        arrow.className =
            "mini-arrow";

        arrow.textContent =
            "↓";


        branch.appendChild(arrow);


        createMiniNode(
            nextCourse,
            branch,
            currentPath
        );


        children.appendChild(branch);
    });


    if (children.children.length > 0) {

        node.appendChild(children);


        toggleButton.onclick = () => {

            children.classList.toggle(
                "hidden-branch"
            );


            toggleButton.textContent =
                children.classList.contains(
                    "hidden-branch"
                )
                    ? "عرض المواد التالية"
                    : "إخفاء المواد التالية";
        };


        container.appendChild(node);

    } else {

        container.appendChild(node);
    }
}


/* =========================================================
   Yearly curriculum
========================================================= */

const yearlyCurriculum = [
    {
        year: "السنة الأولى",

        semesters: [
            {
                name: "الفصل الأول",

                courses: [
                    "مدخل إلى الخوارزميات والبرمجة",
                    "الرياضيات المتقطعة",
                    "الجبر الخطي ونظرية المصفوفات",
                    "فيزياء 1",
                    "التحليل الرياضي 1"
                ]
            },

            {
                name: "الفصل الثاني",

                courses: [
                    "الدارات المنطقية",
                    "الدارات الكهربائية 1",
                    "الإحصاء والاحتمالات",
                    "الكيمياء الحيوية",
                    "البرمجة 1"
                ]
            }
        ]
    },


    {
        year: "السنة الثانية",

        semesters: [
            {
                name: "الفصل الأول",

                courses: [
                    "المعادلات التفاضلية والتحويلات",
                    "فيزياء 2",
                    "بنيان الحواسيب 1",
                    "أساسيات قواعد البيانات",
                    "الخوارزميات وبنى المعطيات",
                    "الفيزيولوجيا والتشريح"
                ]
            },

            {
                name: "الفصل الثاني",

                courses: [
                    "بنيان الحواسيب 2",
                    "تقانات إحصائية في علوم البيانات",
                    "مدخل إلى الذكاء الاصطناعي",
                    "الإشارات والنظم",
                    "دارات إلكترونية 1",
                    "الدارات الكهربائية 2"
                ]
            }
        ]
    },


    {
        year: "السنة الثالثة",

        semesters: [
            {
                name: "الفصل الأول",

                courses: [
                    "مدخل إلى تعلم الآلة",
                    "دارات إلكترونية 2",
                    "تراسل البيانات",
                    "معالجة الإشارة",
                    "البرمجة بلغة بايثون"
                ]
            },

            {
                name: "الفصل الثاني",

                courses: [
                    "نظرية المعلومات",
                    "التحليل العددي",
                    "شبكات الحاسوب",
                    "أسس نظم الاتصالات",
                    "نظرية الحقول الكهرطيسية",
                    "معالجة الإشارة الرقمية"
                ]
            }
        ]
    },


    {
        year: "السنة الرابعة",

        semesters: [
            {
                name: "الفصل الأول",

                courses: [
                    "الإنكليزية للمهندسين",
                    "الاتصالات الرقمية",
                    "هندسة الأمواج المكروية",
                    "الاتصالات الضوئية",
                    "اتصالات الأقمار الصناعية",
                    "تطبيقات اتصالات"
                ]
            },

            {
                name: "الفصل الثاني",

                courses: [
                    "الدارات والنظم المكروية",
                    "الهوائيات وانتشار الأمواج الراديوية",
                    "أمن الاتصالات",
                    "الاتصالات النقالة واللاسلكية",
                    "مشروع فصلي اتصالات"
                ]
            }
        ]
    },


    {
        year: "السنة الخامسة",

        semesters: [
            {
                name: "الفصل الأول",

                courses: [
                    "أسس هندسة الرادار",
                    "معالجة اللغات الطبيعية",
                    "المتحكمات الصغرية والنظم المضمنة",
                    "مدخل إلى التعلم العميق",
                    "مشروع تخرج اتصالات 1"
                ]
            },

            {
                name: "الفصل الثاني",

                courses: [
                    "تقانات الاتصالات الحديثة",
                    "مشروع تخرج اتصالات 2"
                ]
            }
        ]
    }
];


/* =========================================================
   Major-specific data
========================================================= */

const medicalMajor =
    "الهندسة الطبية الذكية والمعلوماتية الحيوية";


const majorPlans = {};


majorPlans[medicalMajor] = {

    foundation: [
        "الرياضيات المتقطعة",
        "الجبر الخطي ونظرية المصفوفات",
        "فيزياء 1",
        "التحليل الرياضي 1"
    ],


    columns: [

        {
            title:
                "مسار البرمجة والذكاء الاصطناعي",

            roots: [
                "مدخل إلى الخوارزميات والبرمجة"
            ]
        },


        {
            title:
                "الرياضيات والإشارات",

            roots: [
                "الإحصاء والاحتمالات"
            ]
        },


        {
            title:
                "العلوم الحيوية",

            roots: [
                "الكيمياء الحيوية"
            ]
        },


        {
            title:
                "الفيزياء والميكانيك الحيوي",

            roots: [
                "فيزياء 2"
            ]
        },


        {
            title:
                "الإلكترونيات والحواسيب",

            roots: [
                "الدارات الكهربائية 1",
                "الدارات المنطقية"
            ],

            stop: [
                "أنظمة القياس والحساسات الحيوية"
            ]
        },


        {
            title:
                "الأجهزة الطبية والمشاريع",

            roots: [
                "أنظمة القياس والحساسات الحيوية"
            ]
        }
    ],


    /* order of the main branches (same as the xmind map) */
    mindMapRoots: [
        "فيزياء 1",
        "مدخل إلى الخوارزميات والبرمجة",
        "التحليل الرياضي 1",
        "الجبر الخطي ونظرية المصفوفات",
        "الرياضيات المتقطعة"
    ],


    /* small text shown under the course name in the map:
       the courses that must be finished to open it */
    prereqs: {
        "الروبوتية الطبية الحيوية والتطبيب عن بعد":
            "مدخل إلى الذكاء الاصطناعي + معالجة الصور الطبية الحيوية"
    },


    independent: [
        "الإنكليزية للمهندسين"
    ],


    notes: {
        "تطبيقات هندسة طبية":
            "يجب اجتياز مقرر أنظمة القياس والحساسات الحيوية بالإضافة إلى إنجاز أكثر من 70 ساعة.",
        "مشروع فصلي هندسة طبية":
            "يجب اجتياز مقرر تطبيقات هندسة طبية بالإضافة إلى إنجاز أكثر من 100 ساعة.",
        "مشروع تخرج هندسة طبية 2":
            "يجب اجتياز مقرر مشروع تخرج 1 بالإضافة إلى إنجاز أكثر من 159 ساعة."
    },


    next: {

        "فيزياء 1": [
    "الدارات المنطقية",
    "الكيمياء الحيوية",
    "فيزياء 2",
    "الدارات الكهربائية 1"
],

        "التحليل الرياضي 1": [
            "الإحصاء والاحتمالات"
        ],

        "مدخل إلى الخوارزميات والبرمجة": [
            "البرمجة 1"
        ],

        "البرمجة 1": [
            "الخوارزميات وبنى المعطيات",
            "البرمجة بلغة بايثون",
            "أساسيات قواعد البيانات"
        ],

        "الخوارزميات وبنى المعطيات": [
            "مدخل إلى الذكاء الاصطناعي"
        ],

        "مدخل إلى الذكاء الاصطناعي": [
            "مدخل إلى تعلم الآلة",
            "معالجة الصور الطبية الحيوية"
        ],

        "مدخل إلى تعلم الآلة": [
            "مدخل إلى التعلم العميق"
        ],

        "معالجة الصور الطبية الحيوية": [
            "الروبوتية الطبية الحيوية والتطبيب عن بعد"
        ],

        "البرمجة بلغة بايثون": [
            "النمذجة والمحاكاة في الهندسة الطبية الحيوية"
        ],

        "أساسيات قواعد البيانات": [
            "المعلوماتية الحيوية"
        ],

        "الإحصاء والاحتمالات": [
            "تقانات إحصائية في علوم البيانات",
            "المعادلات التفاضلية والتحويلات"
        ],

        "المعادلات التفاضلية والتحويلات": [
            "معالجة الإشارة الطبية الحيوية",
            "الكهرطيسية الحيوية"
        ],

        "الكيمياء الحيوية": [
            "الفيزيولوجيا والتشريح",
            "المواد الطبية الحيوية والتقانة النانوية"
        ],

        "فيزياء 2": [
            "الترموديناميك",
            "الميكانيك الهندسي",
            "فيزياء الأشعة"
        ],

        "فيزياء الأشعة": [
            "الطب النووي وأجهزته"
        ],

        "الميكانيك الهندسي": [
            "ميكانيك السوائل الحيوية",
            "الميكانيك الحيوي"
        ],

        "الميكانيك الحيوي": [
            "الأطراف الصناعية والأجهزة التقويمية"
        ],

        "الدارات المنطقية": [
            "بنيان الحواسيب 1"
        ],

        "بنيان الحواسيب 1": [
            "بنيان الحواسيب 2"
        ],

        "الدارات الكهربائية 1": [
            "الآلات الكهربائية وعناصر الآلات",
            "مدخل إلى الإلكترونيات الطبية الحيوية"
        ],

        "مدخل إلى الإلكترونيات الطبية الحيوية": [
            "الإلكترونيات الطبية الحيوية",
            "الدارات الإلكترونية"
        ],

        "الإلكترونيات الطبية الحيوية": [
            "الإلكترونيات والقياسيات الطبية الحيوية"
        ],

        "الدارات الإلكترونية": [
            "أنظمة القياس والحساسات الحيوية",
            "السلامة المهنية في الهندسة الطبية الحيوية"
        ],

        "السلامة المهنية في الهندسة الطبية الحيوية": [
            "صيانة وكشف أعطال الأجهزة الطبية الحيوية"
        ],

        "أنظمة القياس والحساسات الحيوية": [
            "الأجهزة الطبية الحيوية 1",
            "التحكم الطبي الحيوي",
            "تطبيقات هندسة طبية"
        ],

        "الأجهزة الطبية الحيوية 1": [
            "الأجهزة الطبية الحيوية 2"
        ],

        "الأجهزة الطبية الحيوية 2": [
            "الأعضاء الصناعية",
            "هندسة المشافي"
        ],

        "هندسة المشافي": [
            "إدارة المشافي"
        ],

        "تطبيقات هندسة طبية": [
            "مشروع فصلي هندسة طبية"
        ],

        "مشروع فصلي هندسة طبية": [
            "مشروع تخرج هندسة طبية 1"
        ],

        "الطب النووي وأجهزته": [],

        "الأعضاء الصناعية": [],

        "إدارة المشافي": [],

        "الروبوتية الطبية الحيوية والتطبيب عن بعد": [],

        "مشروع تخرج هندسة طبية 1": [
            "مشروع تخرج هندسة طبية 2"
        ]
    },


    curriculum: [

        {
            year: "السنة الأولى",

            semesters: [

                {
                    name: "الفصل الأول",

                    courses: [
                        "مدخل إلى الخوارزميات والبرمجة",
                        "الرياضيات المتقطعة",
                        "الجبر الخطي ونظرية المصفوفات",
                        "فيزياء 1",
                        "التحليل الرياضي 1"
                    ]
                },

                {
                    name: "الفصل الثاني",

                    courses: [
                        "الدارات المنطقية",
                        "الدارات الكهربائية 1",
                        "الإحصاء والاحتمالات",
                        "الكيمياء الحيوية",
                        "البرمجة 1"
                    ]
                }
            ]
        },


        {
            year: "السنة الثانية",

            semesters: [

                {
                    name: "الفصل الأول",

                    courses: [
                        "المعادلات التفاضلية والتحويلات",
                        "فيزياء 2",
                        "بنيان الحواسيب 1",
                        "أساسيات قواعد البيانات",
                        "الخوارزميات وبنى المعطيات",
                        "الفيزيولوجيا والتشريح"
                    ]
                },

                {
                    name: "الفصل الثاني",

                    courses: [
                        "بنيان الحواسيب 2",
                        "تقانات إحصائية في علوم البيانات",
                        "مدخل إلى الذكاء الاصطناعي",
                        "الترموديناميك",
                        "الميكانيك الهندسي",
                        "مدخل إلى الإلكترونيات الطبية الحيوية"
                    ]
                }
            ]
        },


        {
            year: "السنة الثالثة",

            semesters: [

                {
                    name: "الفصل الأول",

                    courses: [
                        "مدخل إلى تعلم الآلة",
                        "المواد الطبية الحيوية والتقانة النانوية",
                        "الآلات الكهربائية وعناصر الآلات",
                        "الكهرطيسية الحيوية",
                        "الدارات الإلكترونية"
                    ]
                },

                {
                    name: "الفصل الثاني",

                    courses: [
                        "البرمجة بلغة بايثون",
                        "ميكانيك السوائل الحيوية",
                        "الإلكترونيات الطبية الحيوية",
                        "أنظمة القياس والحساسات الحيوية",
                        "الميكانيك الحيوي",
                        "فيزياء الأشعة"
                    ]
                }
            ]
        },


        {
            year: "السنة الرابعة",

            semesters: [

                {
                    name: "الفصل الأول",

                    courses: [
                        "الإنكليزية للمهندسين",
                        "الإلكترونيات والقياسيات الطبية الحيوية",
                        "الأجهزة الطبية الحيوية 1",
                        "السلامة المهنية في الهندسة الطبية الحيوية",
                        "النمذجة والمحاكاة في الهندسة الطبية الحيوية",
                        "تطبيقات هندسة طبية"
                    ]
                },

                {
                    name: "الفصل الثاني",

                    courses: [
                        "الأطراف الصناعية والأجهزة التقويمية",
                        "الأجهزة الطبية الحيوية 2",
                        "معالجة الإشارة الطبية الحيوية",
                        "معالجة الصور الطبية الحيوية",
                        "مشروع فصلي هندسة طبية"
                    ]
                }
            ]
        },


        {
            year: "السنة الخامسة",

            semesters: [

                {
                    name: "الفصل الأول",

                    courses: [
                        "التحكم الطبي الحيوي",
                        "المعلوماتية الحيوية",
                        "صيانة وكشف أعطال الأجهزة الطبية الحيوية",
                        "مدخل إلى التعلم العميق",
                        "مشروع تخرج هندسة طبية 1"
                    ]
                },

                {
                    name: "الفصل الثاني",

                    courses: [
                        "هندسة المشافي",
                        "مشروع تخرج هندسة طبية 2"
                    ]
                }
            ]
        }
    ]
};



/* =========================================================
   Software Engineering & Intelligent Information Systems
========================================================= */

const softwareMajor =
    "هندسة البرمجيات ونظم المعلومات الذكية";

majorPlans[softwareMajor] = {

    foundation: [
        "الرياضيات المتقطعة",
        "الجبر الخطي ونظرية المصفوفات",
        "الفيزياء 1",
        "التحليل الرياضي 1"
    ],


    columns: [

        {
            title: "مسار البرمجة والذكاء الاصطناعي",
            roots: ["مدخل إلى الخوارزميات والبرمجة"],
            skip: [
                "نظرية الحوسبة",
                "أساسيات قواعد البيانات",
                "إدارة تشكيلة البرمجيات",
                "صيانة البرمجيات والهندسة العكسية",
                "توثيق بنى البرمجيات",
                "تطوير تطبيقات الويب",
                "تصميم نظم البرمجيات",
                "تطوير تطبيقات الموبايل",
                "اختبار البرمجيات",
                "نظم قواعد البيانات"
            ]
        },

        {
            title: "الرياضيات وعلوم البيانات",
            roots: [
                "الإحصاء والاحتمالات",
                "المعادلات التفاضلية والتحويلات",
                "التحليل الرياضي 2"
            ]
        },

        {
            title: "نظرية الحوسبة والمترجمات",
            roots: ["نظرية الحوسبة"]
        },

        {
            title: "الدارات والحواسيب",
            roots: [
                "الدارات المنطقية",
                "الفيزياء 2",
                "الدارات الكهربائية 1"
            ]
        },

        {
            title: "النظم والشبكات",
            roots: [
                "نظم التشغيل 1",
                "تراسل البيانات"
            ]
        },

        {
            title: "هندسة البرمجيات والمشاريع",
            roots: ["أساسيات قواعد البيانات"]
        },

        {
            title: "تصميم البرمجيات وإدارتها",
            roots: [
                "تصميم نظم البرمجيات",
                "إدارة تشكيلة البرمجيات",
                "صيانة البرمجيات والهندسة العكسية",
                "توثيق بنى البرمجيات"
            ]
        },

        {
            title: "تطوير البرمجيات واختبارها",
            roots: [
                "تطوير تطبيقات الويب",
                "تطوير تطبيقات الموبايل",
                "اختبار البرمجيات"
            ]
        },

        {
            title: "قواعد البيانات",
            roots: ["نظم قواعد البيانات"]
        }
    ],


    mindMapHidden: [
        "اللغة الإنجليزية 1",
        "اللغة الإنجليزية 2",
        "مهارات حاسوب",
        "مهارات اللغة العربية"
    ],


    independent: [
        "اللغة الإنجليزية 1",
        "اللغة الإنجليزية 2",
        "مهارات حاسوب",
        "مهارات اللغة العربية",
        "الإنكليزية للمهندسين",
        "نظم المعلومات الإدارية"
    ],


    notes: {
        "تطبيقات هندسة البرمجيات":
            "يجب إنجاز مقرر بنيان البرمجيات بالإضافة إلى إنجاز أكثر من 70 ساعة.",
        "مشروع فصلي هندسة البرمجيات":
            "يجب اجتياز مقرر تطبيقات هندسة البرمجيات بالإضافة إلى إنجاز أكثر من 100 ساعة.",
        "مشروع تخرج هندسة البرمجيات 2":
            "يجب اجتياز مقرر مشروع تخرج 1 بالإضافة إلى إنجاز أكثر من 159 ساعة."
    },


    next: {

        "الفيزياء 1": [
            "الدارات المنطقية",
            "الفيزياء 2",
            "الدارات الكهربائية 1"
        ],

        "الدارات المنطقية": [
            "بنيان الحواسيب 1"
        ],

        "بنيان الحواسيب 1": [
            "تراسل البيانات",
            "نظم التشغيل 1",
            "بنيان الحواسيب 2"
        ],

        "تراسل البيانات": [
            "شبكات الحاسوب"
        ],

        "نظم التشغيل 1": [
            "النظم الموزعة والحوسبة السحابية"
        ],

        "مدخل إلى الخوارزميات والبرمجة": [
            "البرمجة 1"
        ],

        "البرمجة 1": [
            "الخوارزميات وبنى المعطيات",
            "البرمجة بلغة بايثون",
            "نظرية الحوسبة",
            "أساسيات قواعد البيانات"
        ],

        "الخوارزميات وبنى المعطيات": [
            "مدخل إلى الذكاء الاصطناعي"
        ],

        "مدخل إلى الذكاء الاصطناعي": [
            "مدخل إلى تعلم الآلة"
        ],

        "مدخل إلى تعلم الآلة": [
            "مدخل إلى التعلم العميق"
        ],

        "مدخل إلى التعلم العميق": [
            "الذكاء الاصطناعي التوليدي"
        ],

        "البرمجة بلغة بايثون": [
            "البرمجة المرئية"
        ],

        "نظرية الحوسبة": [
            "تصميم المترجمات"
        ],

        "أساسيات قواعد البيانات": [
            "مدخل إلى هندسة البرمجيات",
            "نظم قواعد البيانات"
        ],

        "مدخل إلى هندسة البرمجيات": [
            "بنيان البرمجيات"
        ],

        "بنيان البرمجيات": [
            "تطبيقات هندسة البرمجيات",
            "إدارة تشكيلة البرمجيات",
            "صيانة البرمجيات والهندسة العكسية",
            "توثيق بنى البرمجيات",
            "تطوير تطبيقات الويب",
            "تصميم نظم البرمجيات"
        ],

        "تطبيقات هندسة البرمجيات": [
            "مشروع فصلي هندسة البرمجيات"
        ],

        "مشروع فصلي هندسة البرمجيات": [
            "مشروع تخرج هندسة البرمجيات 1"
        ],

        "مشروع تخرج هندسة البرمجيات 1": [
            "مشروع تخرج هندسة البرمجيات 2"
        ],

        "تصميم نظم البرمجيات": [
            "إدارة المشاريع البرمجية",
            "تطوير تطبيقات الموبايل",
            "اختبار البرمجيات"
        ],

        "إدارة المشاريع البرمجية": [
            "نماذج نضج البرمجيات"
        ],

        "نماذج نضج البرمجيات": [
            "التطوير الرشيق للبرمجيات"
        ],

        "اختبار البرمجيات": [
            "ضمان جودة البرمجيات"
        ],

        "نظم قواعد البيانات": [
            "مدخل إلى لغات الاستعلام",
            "أمن نظم قواعد البيانات",
            "قواعد البيانات المتقدمة"
        ],

        "التحليل الرياضي 1": [
            "الإحصاء والاحتمالات",
            "التحليل الرياضي 2"
        ],

        "الإحصاء والاحتمالات": [
            "تقانات إحصائية في علوم البيانات",
            "المعادلات التفاضلية والتحويلات"
        ],

        "التحليل الرياضي 2": [
            "التحليل العددي"
        ],

        "التحليل العددي": [
            "معالجة الصور وتحليلها"
        ],

        "معالجة الصور وتحليلها": [
            "مدخل إلى الرؤية الحاسوبية"
        ],

        "الرياضيات المتقطعة": [],

        "ضمان جودة البرمجيات": [],

        "التطوير الرشيق للبرمجيات": [],

        "أمن نظم قواعد البيانات": [],

        "تصميم المترجمات": [],

        "تطوير تطبيقات الموبايل": [],

        "الفيزياء 2": [],

        "تطوير تطبيقات الويب": [],

        "توثيق بنى البرمجيات": [],

        "النظم الموزعة والحوسبة السحابية": [],

        "المعادلات التفاضلية والتحويلات": [],

        "مدخل إلى الرؤية الحاسوبية": [],

        "تقانات إحصائية في علوم البيانات": [],

        "مدخل إلى لغات الاستعلام": [],

        "الدارات الكهربائية 1": [],

        "الذكاء الاصطناعي التوليدي": [],

        "بنيان الحواسيب 2": [],

        "البرمجة المرئية": [],

        "مشروع تخرج هندسة البرمجيات 2": [],

        "صيانة البرمجيات والهندسة العكسية": [],

        "شبكات الحاسوب": [],

        "قواعد البيانات المتقدمة": [],

        "إدارة تشكيلة البرمجيات": []
    },


    curriculum: [

        {
            year: "السنة الأولى",
            semesters: [
                {
                    name: "الفصل الأول",
                    courses: [
                        "مدخل إلى الخوارزميات والبرمجة",
                        "الرياضيات المتقطعة",
                        "الجبر الخطي ونظرية المصفوفات",
                        "الفيزياء 1",
                        "التحليل الرياضي 1",
                        "اللغة الإنجليزية 1"
                    ]
                },
                {
                    name: "الفصل الثاني",
                    courses: [
                        "البرمجة 1",
                        "الدارات المنطقية",
                        "الدارات الكهربائية 1",
                        "الإحصاء والاحتمالات",
                        "اللغة الإنجليزية 2",
                        "التحليل الرياضي 2"
                    ]
                }
            ]
        },

        {
            year: "السنة الثانية",
            semesters: [
                {
                    name: "الفصل الأول",
                    courses: [
                        "المعادلات التفاضلية والتحويلات",
                        "الفيزياء 2",
                        "بنيان الحواسيب 1",
                        "أساسيات قواعد البيانات",
                        "الخوارزميات وبنى المعطيات",
                        "البرمجة بلغة بايثون"
                    ]
                },
                {
                    name: "الفصل الثاني",
                    courses: [
                        "بنيان الحواسيب 2",
                        "تقانات إحصائية في علوم البيانات",
                        "مدخل إلى الذكاء الاصطناعي",
                        "البرمجة المرئية",
                        "نظرية الحوسبة",
                        "مدخل إلى هندسة البرمجيات"
                    ]
                }
            ]
        },

        {
            year: "السنة الثالثة",
            semesters: [
                {
                    name: "الفصل الأول",
                    courses: [
                        "مدخل إلى تعلم الآلة",
                        "مهارات حاسوب",
                        "تراسل البيانات",
                        "نظم التشغيل 1",
                        "تصميم المترجمات",
                        "بنيان البرمجيات"
                    ]
                },
                {
                    name: "الفصل الثاني",
                    courses: [
                        "مدخل إلى التعلم العميق",
                        "التحليل العددي",
                        "شبكات الحاسوب",
                        "نظم قواعد البيانات",
                        "النظم الموزعة والحوسبة السحابية",
                        "تطوير تطبيقات الويب"
                    ]
                }
            ]
        },

        {
            year: "السنة الرابعة",
            semesters: [
                {
                    name: "الفصل الأول",
                    courses: [
                        "مهارات اللغة العربية",
                        "الإنكليزية للمهندسين",
                        "معالجة الصور وتحليلها",
                        "تصميم نظم البرمجيات",
                        "قواعد البيانات المتقدمة",
                        "أمن نظم قواعد البيانات",
                        "تطبيقات هندسة البرمجيات"
                    ]
                },
                {
                    name: "الفصل الثاني",
                    courses: [
                        "إدارة المشاريع البرمجية",
                        "تطوير تطبيقات الموبايل",
                        "اختبار البرمجيات",
                        "إدارة تشكيلة البرمجيات",
                        "مشروع فصلي هندسة البرمجيات"
                    ]
                }
            ]
        },

        {
            year: "السنة الخامسة",
            semesters: [
                {
                    name: "الفصل الأول",
                    courses: [
                        "نماذج نضج البرمجيات",
                        "التطوير الرشيق للبرمجيات",
                        "مدخل إلى الرؤية الحاسوبية",
                        "مدخل إلى لغات الاستعلام",
                        "مشروع تخرج هندسة البرمجيات 1"
                    ]
                },
                {
                    name: "الفصل الثاني",
                    courses: [
                        "ضمان جودة البرمجيات",
                        "مشروع تخرج هندسة البرمجيات 2",
                        "صيانة البرمجيات والهندسة العكسية",
                        "توثيق بنى البرمجيات",
                        "نظم المعلومات الإدارية",
                        "الذكاء الاصطناعي التوليدي"
                    ]
                }
            ]
        }
    ]
};



/* =========================================================
   Robotics & Intelligent Systems Engineering
========================================================= */

const roboticsMajor =
    "هندسة الروبوت والنظم الذكية";

majorPlans[roboticsMajor] = {

    foundation: [
        "الرياضيات المتقطعة",
        "الجبر الخطي ونظرية المصفوفات",
        "الفيزياء 1",
        "التحليل الرياضي 1"
    ],


    columns: [

        {
            title: "مسار البرمجة والذكاء الاصطناعي",
            roots: ["مدخل إلى الخوارزميات والبرمجة"],
            skip: ["مدخل إلى الروبوتية"]
        },

        {
            title: "الروبوتية والتحكم الذكي",
            roots: ["مدخل إلى الروبوتية"]
        },

        {
            title: "الرياضيات والإشارات",
            roots: [
                "الإحصاء والاحتمالات",
                "المعادلات التفاضلية والتحويلات",
                "التحليل الرياضي 2"
            ]
        },

        {
            title: "الحواسيب والمتحكمات والشبكات",
            roots: [
                "الدارات المنطقية",
                "التصميم بمساعدة الحاسوب",
                "تراسل البيانات"
            ]
        },

        {
            title: "الميكانيك والتحكم والمشاريع",
            roots: ["الفيزياء 2"],
            skip: ["الدارات الإلكترونية 1"]
        },

        {
            title: "الإلكترونيات والآلات الكهربائية",
            roots: [
                "الدارات الإلكترونية 1",
                "الدارات الكهربائية 1"
            ]
        }
    ],


    /* order of the main branches (same as the xmind map) */
    mindMapRoots: [
        "الفيزياء 1",
        "مدخل إلى الخوارزميات والبرمجة",
        "التحليل الرياضي 1",
        "الجبر الخطي ونظرية المصفوفات",
        "الرياضيات المتقطعة"
    ],


    /* small text shown under the course name in the map:
       the courses that must be finished to open it */
    prereqs: {
        "نظرية التحكم": "الميكانيك النظري + التحليل الرياضي 2"
    },


    mindMapHidden: [
        "اللغة الإنجليزية 1",
        "اللغة الإنجليزية 2",
        "مهارات حاسوب",
        "مهارات اللغة العربية"
    ],


    independent: [
        "اللغة الإنجليزية 1",
        "اللغة الإنجليزية 2",
        "مهارات حاسوب",
        "مهارات اللغة العربية",
        "الإنكليزية للمهندسين"
    ],


    notes: {
        "تطبيقات الروبوتية":
            "يجب إنجاز مقرر نظرية التحكم ومقرر مدخل إلى الروبوتية بالإضافة إلى إنجاز أكثر من 70 ساعة.",
        "مشروع فصلي هندسة الروبوت":
            "يجب اجتياز مقرر تطبيقات الروبوتية بالإضافة إلى إنجاز أكثر من 100 ساعة.",
        "مشروع تخرج هندسة الروبوت 2":
            "يجب اجتياز مقرر مشروع تخرج 1 بالإضافة إلى إنجاز أكثر من 159 ساعة."
    },


    next: {

        "الفيزياء 1": [
            "الدارات المنطقية",
            "الفيزياء 2",
            "الدارات الكهربائية 1"
        ],

        "الدارات المنطقية": [
            "بنيان الحواسيب 1"
        ],

        "بنيان الحواسيب 1": [
            "بنيان الحواسيب 2",
            "تراسل البيانات"
        ],

        "بنيان الحواسيب 2": [
            "المتحكمات الصغرية والنظم المضمنة",
            "التصميم بمساعدة الحاسوب"
        ],

        "المتحكمات الصغرية والنظم المضمنة": [
            "المتحكمات المنطقية القابلة للبرمجة"
        ],

        "تراسل البيانات": [
            "شبكات الحاسوب"
        ],

        "الفيزياء 2": [
            "الميكانيك النظري",
            "الدارات الإلكترونية 1"
        ],

        "الميكانيك النظري": [
            "نظرية التحكم"
        ],

        "نظرية التحكم": [
            "تطبيقات الروبوتية"
        ],

        "تطبيقات الروبوتية": [
            "مشروع فصلي هندسة الروبوت"
        ],

        "مشروع فصلي هندسة الروبوت": [
            "مشروع تخرج هندسة الروبوت 1"
        ],

        "مشروع تخرج هندسة الروبوت 1": [
            "مشروع تخرج هندسة الروبوت 2"
        ],

        "الدارات الإلكترونية 1": [
            "الدارات الإلكترونية 2"
        ],

        "الدارات الإلكترونية 2": [
            "الآلات الكهربائية",
            "الحساسات والتحسس",
            "التجهيزات والقياسات الكهربائية"
        ],

        "الآلات الكهربائية": [
            "الميكانيك والآلات"
        ],

        "الدارات الكهربائية 1": [
            "الدارات الكهربائية 2",
            "مدخل إلى الإلكترونيات"
        ],

        "مدخل إلى الخوارزميات والبرمجة": [
            "البرمجة 1"
        ],

        "البرمجة 1": [
            "الخوارزميات وبنى المعطيات",
            "أساسيات قواعد البيانات",
            "البرمجة بلغة بايثون"
        ],

        "الخوارزميات وبنى المعطيات": [
            "مدخل إلى الذكاء الاصطناعي"
        ],

        "مدخل إلى الذكاء الاصطناعي": [
            "مدخل إلى تعلم الآلة",
            "مدخل إلى الروبوتية",
            "معالجة اللغات الطبيعية"
        ],

        "مدخل إلى تعلم الآلة": [
            "مدخل إلى التعلم العميق"
        ],

        "مدخل إلى التعلم العميق": [
            "الذكاء الاصطناعي التوليدي"
        ],

        "مدخل إلى الروبوتية": [
            "النظم الروبوتية",
            "النظم الميكاترونية"
        ],

        "النظم الروبوتية": [
            "نظم التحكم الصناعي",
            "الروبوتية النقالة",
            "نظم التحكم الرقمي"
        ],

        "نظم التحكم الرقمي": [
            "نظم التحكم اللحظي"
        ],

        "التحليل الرياضي 1": [
            "الإحصاء والاحتمالات",
            "التحليل الرياضي 2"
        ],

        "الإحصاء والاحتمالات": [
            "تقانات إحصائية في علوم البيانات",
            "المعادلات التفاضلية والتحويلات"
        ],

        "المعادلات التفاضلية والتحويلات": [
            "الإشارات والنظم"
        ],

        "الإشارات والنظم": [
            "معالجة الإشارة"
        ],

        "التحليل الرياضي 2": [
            "التحليل العددي"
        ],

        "التحليل العددي": [
            "معالجة الصور وتحليلها"
        ]
    },


    curriculum: [

        {
            year: "السنة الأولى",
            semesters: [
                {
                    name: "الفصل الأول",
                    courses: [
                        "مدخل إلى الخوارزميات والبرمجة",
                        "الرياضيات المتقطعة",
                        "الجبر الخطي ونظرية المصفوفات",
                        "الفيزياء 1",
                        "التحليل الرياضي 1",
                        "اللغة الإنجليزية 1"
                    ]
                },
                {
                    name: "الفصل الثاني",
                    courses: [
                        "البرمجة 1",
                        "الدارات المنطقية",
                        "الدارات الكهربائية 1",
                        "الإحصاء والاحتمالات",
                        "اللغة الإنجليزية 2",
                        "التحليل الرياضي 2"
                    ]
                }
            ]
        },

        {
            year: "السنة الثانية",
            semesters: [
                {
                    name: "الفصل الأول",
                    courses: [
                        "المعادلات التفاضلية والتحويلات",
                        "الفيزياء 2",
                        "بنيان الحواسيب 1",
                        "أساسيات قواعد البيانات",
                        "الخوارزميات وبنى المعطيات",
                        "مدخل إلى الإلكترونيات"
                    ]
                },
                {
                    name: "الفصل الثاني",
                    courses: [
                        "بنيان الحواسيب 2",
                        "تقانات إحصائية في علوم البيانات",
                        "مدخل إلى الذكاء الاصطناعي",
                        "الإشارات والنظم",
                        "الدارات الإلكترونية 1",
                        "الميكانيك النظري"
                    ]
                }
            ]
        },

        {
            year: "السنة الثالثة",
            semesters: [
                {
                    name: "الفصل الأول",
                    courses: [
                        "مدخل إلى تعلم الآلة",
                        "مهارات حاسوب",
                        "الدارات الإلكترونية 2",
                        "تراسل البيانات",
                        "الدارات الكهربائية 2",
                        "مدخل إلى الروبوتية"
                    ]
                },
                {
                    name: "الفصل الثاني",
                    courses: [
                        "شبكات الحاسوب",
                        "التحليل العددي",
                        "الآلات الكهربائية",
                        "نظرية التحكم",
                        "البرمجة بلغة بايثون",
                        "الحساسات والتحسس"
                    ]
                }
            ]
        },

        {
            year: "السنة الرابعة",
            semesters: [
                {
                    name: "الفصل الأول",
                    courses: [
                        "مهارات اللغة العربية",
                        "الإنكليزية للمهندسين",
                        "النظم الروبوتية",
                        "الميكانيك والآلات",
                        "المتحكمات الصغرية والنظم المضمنة",
                        "النظم الميكاترونية",
                        "تطبيقات الروبوتية"
                    ]
                },
                {
                    name: "الفصل الثاني",
                    courses: [
                        "نظم التحكم الصناعي",
                        "الروبوتية النقالة",
                        "المتحكمات المنطقية القابلة للبرمجة",
                        "نظم التحكم الرقمي",
                        "مشروع فصلي هندسة الروبوت"
                    ]
                }
            ]
        },

        {
            year: "السنة الخامسة",
            semesters: [
                {
                    name: "الفصل الأول",
                    courses: [
                        "التجهيزات والقياسات الكهربائية",
                        "معالجة اللغات الطبيعية",
                        "التصميم بمساعدة الحاسوب",
                        "مدخل إلى التعلم العميق",
                        "مشروع تخرج هندسة الروبوت 1"
                    ]
                },
                {
                    name: "الفصل الثاني",
                    courses: [
                        "نظم التحكم اللحظي",
                        "مشروع تخرج هندسة الروبوت 2",
                        "معالجة الصور وتحليلها",
                        "معالجة الإشارة",
                        "الذكاء الاصطناعي التوليدي"
                    ]
                }
            ]
        }
    ]
};


/* =========================================================
   Smart Information Security Systems Engineering
========================================================= */

const securityMajor =
    "هندسة نظم أمن المعلومات الذكية";

majorPlans[securityMajor] = {

    foundation: [
        "الفيزياء 1",
        "التحليل الرياضي 1"
    ],


    columns: [

        {
            title: "مسار البرمجة والذكاء الاصطناعي",
            roots: ["مدخل إلى الخوارزميات والبرمجة"],
            skip: [
                "أساسيات قواعد البيانات"
            ]
        },

        {
            title: "قواعد البيانات",
            roots: ["أساسيات قواعد البيانات"]
        },

        {
            title: "الرياضيات والإشارات",
            roots: [
                "الإحصاء والاحتمالات",
                "التحليل الرياضي 2"
            ]
        },

        {
            title: "الفيزياء والدارات والحواسيب",
            roots: [
                "الدارات المنطقية",
                "الفيزياء 2",
                "الدارات الكهربائية 1"
            ],
            skip: [
                "تراسل البيانات",
                "نظم التشغيل 1"
            ]
        },

        {
            title: "الاتصالات والشبكات",
            roots: ["تراسل البيانات"]
        },

        {
            title: "نظم التشغيل",
            roots: ["نظم التشغيل 1"],
            skip: [
                "أساسيات أمن الحواسيب"
            ]
        },

        {
            title: "أمن المعلومات",
            roots: ["أساسيات أمن الحواسيب"],
            stop: ["مشروع فصلي أمن المعلومات"]
        },

        {
            title: "المشاريع",
            roots: ["مشروع فصلي أمن المعلومات"]
        }
    ],


    /* small text shown under the course name in the map:
       the courses that must be finished to open it */
    prereqs: {
        "نظرية الحوسبة": "البرمجة 1 + الرياضيات المتقطعة",
        "نظم التشغيل 1": "بنيان الحواسيب 1 + الخوارزميات وبنى المعطيات",
        "مدخل إلى الرؤية الحاسوبية": "معالجة الصور وتحليلها + مدخل إلى تعلم الآلة"
    },


    /* order of the main branches (same as the xmind map) */
    mindMapRoots: [
        "الفيزياء 1",
        "مدخل إلى الخوارزميات والبرمجة",
        "التحليل الرياضي 1",
        "الجبر الخطي ونظرية المصفوفات",
        "الرياضيات المتقطعة"
    ],


    mindMapHidden: [
        "اللغة الإنجليزية 1",
        "اللغة الإنجليزية 2",
        "مهارات حاسوب",
        "مهارات اللغة العربية",
        "الإنكليزية للمهندسين"
    ],


    independent: [
        "الرياضيات المتقطعة",
        "الجبر الخطي ونظرية المصفوفات",
        "اللغة الإنجليزية 1",
        "اللغة الإنجليزية 2",
        "مهارات حاسوب",
        "مهارات اللغة العربية",
        "الإنكليزية للمهندسين"
    ],


    notes: {
        "تطبيقات أمن المعلومات":
            "يجب إنجاز مقرر أساسيات أمن الحواسيب ومقرر شبكات الحاسوب بالإضافة إلى إنجاز أكثر من 70 ساعة.",
        "مشروع فصلي أمن المعلومات":
            "يجب اجتياز مقرر تطبيقات أمن المعلومات بالإضافة إلى إنجاز أكثر من 100 ساعة.",
        "مشروع تخرج 2":
            "يجب اجتياز مقرر مشروع تخرج 1 بالإضافة إلى إنجاز أكثر من 159 ساعة."
    },


    next: {

        "الحوسبة عالية الأداء للذكاء الاصطناعي": [],

        "الفيزياء 1": [
            "الدارات المنطقية",
            "الفيزياء 2",
            "الدارات الكهربائية 1"
        ],

        /* الدارات والحواسيب */

        "الدارات المنطقية": [
            "بنيان الحواسيب 1"
        ],

        "بنيان الحواسيب 1": [
            "بنيان الحواسيب 2",
            "تراسل البيانات",
            "نظم التشغيل 1"
        ],

        /* الاتصالات والشبكات */

        "تراسل البيانات": [
            "نظرية المعلومات",
            "شبكات الحاسوب"
        ],

        "شبكات الحاسوب": [
            "برمجة التطبيقات الشبكية",
            "بروتوكولات الشبكات الحاسوبية"
        ],

        "بروتوكولات الشبكات الحاسوبية": [
            "إدارة الشبكات الحاسوبية"
        ],

        "إدارة الشبكات الحاسوبية": [
            "الشبكات اللاسلكية"
        ],

        /* نظم التشغيل */

        "نظم التشغيل 1": [
            "الحوسبة عالية الأداء للذكاء الاصطناعي",
            "النظم الموزعة والحوسبة السحابية",
            "أساسيات أمن الحواسيب",
            "برمجة نظم التشغيل"
        ],

        "برمجة نظم التشغيل": [
            "نظم التشغيل 2"
        ],

        "نظم التشغيل 2": [
            "نظم الزمن الحقيقي",
            "أمن نظم التشغيل"
        ],

        /* أمن المعلومات */

        "أساسيات أمن الحواسيب": [
            "تطبيقات أمن المعلومات",
            "التعمية التطبيقية",
            "كشف التطفل وإدارة الاختراقات",
            "أمن الشبكات والأمن السيبراني"
        ],

        "كشف التطفل وإدارة الاختراقات": [
            "إدارة المخاطر والامتثال"
        ],

        "التعمية التطبيقية": [
            "الاختراق الأخلاقي والدفاع عن الأنظمة"
        ],

        "تطبيقات أمن المعلومات": [
            "مشروع فصلي أمن المعلومات"
        ],

        "مشروع فصلي أمن المعلومات": [
            "مشروع تخرج 1"
        ],

        "مشروع تخرج 1": [
            "مشروع تخرج 2"
        ],

        /* البرمجة والذكاء الاصطناعي */

        "مدخل إلى الخوارزميات والبرمجة": [
            "البرمجة 1"
        ],

        "البرمجة 1": [
            "الخوارزميات وبنى المعطيات",
            "أساسيات قواعد البيانات",
            "البرمجة بلغة بايثون"
        ],

        "الخوارزميات وبنى المعطيات": [
            "مدخل إلى الذكاء الاصطناعي"
        ],

        "مدخل إلى الذكاء الاصطناعي": [
            "مدخل إلى تعلم الآلة",
            "معالجة اللغات الطبيعية"
        ],

        "مدخل إلى تعلم الآلة": [
            "مدخل إلى التعلم العميق"
        ],

        "مدخل إلى التعلم العميق": [
            "الذكاء الاصطناعي التوليدي",
            "جوانب عملية في تعلم الآلة والتعلم العميق"
        ],

        "أساسيات قواعد البيانات": [
            "نظم قواعد البيانات"
        ],

        "نظم قواعد البيانات": [
            "أمن نظم قواعد البيانات"
        ],

        /* الرياضيات */

        "التحليل الرياضي 1": [
            "الإحصاء والاحتمالات",
            "التحليل الرياضي 2"
        ],

        "الإحصاء والاحتمالات": [
            "تقانات إحصائية في علوم البيانات",
            "المعادلات التفاضلية والتحويلات"
        ],

        "المعادلات التفاضلية والتحويلات": [
            "الإشارات والنظم"
        ],

        "التحليل الرياضي 2": [
            "التحليل العددي"
        ],

        "التحليل العددي": [
            "معالجة الصور وتحليلها"
        ]
    },


    curriculum: [

        {
            year: "السنة الأولى",
            semesters: [
                {
                    name: "الفصل الأول",
                    courses: [
                        "مدخل إلى الخوارزميات والبرمجة",
                        "الرياضيات المتقطعة",
                        "الجبر الخطي ونظرية المصفوفات",
                        "الفيزياء 1",
                        "التحليل الرياضي 1",
                        "اللغة الإنجليزية 1"
                    ]
                },
                {
                    name: "الفصل الثاني",
                    courses: [
                        "البرمجة 1",
                        "الدارات المنطقية",
                        "الدارات الكهربائية 1",
                        "الإحصاء والاحتمالات",
                        "اللغة الإنجليزية 2",
                        "التحليل الرياضي 2"
                    ]
                }
            ]
        },

        {
            year: "السنة الثانية",
            semesters: [
                {
                    name: "الفصل الأول",
                    courses: [
                        "المعادلات التفاضلية والتحويلات",
                        "الفيزياء 2",
                        "بنيان الحواسيب 1",
                        "أساسيات قواعد البيانات",
                        "الخوارزميات وبنى المعطيات",
                        "تراسل البيانات"
                    ]
                },
                {
                    name: "الفصل الثاني",
                    courses: [
                        "بنيان الحواسيب 2",
                        "تقانات إحصائية في علوم البيانات",
                        "مدخل إلى الذكاء الاصطناعي",
                        "شبكات الحاسوب",
                        "نظم التشغيل 1",
                        "البرمجة بلغة بايثون"
                    ]
                }
            ]
        },

        {
            year: "السنة الثالثة",
            semesters: [
                {
                    name: "الفصل الأول",
                    courses: [
                        "مدخل إلى تعلم الآلة",
                        "مهارات حاسوب",
                        "بروتوكولات الشبكات الحاسوبية",
                        "برمجة نظم التشغيل",
                        "الإشارات والنظم",
                        "أساسيات أمن الحواسيب"
                    ]
                },
                {
                    name: "الفصل الثاني",
                    courses: [
                        "نظرية المعلومات",
                        "التحليل العددي",
                        "إدارة الشبكات الحاسوبية",
                        "نظم قواعد البيانات",
                        "النظم الموزعة والحوسبة السحابية",
                        "نظم التشغيل 2"
                    ]
                }
            ]
        },

        {
            year: "السنة الرابعة",
            semesters: [
                {
                    name: "الفصل الأول",
                    courses: [
                        "مهارات اللغة العربية",
                        "الإنكليزية للمهندسين",
                        "أمن الشبكات والأمن السيبراني",
                        "مدخل إلى التعلم العميق",
                        "برمجة التطبيقات الشبكية",
                        "أمن نظم قواعد البيانات",
                        "تطبيقات أمن المعلومات"
                    ]
                },
                {
                    name: "الفصل الثاني",
                    courses: [
                        "جوانب عملية في تعلم الآلة والتعلم العميق",
                        "أمن نظم التشغيل",
                        "الشبكات اللاسلكية",
                        "كشف التطفل وإدارة الاختراقات",
                        "مشروع فصلي أمن المعلومات"
                    ]
                }
            ]
        },

        {
            year: "السنة الخامسة",
            semesters: [
                {
                    name: "الفصل الأول",
                    courses: [
                        "نظم الزمن الحقيقي",
                        "إدارة المخاطر والامتثال",
                        "التعمية التطبيقية",
                        "معالجة اللغات الطبيعية",
                        "مشروع تخرج 1"
                    ]
                },
                {
                    name: "الفصل الثاني",
                    courses: [
                        "الاختراق الأخلاقي والدفاع عن الأنظمة",
                        "مشروع تخرج 2",
                        "معالجة الصور وتحليلها",
                        "الذكاء الاصطناعي التوليدي"
                    ]
                }
            ]
        }
    ]
};


/* =========================================================
   Artificial Intelligence & Data Science Engineering
========================================================= */

const dataScienceMajor =
    "هندسة الذكاء الاصطناعي و علوم البيانات";

majorPlans[dataScienceMajor] = {

    foundation: [
        "الرياضيات المتقطعة",
        "الجبر الخطي ونظرية المصفوفات",
        "الفيزياء 1",
        "التحليل الرياضي 1"
    ],


    columns: [

        {
            title: "مسار الخوارزميات والذكاء الاصطناعي",
            roots: ["مدخل إلى الخوارزميات والبرمجة"],
            skip: [
                "أساسيات قواعد البيانات",
                "مدخل إلى هندسة البرمجيات",
                "نظرية الحوسبة",
                "البرمجة بلغة بايثون"
            ]
        },

        {
            title: "قواعد البيانات",
            roots: ["أساسيات قواعد البيانات"]
        },

        {
            title: "البرمجة ونظرية الحوسبة",
            roots: [
                "مدخل إلى هندسة البرمجيات",
                "نظرية الحوسبة",
                "البرمجة بلغة بايثون"
            ]
        },

        {
            title: "الرياضيات وعلوم البيانات",
            roots: [
                "الإحصاء والاحتمالات",
                "المعادلات التفاضلية والتحويلات",
                "التحليل الرياضي 2"
            ]
        },

        {
            title: "الدارات والحواسيب",
            roots: [
                "الدارات المنطقية",
                "الفيزياء 2",
                "الدارات الكهربائية 1"
            ],
            skip: [
                "تراسل البيانات",
                "نظم التشغيل 1"
            ]
        },

        {
            title: "النظم والشبكات",
            roots: [
                "نظم التشغيل 1",
                "تراسل البيانات"
            ]
        }
    ],


    /* small text shown under the course name in the map:
       the courses that must be finished to open it */
    prereqs: {
        "نظرية الحوسبة": "البرمجة 2 + الرياضيات المتقطعة",
        "نظم التشغيل 1": "بنيان الحواسيب 1 + الخوارزميات وبنى المعطيات",
        "مدخل إلى الرؤية الحاسوبية": "معالجة الصور وتحليلها + مدخل إلى تعلم الآلة"
    },


    /* order of the main branches (same as the xmind map) */
    mindMapRoots: [
        "الفيزياء 1",
        "مدخل إلى الخوارزميات والبرمجة",
        "التحليل الرياضي 1",
        "الجبر الخطي ونظرية المصفوفات",
        "الرياضيات المتقطعة"
    ],


    mindMapHidden: [
        "اللغة الإنجليزية 1",
        "اللغة الإنجليزية 2",
        "مهارات حاسوب",
        "مهارات اللغة العربية",
        "الإنكليزية للمهندسين"
    ],


    independent: [
        "اللغة الإنجليزية 1",
        "اللغة الإنجليزية 2",
        "مهارات حاسوب",
        "مهارات اللغة العربية",
        "الإنكليزية للمهندسين"
    ],


    notes: {
        "تطبيقات الذكاء الاصطناعي":
            "يجب إنجاز مقرر مدخل إلى التعلم العميق بالإضافة إلى إنجاز أكثر من 70 ساعة.",
        "مشروع فصلي الذكاء الاصطناعي":
            "يجب اجتياز مقرر تطبيقات الذكاء الاصطناعي بالإضافة إلى إنجاز أكثر من 100 ساعة.",
        "مشروع تخرج الذكاء الاصطناعي 2":
            "يجب اجتياز مقرر مشروع تخرج 1 بالإضافة إلى إنجاز أكثر من 159 ساعة."
    },


    next: {

        "الفيزياء 1": [
            "الدارات المنطقية",
            "الفيزياء 2",
            "الدارات الكهربائية 1"
        ],

        "الدارات المنطقية": [
            "بنيان الحواسيب 1"
        ],

        "بنيان الحواسيب 1": [
            "بنيان الحواسيب 2",
            "تراسل البيانات",
            "نظم التشغيل 1"
        ],

        "بنيان الحواسيب 2": [
            "المتحكمات الصغرية والنظم المضمنة"
        ],

        "تراسل البيانات": [
            "شبكات الحاسوب"
        ],

        "نظم التشغيل 1": [
            "الحوسبة عالية الأداء للذكاء الاصطناعي",
            "النظم الموزعة والحوسبة السحابية"
        ],

        "مدخل إلى الخوارزميات والبرمجة": [
            "البرمجة 1"
        ],

        "البرمجة 1": [
            "الخوارزميات وبنى المعطيات",
            "أساسيات قواعد البيانات",
            "نظرية الحوسبة",
            "البرمجة بلغة بايثون"
        ],

        "الخوارزميات وبنى المعطيات": [
            "مدخل إلى الذكاء الاصطناعي",
            "نظرية الألعاب"
        ],

        "مدخل إلى الذكاء الاصطناعي": [
            "مدخل إلى الروبوتية",
            "الذكاء الاصطناعي المتقدم",
            "معالجة اللغات الطبيعية",
            "مدخل إلى تعلم الآلة"
        ],

        "مدخل إلى تعلم الآلة": [
            "مدخل إلى التعلم العميق"
        ],

        "مدخل إلى التعلم العميق": [
            "تطبيقات الذكاء الاصطناعي",
            "جوانب عملية في تعلم الآلة والتعلم العميق",
            "تعلم الآلة مع البيان"
        ],

        "تطبيقات الذكاء الاصطناعي": [
            "مشروع فصلي الذكاء الاصطناعي"
        ],

        "مشروع فصلي الذكاء الاصطناعي": [
            "مشروع تخرج الذكاء الاصطناعي 1"
        ],

        "مشروع تخرج الذكاء الاصطناعي 1": [
            "مشروع تخرج الذكاء الاصطناعي 2"
        ],

        "الذكاء الاصطناعي المتقدم": [
            "الذكاء الاصطناعي العملي"
        ],

        "معالجة اللغات الطبيعية": [
            "الذكاء الاصطناعي التوليدي"
        ],

        "الذكاء الاصطناعي التوليدي": [
            "تعلم الآلة للأجهزة الصغيرة"
        ],

        "أساسيات قواعد البيانات": [
            "نظم قواعد البيانات",
            "مدخل إلى هندسة البرمجيات"
        ],

        "نظم قواعد البيانات": [
            "أمن نظم قواعد البيانات",
            "مدخل إلى لغات الاستعلام",
            "قواعد البيانات المتقدمة"
        ],

        "مدخل إلى لغات الاستعلام": [
            "مدخل إلى البيانات الكبيرة"
        ],

        "نظرية الحوسبة": [
            "تصميم المترجمات"
        ],

        "البرمجة بلغة بايثون": [
            "البرمجة المرئية"
        ],

        "التحليل الرياضي 1": [
            "الإحصاء والاحتمالات",
            "التحليل الرياضي 2"
        ],

        "الإحصاء والاحتمالات": [
            "تقانات إحصائية في علوم البيانات",
            "المعادلات التفاضلية والتحويلات"
        ],

        "المعادلات التفاضلية والتحويلات": [
            "النمذجة العددية"
        ],

        "التحليل الرياضي 2": [
            "التحليل العددي"
        ],

        "التحليل العددي": [
            "معالجة الصور وتحليلها"
        ],

        "معالجة الصور وتحليلها": [
            "مدخل إلى الرؤية الحاسوبية"
        ]
    },


    curriculum: [

        {
            year: "السنة الأولى",
            semesters: [
                {
                    name: "الفصل الأول",
                    courses: [
                        "مدخل إلى الخوارزميات والبرمجة",
                        "الرياضيات المتقطعة",
                        "الجبر الخطي ونظرية المصفوفات",
                        "الفيزياء 1",
                        "التحليل الرياضي 1",
                        "اللغة الإنجليزية 1"
                    ]
                },
                {
                    name: "الفصل الثاني",
                    courses: [
                        "البرمجة 1",
                        "الدارات المنطقية",
                        "الدارات الكهربائية 1",
                        "الإحصاء والاحتمالات",
                        "اللغة الإنجليزية 2",
                        "التحليل الرياضي 2"
                    ]
                }
            ]
        },

        {
            year: "السنة الثانية",
            semesters: [
                {
                    name: "الفصل الأول",
                    courses: [
                        "المعادلات التفاضلية والتحويلات",
                        "الفيزياء 2",
                        "بنيان الحواسيب 1",
                        "أساسيات قواعد البيانات",
                        "الخوارزميات وبنى المعطيات",
                        "البرمجة بلغة بايثون"
                    ]
                },
                {
                    name: "الفصل الثاني",
                    courses: [
                        "بنيان الحواسيب 2",
                        "تقانات إحصائية في علوم البيانات",
                        "مدخل إلى الذكاء الاصطناعي",
                        "البرمجة المرئية",
                        "نظرية الحوسبة",
                        "مدخل إلى هندسة البرمجيات"
                    ]
                }
            ]
        },

        {
            year: "السنة الثالثة",
            semesters: [
                {
                    name: "الفصل الأول",
                    courses: [
                        "مدخل إلى تعلم الآلة",
                        "مهارات حاسوب",
                        "تراسل البيانات",
                        "نظم التشغيل 1",
                        "نظرية الألعاب",
                        "نظم قواعد البيانات"
                    ]
                },
                {
                    name: "الفصل الثاني",
                    courses: [
                        "مدخل إلى التعلم العميق",
                        "التحليل العددي",
                        "شبكات الحاسوب",
                        "النمذجة العددية",
                        "النظم الموزعة والحوسبة السحابية",
                        "قواعد البيانات المتقدمة"
                    ]
                }
            ]
        },

        {
            year: "السنة الرابعة",
            semesters: [
                {
                    name: "الفصل الأول",
                    courses: [
                        "مهارات اللغة العربية",
                        "الإنكليزية للمهندسين",
                        "معالجة الصور وتحليلها",
                        "الحوسبة عالية الأداء للذكاء الاصطناعي",
                        "مدخل إلى لغات الاستعلام",
                        "معالجة اللغات الطبيعية",
                        "تطبيقات الذكاء الاصطناعي"
                    ]
                },
                {
                    name: "الفصل الثاني",
                    courses: [
                        "الذكاء الاصطناعي المتقدم",
                        "الذكاء الاصطناعي التوليدي",
                        "مدخل إلى البيانات الكبيرة",
                        "تعلم الآلة مع البيان",
                        "مشروع فصلي الذكاء الاصطناعي"
                    ]
                }
            ]
        },

        {
            year: "السنة الخامسة",
            semesters: [
                {
                    name: "الفصل الأول",
                    courses: [
                        "جوانب عملية في تعلم الآلة والتعلم العميق",
                        "تعلم الآلة للأجهزة الصغيرة",
                        "مدخل إلى الرؤية الحاسوبية",
                        "مدخل إلى الروبوتية",
                        "مشروع تخرج الذكاء الاصطناعي 1"
                    ]
                },
                {
                    name: "الفصل الثاني",
                    courses: [
                        "الذكاء الاصطناعي العملي",
                        "مشروع تخرج الذكاء الاصطناعي 2",
                        "أمن نظم قواعد البيانات",
                        "تصميم المترجمات",
                        "المتحكمات الصغرية والنظم المضمنة"
                    ]
                }
            ]
        }
    ]
};



/* =========================================================
   Communications major (same data-driven format as the others)
   - the years are the existing yearlyCurriculum (unchanged)
   - independent courses exclude anything already listed in the
     university / faculty required + elective requirement lists
========================================================= */

majorPlans[COMMUNICATIONS_MAJOR] = {

    foundation: [
        "فيزياء 1",
        "التحليل الرياضي 1"
    ],


    columns: [

        {
            title: "مسار البرمجة والذكاء الاصطناعي",
            roots: ["مدخل إلى الخوارزميات والبرمجة"]
        },

        {
            title: "الرياضيات والإحصاء",
            roots: [
                "التحليل الرياضي 2",
                "الإحصاء والاحتمالات",
                "المعادلات التفاضلية والتحويلات"
            ],
            skip: ["الإشارات والنظم"]
        },

        {
            title: "الإشارات والحقول الكهرطيسية",
            roots: ["الإشارات والنظم"],
            skip: ["أسس نظم الاتصالات"]
        },

        {
            title: "نظم الاتصالات",
            roots: ["أسس نظم الاتصالات"],
            skip: ["تطبيقات اتصالات"]
        },

        {
            title: "التطبيقات والمشاريع",
            roots: ["تطبيقات اتصالات"]
        },

        {
            title: "الدارات والحواسيب والشبكات",
            roots: ["الدارات المنطقية"]
        },

        {
            title: "الفيزياء والإلكترونيات",
            roots: [
                "فيزياء 2",
                "الدارات الكهربائية 1"
            ]
        }
    ],


    /* order of the main branches (same as the xmind map, right to left) */
    mindMapRoots: [
        "مدخل إلى الخوارزميات والبرمجة",
        "الرياضيات المتقطعة",
        "الجبر الخطي ونظرية المصفوفات",
        "فيزياء 1",
        "التحليل الرياضي 1"
    ],


    /* not part of the department map */
    mindMapHidden: [
        "الإنكليزية للمهندسين"
    ],


    /* small text shown under the course name in the map:
       the courses that must be finished to open it */
    prereqs: {
        "نظرية الحقول الكهرطيسية": "معالجة الإشارة + التحليل الرياضي 2"
    },


    independent: [
        "الجبر الخطي ونظرية المصفوفات",
        "الرياضيات المتقطعة",
        "الإنكليزية للمهندسين"
    ],


    notes: {
        "تطبيقات اتصالات":
            "يجب إنجاز مقرر أسس نظم الاتصالات بالإضافة إلى إنجاز أكثر من 70 ساعة.",
        "مشروع فصلي اتصالات":
            "يجب اجتياز مقرر تطبيقات اتصالات بالإضافة إلى إنجاز أكثر من 100 ساعة.",
        "مشروع تخرج اتصالات 2":
            "يجب اجتياز مقرر مشروع تخرج 1 بالإضافة إلى إنجاز أكثر من 159 ساعة."
    },


    next: {

        /* ---- فيزياء 1 ---- */
        "فيزياء 1": [
            "الدارات الكهربائية 1",
            "فيزياء 2",
            "الدارات المنطقية"
        ],

        "الدارات الكهربائية 1": [
            "مدخل إلى الإلكترونيات",
            "الدارات الكهربائية 2"
        ],

        "فيزياء 2": ["دارات إلكترونية 1"],

        "دارات إلكترونية 1": ["دارات إلكترونية 2"],

        "الدارات المنطقية": ["بنيان الحواسيب 1"],

        "بنيان الحواسيب 1": [
            "تراسل البيانات",
            "بنيان الحواسيب 2"
        ],

        "بنيان الحواسيب 2": ["المتحكمات الصغرية والنظم المضمنة"],

        "تراسل البيانات": [
            "شبكات الحاسوب",
            "نظرية المعلومات"
        ],


        /* ---- التحليل الرياضي 1 ---- */
        "التحليل الرياضي 1": [
            "الإحصاء والاحتمالات",
            "التحليل الرياضي 2"
        ],

        "التحليل الرياضي 2": ["التحليل العددي"],

        "الإحصاء والاحتمالات": [
            "المعادلات التفاضلية والتحويلات",
            "تقانات إحصائية في علوم البيانات"
        ],

        "المعادلات التفاضلية والتحويلات": ["الإشارات والنظم"],

        "الإشارات والنظم": [
            "معالجة الإشارة",
            "أسس نظم الاتصالات"
        ],

        "معالجة الإشارة": [
            "معالجة الإشارة الرقمية",
            "نظرية الحقول الكهرطيسية"
        ],

        "نظرية الحقول الكهرطيسية": ["هندسة الأمواج المكروية"],

        "هندسة الأمواج المكروية": [
            "الدارات والنظم المكروية",
            "الهوائيات وانتشار الأمواج الراديوية"
        ],

        "أسس نظم الاتصالات": [
            "الاتصالات الرقمية",
            "تصميم الدارات ذات التكامل الواسع النطاق",
            "أمن الاتصالات",
            "اتصالات الأقمار الصناعية",
            "الاتصالات النقالة واللاسلكية",
            "الاتصالات الضوئية",
            "تطبيقات اتصالات"
        ],

        "الاتصالات النقالة واللاسلكية": [
            "نمذجة شبكات الاتصالات",
            "أسس هندسة الرادار",
            "تقانات الاتصالات الحديثة"
        ],

        "تطبيقات اتصالات": ["مشروع فصلي اتصالات"],

        "مشروع فصلي اتصالات": [
            "مشروع تخرج اتصالات 1",
            "مشروع تخرج اتصالات 2"
        ],


        /* ---- مدخل إلى الخوارزميات والبرمجة ---- */
        "مدخل إلى الخوارزميات والبرمجة": ["البرمجة 1"],

        "البرمجة 1": [
            "أساسيات قواعد البيانات",
            "البرمجة بلغة بايثون",
            "الخوارزميات وبنى المعطيات"
        ],

        "الخوارزميات وبنى المعطيات": ["مدخل إلى الذكاء الاصطناعي"],

        "مدخل إلى الذكاء الاصطناعي": [
            "معالجة اللغات الطبيعية",
            "مدخل إلى تعلم الآلة"
        ],

        "مدخل إلى تعلم الآلة": ["مدخل إلى التعلم العميق"],

        "مدخل إلى التعلم العميق": ["الذكاء الاصطناعي التوليدي"]
    },


    /* years: the existing (correct) curriculum, not modified */
    curriculum: yearlyCurriculum
};


function getMajorPlan(major) {

    return majorPlans[major] || null;
}


/* =========================================================
   Mind-map style renderer (Communications major)
   Draws one connected branching diagram, like the reference
   xmind file, instead of separate boxed columns. Node boxes
   reuse the normal .course-card look; only the layout/branch
   lines differ.
========================================================= */

/* sizes are chosen per screen: the phone gets smaller cards and less margin */
const MINDMAP_DESKTOP = { nodeW: 190, rowH: 90, colW: 250, pad: 40 };
const MINDMAP_MOBILE  = { nodeW: 140, rowH: 90, colW: 168, pad: 16 };

function getMindMapMetrics() {

    return (
        window.matchMedia &&
        window.matchMedia("(max-width: 600px)").matches
    )
        ? MINDMAP_MOBILE
        : MINDMAP_DESKTOP;
}

/* which courses are expanded (their next courses are shown) */
let mindMapData = null;
let mindMapExpanded = new Set();
let mindMapActiveName = null;

function buildMindMapTree(name, plan, seen) {

    const node = { name: name, children: [] };

    if (seen.has(name)) {
        return node;
    }

    seen.add(name);

    const next = (plan.next && plan.next[name]) || [];

    next.forEach(childName => {
        node.children.push(
            buildMindMapTree(childName, plan, seen)
        );
    });

    return node;
}

function layoutMindMapTree(root, m) {

    function countLeaves(node) {

        if (!node.children.length) {
            node._leaves = 1;
            return 1;
        }

        let sum = 0;

        node.children.forEach(child => {
            sum += countLeaves(child);
        });

        node._leaves = sum;
        return sum;
    }

    countLeaves(root);

    let cursor = 0;

    function assignY(node) {

        if (!node.children.length) {

            node._y =
                cursor * m.rowH +
                m.rowH / 2;

            cursor += 1;
            return node._y;
        }

        const childYs = node.children.map(assignY);

        node._y =
            (childYs[0] + childYs[childYs.length - 1]) / 2;

        return node._y;
    }

    assignY(root);

    let maxDepth = 0;

    function assignDepth(node, depth) {

        node._depth = depth;
        maxDepth = Math.max(maxDepth, depth);

        node.children.forEach(child => {
            assignDepth(child, depth + 1);
        });
    }

    assignDepth(root, 0);

    function assignX(node) {

        node._x =
            (maxDepth - node._depth) * m.colW;

        node.children.forEach(assignX);
    }

    assignX(root);

    return {
        maxDepth: maxDepth,
        totalRows: cursor
    };
}

function elbowConnectorPath(
    parentRightEdgeX,
    parentY,
    childLeftEdgeX,
    childY
) {

    const trunkX =
        (parentRightEdgeX + childLeftEdgeX) / 2;

    return (
        "M " + parentRightEdgeX + " " + parentY +
        " H " + trunkX +
        " V " + childY +
        " H " + childLeftEdgeX
    );
}

/* majors that use the connected mind-map layout */
function isMindMapMajor(major) {

    return (
        major === COMMUNICATIONS_MAJOR ||
        major === dataScienceMajor ||
        major === securityMajor ||
        major === roboticsMajor ||
        major === medicalMajor ||
        major === softwareMajor
    );
}


function renderCommunicationsMindMap(plan, major) {

    if (!document.getElementById("course-map")) {
        return;
    }

    mindMapData = getMindMapData(plan, major || COMMUNICATIONS_MAJOR);

    drawMindMap();
}


/* Builds the full course tree once per plan (nothing is hidden here).
   Every node knows its parent and how many courses sit below it. */
function getMindMapData(plan, major) {

    major = major || COMMUNICATIONS_MAJOR;

    if (mindMapData && mindMapData.plan === plan) {
        return mindMapData;
    }

    const seen = new Set();

    /* university-required courses (English, computer skills, Arabic...)
       are not part of the department map, so a plan can hide them */
    const hidden = plan.mindMapHidden || [];

    /* a plan can set its own order of main branches (mindMapRoots) */
    const rootChildNames = [
        ...(plan.mindMapRoots || [
            ...(plan.foundation || []),
            "مدخل إلى الخوارزميات والبرمجة"
        ]),
        ...(plan.independent || [])
    ].filter(name => !hidden.includes(name));

    const root = { name: major, children: [] };

    seen.add(major);

    rootChildNames.forEach(name => {

        if (seen.has(name)) {
            return;
        }

        root.children.push(
            buildMindMapTree(name, plan, seen)
        );
    });

    const byName = {};

    function index(node, parent) {

        node.parent = parent;

        if (!(node.name in byName)) {
            byName[node.name] = node;
        }

        let total = 0;

        node.children.forEach(child => {
            index(child, node);
            total += 1 + child.total;
        });

        node.total = total;
    }

    index(root, null);

    return { plan: plan, root: root, byName: byName };
}


/* Copy of the tree that only contains what is currently shown:
   the main branches, plus the children of every expanded course. */
function toVisibleMindMapTree(node, isRoot) {

    const open = isRoot || mindMapExpanded.has(node.name);

    return {
        name: node.name,
        source: node,
        children: open
            ? node.children.map(child => toVisibleMindMapTree(child, false))
            : []
    };
}


function findMindMapCard(name) {

    return Array
        .from(document.querySelectorAll("#course-map .mindmap-node"))
        .find(card => card.dataset.course === name) || null;
}


function toggleMindMapNode(name) {

    if (mindMapExpanded.has(name)) {
        mindMapExpanded.delete(name);
    } else {
        mindMapExpanded.add(name);
    }

    drawMindMap(name);
}


/* Used when a course is opened from somewhere else (e.g. the details
   panel): expand the branches above it so the card really is on the map. */
function revealMindMapCourse(name) {

    if (!mindMapData || !document.querySelector(".mindmap-wrapper")) {
        return;
    }

    const target = mindMapData.byName[name];

    if (!target) {
        return;
    }

    let changed = false;

    for (let p = target.parent; p && p.parent; p = p.parent) {

        if (!mindMapExpanded.has(p.name)) {
            mindMapExpanded.add(p.name);
            changed = true;
        }
    }

    if (changed) {
        drawMindMap();
    }
}


function resetMindMapState() {

    mindMapExpanded.clear();
    mindMapActiveName = null;
}


function drawMindMap(toggledName) {

    const map = document.getElementById("course-map");

    if (!map || !mindMapData) {
        return;
    }

    const m = getMindMapMetrics();

    /* remember where the clicked course is on screen, so that the page
       does not jump when the layout is recalculated */
    let anchorTop = null;

    if (toggledName) {

        const oldCard = findMindMapCard(toggledName);

        if (oldCard) {
            anchorTop = oldCard.getBoundingClientRect().top;
        }
    }

    map.innerHTML = "";

    const root = toVisibleMindMapTree(mindMapData.root, true);

    const layout = layoutMindMapTree(root, m);

    /* exactly as wide as the drawing: no empty column on the right
       (the page is RTL, so that empty column was the first thing you saw) */
    const totalWidth =
        layout.maxDepth * m.colW +
        m.nodeW +
        m.pad * 2;

    const totalHeight =
        layout.totalRows * m.rowH +
        m.pad * 2;

    const wrapper = document.createElement("div");
    wrapper.className = "mindmap-wrapper";
    wrapper.style.width = totalWidth + "px";
    wrapper.style.height = totalHeight + "px";

    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");

    svg.setAttribute("class", "mindmap-svg");
    svg.setAttribute("width", totalWidth);
    svg.setAttribute("height", totalHeight);

    const nodesLayer = document.createElement("div");
    nodesLayer.className = "mindmap-nodes";

    function place(node, isRoot) {

        const left = m.pad + node._x;
        const top = m.pad + node._y;

        if (isRoot) {

            const rootBox = document.createElement("div");
            rootBox.className = "mindmap-root-node";
            rootBox.textContent = node.name;
            rootBox.style.width = m.nodeW + "px";
            rootBox.style.left = left + "px";
            rootBox.style.top = top + "px";

            nodesLayer.appendChild(rootBox);

        } else {

            const card = createFlowCard(node.name);
            card.classList.add("mindmap-node");

            /* prerequisites (small text under the course name) */
            const prereqText =
                (mindMapData.plan.prereqs || {})[node.name];

            if (prereqText) {

                const prereqEl = document.createElement("span");
                prereqEl.className = "course-prereq";
                prereqEl.textContent = prereqText;

                card.insertBefore(
                    prereqEl,
                    card.querySelector(".course-hours")
                );
            }
            card.style.width = m.nodeW + "px";
            card.style.left = left + "px";
            card.style.top = top + "px";

            nodesLayer.appendChild(card);

            /* every course that opens other courses gets a show / hide button */
            const total = node.source.total;

            if (node.source.children.length > 0) {

                const open = mindMapExpanded.has(node.name);

                const toggle = document.createElement("button");
                toggle.type = "button";
                toggle.className = "mindmap-toggle" + (open ? " open" : "");
                toggle.textContent = open ? "\u2212" : String(total);
                toggle.title = open
                    ? "إخفاء المواد التالية"
                    : "إظهار المواد التالية (" + total + ")";
                toggle.setAttribute("aria-expanded", open ? "true" : "false");
                toggle.setAttribute(
                    "aria-label",
                    (open ? "إخفاء" : "إظهار") +
                    " المواد التالية بعد " + node.name
                );
                toggle.style.left = (left - 13) + "px";
                toggle.style.top = top + "px";

                toggle.onclick = event => {
                    event.stopPropagation();
                    toggleMindMapNode(node.name);
                };

                nodesLayer.appendChild(toggle);
            }
        }

        node.children.forEach(child => {

            const childEdgeX = m.pad + child._x + m.nodeW;
            const childY = m.pad + child._y;

            const path = document.createElementNS(svgNS, "path");

            path.setAttribute(
                "d",
                elbowConnectorPath(left, top, childEdgeX, childY)
            );

            path.setAttribute("class", "mindmap-link");

            svg.appendChild(path);

            place(child, false);
        });
    }

    place(root, true);

    wrapper.appendChild(svg);
    wrapper.appendChild(nodesLayer);
    map.appendChild(wrapper);

    if (mindMapActiveName) {

        const active = findMindMapCard(mindMapActiveName);

        if (active) {
            active.classList.add("active");
        }
    }

    if (!toggledName) {
        return;
    }

    /* keep the clicked course exactly where it was on the screen */
    const newCard = findMindMapCard(toggledName);

    if (newCard && anchorTop !== null) {

        const shift = newCard.getBoundingClientRect().top - anchorTop;

        if (Math.abs(shift) > 1) {
            window.scrollBy({ top: shift, behavior: "instant" });
        }
    }

    /* if the newly shown courses are off-screen to the left, bring them in */
    const container = document.getElementById("map-container");
    const source = mindMapData.byName[toggledName];

    if (container && source && mindMapExpanded.has(toggledName)) {

        let minLeft = Infinity;

        source.children.forEach(child => {

            const childCard = findMindMapCard(child.name);

            if (childCard) {
                minLeft = Math.min(
                    minLeft,
                    childCard.getBoundingClientRect().left
                );
            }
        });

        const edge = container.getBoundingClientRect().left + 12;

        if (minLeft < edge) {
            container.scrollBy({ left: minLeft - edge, behavior: "smooth" });
        }
    }
}


/* keep the layout in sync when the phone is rotated / window is resized */
if (window.matchMedia) {

    const mindMapMedia = window.matchMedia("(max-width: 600px)");

    const onMindMapMediaChange = () => {

        if (document.querySelector(".mindmap-wrapper")) {
            drawMindMap();
        }
    };

    if (mindMapMedia.addEventListener) {
        mindMapMedia.addEventListener("change", onMindMapMediaChange);
    } else if (mindMapMedia.addListener) {
        mindMapMedia.addListener(onMindMapMediaChange);
    }
}


/* =========================================================
   Data-driven major map helpers
========================================================= */

function buildPlanTree(
    name,
    plan,
    stopSet,
    seen,
    isRoot,
    skipSet
) {

    const node = {
        name: name,
        kids: []
    };


    if (
        stopSet.has(name) &&
        !isRoot
    ) {
        return node;
    }


    if (
        seen.has(name) &&
        !isRoot
    ) {
        return node;
    }


    seen.add(name);


    const next =
        (plan.next && plan.next[name]) || [];


    next.forEach(childName => {

        if (skipSet && skipSet.has(childName)) {
            return;
        }

        if (
            !stopSet.has(name) &&
            !seen.has(childName)
        ) {

            node.kids.push(
                buildPlanTree(
                    childName,
                    plan,
                    stopSet,
                    seen,
                    false,
                    skipSet
                )
            );
        }
    });


    return node;
}


function createFlowCard(
    name,
    extraClass
) {

    const card =
        document.createElement("button");


    card.className =
        "course-card" +
        (
            extraClass
                ? " " + extraClass
                : ""
        );


    setCourseLabel(card, name);


    card.onclick = () => {
        openCourseByName(name);
    };


    return card;
}


function createFlowArrow() {

    const arrow =
        document.createElement("div");


    arrow.className =
        "flow-arrow";


    arrow.textContent =
        "↓";


    return arrow;
}


function renderPlanTree(
    node,
    container,
    path = []
) {

    if (
        !node ||
        path.includes(node.name)
    ) {
        return;
    }


    const currentPath =
        [...path, node.name];


    const nodeBox =
        document.createElement("div");


    nodeBox.className =
        "plan-tree-node";


    nodeBox.appendChild(
        createFlowCard(node.name)
    );


    if (node.kids.length > 0) {

        nodeBox.appendChild(
            createFlowArrow()
        );


        const children =
            document.createElement("div");


        children.className =
            "plan-tree-children";


        node.kids.forEach(child => {

            renderPlanTree(
                child,
                children,
                currentPath
            );
        });


        nodeBox.appendChild(children);
    }


    container.appendChild(nodeBox);
}


function createSimpleGroup(
    title,
    names,
    isFoundation
) {

    const group =
        document.createElement("div");


    group.className =
        "course-group";


    const heading =
        document.createElement("h3");


    heading.className =
        "group-title";


    heading.textContent =
        title;


    group.appendChild(heading);


    names.forEach(name => {

        group.appendChild(
            createFlowCard(
                name,
                isFoundation
                    ? "foundation"
                    : ""
            )
        );
    });


    return group;
}


function createPlanColumn(
    column,
    plan
) {

    const group =
        document.createElement("div");


    group.className =
        "course-group flow-group plan-column";


    const heading =
        document.createElement("h3");


    heading.className =
        "group-title";


    heading.textContent =
        column.title;


    group.appendChild(heading);


    const stopSet =
        new Set(column.stop || []);


    const skipSet =
        new Set(column.skip || []);


    const seen =
        new Set();


    const treeContainer =
        document.createElement("div");


    treeContainer.className =
        "plan-tree-container";


    (column.roots || []).forEach(
        rootName => {

            const tree =
                buildPlanTree(
                    rootName,
                    plan,
                    stopSet,
                    seen,
                    true,
                    skipSet
                );


            renderPlanTree(
                tree,
                treeContainer
            );
        }
    );


    group.appendChild(
        treeContainer
    );


    return group;
}


function renderPlanMap(plan) {

    const map =
        document.getElementById(
            "course-map"
        );


    if (!map || !plan) {
        return;
    }


    map.innerHTML = "";


    if (
        plan.foundation &&
        plan.foundation.length
    ) {

        map.appendChild(
            createSimpleGroup(
                "المواد الأساسية",
                plan.foundation,
                true
            )
        );
    }


    (plan.columns || []).forEach(
        column => {

            map.appendChild(
                createPlanColumn(
                    column,
                    plan
                )
            );
        }
    );


    if (
        plan.independent &&
        plan.independent.length
    ) {

        map.appendChild(
            createSimpleGroup(
                "مواد مستقلة",
                plan.independent,
                false
            )
        );
    }
}


/* =========================================================
   Years view
========================================================= */

function showFullMap() {

    const fullMap =
        document.getElementById(
            "full-map-view"
        );


    const years =
        document.getElementById(
            "years-view"
        );


    const fullButton =
        document.getElementById(
            "full-map-btn"
        );


    const yearsButton =
        document.getElementById(
            "years-btn"
        );


    hideElectivesView();

    if (fullMap) {
        fullMap.style.display =
            "block";
    }


    if (years) {
        years.style.display =
            "none";
    }


    if (fullButton) {
        fullButton.classList.add(
            "active"
        );
    }


    if (yearsButton) {
        yearsButton.classList.remove(
            "active"
        );
    }


    showAllCourses();
}


function showYears() {

    const fullMap =
        document.getElementById(
            "full-map-view"
        );


    const years =
        document.getElementById(
            "years-view"
        );


    const fullButton =
        document.getElementById(
            "full-map-btn"
        );


    const yearsButton =
        document.getElementById(
            "years-btn"
        );


    hideElectivesView();

    if (fullMap) {
        fullMap.style.display =
            "none";
    }


    if (years) {
        years.style.display =
            "block";
    }


    if (yearsButton) {
        yearsButton.classList.add(
            "active"
        );
    }


    if (fullButton) {
        fullButton.classList.remove(
            "active"
        );
    }


    createYearsView();
}


function createYearsView() {

    const container =
        document.getElementById(
            "years-container"
        );


    if (!container) {
        return;
    }


    container.innerHTML = "";


    const major =
        localStorage.getItem(
            "selectedMajor"
        );


    const plan =
        getMajorPlan(major);


    const curriculum =
        plan
            ? plan.curriculum
            : yearlyCurriculum;


    curriculum.forEach(year => {

        const yearBox =
            document.createElement("div");


        yearBox.className =
            "year-card";


        const yearTitle =
            document.createElement("h2");


        yearTitle.textContent =
            year.year;


        yearTitle.className =
            "year-title";


        yearBox.appendChild(
            yearTitle
        );


        (year.semesters || []).forEach(
            semester => {

                const semesterBox =
                    document.createElement("div");


                semesterBox.className =
                    "semester-card";


                const semesterTitle =
                    document.createElement("h3");


                semesterTitle.textContent =
                    semester.name;


                semesterTitle.className =
                    "semester-title";


                semesterBox.appendChild(
                    semesterTitle
                );


                const coursesGrid =
                    document.createElement("div");


                coursesGrid.className =
                    "year-courses";


                (semester.courses || []).forEach(
                    courseName => {

                        const courseButton =
                            document.createElement(
                                "button"
                            );


                        courseButton.className =
                            "year-course";


                        setCourseLabel(
                            courseButton,
                            courseName
                        );


                        courseButton.onclick = () => {

                            showYearCourseDetails(
                                courseName,
                                year.year,
                                semester.name
                            );
                        };


                        coursesGrid.appendChild(
                            courseButton
                        );
                    }
                );


                semesterBox.appendChild(
                    coursesGrid
                );


                yearBox.appendChild(
                    semesterBox
                );
            }
        );


        container.appendChild(
            yearBox
        );
    });
}


function locateCourseInYears(courseName) {

    const plan =
        getMajorPlan(
            localStorage.getItem(
                "selectedMajor"
            )
        );


    const curriculum =
        plan
            ? plan.curriculum
            : yearlyCurriculum;


    for (const year of curriculum) {

        for (
            const semester of
            year.semesters || []
        ) {

            if (
                (semester.courses || [])
                    .includes(courseName)
            ) {

                return {
                    year: year.year,
                    semester: semester.name
                };
            }
        }
    }


    return null;
}


function showYearCourseDetails(
    courseName,
    year,
    semester
) {

    const details =
        document.getElementById(
            "year-course-details"
        );


    if (!details) {
        return;
    }


    details.innerHTML = "";


    const title =
        document.createElement("h3");


    title.textContent =
        courseName;


    details.appendChild(title);


    const yearText =
        document.createElement("p");


    yearText.textContent =
        "السنة الدراسية: " + year;


    details.appendChild(
        yearText
    );


    const semesterText =
        document.createElement("p");


    semesterText.textContent =
        "الفصل الدراسي: " + semester;


    details.appendChild(
        semesterText
    );


    const yearNote = getCourseNote(courseName);

    if (yearNote) {

        const yearNoteEl = document.createElement("p");

        yearNoteEl.textContent = yearNote;

        details.appendChild(yearNoteEl);
    }


    const mapCourse =
        findCourse(courseName);


    if (
        mapCourse &&
        mapCourse.next &&
        mapCourse.next.length > 0
    ) {

        const nextTitle =
            document.createElement("p");


        nextTitle.textContent =
            "المواد التي تفتحها هذه المادة:";


        details.appendChild(
            nextTitle
        );


        mapCourse.next.forEach(
            nextCourse => {

                const nextButton =
                    document.createElement(
                        "button"
                    );


                nextButton.className =
                    "year-course";


                setCourseLabel(
                    nextButton,
                    nextCourse
                );


                nextButton.onclick = () => {

                    const foundCourse =
                        findCourse(
                            nextCourse
                        );


                    if (!foundCourse) {
                        return;
                    }


                    const place =
                        locateCourseInYears(
                            nextCourse
                        );


                    showYearCourseDetails(
                        nextCourse,
                        place
                            ? place.year
                            : year,
                        place
                            ? place.semester
                            : semester
                    );
                };


                details.appendChild(
                    nextButton
                );
            }
        );

    } else {

        const info =
            document.createElement("p");


        info.textContent =
            "لا توجد تفرعات مسجلة لهذه المادة في الخريطة الحالية.";


        details.appendChild(
            info
        );
    }


    details.scrollIntoView({
        behavior: "smooth",
        block: "nearest"
    });
}



/* =========================================================
   Reset map
========================================================= */

/* =========================================================
   Department electives
========================================================= */

const GEN_AI = "الذكاء الاصطناعي التوليدي";
const HPC_AI = "الحوسبة عالية الأداء للذكاء الاصطناعي";
const IMG_PROC = "معالجة الصور و تحليلها";
const MIS = "نظم المعلومات الإدارية";

const departmentElectives = {
    "هندسة الإتصالات الذكية": {
        label: "هندسة اتصالات",
        courses: [
            [GEN_AI, 3],
            [HPC_AI, 3],
            ["تصميم الدارات ذات التكامل الواسع النطاق", 3],
            ["نمذجة شبكات الاتصالات", 3]
        ]
    },
    "هندسة الذكاء الاصطناعي و علوم البيانات": {
        label: "هندسة الذكاء الاصطناعي وعلوم البيانات",
        courses: [
            ["تصميم المترجمات", 3],
            ["أمن نظم قواعد البيانات", 3],
            [MIS, 3],
            ["المتحكمات الصغرية والنظم المضمنة", 3]
        ]
    },
    "الهندسة الطبية الذكية والمعلوماتية الحيوية": {
        label: "هندسة طبية",
        courses: [
            ["الطب النووي و أجهزته", 3],
            ["الأعضاء الصناعية", 3],
            ["الروبوتية الطبية الحيوية و التطبيب عن بعد", 3],
            ["إدارة المشافي", 3]
        ]
    },
    "هندسة الروبوت والنظم الذكية": {
        label: "هندسة روبوتات",
        courses: [
            [IMG_PROC, 3],
            ["معالجة الإشارة", 3],
            [HPC_AI, 3],
            [GEN_AI, 3]
        ]
    },
    "هندسة البرمجيات ونظم المعلومات الذكية": {
        label: "هندسة برمجيات",
        courses: [
            ["صيانة البرمجيات و الهندسة العكسية", 3],
            ["توثيق بنى البرمجيات", 3],
            [MIS, 3],
            [GEN_AI, 3]
        ]
    },
    "هندسة نظم أمن المعلومات الذكية": {
        label: "هندسة أمن سيبراني",
        courses: [
            [IMG_PROC, 3],
            [HPC_AI, 3],
            [GEN_AI, 3],
            [MIS, 3]
        ]
    }
};

const ELECTIVES_REQUIRED_HOURS = 6;

function normalizeMajorName(s) {
    return (s || "").replace(/\s+/g, " ").trim();
}

function findDepartmentElectives(major) {
    const target = normalizeMajorName(major);
    const key = Object.keys(departmentElectives).find(
        k => normalizeMajorName(k) === target
    );
    return key ? departmentElectives[key] : null;
}

function createElectivesView() {
    const container = document.getElementById("electives-container");
    if (!container) return;

    container.innerHTML = "";

    const major = localStorage.getItem("selectedMajor");
    const data = findDepartmentElectives(major);

    const box = document.createElement("div");
    box.className = "electives-card";

    if (!data) {
        box.innerHTML = '<p class="details-hint">لا توجد متطلبات قسم اختيارية لهذا التخصص.</p>';
        container.appendChild(box);
        return;
    }

    const title = document.createElement("h3");
    title.className = "electives-title";
    title.textContent = "متطلبات قسم (التخصص) الاختيارية لتخصص " + data.label;
    box.appendChild(title);

    const note = document.createElement("p");
    note.className = "req-note";
    note.innerHTML = "المطلوب <strong>" + ELECTIVES_REQUIRED_HOURS +
        " ساعات</strong> — يختار الطالب من بين المواد التالية بحيث يجمع " +
        ELECTIVES_REQUIRED_HOURS + " ساعات:";
    box.appendChild(note);

    const list = document.createElement("ul");
    list.className = "req-list";

    data.courses.forEach(([name, hours]) => {
        const li = document.createElement("li");

        const n = document.createElement("span");
        n.className = "req-name";
        n.textContent = name;

        const h = document.createElement("span");
        h.className = "req-hours";
        h.textContent = hours + " ساعات";

        li.appendChild(n);
        li.appendChild(h);
        list.appendChild(li);
    });

    box.appendChild(list);
    container.appendChild(box);
}

function hideElectivesView() {
    const view = document.getElementById("electives-view");
    const btn = document.getElementById("electives-btn");

    if (view) view.style.display = "none";
    if (btn) btn.classList.remove("active");
}

function showElectives() {
    const fullMap = document.getElementById("full-map-view");
    const years = document.getElementById("years-view");
    const view = document.getElementById("electives-view");

    if (fullMap) fullMap.style.display = "none";
    if (years) years.style.display = "none";
    if (view) view.style.display = "block";

    ["full-map-btn", "years-btn"].forEach(id => {
        const b = document.getElementById(id);
        if (b) b.classList.remove("active");
    });

    const btn = document.getElementById("electives-btn");
    if (btn) btn.classList.add("active");

    createElectivesView();
}

/* ---------- University / faculty requirement boxes (index page) ---------- */

function toggleReqBox(btn) {
    const body = document.getElementById(btn.getAttribute("aria-controls"));
    if (!body) return;

    const open = btn.getAttribute("aria-expanded") !== "true";
    btn.setAttribute("aria-expanded", open ? "true" : "false");
    body.classList.toggle("show", open);
    btn.classList.toggle("open", open);
}


function resetMap() {

    resetMindMapState();

    document
        .querySelectorAll(".course-card, .mini-course-card")
        .forEach(card => card.classList.remove("active"));

    const details = document.getElementById("course-details");

    if (details) {
        details.innerHTML =
            '<p class="details-hint">اختر مادة من الخريطة لعرض تفاصيلها.</p>';
    }

    showAllCourses();

    const container = document.getElementById("map-container");

    if (container) {
        container.scrollLeft = 0;
    }
}


/* =========================================================
   Start
========================================================= */

showSelectedMajor();
showAllCourses();

/* =========================================================
   تعرّف على التخصصات
========================================================= */

const ABOUT_MAJORS = [
{
 key: 'هندسة الذكاء الاصطناعي و علوم البيانات',
 name: 'هندسة الذكاء الاصطناعي وعلوم البيانات',
 sum: 'التخصص الأكثر تركيزًا على الذكاء الاصطناعي وتحليل البيانات، ويهدف إلى تدريب الطالب على بناء نماذج وأنظمة قادرة على التعلم من البيانات والتنبؤ واتخاذ القرارات.',
 study: ['البرمجة والخوارزميات','الرياضيات والإحصاء','تعلم الآلة Machine Learning','التعلم العميق Deep Learning','تحليل البيانات وعلوم البيانات','معالجة البيانات الضخمة','معالجة اللغة الطبيعية NLP','الرؤية الحاسوبية Computer Vision','بناء وتقييم نماذج الذكاء الاصطناعي'],
 focus: 'تحويل البيانات إلى معرفة وقرارات وحلول ذكية.',
 sy: ['شركات البرمجيات والـAI','تحليل البيانات في الشركات والمؤسسات','البنوك والتأمين','التسويق وتحليل سلوك العملاء','مشاريع الرؤية الحاسوبية والصور','العمل الحر والمشاريع التقنية'],
 ab: ['AI Engineer','Machine Learning Engineer','Data Scientist','Data Analyst','Deep Learning Engineer','Computer Vision Engineer','NLP Engineer','AI Researcher'],
 skills: ['برمجة قوية، خصوصًا Python','رياضيات وإحصاء','تحليل البيانات','التفكير التحليلي','فهم الخوارزميات','القدرة على التعامل مع كميات كبيرة من البيانات','بناء مشاريع AI حقيقية بدل الاكتفاء بالدراسة النظرية']
},
{
 key: 'هندسة البرمجيات ونظم المعلومات الذكية',
 name: 'هندسة البرمجيات ونظم المعلومات الذكية',
 sum: 'تخصص يجمع بين هندسة البرمجيات والذكاء الاصطناعي ونظم المعلومات، ويركّز على بناء البرمجيات والأنظمة الذكية القادرة على تحليل البيانات واتخاذ قرارات أو تنفيذ مهام بشكل أكثر ذكاءً وكفاءة.',
 study: ['البرمجة وهندسة البرمجيات','قواعد البيانات ونظم المعلومات','تحليل وتصميم الأنظمة','الذكاء الاصطناعي وتعلم الآلة','تطوير تطبيقات ومواقع وأنظمة ذكية','هندسة البرمجيات وإدارة المشاريع البرمجية'],
 focus: 'تصميم وتطوير أنظمة وبرمجيات ذكية تجمع بين البرمجة والذكاء الاصطناعي.',
 sy: ['شركات البرمجيات وتطوير التطبيقات','شركات الاتصالات والتكنولوجيا','البنوك والمؤسسات والشركات التي تعتمد على الأنظمة الرقمية','تطوير مواقع وتطبيقات وأنظمة معلومات','العمل الحر Freelancing'],
 ab: ['Software Engineer','AI Software Engineer','Systems Engineer','Software Developer','Full-Stack Developer','Business/Information Systems Analyst','AI Application Developer'],
 skills: ['مهارات قوية في البرمجة','التفكير المنطقي وحل المشكلات','فهم قواعد البيانات والأنظمة','القدرة على تحليل احتياجات المستخدم وتحويلها إلى نظام','معرفة بأدوات الذكاء الاصطناعي وتعلم الآلة','العمل الجماعي وإدارة المشاريع']
},
{
 key: 'هندسة نظم أمن المعلومات الذكية',
 name: 'هندسة نظم أمن المعلومات الذكية',
 sum: 'تخصص يجمع بين الأمن السيبراني والذكاء الاصطناعي لحماية الأنظمة والشبكات والبيانات من الهجمات والتهديدات الإلكترونية، مع استخدام الذكاء الاصطناعي لاكتشاف التهديدات وتحليلها.',
 study: ['الشبكات وأنظمة التشغيل','أمن المعلومات','التشفير Cryptography','الأمن السيبراني','أمن الشبكات والأنظمة','اكتشاف وتحليل الهجمات','الاختبار الأمني والـEthical Hacking','الذكاء الاصطناعي في الأمن السيبراني','تحليل السلوك والتهديدات الرقمية'],
 focus: 'حماية الأنظمة والبيانات، واستخدام الذكاء الاصطناعي لجعل الأمن أكثر قدرة على اكتشاف الهجمات والاستجابة لها.',
 sy: ['شركات الاتصالات','البنوك والمؤسسات المالية','الشركات التي لديها بنية تحتية وشبكات','أقسام أمن المعلومات في المؤسسات','شركات البرمجيات والخدمات التقنية'],
 ab: ['Cybersecurity Engineer','Information Security Engineer','Security Analyst','SOC Analyst','Network Security Engineer','Penetration Tester','Threat Intelligence Analyst','AI Security Engineer'],
 skills: ['فهم قوي للشبكات','أنظمة Linux وWindows','البرمجة والـScripting','التفكير التحليلي','فهم أساليب الهجمات والدفاع','معرفة التشفير ومبادئ الأمن','متابعة مستمرة للتهديدات والتقنيات الجديدة']
},
{
 key: 'هندسة الروبوت والنظم الذكية',
 name: 'هندسة الروبوت والنظم الذكية',
 sum: 'تخصص يجمع بين الروبوتات والذكاء الاصطناعي والتحكم والإلكترونيات والبرمجة، بهدف تصميم أنظمة وروبوتات قادرة على الاستشعار والتفاعل مع البيئة وتنفيذ المهام بشكل ذكي.',
 study: ['البرمجة والخوارزميات','الإلكترونيات','أنظمة التحكم','الروبوتات','الحساسات Sensors','الرؤية الحاسوبية','الذكاء الاصطناعي وتعلم الآلة','الأنظمة المضمنة Embedded Systems','معالجة الإشارات والصور','الملاحة والتحكم بالروبوتات'],
 focus: 'بناء أنظمة وروبوتات ذكية تستطيع الإحساس بالبيئة واتخاذ قرارات وتنفيذ أفعال.',
 sy: ['شركات الأتمتة والتحكم','الشركات الصناعية','المشاريع الهندسية والتقنية','المختبرات والمراكز البحثية','شركات البرمجيات والأنظمة الذكية','مشاريع الروبوتات التعليمية والصناعية'],
 ab: ['Robotics Engineer','Automation Engineer','Robotics Software Engineer','Embedded Systems Engineer','Computer Vision Engineer','Control Systems Engineer','Autonomous Systems Engineer'],
 skills: ['برمجة قوية','إلكترونيات وتحكم','فهم ميكانيكية الروبوتات','الذكاء الاصطناعي والرؤية الحاسوبية','القدرة على بناء مشاريع عملية','العمل على Microcontrollers وEmbedded Systems','التفكير الهندسي وحل المشكلات']
},
{
 key: 'هندسة الإتصالات الذكية',
 name: 'هندسة الاتصالات الذكية',
 sum: 'تخصص يجمع بين هندسة الاتصالات والشبكات والذكاء الاصطناعي، ويركز على تطوير أنظمة اتصال أكثر كفاءة وذكاءً وقدرة على تحليل البيانات وتحسين أداء الشبكات.',
 study: ['أساسيات الاتصالات','الإشارات والأنظمة','الاتصالات الرقمية','الشبكات','معالجة الإشارات','الاتصالات اللاسلكية','أنظمة الهاتف المحمول','تقنيات إنترنت الأشياء IoT','الذكاء الاصطناعي وتعلم الآلة','استخدام AI في تحسين أداء الشبكات والاتصالات'],
 focus: 'دمج الاتصالات والشبكات مع الذكاء الاصطناعي لإنشاء شبكات وأنظمة اتصال أكثر كفاءة وذكاءً.',
 sy: ['شركات الاتصالات','مزودو خدمات الإنترنت','شركات الشبكات','شركات الأنظمة والاتصالات','مشاريع IoT والأنظمة الذكية','شركات التكنولوجيا'],
 ab: ['Telecom Engineer','Network Engineer','Wireless Communications Engineer','RF Engineer','IoT Engineer','Network Optimization Engineer','AI/ML for Telecom Engineer','5G/6G Engineer'],
 skills: ['فهم قوي للاتصالات والشبكات','أساس جيد بالرياضيات والإشارات','البرمجة وتحليل البيانات','فهم الشبكات اللاسلكية','معرفة تقنيات IoT','تعلم كيفية استخدام AI لتحليل الشبكات وتحسينها','متابعة تطورات 5G و6G']
},
{
 key: 'الهندسة الطبية الذكية والمعلوماتية الحيوية',
 name: 'الهندسة الطبية الذكية والمعلوماتية الحيوية',
 sum: 'تخصص يجمع بين الهندسة والذكاء الاصطناعي والطب والبيانات الحيوية، ويهدف إلى استخدام التقنيات الهندسية والذكاء الاصطناعي في المجالات الطبية والصحية.',
 study: ['البرمجة والذكاء الاصطناعي','معالجة الصور الطبية','معالجة الإشارات الحيوية','المعلوماتية الحيوية والطبية','أساسيات التشريح ووظائف الأعضاء','الأجهزة والأنظمة الطبية','تحليل البيانات الطبية','تعلم الآلة والتعلم العميق','تطبيقات الذكاء الاصطناعي في التشخيص والمساعدة الطبية'],
 focus: 'استخدام AI لتحليل الصور والإشارات والبيانات الطبية وتطوير الأنظمة والأجهزة والحلول الصحية الذكية.',
 sy: ['المستشفيات والمراكز الطبية','شركات الأجهزة الطبية','شركات البرمجيات والأنظمة الصحية','مشاريع تحليل الصور الطبية','المعلوماتية الطبية','المراكز البحثية'],
 ab: ['Biomedical Engineer','Medical AI Engineer','Healthcare Data Analyst','Medical Imaging Engineer','Bioinformatics Engineer','Clinical/Healthcare Systems Engineer','Medical Software Developer','AI Researcher in Healthcare'],
 skills: ['برمجة وذكاء اصطناعي','فهم أساسيات التشريح ووظائف الجسم','معالجة الصور والإشارات','تحليل البيانات الطبية','فهم الأجهزة والأنظمة الطبية','القدرة على الربط بين الهندسة والطب والـAI']
}
];

function renderAboutList() {
    const list = document.getElementById("about-list");
    if (!list) return;
    list.innerHTML = ABOUT_MAJORS.map(function (m, i) {
        return '<button type="button" class="about-option" onclick="selectAbout(' + i + ')">' + m.name + '</button>';
    }).join("");
}

function toggleAbout() {
    const list = document.getElementById("about-list");
    const btn = document.getElementById("about-btn");
    if (!list) return;
    const open = list.classList.toggle("show");
    if (btn) btn.setAttribute("aria-expanded", open ? "true" : "false");
}

function selectAbout(i) {
    const m = ABOUT_MAJORS[i];
    const panel = document.getElementById("about-panel");
    const list = document.getElementById("about-list");
    if (!m || !panel) return;

    const items = function (a) {
        return '<ul class="about-list-items">' + a.map(function (x) { return '<li dir="auto">' + x + '</li>'; }).join("") + '</ul>';
    };
    const chips = function (a) {
        return '<div class="about-chips">' + a.map(function (x) { return '<span class="about-chip" dir="auto">' + x + '</span>'; }).join("") + '</div>';
    };

    const section = function (icon, title, body) {
        return '<div class="about-acc">' +
            '<div class="about-acc-head" onclick="toggleAboutSection(this)">' +
                '<div class="about-acc-icon"><i class="fa-solid ' + icon + '"></i></div>' +
                '<h4>' + title + '</h4>' +
                '<button type="button" class="arrow about-acc-btn" aria-expanded="false" aria-label="عرض ' + title + '">↓</button>' +
            '</div>' +
            '<div class="about-acc-body">' + body + '</div>' +
        '</div>';
    };

    panel.innerHTML =
        '<h3 class="about-name">' + m.name + '</h3>' +
        section('fa-circle-info', 'التعريف بالتخصص', '<p class="about-lead">' + m.sum + '</p>') +
        section('fa-book-open', 'ماذا يدرس الطالب؟', chips(m.study)) +
        section('fa-bullseye', 'التركيز الأساسي', '<p class="about-focus">' + m.focus + '</p>') +
        section('fa-briefcase', 'مجالات العمل داخل سوريا', items(m.sy)) +
        section('fa-globe', 'مجالات العمل خارج سوريا', chips(m.ab)) +
        section('fa-star', 'كيف يتميز الطالب؟', items(m.skills)) +
        '<button type="button" class="start-btn about-pick" onclick="pickFromAbout(' + i + ')">اختر هذا التخصص <span>←</span></button>';

    panel.classList.add("show");

    document.querySelectorAll(".about-option").forEach(function (b, n) {
        b.classList.toggle("active", n === i);
    });

    const title = document.getElementById("about-title");
    const sub = document.getElementById("about-sub");
    if (title) title.textContent = m.name;
    if (sub) sub.textContent = "اضغط على السهم للتبديل بين التخصصات";

    if (list) list.classList.remove("show");
    const btn = document.getElementById("about-btn");
    if (btn) btn.setAttribute("aria-expanded", "false");

    panel.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function toggleAboutSection(head) {
    const acc = head.parentElement;
    const open = acc.classList.toggle("open");
    const btn = head.querySelector(".about-acc-btn");
    if (btn) btn.setAttribute("aria-expanded", open ? "true" : "false");
}

function pickFromAbout(i) {
    const m = ABOUT_MAJORS[i];
    if (!m) return;
    selectMajor(m.key);
    const sel = document.getElementById("selected-major");
    if (sel) sel.scrollIntoView({ behavior: "smooth", block: "center" });
}

renderAboutList();
