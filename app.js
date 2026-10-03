// app.js - المحرك البرمجي الشامل مع دعم الوضع الليلي
document.addEventListener("DOMContentLoaded", () => {
  // ==================== 0. إدارة الوضع الليلي (Dark Mode) ====================
  const themeToggleBtn = document.getElementById("themeToggleBtn");
  const themeIcon = document.getElementById("themeIcon");

  function applyTheme(isDark) {
    if (isDark) {
      document.documentElement.classList.add("dark");
      themeIcon.innerText = "☀️";
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      themeIcon.innerText = "🌙";
      localStorage.setItem("theme", "light");
    }
  }

  // قراءة الحالة المحفوظة أو النظام الافتراضي
  const savedTheme = localStorage.getItem("theme");
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  applyTheme(savedTheme === "dark" || (!savedTheme && prefersDark));

  themeToggleBtn.onclick = () => {
    const isDark = document.documentElement.classList.contains("dark");
    applyTheme(!isDark);
  };

  // ==================== حالة التطبيق ====================
  let activeCourseId = null;
  let activeQuestions = [];
  let currentIndex = 0;
  let userAnswers = {};
  let isImmediateFeedback = true;
  let timerInterval = null;
  let secondsElapsed = 0;
  let filterWrongOnly = false;

  // عناصر الواجهات
  const coursesScreen = document.getElementById("coursesScreen");
  const courseSetupScreen = document.getElementById("courseSetupScreen");
  const examScreen = document.getElementById("examScreen");
  const resultScreen = document.getElementById("resultScreen");
  const wrongQuestionsScreen = document.getElementById("wrongQuestionsScreen");
  const sourcesScreen = document.getElementById("sourcesScreen");

  const coursesGrid = document.getElementById("coursesGrid");
  const navCoursesBtn = document.getElementById("navCoursesBtn");
  const logoHomeBtn = document.getElementById("logoHomeBtn");
  const statsBadge = document.getElementById("statsBadge");

  // تنبيه استئناف الجلسة
  const resumeSessionAlert = document.getElementById("resumeSessionAlert");
  const resumeExamBtn = document.getElementById("resumeExamBtn");
  const discardSessionBtn = document.getElementById("discardSessionBtn");
  const resetSessionBtn = document.getElementById("resetSessionBtn");

  // نافذة الإدخال اليدوي لبنك المقرر
  const manualStatsModal = document.getElementById("manualStatsModal");
  const openManualStatsModal = document.getElementById("openManualStatsModal");
  const closeModalBtn = document.getElementById("closeModalBtn");
  const saveManualStatsBtn = document.getElementById("saveManualStatsBtn");
  const manualTotalInput = document.getElementById("manualTotalInput");
  const manualWrongIdsInput = document.getElementById("manualWrongIdsInput");

  // أزرار وعناصر مصادر الأسئلة
  const viewSourcesBtn = document.getElementById("viewSourcesBtn");
  const sourcesCount = document.getElementById("sourcesCount");
  const sourcesScreenCourseName = document.getElementById("sourcesScreenCourseName");
  const sourcesList = document.getElementById("sourcesList");
  const backToSetupFromSourcesBtn = document.getElementById("backToSetupFromSourcesBtn");

  // بطاقة السؤال والمراجعة
  const questionText = document.getElementById("questionText");
  const optionsContainer = document.getElementById("optionsContainer");
  const currentQNum = document.getElementById("currentQNum");
  const totalQNum = document.getElementById("totalQNum");
  const progressBar = document.getElementById("progressBar");
  const explanationBox = document.getElementById("explanationBox");
  const explanationTitle = document.getElementById("explanationTitle");
  const explanationText = document.getElementById("explanationText");
  const questionPalette = document.getElementById("questionPalette");
  const qCourseBadge = document.getElementById("qCourseBadge");
  const qOriginalBadge = document.getElementById("qOriginalBadge");

  const prevBtn = document.getElementById("prevBtn");
  const nextBtn = document.getElementById("nextBtn");
  const finishBtn = document.getElementById("finishBtn");
  const retryBtn = document.getElementById("retryBtn");
  const toggleReviewBtn = document.getElementById("toggleReviewBtn");

  const answeredCount = document.getElementById("answeredCount");
  const totalQuestionsCount = document.getElementById("totalQuestionsCount");
  const liveScore = document.getElementById("liveScore");
  const timeElapsed = document.getElementById("timeElapsed");

  // ==================== 1. إدارة التخزين المحلي (LocalStorage) ====================

  function getCourseStats(courseId) {
    const key = `exam_stats_${courseId}`;
    const data = localStorage.getItem(key);
    if (!data) return { correct: 0, wrong: 0, total: 0, wrongQuestionIds: [] };
    const parsed = JSON.parse(data);
    if (!parsed.wrongQuestionIds) parsed.wrongQuestionIds = [];
    return parsed;
  }

  function saveCourseStats(courseId, newCorrect, newWrong, newWrongIds = []) {
    const key = `exam_stats_${courseId}`;
    const current = getCourseStats(courseId);
    const mergedWrongIds = Array.from(new Set([...current.wrongQuestionIds, ...newWrongIds]));

    const updated = {
      correct: current.correct + newCorrect,
      wrong: current.wrong + newWrong,
      total: current.total + (newCorrect + newWrong),
      wrongQuestionIds: mergedWrongIds
    };
    localStorage.setItem(key, JSON.stringify(updated));
    return updated;
  }

  function saveCoursePreferences(courseId) {
    const mode = document.querySelector('input[name="examMode"]:checked')?.value || "all";
    const immediate = document.getElementById("immediateFeedback").checked;
    const shuffle = document.getElementById("shuffleQuestions").checked;

    const prefs = { mode, immediate, shuffle };
    localStorage.setItem(`exam_prefs_${courseId}`, JSON.stringify(prefs));
  }

  function loadCoursePreferences(courseId) {
    const saved = localStorage.getItem(`exam_prefs_${courseId}`);
    if (!saved) {
      const defaultRadio = document.querySelector('input[name="examMode"][value="all"]') || document.querySelector('input[name="examMode"][value="25"]');
      if (defaultRadio) defaultRadio.checked = true;
      document.getElementById("immediateFeedback").checked = true;
      document.getElementById("shuffleQuestions").checked = false;
      return;
    }
    const { mode, immediate, shuffle } = JSON.parse(saved);
    const radio = document.querySelector(`input[name="examMode"][value="${mode}"]`);
    if (radio) radio.checked = true;
    document.getElementById("immediateFeedback").checked = immediate !== undefined ? immediate : true;
    document.getElementById("shuffleQuestions").checked = shuffle !== undefined ? shuffle : false;
  }

  function saveCurrentLiveSession() {
    if (!activeCourseId || activeQuestions.length === 0) return;
    const sessionData = {
      courseId: activeCourseId,
      questions: activeQuestions,
      currentIndex: currentIndex,
      userAnswers: userAnswers,
      secondsElapsed: secondsElapsed,
      isImmediateFeedback: isImmediateFeedback
    };
    localStorage.setItem(`exam_livesession_${activeCourseId}`, JSON.stringify(sessionData));
  }

  function clearLiveSession(courseId) {
    localStorage.removeItem(`exam_livesession_${courseId}`);
  }

  function getLiveSession(courseId) {
    const data = localStorage.getItem(`exam_livesession_${courseId}`);
    return data ? JSON.parse(data) : null;
  }

  // ==================== 2. بناء واجهة المقررات ====================

  function renderCourses() {
    coursesGrid.innerHTML = "";
    Object.values(COURSES_DATA).forEach(course => {
      const stats = getCourseStats(course.id);
      const card = document.createElement("div");
      card.className = "course-card bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 cursor-pointer flex flex-col justify-between transition";
      card.onclick = () => selectCourse(course.id);

      card.innerHTML = `
        <div>
          <div class="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 flex items-center justify-center text-2xl mb-3 shadow-inner">
            ${course.icon}
          </div>
          <h3 class="text-lg font-bold text-slate-800 dark:text-slate-100 mb-1">${course.title}</h3>
          <p class="text-xs text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">${course.desc}</p>
        </div>
        
        <div class="pt-3 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
          <span class="font-bold text-indigo-600 dark:text-indigo-400">الأسئلة: ${course.questions.length}</span>
          <span class="bg-slate-100 dark:bg-slate-700 px-2.5 py-1 rounded-md text-[11px]">
            سجلك: <b class="text-emerald-600 dark:text-emerald-400">${stats.correct}✓</b> / <b class="text-rose-600 dark:text-rose-400">${stats.wrong}✕</b>
          </span>
        </div>
      `;
      coursesGrid.appendChild(card);
    });
  }

  function selectCourse(courseId) {
    activeCourseId = courseId;
    const course = COURSES_DATA[courseId];

    document.getElementById("setupCourseTitle").innerText = course.title;
    document.getElementById("setupCourseDesc").innerText = `${course.desc} • يحتوي على ${course.questions.length} سؤالاً`;
    document.getElementById("setupCourseIcon").innerText = course.icon;

    const sources = course.sources || [];
    if (sourcesCount) sourcesCount.innerText = sources.length;

    updateSavedStatsDisplay();
    loadCoursePreferences(courseId);

    const savedSession = getLiveSession(courseId);
    if (savedSession && Object.keys(savedSession.userAnswers).length > 0) {
      resumeSessionAlert.classList.remove("hidden");
    } else {
      resumeSessionAlert.classList.add("hidden");
    }

    coursesScreen.classList.add("hidden");
    courseSetupScreen.classList.remove("hidden");
    examScreen.classList.add("hidden");
    resultScreen.classList.add("hidden");
    wrongQuestionsScreen.classList.add("hidden");
    if (sourcesScreen) sourcesScreen.classList.add("hidden");
    navCoursesBtn.classList.remove("hidden");
  }

  function updateSavedStatsDisplay() {
    if (!activeCourseId) return;
    const stats = getCourseStats(activeCourseId);
    document.getElementById("savedTotalAnswers").innerText = stats.total;
    document.getElementById("savedCorrectAnswers").innerText = stats.correct;
    document.getElementById("savedWrongAnswers").innerText = stats.wrong;
    document.getElementById("wrongQuestionsCount").innerText = stats.wrongQuestionIds.length;
  }

  function showCoursesScreen() {
    clearInterval(timerInterval);
    coursesScreen.classList.remove("hidden");
    courseSetupScreen.classList.add("hidden");
    examScreen.classList.add("hidden");
    resultScreen.classList.add("hidden");
    wrongQuestionsScreen.classList.add("hidden");
    if (sourcesScreen) sourcesScreen.classList.add("hidden");
    statsBadge.classList.add("hidden");
    navCoursesBtn.classList.add("hidden");
    renderCourses();
  }

  logoHomeBtn.onclick = showCoursesScreen;
  navCoursesBtn.onclick = showCoursesScreen;
  document.getElementById("backToCoursesFromSetup").onclick = showCoursesScreen;
  document.getElementById("backToCoursesFromResults").onclick = showCoursesScreen;

  // ==================== 3. التعديل اليدوي لبنك المقرر ====================

  openManualStatsModal.onclick = () => {
    const live = getLiveSession(activeCourseId);
    const stats = getCourseStats(activeCourseId);

    manualTotalInput.value = live ? Object.keys(live.userAnswers).length : stats.total;
    manualWrongIdsInput.value = stats.wrongQuestionIds.join(", ");
    manualStatsModal.classList.remove("hidden");
  };

  closeModalBtn.onclick = () => {
    manualStatsModal.classList.add("hidden");
  };

  saveManualStatsBtn.onclick = () => {
    const course = COURSES_DATA[activeCourseId];
    const answeredCountVal = Math.min(parseInt(manualTotalInput.value) || 0, course.questions.length);

    const wrongIdsSet = new Set(
      manualWrongIdsInput.value
        .split(/[,،\s]+/)
        .map(id => parseInt(id.trim()))
        .filter(id => !isNaN(id) && id > 0)
    );

    activeQuestions = [...course.questions];
    userAnswers = {};

    let totalCorrect = 0;
    let totalWrong = 0;
    const recordedWrongIds = [];

    for (let i = 0; i < answeredCountVal; i++) {
      const q = activeQuestions[i];
      if (wrongIdsSet.has(q.id)) {
        const wrongChoice = q.c === 0 ? 1 : 0;
        userAnswers[i] = wrongChoice;
        totalWrong++;
        recordedWrongIds.push(q.id);
      } else {
        userAnswers[i] = q.c;
        totalCorrect++;
      }
    }

    const key = `exam_stats_${activeCourseId}`;
    localStorage.setItem(key, JSON.stringify({
      total: answeredCountVal,
      correct: totalCorrect,
      wrong: totalWrong,
      wrongQuestionIds: Array.from(new Set(recordedWrongIds))
    }));

    currentIndex = answeredCountVal < activeQuestions.length ? answeredCountVal : activeQuestions.length - 1;
    secondsElapsed = 0;
    isImmediateFeedback = true;

    saveCurrentLiveSession();
    updateSavedStatsDisplay();
    manualStatsModal.classList.add("hidden");

    startActiveSession();
  };

  // ==================== 4. استعراض بنك الأسئلة الخاطئة ====================

  document.getElementById("viewWrongQuestionsBtn").onclick = () => {
    const stats = getCourseStats(activeCourseId);
    const course = COURSES_DATA[activeCourseId];
    document.getElementById("wrongScreenCourseName").innerText = course.title;

    const listContainer = document.getElementById("wrongQuestionsList");
    listContainer.innerHTML = "";

    if (stats.wrongQuestionIds.length === 0) {
      listContainer.innerHTML = `
        <div class="text-center py-10 bg-slate-50 dark:bg-slate-700/40 rounded-xl border border-slate-200 dark:border-slate-700">
          <span class="text-3xl">🎉</span>
          <p class="text-sm font-bold text-slate-700 dark:text-slate-300 mt-2">رائع! ليس لديك أي أسئلة مسجلة في بنك الأخطاء.</p>
        </div>
      `;
    } else {
      stats.wrongQuestionIds.forEach(qId => {
        const qObj = course.questions.find(q => q.id === qId);
        if (!qObj) return;

        const card = document.createElement("div");
        card.className = "p-4 rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50/40 dark:bg-rose-950/20 text-sm";
        card.innerHTML = `
          <div class="flex justify-between items-center mb-2">
            <span class="font-bold text-rose-800 dark:text-rose-300">سؤال #${qObj.id}</span>
            <span class="px-2 py-0.5 bg-rose-100 dark:bg-rose-900/60 text-rose-800 dark:text-rose-300 text-[11px] font-bold rounded">إجابة خاطئة مسجلة</span>
          </div>
          <div class="font-bold text-slate-800 dark:text-slate-100 mb-3">${qObj.q}</div>
          <div class="text-xs mb-2">
            <strong class="text-slate-600 dark:text-slate-400">الإجابة الصحيحة المعتمدة:</strong>
            <span class="text-emerald-700 dark:text-emerald-400 font-bold mr-1">${qObj.opts[qObj.c]}</span>
          </div>
          <div class="text-xs text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700">
            <span class="font-bold text-slate-700 dark:text-slate-200">💡 الشرح:</span> ${qObj.exp}
          </div>
        `;
        listContainer.appendChild(card);
      });
    }

    courseSetupScreen.classList.add("hidden");
    wrongQuestionsScreen.classList.remove("hidden");
  };

  document.getElementById("backToSetupFromWrongBtn").onclick = () => {
    wrongQuestionsScreen.classList.add("hidden");
    courseSetupScreen.classList.remove("hidden");
  };

  // ==================== 5. استعراض ملفات ومصادر التجميعات ====================

  if (viewSourcesBtn) {
    viewSourcesBtn.onclick = () => {
      const course = COURSES_DATA[activeCourseId];
      const sources = course.sources || [];
      sourcesScreenCourseName.innerText = course.title;
      sourcesList.innerHTML = "";

      if (sources.length === 0) {
        sourcesList.innerHTML = `
          <div class="text-center py-10 bg-slate-50 dark:bg-slate-700/40 rounded-xl border border-slate-200 dark:border-slate-700">
            <span class="text-3xl">📄</span>
            <p class="text-sm font-bold text-slate-700 dark:text-slate-300 mt-2">لا توجد مصادر ملفات مسجلة لهذا المقرر حالياً.</p>
          </div>
        `;
      } else {
        sources.forEach(src => {
          const card = document.createElement("div");
          card.className = "p-4 rounded-xl border border-indigo-100 dark:border-slate-700 bg-indigo-50/40 dark:bg-slate-700/30 text-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3";
          card.innerHTML = `
            <div>
              <div class="flex items-center gap-2 mb-1">
                <span class="text-xl">📄</span>
                <span class="font-bold text-indigo-950 dark:text-indigo-300">${src.name}</span>
              </div>
              <div class="text-xs text-slate-500 dark:text-slate-400 font-medium">${src.author || ''}</div>
              <div class="text-xs text-slate-600 dark:text-slate-300 mt-1">${src.details || ''}</div>
            </div>
            ${src.url && src.url !== '#' ? `
              <a href="${src.url}" target="_blank" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition shrink-0 flex items-center gap-1.5 shadow-sm">
                <span>📥</span> فتح الملف
              </a>
            ` : `
              <span class="px-3 py-1 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold rounded-md shrink-0">
                ملف تجميعي معتمد
              </span>
            `}
          `;
          sourcesList.appendChild(card);
        });
      }

      courseSetupScreen.classList.add("hidden");
      sourcesScreen.classList.remove("hidden");
    };
  }

  if (backToSetupFromSourcesBtn) {
    backToSetupFromSourcesBtn.onclick = () => {
      sourcesScreen.classList.add("hidden");
      courseSetupScreen.classList.remove("hidden");
    };
  }

  // ==================== 6. تشغيل واستئناف الاختبار ====================

  document.getElementById("startExamBtn").onclick = () => {
    saveCoursePreferences(activeCourseId);
    clearLiveSession(activeCourseId);

    const course = COURSES_DATA[activeCourseId];
    const selectedMode = document.querySelector('input[name="examMode"]:checked')?.value || "all";
    isImmediateFeedback = document.getElementById("immediateFeedback").checked;
    const shouldShuffle = document.getElementById("shuffleQuestions").checked;

    let pool = shouldShuffle ? [...course.questions].sort(() => Math.random() - 0.5) : [...course.questions];

    if (selectedMode === "25") activeQuestions = pool.slice(0, 25);
    else if (selectedMode === "50") activeQuestions = pool.slice(0, 50);
    else if (selectedMode === "100") activeQuestions = pool.slice(0, 100);
    else activeQuestions = pool;

    currentIndex = 0;
    userAnswers = {};
    secondsElapsed = 0;

    startActiveSession();
  };

  resumeExamBtn.onclick = () => {
    const session = getLiveSession(activeCourseId);
    if (!session) return;

    activeQuestions = session.questions;
    currentIndex = session.currentIndex;
    userAnswers = session.userAnswers;
    secondsElapsed = session.secondsElapsed;
    isImmediateFeedback = session.isImmediateFeedback;

    startActiveSession();
  };

  discardSessionBtn.onclick = () => {
    clearLiveSession(activeCourseId);
    resumeSessionAlert.classList.add("hidden");
  };

  resetSessionBtn.onclick = () => {
    if (confirm("هل أنت متأكد من رغبتك في إعادة بدء هذا الاختبار وتصفير تقدمه؟")) {
      userAnswers = {};
      currentIndex = 0;
      secondsElapsed = 0;
      saveCurrentLiveSession();
      renderQuestion();
      updateLiveStats();
    }
  };

  function startActiveSession() {
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      secondsElapsed++;
      const mins = String(Math.floor(secondsElapsed / 60)).padStart(2, "0");
      const secs = String(secondsElapsed % 60).padStart(2, "0");
      timeElapsed.innerText = `${mins}:${secs}`;
    }, 1000);

    courseSetupScreen.classList.add("hidden");
    examScreen.classList.remove("hidden");
    statsBadge.classList.remove("hidden");
    statsBadge.classList.add("flex");

    const course = COURSES_DATA[activeCourseId];
    totalQNum.innerText = activeQuestions.length;
    totalQuestionsCount.innerText = activeQuestions.length;
    qCourseBadge.innerText = course.title.split("-")[0].trim();

    buildPalette();
    renderQuestion();
    updateLiveStats();
    saveCurrentLiveSession();
  }

  function buildPalette() {
    questionPalette.innerHTML = "";
    activeQuestions.forEach((q, idx) => {
      const btn = document.createElement("button");
      btn.id = `palette-btn-${idx}`;
      btn.innerText = idx + 1;
      btn.className = "w-7 h-7 rounded text-[11px] font-bold border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition";
      btn.onclick = () => {
        currentIndex = idx;
        renderQuestion();
      };
      questionPalette.appendChild(btn);
    });
    updatePaletteHighlight();
  }

  function renderQuestion() {
    const q = activeQuestions[currentIndex];
    currentQNum.innerText = currentIndex + 1;
    qOriginalBadge.innerText = `سؤال #${q.id}`;
    questionText.innerText = `${currentIndex + 1}. ${q.q}`;

    const progressPercent = ((currentIndex + 1) / activeQuestions.length) * 100;
    progressBar.style.width = `${progressPercent}%`;

    optionsContainer.innerHTML = "";
    const answered = userAnswers[currentIndex] !== undefined;
    const userSelected = userAnswers[currentIndex];

    q.opts.forEach((optText, optIdx) => {
      const btn = document.createElement("button");
      btn.className = "w-full text-right p-3.5 rounded-xl font-medium text-sm md:text-base border transition flex justify-between items-center gap-3 ";

      if (!answered) {
        btn.className += "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-indigo-50/50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100";
        btn.onclick = () => handleSelectOption(optIdx);
      } else {
        if (isImmediateFeedback) {
          if (optIdx === q.c) {
            btn.className += "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 dark:border-emerald-600 text-emerald-900 dark:text-emerald-300 font-bold";
          } else if (optIdx === userSelected) {
            btn.className += "bg-rose-50 dark:bg-rose-950/40 border-rose-500 dark:border-rose-600 text-rose-900 dark:text-rose-300 font-bold";
          } else {
            btn.className += "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 opacity-60";
          }
        } else {
          if (optIdx === userSelected) {
            btn.className += "bg-indigo-50 dark:bg-indigo-950/50 border-indigo-600 dark:border-indigo-500 text-indigo-900 dark:text-indigo-200 font-bold";
          } else {
            btn.className += "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100";
          }
          btn.onclick = () => handleSelectOption(optIdx);
        }
      }

      const mark = document.createElement("span");
      mark.className = "w-6 h-6 rounded-full border border-current flex items-center justify-center text-xs shrink-0";
      if (answered && isImmediateFeedback) {
        if (optIdx === q.c) mark.innerHTML = "✓";
        else if (optIdx === userSelected) mark.innerHTML = "✕";
        else mark.innerHTML = String.fromCharCode(65 + optIdx);
      } else {
        mark.innerHTML = String.fromCharCode(65 + optIdx);
      }

      btn.innerHTML = `<span>${optText}</span>`;
      btn.appendChild(mark);
      optionsContainer.appendChild(btn);
    });

    if (answered && isImmediateFeedback) {
      explanationBox.classList.remove("hidden");
      const isRight = userSelected === q.c;
      if (isRight) {
        explanationBox.className = "mt-6 p-4 rounded-xl text-sm border bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-300";
        explanationTitle.innerHTML = "<span>✅</span> إجابة صحيحة!";
      } else {
        explanationBox.className = "mt-6 p-4 rounded-xl text-sm border bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-300";
        explanationTitle.innerHTML = "<span>❌</span> إجابة غير دقيقة!";
      }
      explanationText.innerText = q.exp;
    } else {
      explanationBox.classList.add("hidden");
    }

    prevBtn.disabled = currentIndex === 0;
    prevBtn.classList.toggle("opacity-50", currentIndex === 0);
    prevBtn.classList.toggle("cursor-not-allowed", currentIndex === 0);

    const isLast = currentIndex === activeQuestions.length - 1;
    nextBtn.classList.toggle("hidden", isLast);
    finishBtn.classList.toggle("hidden", !isLast);

    updatePaletteHighlight();
  }

  function handleSelectOption(optIdx) {
    userAnswers[currentIndex] = optIdx;
    saveCurrentLiveSession();
    updateLiveStats();
    renderQuestion();
    updatePaletteHighlight();
  }

  function updatePaletteHighlight() {
    activeQuestions.forEach((q, idx) => {
      const btn = document.getElementById(`palette-btn-${idx}`);
      if (!btn) return;
      btn.className = "w-7 h-7 rounded text-[11px] font-bold border transition flex items-center justify-center ";

      if (idx === currentIndex) {
        btn.className += "ring-2 ring-indigo-600 scale-105 ";
      }

      if (userAnswers[idx] !== undefined) {
        if (isImmediateFeedback) {
          if (userAnswers[idx] === q.c) {
            btn.className += "bg-emerald-500 text-white border-emerald-600";
          } else {
            btn.className += "bg-rose-500 text-white border-rose-600";
          }
        } else {
          btn.className += "bg-indigo-600 text-white border-indigo-700";
        }
      } else {
        btn.className += "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:bg-slate-200 dark:hover:bg-slate-600";
      }
    });
  }

  function updateLiveStats() {
    const answeredKeys = Object.keys(userAnswers);
    answeredCount.innerText = answeredKeys.length;

    let score = 0;
    answeredKeys.forEach(key => {
      const idx = parseInt(key);
      if (userAnswers[idx] === activeQuestions[idx].c) {
        score++;
      }
    });
    liveScore.innerText = score;
  }

  prevBtn.onclick = () => {
    if (currentIndex > 0) {
      currentIndex--;
      saveCurrentLiveSession();
      renderQuestion();
    }
  };

  nextBtn.onclick = () => {
    if (currentIndex < activeQuestions.length - 1) {
      currentIndex++;
      saveCurrentLiveSession();
      renderQuestion();
    }
  };

  finishBtn.onclick = () => {
    clearInterval(timerInterval);
    examScreen.classList.add("hidden");
    resultScreen.classList.remove("hidden");

    let sessionCorrect = 0;
    let sessionWrong = 0;
    const sessionWrongIds = [];

    activeQuestions.forEach((q, idx) => {
      const ans = userAnswers[idx];
      if (ans !== undefined) {
        if (ans === q.c) {
          sessionCorrect++;
        } else {
          sessionWrong++;
          sessionWrongIds.push(q.id);
        }
      }
    });

    saveCourseStats(activeCourseId, sessionCorrect, sessionWrong, sessionWrongIds);
    clearLiveSession(activeCourseId);

    const total = activeQuestions.length;
    const percent = Math.round((sessionCorrect / total) * 100);

    document.getElementById("finalScore").innerText = `${sessionCorrect}/${total}`;
    document.getElementById("finalPercent").innerText = `${percent}%`;
    document.getElementById("finalCount").innerText = `${Object.keys(userAnswers).length}`;

    renderReview();
  };

  function renderReview() {
    const container = document.getElementById("reviewContainer");
    container.innerHTML = "";

    activeQuestions.forEach((q, idx) => {
      const userChoice = userAnswers[idx];
      const isCorrect = userChoice === q.c;

      if (filterWrongOnly && isCorrect) return;

      const card = document.createElement("div");
      card.className = `p-4 rounded-xl border text-sm ${
        isCorrect 
          ? "bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800" 
          : "bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800"
      }`;

      const userText = userChoice !== undefined ? q.opts[userChoice] : "لم تجب";
      const correctText = q.opts[q.c];

      card.innerHTML = `
        <div class="flex justify-between items-center mb-2">
          <span class="font-bold text-slate-700 dark:text-slate-300">السؤال ${idx + 1} (سؤال #${q.id})</span>
          <span class="px-2 py-0.5 text-xs font-bold rounded ${
            isCorrect 
              ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300' 
              : 'bg-rose-100 dark:bg-rose-900/60 text-rose-800 dark:text-rose-300'
          }">
            ${isCorrect ? 'صحيحة' : 'خاطئة / غير مجاب'}
          </span>
        </div>
        <div class="font-bold text-slate-800 dark:text-slate-100 mb-2">${q.q}</div>
        <div class="space-y-1 mb-2 text-xs">
          <div><strong class="text-slate-600 dark:text-slate-400">إجابتك:</strong> <span class="${isCorrect ? 'text-emerald-700 dark:text-emerald-400 font-bold' : 'text-rose-700 dark:text-rose-400 font-bold'}">${userText}</span></div>
          ${!isCorrect ? `<div><strong class="text-slate-600 dark:text-slate-400">الإجابة المعتمدة:</strong> <span class="text-emerald-700 dark:text-emerald-400 font-bold">${correctText}</span></div>` : ''}
        </div>
        <div class="text-xs text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700">
          <span class="font-bold text-slate-700 dark:text-slate-200">💡 الشرح:</span> ${q.exp}
        </div>
      `;
      container.appendChild(card);
    });
  }

  toggleReviewBtn.onclick = () => {
    filterWrongOnly = !filterWrongOnly;
    toggleReviewBtn.innerText = filterWrongOnly ? "عرض كل الأسئلة" : "عرض الأسئلة الخاطئة فقط";
    renderReview();
  };

  retryBtn.onclick = () => {
    selectCourse(activeCourseId);
  };

  renderCourses();
});