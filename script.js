(() => {
  "use strict";

  const GRADE_INFO = [
    { grade: "A+", marks: "90-100", points: 4.00 },
    { grade: "A",  marks: "85-89",  points: 3.75 },
    { grade: "A-", marks: "80-84",  points: 3.50 },
    { grade: "B+", marks: "75-79",  points: 3.25 },
    { grade: "B",  marks: "70-74",  points: 3.00 },
    { grade: "B-", marks: "66-69",  points: 2.75 },
    { grade: "C+", marks: "63-65",  points: 2.50 },
    { grade: "C",  marks: "60-62",  points: 2.00 },
    { grade: "C-", marks: "55-59",  points: 1.50 },
    { grade: "F",  marks: "0-54",   points: 0.00 }
  ];

  const GRADE_POINTS = {};
  GRADE_INFO.forEach(g => { GRADE_POINTS[g.grade] = g.points; });

  const STORAGE_KEY = "szabist-gpa-calculator-state";
  const GAUGE_ARC_LENGTH = 251;

  let idCounter = 1000;
  let state = loadState() || createDefaultState();
  if(state.mode !== "gpa" && state.mode !== "cgpa") state.mode = "gpa";

  function createDefaultState(){
    return {
      theme: matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light",
      mode: "gpa",
      gpa: {
        name: "Current Semester",
        courses: [ createCourse() ]
      },
      cgpaSemesters: [ createCgpaSemester("Semester 1") ]
    };
  }

  function createCourse(){
    return {
      id: "course-" + (++idCounter),
      name: "",
      credits: 3,
      grade: "A"
    };
  }

  function createCgpaSemester(name){
    return {
      id: "cgpasem-" + (++idCounter),
      name: name,
      credits: 15,
      gpa: 0
    };
  }

  function saveState(){
    try{
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }catch(e){ /* storage unavailable — fail silently */ }
  }

  function loadState(){
    try{
      const raw = localStorage.getItem(STORAGE_KEY);
      if(!raw) return null;
      const parsed = JSON.parse(raw);
      return migrateState(parsed);
    }catch(e){ return null; }
  }

  function migrateState(parsed){
    if(!parsed || typeof parsed !== "object") return null;

    if(parsed.gpa && Array.isArray(parsed.cgpaSemesters)){
      if(!parsed.gpa.courses || !parsed.gpa.courses.length) return null;
      return parsed;
    }

    if(Array.isArray(parsed.semesters) && parsed.semesters.length){
      const first = parsed.semesters[0];
      const gpa = {
        name: first.name || "Current Semester",
        courses: (first.courses && first.courses.length) ? first.courses : [ createCourse() ]
      };
      const cgpaSemesters = parsed.semesters.map(s => {
        const { gpa: semGpa, credits } = computeCoursesGpa(s.courses || []);
        return {
          id: "cgpasem-" + (++idCounter),
          name: s.name || "Semester",
          credits: credits || 15,
          gpa: Number(semGpa.toFixed(2))
        };
      });
      return {
        theme: parsed.theme === "dark" ? "dark" : "light",
        mode: parsed.mode === "cgpa" ? "cgpa" : "gpa",
        gpa,
        cgpaSemesters
      };
    }

    return null;
  }

  const semesterListEl = document.getElementById("semesterList");
  const semesterTemplate = document.getElementById("semesterTemplate");
  const courseRowTemplate = document.getElementById("courseRowTemplate");
  const cgpaSemesterTemplate = document.getElementById("cgpaSemesterTemplate");
  const addSemesterBtn = document.getElementById("addSemesterBtn");
  const modeSwitch = document.getElementById("modeSwitch");
  const modeButtons = modeSwitch.querySelectorAll(".mode-btn");
  const gaugeEyebrow = document.getElementById("gaugeEyebrow");
  const gaugeLabelText = document.getElementById("gaugeLabelText");
  const semesterCountStat = document.getElementById("semesterCountStat");
  const themeToggle = document.getElementById("themeToggle");
  const resetBtn = document.getElementById("resetBtn");
  const iconSun = document.getElementById("iconSun");
  const iconMoon = document.getElementById("iconMoon");

  const cgpaValueEl = document.getElementById("cgpaValue");
  const totalCreditsEl = document.getElementById("totalCredits");
  const semesterCountEl = document.getElementById("semesterCount");
  const gaugeFillEl = document.getElementById("gaugeFill");
  const gaugeTicksEl = document.getElementById("gaugeTicks");
  const legendGridEl = document.getElementById("legendGrid");

  function render(){
    semesterListEl.innerHTML = "";
    const isGpaMode = state.mode === "gpa";

    if(isGpaMode){
      semesterListEl.appendChild(buildGpaCard());
    }else{
      state.cgpaSemesters.forEach(sem => semesterListEl.appendChild(buildCgpaSemesterCard(sem)));
    }

    addSemesterBtn.style.display = isGpaMode ? "none" : "flex";
    updateModeUI();
    recalculateAll();
  }

  function updateModeUI(){
    const isGpaMode = state.mode === "gpa";

    modeButtons.forEach(btn => {
      const active = btn.dataset.mode === state.mode;
      btn.classList.toggle("active", active);
      btn.setAttribute("aria-selected", active ? "true" : "false");
    });

    gaugeEyebrow.textContent = isGpaMode ? "Current Semester" : "Cumulative Standing";
    gaugeLabelText.textContent = isGpaMode ? "GPA / 4.00" : "CGPA / 4.00";
    semesterCountStat.style.display = isGpaMode ? "none" : "flex";
  }

  function buildGpaCard(){
    const node = semesterTemplate.content.firstElementChild.cloneNode(true);
    node.dataset.semesterId = "gpa-current";

    const titleInput = node.querySelector(".semester-title-input");
    titleInput.value = state.gpa.name;
    titleInput.addEventListener("input", () => {
      state.gpa.name = titleInput.value;
      saveState();
    });

    const removeBtn = node.querySelector(".remove-semester-btn");
    removeBtn.style.display = "none";

    const rowsContainer = node.querySelector(".course-rows");
    state.gpa.courses.forEach(course => rowsContainer.appendChild(buildCourseRow(course)));

    const addCourseBtn = node.querySelector(".add-course-btn");
    addCourseBtn.addEventListener("click", () => {
      const course = createCourse();
      state.gpa.courses.push(course);
      rowsContainer.appendChild(buildCourseRow(course));
      saveState();
      recalculateAll();
    });

    return node;
  }

  function buildCourseRow(course){
    const row = courseRowTemplate.content.firstElementChild.cloneNode(true);
    row.dataset.courseId = course.id;

    const nameInput = row.querySelector(".course-name-input");
    nameInput.value = course.name;
    nameInput.addEventListener("input", () => {
      course.name = nameInput.value;
      saveState();
    });

    const creditsSelect = row.querySelector(".course-credits-select");
    creditsSelect.value = String(course.credits);
    creditsSelect.addEventListener("change", () => {
      course.credits = Number(creditsSelect.value);
      saveState();
      recalculateAll();
    });

    const gradeSelect = row.querySelector(".course-grade-select");
    GRADE_INFO.forEach(g => {
      const opt = document.createElement("option");
      opt.value = g.grade;
      opt.textContent = g.grade;
      gradeSelect.appendChild(opt);
    });
    gradeSelect.value = course.grade;
    gradeSelect.addEventListener("change", () => {
      course.grade = gradeSelect.value;
      saveState();
      recalculateAll();
    });

    const removeBtn = row.querySelector(".remove-course-btn");
    removeBtn.addEventListener("click", () => {
      if(state.gpa.courses.length <= 1){
        flashShake(row);
        return;
      }
      row.classList.add("removing");
      setTimeout(() => {
        state.gpa.courses = state.gpa.courses.filter(c => c.id !== course.id);
        row.remove();
        saveState();
        recalculateAll();
      }, 220);
    });

    return row;
  }

  function buildCgpaSemesterCard(semester){
    const node = cgpaSemesterTemplate.content.firstElementChild.cloneNode(true);
    node.dataset.semesterId = semester.id;

    const titleInput = node.querySelector(".semester-title-input");
    titleInput.value = semester.name;
    titleInput.addEventListener("input", () => {
      semester.name = titleInput.value;
      saveState();
    });

    const removeBtn = node.querySelector(".remove-semester-btn");
    removeBtn.addEventListener("click", () => {
      if(state.cgpaSemesters.length <= 1){
        flashShake(node);
        return;
      }
      node.classList.add("removing");
      setTimeout(() => {
        state.cgpaSemesters = state.cgpaSemesters.filter(s => s.id !== semester.id);
        saveState();
        render();
      }, 260);
    });

    const creditsInput = node.querySelector(".semester-credits-input");
    creditsInput.value = String(semester.credits);
    creditsInput.addEventListener("input", () => {
      const val = Math.max(0, Math.min(60, Number(creditsInput.value) || 0));
      semester.credits = val;
      saveState();
      recalculateAll();
    });

    const gpaInput = node.querySelector(".semester-gpa-input");
    gpaInput.value = semester.gpa.toFixed(2);
    gpaInput.addEventListener("input", () => {
      const val = Math.max(0, Math.min(4, Number(gpaInput.value) || 0));
      semester.gpa = val;
      saveState();
      recalculateAll();
    });

    return node;
  }

  function flashShake(el){
    el.animate(
      [
        { transform: "translateX(0)" },
        { transform: "translateX(-4px)" },
        { transform: "translateX(4px)" },
        { transform: "translateX(0)" }
      ],
      { duration: 260, easing: "ease-in-out" }
    );
  }

  function computeCoursesGpa(courses){
    let points = 0, credits = 0;
    (courses || []).forEach(c => {
      const gp = GRADE_POINTS[c.grade];
      if(gp === undefined) return;
      points += gp * c.credits;
      credits += c.credits;
    });
    return { gpa: credits ? points / credits : 0, credits, points };
  }

  function recalculateAll(){
    if(state.mode === "gpa"){
      const { gpa, credits } = computeCoursesGpa(state.gpa.courses);

      cgpaValueEl.textContent = gpa.toFixed(2);
      totalCreditsEl.textContent = String(credits);
      semesterCountEl.textContent = "1";

      const fillPct = Math.max(0, Math.min(100, (gpa / 4) * 100));
      const progressFill = semesterListEl.querySelector(".semester-progress-fill");
      if(progressFill) progressFill.style.width = fillPct + "%";

      const pillValue = semesterListEl.querySelector(".semester-gpa-value");
      if(pillValue) pillValue.textContent = gpa.toFixed(2);

      setGaugeOffset(gpa);
      return;
    }

    let totalPoints = 0, totalCredits = 0;

    document.querySelectorAll(".cgpa-semester-card").forEach(card => {
      const semId = card.dataset.semesterId;
      const semester = state.cgpaSemesters.find(s => s.id === semId);
      if(!semester) return;

      totalPoints += semester.gpa * semester.credits;
      totalCredits += semester.credits;

      const fillPct = Math.max(0, Math.min(100, (semester.gpa / 4) * 100));
      const progressFill = card.querySelector(".semester-progress-fill");
      if(progressFill) progressFill.style.width = fillPct + "%";
    });

    const cgpa = totalCredits ? totalPoints / totalCredits : 0;

    cgpaValueEl.textContent = cgpa.toFixed(2);
    totalCreditsEl.textContent = String(totalCredits);
    semesterCountEl.textContent = String(state.cgpaSemesters.length);

    setGaugeOffset(cgpa);
  }

  function setGaugeOffset(value){
    const offset = GAUGE_ARC_LENGTH - (Math.max(0, Math.min(4, value)) / 4) * GAUGE_ARC_LENGTH;
    gaugeFillEl.style.strokeDashoffset = String(offset);
  }

  function buildGaugeTicks(){
    const marks = [0, 1, 2, 2.75, 3.5, 4];
    const cx = 120, cy = 130, r = 100;
    marks.forEach(v => {
      const t = v / 4;
      const angle = Math.PI - t * Math.PI;
      const x1 = cx + Math.cos(angle) * (r - 10);
      const y1 = cy - Math.sin(angle) * (r - 10);
      const x2 = cx + Math.cos(angle) * (r + 2);
      const y2 = cy - Math.sin(angle) * (r + 2);

      const tick = document.createElementNS("http://www.w3.org/2000/svg", "line");
      tick.setAttribute("x1", x1.toFixed(1));
      tick.setAttribute("y1", y1.toFixed(1));
      tick.setAttribute("x2", x2.toFixed(1));
      tick.setAttribute("y2", y2.toFixed(1));
      tick.setAttribute("class", "gauge-tick");
      gaugeTicksEl.appendChild(tick);

      const lx = cx + Math.cos(angle) * (r - 22);
      const ly = cy - Math.sin(angle) * (r - 22);
      const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
      label.setAttribute("x", lx.toFixed(1));
      label.setAttribute("y", (ly + 3).toFixed(1));
      label.setAttribute("text-anchor", "middle");
      label.setAttribute("class", "gauge-tick-label");
      label.textContent = v.toFixed(v % 1 === 0 ? 0 : 1);
      gaugeTicksEl.appendChild(label);
    });
  }

  function buildLegend(){
    legendGridEl.innerHTML = "";
    GRADE_INFO.forEach(g => {
      const item = document.createElement("div");
      item.className = "legend-item";
      item.innerHTML = "<b>" + g.grade + "</b><span class=\"legend-marks\">" + g.marks + "</span><span class=\"legend-points\">" + g.points.toFixed(2) + "</span>";
      legendGridEl.appendChild(item);
    });
  }

  function applyTheme(){
    document.documentElement.setAttribute("data-theme", state.theme);
    const isDark = state.theme === "dark";
    iconSun.style.display = isDark ? "none" : "block";
    iconMoon.style.display = isDark ? "block" : "none";
  }

  modeButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const newMode = btn.dataset.mode;
      if(newMode === state.mode) return;
      state.mode = newMode;
      saveState();
      render();
    });
  });

  themeToggle.addEventListener("click", () => {
    state.theme = state.theme === "dark" ? "light" : "dark";
    applyTheme();
    saveState();
  });

  resetBtn.addEventListener("click", () => {
    const confirmed = window.confirm("Reset all semesters and courses? This can't be undone.");
    if(!confirmed) return;
    idCounter = 1000;
    state = createDefaultState();
    saveState();
    applyTheme();
    render();
  });

  addSemesterBtn.addEventListener("click", () => {
    if(state.mode !== "cgpa") return;
    const semester = createCgpaSemester("Semester " + (state.cgpaSemesters.length + 1));
    state.cgpaSemesters.push(semester);
    saveState();
    render();
    const newCard = semesterListEl.querySelector('[data-semester-id="' + semester.id + '"]');
    if(newCard) newCard.scrollIntoView({ behavior: "smooth", block: "center" });
  });

  applyTheme();
  buildGaugeTicks();
  buildLegend();
  render();

})();
