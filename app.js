(function () {
  "use strict";

  var TARGET_SECONDS = 45 * 60;
  var state = {
    exercises: [],
    sessions: [],
    selectedBodyParts: [],
    builder: {},
    editingExerciseId: null,
    activeWorkout: null,
    activeTab: "library",
    tickId: null
  };

  var els = {};

  document.addEventListener("DOMContentLoaded", init);

  function init() {
    cacheElements();
    bindEvents();
    setAuthenticatedUi(false);
    WorkoutDb.initAuthFromUrl().then(function () {
      if (!WorkoutDb.isAuthenticated()) {
        setAuthenticatedUi(false);
        return;
      }
      setAuthenticatedUi(true);
      loadAppData();
    });
  }

  function loadAppData() {
    Promise.all([
      WorkoutDb.listExercises(),
      WorkoutDb.listSessions(),
      WorkoutDb.getActiveWorkout()
    ]).then(function (records) {
      state.exercises = records[0].length ? records[0] : clone(WorkoutSeed.exercises);
      state.sessions = records[1] || [];
      state.activeWorkout = records[2];
      state.selectedBodyParts = clone(WorkoutSeed.bodyParts);
      seedBuilderDefaults();
      renderAll();
      updateModeWarning();
      startTicker();
      if (state.activeWorkout) {
        showToast("Restored active workout.");
        switchTab("player");
      }
    }).catch(function () {
      updateModeWarning();
      showToast("Offline/local mode");
    });
  }

  function cacheElements() {
    els.libraryGrid = document.getElementById("libraryGrid");
    els.bodyPartFilters = document.getElementById("bodyPartFilters");
    els.builderRows = document.getElementById("builderRows");
    els.openExerciseEditorBtn = document.getElementById("openExerciseEditorBtn");
    els.exerciseModal = document.getElementById("exerciseModal");
    els.exerciseForm = document.getElementById("exerciseForm");
    els.exerciseFormTitle = document.getElementById("exerciseFormTitle");
    els.exerciseNameInput = document.getElementById("exerciseNameInput");
    els.exerciseBodyPartInput = document.getElementById("exerciseBodyPartInput");
    els.exerciseTypeInput = document.getElementById("exerciseTypeInput");
    els.exerciseSetsInput = document.getElementById("exerciseSetsInput");
    els.exerciseTargetInput = document.getElementById("exerciseTargetInput");
    els.exerciseRestInput = document.getElementById("exerciseRestInput");
    els.exerciseDifficultyInput = document.getElementById("exerciseDifficultyInput");
    els.exerciseNoteInput = document.getElementById("exerciseNoteInput");
    els.saveExerciseBtn = document.getElementById("saveExerciseBtn");
    els.cancelEditBtn = document.getElementById("cancelEditBtn");
    els.startWorkoutBtn = document.getElementById("startWorkoutBtn");
    els.playerTitle = document.getElementById("playerTitle");
    els.elapsedTime = document.getElementById("elapsedTime");
    els.durationProgress = document.getElementById("durationProgress");
    els.currentExercise = document.getElementById("currentExercise");
    els.currentSet = document.getElementById("currentSet");
    els.targetWork = document.getElementById("targetWork");
    els.setTimer = document.getElementById("setTimer");
    els.restTimer = document.getElementById("restTimer");
    els.startSetBtn = document.getElementById("startSetBtn");
    els.finishSetBtn = document.getElementById("finishSetBtn");
    els.skipRestBtn = document.getElementById("skipRestBtn");
    els.finishExerciseBtn = document.getElementById("finishExerciseBtn");
    els.finishWorkoutBtn = document.getElementById("finishWorkoutBtn");
    els.liveSetLog = document.getElementById("liveSetLog");
    els.sessionList = document.getElementById("sessionList");
    els.weeklyStats = document.getElementById("weeklyStats");
    els.exerciseStats = document.getElementById("exerciseStats");
    els.toast = document.getElementById("toast");
    els.modeWarning = document.getElementById("modeWarning");
    els.authPanel = document.getElementById("authPanel");
    els.authForm = document.getElementById("authForm");
    els.authEmailInput = document.getElementById("authEmailInput");
    els.authSubmitBtn = document.getElementById("authSubmitBtn");
    els.authMessage = document.getElementById("authMessage");
    els.userPill = document.getElementById("userPill");
    els.signOutBtn = document.getElementById("signOutBtn");
    els.exportBtn = document.getElementById("exportBtn");
    els.importFile = document.getElementById("importFile");
    els.resetBtn = document.getElementById("resetBtn");
  }

  function bindEvents() {
    document.querySelectorAll(".tab-btn").forEach(function (button) {
      button.addEventListener("click", function () {
        switchTab(button.dataset.tab);
      });
    });

    els.authForm.addEventListener("submit", sendLoginLink);
    els.signOutBtn.addEventListener("click", signOut);
    els.startWorkoutBtn.addEventListener("click", startWorkout);
    els.openExerciseEditorBtn.addEventListener("click", openNewExerciseModal);
    els.exerciseForm.addEventListener("submit", saveExerciseFromForm);
    els.cancelEditBtn.addEventListener("click", closeExerciseModal);
    els.exerciseModal.addEventListener("click", function (event) {
      if (event.target === els.exerciseModal) {
        closeExerciseModal();
      }
    });
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && !els.exerciseModal.hidden) {
        closeExerciseModal();
      }
    });
    els.startSetBtn.addEventListener("click", startSet);
    els.finishSetBtn.addEventListener("click", finishSet);
    els.skipRestBtn.addEventListener("click", skipRest);
    els.finishExerciseBtn.addEventListener("click", finishExercise);
    els.finishWorkoutBtn.addEventListener("click", finishWorkout);
    els.exportBtn.addEventListener("click", exportJson);
    els.importFile.addEventListener("change", importJson);
    els.resetBtn.addEventListener("click", resetDemoData);
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function setAuthenticatedUi(isAuthenticated) {
    document.body.classList.toggle("is-authenticated", isAuthenticated);
    els.authPanel.hidden = isAuthenticated;
    els.signOutBtn.hidden = !isAuthenticated;
    els.userPill.hidden = !isAuthenticated;
    if (isAuthenticated) {
      var user = WorkoutDb.currentUser();
      els.userPill.textContent = user ? user.email : "";
    } else {
      els.userPill.textContent = "";
      els.authEmailInput.value = window.WorkoutConfig.ALLOWED_EMAIL || "";
    }
  }

  function sendLoginLink(event) {
    event.preventDefault();
    var email = els.authEmailInput.value.trim();
    els.authSubmitBtn.disabled = true;
    els.authMessage.textContent = "";
    WorkoutDb.sendMagicLink(email).then(function () {
      els.authMessage.textContent = "Magic link sent. Check your email, then open the link on this device.";
    }).catch(function (error) {
      els.authMessage.textContent = error.message || "Could not send magic link.";
    }).finally(function () {
      els.authSubmitBtn.disabled = false;
    });
  }

  function signOut() {
    WorkoutDb.signOut().then(function () {
      state.exercises = [];
      state.sessions = [];
      state.activeWorkout = null;
      state.builder = {};
      setAuthenticatedUi(false);
      renderPlayer();
      renderLog();
      renderStats();
      showToast("Signed out.");
    });
  }

  function persistActiveWorkout() {
    return WorkoutDb.saveActiveWorkout(state.activeWorkout);
  }

  function refreshSessions() {
    return WorkoutDb.listSessions().then(function (sessions) {
      state.sessions = sessions || [];
      renderLog();
      renderStats();
      updateModeWarning();
    });
  }

  function updateModeWarning() {
    if (!els.modeWarning) {
      return;
    }
    var offline = !WorkoutDb.isOnline();
    els.modeWarning.hidden = !offline;
    els.modeWarning.title = offline ? WorkoutDb.offlineReason() : "";
  }

  function seedBuilderDefaults() {
    state.exercises.forEach(function (exercise) {
      state.builder[exercise.id] = {
        selected: state.builder[exercise.id] ? state.builder[exercise.id].selected : false,
        sets: state.builder[exercise.id] ? state.builder[exercise.id].sets : exercise.defaultSets,
        target: state.builder[exercise.id] ? state.builder[exercise.id].target : exercise.defaultReps,
        restSeconds: state.builder[exercise.id] ? state.builder[exercise.id].restSeconds : suggestedRest(exercise)
      };
    });
  }

  // Rest suggestions stay simple and transparent so beginners can adjust them.
  function suggestedRest(exercise) {
    if (exercise.difficulty === "easy" || exercise.bodyPart === "Core") {
      return clamp(exercise.defaultRestSeconds || 45, 30, 45);
    }
    if (exercise.difficulty === "hard") {
      return clamp(exercise.defaultRestSeconds || 105, 90, 120);
    }
    return clamp(exercise.defaultRestSeconds || 75, 60, 90);
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, Number(value) || min));
  }

  function renderAll() {
    renderLibrary();
    renderFilters();
    renderExerciseFormOptions();
    renderBuilder();
    renderPlayer();
    renderLog();
    renderStats();
  }

  function renderExerciseFormOptions() {
    els.exerciseBodyPartInput.innerHTML = "";
    WorkoutSeed.bodyParts.forEach(function (bodyPart) {
      var option = document.createElement("option");
      option.value = bodyPart;
      option.textContent = bodyPart;
      els.exerciseBodyPartInput.appendChild(option);
    });
  }

  function switchTab(tabName) {
    state.activeTab = tabName;
    document.querySelectorAll(".tab-btn").forEach(function (button) {
      button.classList.toggle("active", button.dataset.tab === tabName);
    });
    document.querySelectorAll(".panel").forEach(function (panel) {
      panel.classList.remove("active");
    });
    document.getElementById(tabName + "Panel").classList.add("active");
  }

  function renderLibrary() {
    els.libraryGrid.innerHTML = "";
    WorkoutSeed.bodyParts.forEach(function (bodyPart) {
      var card = document.createElement("article");
      card.className = "body-card";
      card.innerHTML = "<h3>" + escapeHtml(bodyPart) + "</h3>";

      var list = document.createElement("div");
      list.className = "exercise-list";
      state.exercises.filter(function (exercise) {
        return exercise.bodyPart === bodyPart;
      }).forEach(function (exercise) {
        var item = document.createElement("div");
        item.className = "exercise-item";
        item.innerHTML =
          "<strong>" + escapeHtml(exercise.name) + "</strong>" +
          "<span>" + exercise.defaultSets + " sets · " +
          targetLabel(exercise, exercise.defaultReps) + " · " +
          exercise.defaultRestSeconds + "s rest</span>" +
          "<p>" + escapeHtml(exercise.note) + "</p>";
        list.appendChild(item);
      });

      card.appendChild(list);
      els.libraryGrid.appendChild(card);
    });
  }

  function renderFilters() {
    els.bodyPartFilters.innerHTML = "";
    WorkoutSeed.bodyParts.forEach(function (bodyPart) {
      var label = document.createElement("label");
      label.className = "chip";
      label.innerHTML =
        '<input type="checkbox" ' +
        (state.selectedBodyParts.indexOf(bodyPart) >= 0 ? "checked" : "") +
        '> <span>' + escapeHtml(bodyPart) + "</span>";
      label.querySelector("input").addEventListener("change", function (event) {
        if (event.target.checked) {
          state.selectedBodyParts.push(bodyPart);
        } else {
          state.selectedBodyParts = state.selectedBodyParts.filter(function (part) {
            return part !== bodyPart;
          });
        }
        renderBuilder();
      });
      els.bodyPartFilters.appendChild(label);
    });
  }

  function renderBuilder() {
    els.builderRows.innerHTML = "";
    filteredExercises().forEach(function (exercise) {
      if (!state.builder[exercise.id]) {
        state.builder[exercise.id] = {
          selected: false,
          sets: exercise.defaultSets,
          target: exercise.defaultReps,
          restSeconds: suggestedRest(exercise)
        };
      }
      var config = state.builder[exercise.id];
      var row = document.createElement("tr");
      row.innerHTML =
        '<td><input class="row-check" type="checkbox" ' + (config.selected ? "checked" : "") + "></td>" +
        "<td><strong>" + escapeHtml(exercise.name) + "</strong><small>" + escapeHtml(exercise.note) + "</small></td>" +
        "<td>" + escapeHtml(exercise.bodyPart) + "</td>" +
        '<td><input class="number-input" min="1" max="12" type="number" value="' + config.sets + '"></td>' +
        '<td><input class="number-input" min="1" max="300" type="number" value="' + config.target + '"></td>' +
        '<td><input class="number-input" min="15" max="180" step="5" type="number" value="' + config.restSeconds + '"></td>' +
        '<td><div class="row-actions"><button class="ghost-btn small-btn" type="button">Edit</button><button class="danger-btn small-btn" type="button">Remove</button></div></td>';

      var inputs = row.querySelectorAll("input");
      var buttons = row.querySelectorAll("button");
      inputs[0].addEventListener("change", function (event) {
        config.selected = event.target.checked;
      });
      inputs[1].addEventListener("input", function (event) {
        config.sets = cleanNumber(event.target.value, 1);
      });
      inputs[2].addEventListener("input", function (event) {
        config.target = cleanNumber(event.target.value, 1);
      });
      inputs[3].addEventListener("input", function (event) {
        config.restSeconds = cleanNumber(event.target.value, 15);
      });
      buttons[0].addEventListener("click", function () {
        editExercise(exercise.id);
      });
      buttons[1].addEventListener("click", function () {
        removeExercise(exercise.id);
      });

      els.builderRows.appendChild(row);
    });
  }

  function exerciseFromForm() {
    var type = els.exerciseTypeInput.value;
    var target = cleanNumber(els.exerciseTargetInput.value, type === "time" ? 30 : 8);
    return {
      name: els.exerciseNameInput.value.trim(),
      bodyPart: els.exerciseBodyPartInput.value,
      type: type,
      defaultSets: cleanNumber(els.exerciseSetsInput.value, 3),
      defaultReps: target,
      defaultRestSeconds: cleanNumber(els.exerciseRestInput.value, 60),
      difficulty: els.exerciseDifficultyInput.value,
      note: els.exerciseNoteInput.value.trim()
    };
  }

  function saveExerciseFromForm(event) {
    event.preventDefault();
    var exercise = exerciseFromForm();
    if (!exercise.name) {
      showToast("Exercise name is required.");
      return;
    }

    els.saveExerciseBtn.disabled = true;
    var wasEditing = Boolean(state.editingExerciseId);
    var editingId = state.editingExerciseId;
    var save = wasEditing ?
      WorkoutDb.updateExercise(state.editingExerciseId, exercise) :
      WorkoutDb.createExercise(exercise);

    save.then(function (saved) {
      if (wasEditing) {
        state.exercises = state.exercises.map(function (item) {
          return item.id === editingId ? saved : item;
        });
      } else {
        state.exercises.push(saved);
        if (state.selectedBodyParts.indexOf(saved.bodyPart) < 0) {
          state.selectedBodyParts.push(saved.bodyPart);
        }
      }
      state.builder[saved.id] = {
        selected: state.builder[saved.id] ? state.builder[saved.id].selected : false,
        sets: saved.defaultSets,
        target: saved.defaultReps,
        restSeconds: suggestedRest(saved)
      };
      resetExerciseForm();
      closeExerciseModal();
      renderAll();
      updateModeWarning();
      showToast(wasEditing ? "Exercise updated." : "Exercise added.");
    }).catch(function () {
      showToast("Exercise save failed.");
      updateModeWarning();
    }).finally(function () {
      els.saveExerciseBtn.disabled = false;
    });
  }

  function editExercise(exerciseId) {
    var exercise = state.exercises.find(function (item) {
      return item.id === exerciseId;
    });
    if (!exercise) {
      return;
    }

    state.editingExerciseId = exerciseId;
    els.exerciseFormTitle.textContent = "Edit exercise";
    els.saveExerciseBtn.textContent = "Save Changes";
    els.exerciseNameInput.value = exercise.name;
    els.exerciseBodyPartInput.value = exercise.bodyPart;
    els.exerciseTypeInput.value = exercise.type;
    els.exerciseSetsInput.value = exercise.defaultSets;
    els.exerciseTargetInput.value = exercise.defaultReps;
    els.exerciseRestInput.value = exercise.defaultRestSeconds;
    els.exerciseDifficultyInput.value = exercise.difficulty || "normal";
    els.exerciseNoteInput.value = exercise.note || "";
    openExerciseModal();
    els.exerciseNameInput.focus();
  }

  function resetExerciseForm() {
    state.editingExerciseId = null;
    els.exerciseForm.reset();
    els.exerciseFormTitle.textContent = "Add exercise";
    els.saveExerciseBtn.textContent = "Add Exercise";
    els.exerciseSetsInput.value = 3;
    els.exerciseTargetInput.value = 8;
    els.exerciseRestInput.value = 60;
    els.exerciseDifficultyInput.value = "normal";
  }

  function openNewExerciseModal() {
    resetExerciseForm();
    openExerciseModal();
  }

  function openExerciseModal() {
    els.exerciseModal.hidden = false;
    els.exerciseModal.classList.add("is-open");
    document.body.classList.add("modal-open");
    window.setTimeout(function () {
      els.exerciseNameInput.focus();
    }, 0);
  }

  function closeExerciseModal() {
    els.exerciseModal.classList.remove("is-open");
    document.body.classList.remove("modal-open");
    els.exerciseModal.hidden = true;
    resetExerciseForm();
  }

  function removeExercise(exerciseId) {
    var exercise = state.exercises.find(function (item) {
      return item.id === exerciseId;
    });
    if (!exercise) {
      return;
    }
    if (!window.confirm("Remove " + exercise.name + " from the exercise list? Workout logs will keep the exercise name.")) {
      return;
    }

    WorkoutDb.deleteExercise(exerciseId).then(function () {
      state.exercises = state.exercises.filter(function (item) {
        return item.id !== exerciseId;
      });
      delete state.builder[exerciseId];
      if (state.editingExerciseId === exerciseId) {
        resetExerciseForm();
      }
      renderAll();
      updateModeWarning();
      showToast("Exercise removed.");
    }).catch(function () {
      showToast("Exercise remove failed.");
      updateModeWarning();
    });
  }

  function filteredExercises() {
    return state.exercises.filter(function (exercise) {
      return state.selectedBodyParts.indexOf(exercise.bodyPart) >= 0;
    });
  }

  function cleanNumber(value, fallback) {
    var parsed = parseInt(value, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  }

  function startWorkout() {
    // Copy the current builder values into the active workout. Later edits in
    // the builder will not change a workout that is already running.
    var selected = state.exercises.filter(function (exercise) {
      return state.builder[exercise.id] && state.builder[exercise.id].selected;
    }).map(function (exercise) {
      var config = state.builder[exercise.id];
      return {
        id: exercise.id,
        name: exercise.name,
        bodyPart: exercise.bodyPart,
        type: exercise.type,
        sets: config.sets,
        target: config.target,
        restSeconds: config.restSeconds
      };
    });

    if (!selected.length) {
      showToast("Select at least one exercise.");
      return;
    }

    var startedAtMs = Date.now();
    els.startWorkoutBtn.disabled = true;
    WorkoutDb.createSession(new Date(startedAtMs).toISOString()).then(function (session) {
      state.activeWorkout = {
        id: session.id,
        startedAt: startedAtMs,
        finishedAt: null,
        exercises: selected,
        exerciseIndex: 0,
        setNumber: 1,
        status: "ready",
        setStartedAt: null,
        restStartedAt: null,
        restEndsAt: null,
        completedSets: []
      };

      return persistActiveWorkout();
    }).then(function () {
      els.startWorkoutBtn.disabled = false;
      updateModeWarning();
      renderPlayer();
      switchTab("player");
    }).catch(function () {
      els.startWorkoutBtn.disabled = false;
      showToast("Could not start workout.");
      updateModeWarning();
    });
  }

  function currentPlan() {
    if (!state.activeWorkout) {
      return null;
    }
    return state.activeWorkout.exercises[state.activeWorkout.exerciseIndex] || null;
  }

  function renderPlayer() {
    var workout = state.activeWorkout;
    var plan = currentPlan();
    if (!workout || !plan) {
      els.playerTitle.textContent = "No workout active";
      els.elapsedTime.textContent = "00:00";
      els.durationProgress.style.width = "0%";
      els.currentExercise.textContent = "None";
      els.currentSet.textContent = "-";
      els.targetWork.textContent = "-";
      els.setTimer.textContent = "00:00";
      els.restTimer.textContent = "00:00";
      els.liveSetLog.textContent = "No sets logged yet.";
      els.liveSetLog.classList.add("empty");
      setPlayerButtons(false);
      return;
    }

    var elapsed = secondsBetween(workout.startedAt, Date.now());
    els.playerTitle.textContent = workout.status === "resting" ? "Rest countdown" : "Workout in progress";
    els.elapsedTime.textContent = formatTime(elapsed);
    els.durationProgress.style.width = Math.min(100, elapsed / TARGET_SECONDS * 100) + "%";
    els.currentExercise.textContent = plan.name;
    els.currentSet.textContent = workout.setNumber + " of " + plan.sets;
    els.targetWork.textContent = targetLabel(plan, plan.target);
    els.setTimer.textContent = workout.setStartedAt ? formatTime(secondsBetween(workout.setStartedAt, Date.now())) : "00:00";
    els.restTimer.textContent = workout.status === "resting" ? formatTime(Math.max(0, secondsBetween(Date.now(), workout.restEndsAt))) : "00:00";
    renderLiveSetLog(workout);
    setPlayerButtons(true);
  }

  function setPlayerButtons(hasWorkout) {
    var workout = state.activeWorkout;
    var status = workout ? workout.status : "none";
    els.startSetBtn.disabled = !hasWorkout || status === "working" || status === "resting" || status === "exercise-complete";
    els.finishSetBtn.disabled = !hasWorkout || status !== "working";
    els.skipRestBtn.disabled = !hasWorkout || status !== "resting";
    els.finishExerciseBtn.disabled = !hasWorkout || status === "working";
    els.finishWorkoutBtn.disabled = !hasWorkout;
  }

  function startSet() {
    if (!state.activeWorkout || state.activeWorkout.status === "working") {
      return;
    }
    state.activeWorkout.status = "working";
    state.activeWorkout.setStartedAt = Date.now();
    persistActiveWorkout();
    renderPlayer();
  }

  function finishSet() {
    var workout = state.activeWorkout;
    var plan = currentPlan();
    if (!workout || workout.status !== "working" || !plan) {
      return;
    }

    var duration = Math.max(1, secondsBetween(workout.setStartedAt, Date.now()));
    var actualReps = plan.type === "reps" ? askForReps(plan.target) : plan.target;
    var setLog = {
      sessionId: workout.id,
      exerciseId: plan.id,
      exerciseName: plan.name,
      bodyPart: plan.bodyPart,
      type: plan.type,
      setNumber: workout.setNumber,
      target: plan.target,
      reps: actualReps,
      setDurationSeconds: duration,
      restDurationSeconds: plan.restSeconds,
      loggedAt: new Date().toISOString()
    };

    els.finishSetBtn.disabled = true;
    WorkoutDb.saveSet(setLog).then(function (savedSet) {
      workout.completedSets.push(Object.assign(setLog, savedSet || {}));
      workout.status = "resting";
      workout.setStartedAt = null;
      workout.restStartedAt = Date.now();
      workout.restEndsAt = workout.restStartedAt + plan.restSeconds * 1000;
      return persistActiveWorkout();
    }).then(function () {
      updateModeWarning();
      renderPlayer();
    }).catch(function () {
      showToast("Set save failed.");
      updateModeWarning();
      renderPlayer();
    });
  }

  // prompt() is intentionally used here to keep the app dependency-free and
  // usable from a single static HTML page.
  function askForReps(defaultReps) {
    var answer = window.prompt("Actual reps completed?", String(defaultReps));
    if (answer === null || answer.trim() === "") {
      return defaultReps;
    }
    return cleanNumber(answer, defaultReps);
  }

  function skipRest() {
    completeRest(true);
  }

  function completeRest(skipped) {
    var workout = state.activeWorkout;
    var plan = currentPlan();
    if (!workout || !plan || workout.status !== "resting") {
      return;
    }

    var lastSet = workout.completedSets[workout.completedSets.length - 1];
    if (lastSet) {
      lastSet.restDurationSeconds = skipped ? secondsBetween(workout.restStartedAt, Date.now()) : plan.restSeconds;
      WorkoutDb.updateSetRest(lastSet.id, lastSet.restDurationSeconds);
    }

    if (workout.setNumber < plan.sets) {
      workout.setNumber += 1;
      workout.status = "ready";
    } else {
      workout.status = "exercise-complete";
    }
    workout.restStartedAt = null;
    workout.restEndsAt = null;
    persistActiveWorkout();
    renderPlayer();
  }

  function updateCurrentRestDuration() {
    var workout = state.activeWorkout;
    if (!workout || workout.status !== "resting") {
      return;
    }
    var lastSet = workout.completedSets[workout.completedSets.length - 1];
    if (lastSet) {
      lastSet.restDurationSeconds = secondsBetween(workout.restStartedAt, Date.now());
      WorkoutDb.updateSetRest(lastSet.id, lastSet.restDurationSeconds);
    }
  }

  function finishExercise() {
    var workout = state.activeWorkout;
    if (!workout) {
      return;
    }

    updateCurrentRestDuration();

    if (workout.exerciseIndex < workout.exercises.length - 1) {
      workout.exerciseIndex += 1;
      workout.setNumber = 1;
      workout.status = "ready";
      workout.setStartedAt = null;
      workout.restStartedAt = null;
      workout.restEndsAt = null;
      persistActiveWorkout();
      renderPlayer();
      return;
    }

    finishWorkout();
  }

  function finishWorkout() {
    var workout = state.activeWorkout;
    if (!workout) {
      return;
    }

    updateCurrentRestDuration();

    var finishedAt = Date.now();
    var session = {
      id: workout.id,
      startedAt: new Date(workout.startedAt).toISOString(),
      finishedAt: new Date(finishedAt).toISOString(),
      totalDurationSeconds: secondsBetween(workout.startedAt, finishedAt),
      selectedExercises: workout.exercises,
      completedSets: workout.completedSets
    };

    WorkoutDb.finishSession(
      session.id,
      session.finishedAt,
      session.totalDurationSeconds,
      session.selectedExercises,
      session.completedSets
    ).then(function () {
      state.activeWorkout = null;
      return persistActiveWorkout();
    }).then(refreshSessions).then(function () {
      renderAll();
      switchTab("log");
      showToast("Workout saved.");
    }).catch(function () {
      showToast("Workout finish failed.");
      updateModeWarning();
    });
  }

  function startTicker() {
    if (state.tickId) {
      clearInterval(state.tickId);
    }
    state.tickId = setInterval(function () {
      var workout = state.activeWorkout;
      if (workout && workout.status === "resting" && Date.now() >= workout.restEndsAt) {
        beep();
        completeRest(false);
      }
      if (state.activeTab === "player") {
        renderPlayer();
      }
    }, 1000);
  }

  function renderLiveSetLog(workout) {
    els.liveSetLog.innerHTML = "";
    if (!workout.completedSets.length) {
      els.liveSetLog.textContent = "No sets logged yet.";
      els.liveSetLog.classList.add("empty");
      return;
    }

    els.liveSetLog.classList.remove("empty");
    workout.completedSets.slice().reverse().forEach(function (set) {
      var item = document.createElement("div");
      item.className = "set-row";
      item.innerHTML =
        "<strong>" + escapeHtml(set.exerciseName) + " · Set " + set.setNumber + "</strong>" +
        "<span>" + set.reps + (set.type === "time" ? "s" : " reps") +
        " · work " + formatTime(set.setDurationSeconds) +
        " · rest " + formatTime(set.restDurationSeconds) + "</span>";
      els.liveSetLog.appendChild(item);
    });
  }

  function renderLog() {
    els.sessionList.innerHTML = "";
    if (!state.sessions.length) {
      els.sessionList.innerHTML = '<p class="empty-state">No workouts saved yet.</p>';
      return;
    }

    state.sessions.forEach(function (session) {
      var totalReps = session.completedSets.reduce(function (sum, set) {
        return sum + (set.type === "reps" ? Number(set.reps || 0) : 0);
      }, 0);
      var details = document.createElement("details");
      details.className = "session-card";
      details.innerHTML =
        "<summary>" +
        "<span><strong>" + formatDateTime(session.startedAt) + "</strong><small>" +
        session.selectedExercises.map(function (item) { return item.name; }).join(", ") +
        "</small></span>" +
        "<span>" + formatTime(session.totalDurationSeconds) + " · " +
        session.completedSets.length + " sets · " + totalReps + " reps</span>" +
        "</summary>";

      var detailList = document.createElement("div");
      detailList.className = "session-detail";
      session.completedSets.forEach(function (set) {
        var row = document.createElement("div");
        row.className = "set-row";
        row.innerHTML =
          "<strong>" + escapeHtml(set.exerciseName) + " · Set " + set.setNumber + "</strong>" +
          "<span>" + set.reps + (set.type === "time" ? "s" : " reps") +
          " · work " + formatTime(set.setDurationSeconds) +
          " · rest " + formatTime(set.restDurationSeconds) + "</span>";
        detailList.appendChild(row);
      });
      details.appendChild(detailList);
      els.sessionList.appendChild(details);
    });
  }

  function renderStats() {
    var weekStart = startOfWeek(new Date());
    var weekSessions = state.sessions.filter(function (session) {
      return new Date(session.startedAt) >= weekStart;
    });
    var weekly = weekSessions.reduce(function (acc, session) {
      acc.workouts += 1;
      acc.time += session.totalDurationSeconds;
      acc.sets += session.completedSets.length;
      acc.reps += session.completedSets.reduce(function (sum, set) {
        return sum + (set.type === "reps" ? Number(set.reps || 0) : 0);
      }, 0);
      return acc;
    }, { workouts: 0, time: 0, sets: 0, reps: 0 });

    els.weeklyStats.innerHTML = "";
    [
      ["Workouts", weekly.workouts],
      ["Workout Time", formatTime(weekly.time)],
      ["Sets", weekly.sets],
      ["Reps", weekly.reps]
    ].forEach(function (item) {
      var card = document.createElement("div");
      card.className = "stat-card";
      card.innerHTML = "<span>" + item[0] + "</span><strong>" + item[1] + "</strong>";
      els.weeklyStats.appendChild(card);
    });

    var stats = {};
    state.sessions.forEach(function (session) {
      var seen = {};
      session.completedSets.forEach(function (set) {
        if (!stats[set.exerciseId]) {
          stats[set.exerciseId] = { name: set.exerciseName, sets: 0, reps: 0, time: 0, sessions: 0 };
        }
        stats[set.exerciseId].sets += 1;
        stats[set.exerciseId].reps += set.type === "reps" ? Number(set.reps || 0) : 0;
        stats[set.exerciseId].time += Number(set.setDurationSeconds || 0);
        seen[set.exerciseId] = true;
      });
      Object.keys(seen).forEach(function (exerciseId) {
        stats[exerciseId].sessions += 1;
      });
    });

    els.exerciseStats.innerHTML = "";
    var rows = Object.keys(stats).map(function (key) { return stats[key]; });
    if (!rows.length) {
      els.exerciseStats.innerHTML = '<tr><td colspan="5">No exercise stats yet.</td></tr>';
      return;
    }
    rows.sort(function (a, b) { return a.name.localeCompare(b.name); }).forEach(function (stat) {
      var row = document.createElement("tr");
      row.innerHTML =
        "<td><strong>" + escapeHtml(stat.name) + "</strong></td>" +
        "<td>" + stat.sets + "</td>" +
        "<td>" + stat.reps + "</td>" +
        "<td>" + formatTime(stat.time) + "</td>" +
        "<td>" + stat.sessions + "</td>";
      els.exerciseStats.appendChild(row);
    });
  }

  function exportJson() {
    WorkoutDb.exportData().then(function (data) {
      var blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      var link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = "workout-watch-backup.json";
      link.click();
      URL.revokeObjectURL(link.href);
    });
  }

  function importJson(event) {
    var file = event.target.files[0];
    if (!file) {
      return;
    }
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var data = JSON.parse(reader.result);
        WorkoutDb.importData(data).then(function () {
          state.exercises = Array.isArray(data.exercises) ? data.exercises : clone(WorkoutSeed.exercises);
          state.sessions = Array.isArray(data.sessions) ? data.sessions : [];
          state.activeWorkout = data.activeWorkout || null;
          seedBuilderDefaults();
          renderAll();
          updateModeWarning();
          showToast("Backup imported.");
        });
      } catch (error) {
        showToast("Import failed. Choose a valid JSON backup.");
      }
      event.target.value = "";
    };
    reader.readAsText(file);
  }

  function resetDemoData() {
    if (!window.confirm("Reset exercises, saved workouts, and active workout?")) {
      return;
    }
    state.exercises = clone(WorkoutSeed.exercises);
    state.sessions = [];
    state.activeWorkout = null;
    seedBuilderDefaults();
    WorkoutDb.deleteAllData().then(function (exercises) {
      state.exercises = exercises && exercises.length ? exercises : clone(WorkoutSeed.exercises);
      state.sessions = [];
      state.activeWorkout = null;
      seedBuilderDefaults();
      return persistActiveWorkout();
    }).then(function () {
      renderAll();
      updateModeWarning();
      switchTab("library");
      showToast("Demo data reset.");
    });
  }

  function targetLabel(exercise, value) {
    return exercise.type === "time" ? value + " sec" : value + " reps";
  }

  function secondsBetween(start, end) {
    return Math.max(0, Math.floor((end - start) / 1000));
  }

  function formatTime(seconds) {
    seconds = Math.max(0, Number(seconds) || 0);
    var mins = Math.floor(seconds / 60);
    var secs = seconds % 60;
    return String(mins).padStart(2, "0") + ":" + String(secs).padStart(2, "0");
  }

  function formatDateTime(value) {
    return new Date(value).toLocaleString([], {
      dateStyle: "medium",
      timeStyle: "short"
    });
  }

  function startOfWeek(date) {
    var copy = new Date(date);
    var day = copy.getDay();
    var diff = day === 0 ? -6 : 1 - day;
    copy.setDate(copy.getDate() + diff);
    copy.setHours(0, 0, 0, 0);
    return copy;
  }

  function beep() {
    try {
      var AudioContext = window.AudioContext || window.webkitAudioContext;
      var audio = new AudioContext();
      var oscillator = audio.createOscillator();
      var gain = audio.createGain();
      oscillator.frequency.value = 880;
      oscillator.connect(gain);
      gain.connect(audio.destination);
      gain.gain.setValueAtTime(0.08, audio.currentTime);
      oscillator.start();
      oscillator.stop(audio.currentTime + 0.18);
    } catch (error) {
      // Some browsers block audio until the user interacts. The timer still works.
    }
  }

  function showToast(message) {
    els.toast.textContent = message;
    els.toast.classList.add("show");
    window.setTimeout(function () {
      els.toast.classList.remove("show");
    }, 2400);
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, function (char) {
      return {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
      }[char];
    });
  }
})();
