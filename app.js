(function () {
  "use strict";

  var TARGET_SECONDS = 45 * 60;
  var state = {
    exercises: [],
    sessions: [],
    selectedBodyParts: [],
    builder: {},
    builderSelectionCounter: 0,
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
      normalizeActiveWorkout();
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
    els.discardWorkoutBtn = document.getElementById("discardWorkoutBtn");
    els.builderNotice = document.getElementById("builderNotice");
    els.builderEta = document.getElementById("builderEta");
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
    els.activeWorkoutPlan = document.getElementById("activeWorkoutPlan");
    els.liveSetLog = document.getElementById("liveSetLog");
    els.sessionList = document.getElementById("sessionList");
    els.weeklyStats = document.getElementById("weeklyStats");
    els.exerciseStats = document.getElementById("exerciseStats");
    els.toast = document.getElementById("toast");
    els.modeWarning = document.getElementById("modeWarning");
    els.authPanel = document.getElementById("authPanel");
    els.authForm = document.getElementById("authForm");
    els.authEmailInput = document.getElementById("authEmailInput");
    els.authPasswordInput = document.getElementById("authPasswordInput");
    els.authSubmitBtn = document.getElementById("authSubmitBtn");
    els.authMessage = document.getElementById("authMessage");
    els.userPill = document.getElementById("userPill");
    els.signOutBtn = document.getElementById("signOutBtn");
    els.exportBtn = document.getElementById("exportBtn");
    els.importFile = document.getElementById("importFile");
    els.syncLocalBtn = document.getElementById("syncLocalBtn");
    els.resetBtn = document.getElementById("resetBtn");
    els.appDialog = document.getElementById("appDialog");
    els.appDialogForm = document.getElementById("appDialogForm");
    els.appDialogKicker = document.getElementById("appDialogKicker");
    els.appDialogTitle = document.getElementById("appDialogTitle");
    els.appDialogMessage = document.getElementById("appDialogMessage");
    els.appDialogInputRow = document.getElementById("appDialogInputRow");
    els.appDialogInputLabel = document.getElementById("appDialogInputLabel");
    els.appDialogInput = document.getElementById("appDialogInput");
    els.appDialogCancelBtn = document.getElementById("appDialogCancelBtn");
    els.appDialogConfirmBtn = document.getElementById("appDialogConfirmBtn");
  }

  function bindEvents() {
    document.querySelectorAll(".tab-btn").forEach(function (button) {
      button.addEventListener("click", function () {
        switchTab(button.dataset.tab);
      });
    });

    els.authForm.addEventListener("submit", signInWithPassword);
    els.signOutBtn.addEventListener("click", signOut);
    els.startWorkoutBtn.addEventListener("click", startWorkout);
    els.discardWorkoutBtn.addEventListener("click", discardWorkout);
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
      } else if (event.key === "Escape" && !els.appDialog.hidden) {
        cancelAppDialog();
      }
    });
    els.startSetBtn.addEventListener("click", startSet);
    els.finishSetBtn.addEventListener("click", finishSet);
    els.skipRestBtn.addEventListener("click", skipRest);
    els.finishExerciseBtn.addEventListener("click", finishExercise);
    els.finishWorkoutBtn.addEventListener("click", finishWorkout);
    els.exportBtn.addEventListener("click", exportJson);
    els.importFile.addEventListener("change", importJson);
    els.syncLocalBtn.addEventListener("click", syncLocalLogs);
    els.resetBtn.addEventListener("click", resetDemoData);
    els.appDialogForm.addEventListener("submit", submitAppDialog);
    els.appDialogCancelBtn.addEventListener("click", cancelAppDialog);
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
      els.authPasswordInput.value = "";
    }
  }

  function signInWithPassword(event) {
    event.preventDefault();
    var email = window.WorkoutConfig.ALLOWED_EMAIL || els.authEmailInput.value.trim();
    var password = els.authPasswordInput.value;
    els.authSubmitBtn.disabled = true;
    els.authMessage.textContent = "";
    WorkoutDb.signInWithPassword(email, password).then(function () {
      setAuthenticatedUi(true);
      els.authPasswordInput.value = "";
      loadAppData();
    }).catch(function (error) {
      els.authMessage.textContent = readableAuthError(error);
    }).finally(function () {
      els.authSubmitBtn.disabled = false;
    });
  }

  function readableAuthError(error) {
    var message = error && error.message ? error.message : "Sign in failed.";
    if (message.indexOf("Invalid login credentials") >= 0) {
      return "Wrong password.";
    }
    return message;
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
      var existing = state.builder[exercise.id];
      state.builder[exercise.id] = {
        selected: existing ? existing.selected : false,
        selectionOrder: existing ? existing.selectionOrder : null,
        sets: existing ? existing.sets : exercise.defaultSets,
        target: existing ? existing.target : defaultTarget(exercise),
        restSeconds: existing ? existing.restSeconds : suggestedRest(exercise)
      };
      if (state.builder[exercise.id].selected && !state.builder[exercise.id].selectionOrder) {
        state.builder[exercise.id].selectionOrder = nextBuilderSelectionOrder();
      }
    });
  }

  function nextBuilderSelectionOrder() {
    state.builderSelectionCounter += 1;
    return state.builderSelectionCounter;
  }

  function defaultTarget(exercise) {
    return exercise.type === "time" ?
      cleanNumber(exercise.defaultSeconds, exercise.defaultReps || 30) :
      cleanNumber(exercise.defaultReps, 8);
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
          targetLabel(exercise, defaultTarget(exercise)) + " · " +
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
    var hasActiveWorkout = Boolean(state.activeWorkout);
    els.startWorkoutBtn.textContent = hasActiveWorkout ? "Add to Current Workout" : "Start Workout";
    els.builderNotice.hidden = !hasActiveWorkout;
    els.discardWorkoutBtn.hidden = !hasActiveWorkout;
    filteredExercises().forEach(function (exercise) {
      if (!state.builder[exercise.id]) {
        state.builder[exercise.id] = {
          selected: false,
          sets: exercise.defaultSets,
          target: defaultTarget(exercise),
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
        config.selectionOrder = config.selected ? nextBuilderSelectionOrder() : null;
        renderBuilderEta();
      });
      inputs[1].addEventListener("input", function (event) {
        config.sets = cleanNumber(event.target.value, 1);
        renderBuilderEta();
      });
      inputs[2].addEventListener("input", function (event) {
        config.target = cleanNumber(event.target.value, 1);
        renderBuilderEta();
      });
      inputs[3].addEventListener("input", function (event) {
        config.restSeconds = cleanNumber(event.target.value, 15);
        renderBuilderEta();
      });
      buttons[0].addEventListener("click", function () {
        editExercise(exercise.id);
      });
      buttons[1].addEventListener("click", function () {
        removeExercise(exercise.id);
      });

      els.builderRows.appendChild(row);
    });
    renderBuilderEta();
  }

  function renderBuilderEta() {
    var summary = selectedBuilderSummary();
    var etaText = formatTime(summary.seconds);
    els.builderEta.querySelector("strong").textContent = etaText;
    els.builderEta.querySelector("small").textContent =
      summary.count + " exercise" + (summary.count === 1 ? "" : "s") +
      " selected · " + summary.sets + " set" + (summary.sets === 1 ? "" : "s");
  }

  function selectedBuilderSummary() {
    return state.exercises.reduce(function (summary, exercise) {
      var config = state.builder[exercise.id];
      if (!config || !config.selected) {
        return summary;
      }
      var sets = cleanNumber(config.sets, exercise.defaultSets || 1);
      summary.count += 1;
      summary.sets += sets;
      summary.seconds += estimateExerciseSeconds(exercise, config, sets);
      return summary;
    }, { count: 0, sets: 0, seconds: 0 });
  }

  function estimateExerciseSeconds(exercise, config, sets) {
    var target = cleanNumber(config.target, defaultTarget(exercise));
    var restSeconds = cleanNumber(config.restSeconds, suggestedRest(exercise));
    var workSeconds = exercise.type === "time" ? target : Math.max(10, target * 3);
    return sets * workSeconds + Math.max(0, sets - 1) * restSeconds;
  }

  function exerciseFromForm() {
    var type = els.exerciseTypeInput.value;
    var target = cleanNumber(els.exerciseTargetInput.value, type === "time" ? 30 : 8);
    return {
      name: els.exerciseNameInput.value.trim(),
      bodyPart: els.exerciseBodyPartInput.value,
      type: type,
      defaultSets: cleanNumber(els.exerciseSetsInput.value, 3),
      defaultReps: type === "reps" ? target : null,
      defaultSeconds: type === "time" ? target : null,
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
        target: defaultTarget(saved),
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
    els.exerciseTargetInput.value = defaultTarget(exercise);
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
    confirmDialog({
      title: "Remove exercise?",
      message: "Remove " + exercise.name + " from the exercise list? Workout logs will keep the exercise name.",
      confirmText: "Remove",
      danger: true
    }).then(function (confirmed) {
      if (!confirmed) {
        return null;
      }
      return WorkoutDb.deleteExercise(exerciseId);
    }).then(function (deleted) {
      if (deleted === null) {
        return;
      }
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
    var selected = selectedWorkoutItems();

    if (!selected.length) {
      showToast("Select at least one exercise.");
      return;
    }

    if (state.activeWorkout) {
      addSelectedToActiveWorkout(selected);
      return;
    }

    var startedAtMs = Date.now();
    els.startWorkoutBtn.disabled = true;
    WorkoutDb.createSession(new Date(startedAtMs).toISOString()).then(function (session) {
      selected.forEach(function (item, index) {
        item.order = index + 1;
      });
      state.activeWorkout = {
        id: session.id,
        startedAt: startedAtMs,
        finishedAt: null,
        exercises: selected,
        currentItemId: selected[0].itemId,
        setNumber: 1,
        status: "ready",
        setStartedAt: null,
        setEndsAt: null,
        restStartedAt: null,
        restEndsAt: null,
        completedSets: []
      };

      return persistActiveWorkout();
    }).then(function () {
      els.startWorkoutBtn.disabled = false;
      updateModeWarning();
      renderBuilder();
      renderPlayer();
      switchTab("player");
    }).catch(function () {
      els.startWorkoutBtn.disabled = false;
      showToast("Could not start workout.");
      updateModeWarning();
    });
  }

  function selectedWorkoutItems() {
    return state.exercises.filter(function (exercise) {
      return state.builder[exercise.id] && state.builder[exercise.id].selected;
    }).sort(function (a, b) {
      return selectionOrderForExercise(a) - selectionOrderForExercise(b);
    }).map(function (exercise) {
      var config = state.builder[exercise.id];
      return workoutItemFromExercise(exercise, config, 0);
    });
  }

  function selectionOrderForExercise(exercise) {
    var config = state.builder[exercise.id];
    return config && config.selectionOrder ? config.selectionOrder : Number.MAX_SAFE_INTEGER;
  }

  function workoutItemFromExercise(exercise, config, order) {
    return {
      itemId: localItemId(exercise.id),
      id: exercise.id,
      name: exercise.name,
      bodyPart: exercise.bodyPart,
      type: exercise.type,
      sets: cleanNumber(config.sets, exercise.defaultSets || 1),
      target: cleanNumber(config.target, defaultTarget(exercise) || 1),
      restSeconds: cleanNumber(config.restSeconds, suggestedRest(exercise)),
      order: order
    };
  }

  function localItemId(exerciseId) {
    return exerciseId + "-" + Date.now() + "-" + Math.random().toString(16).slice(2);
  }

  function addSelectedToActiveWorkout(selected) {
    var workout = state.activeWorkout;
    var existingIds = {};
    workout.exercises.forEach(function (item) {
      existingIds[item.id] = true;
    });
    var nextOrder = maxOrder(workout.exercises) + 1;
    var added = 0;
    selected.forEach(function (item) {
      if (existingIds[item.id]) {
        return;
      }
      item.order = nextOrder;
      nextOrder += 1;
      workout.exercises.push(item);
      added += 1;
    });

    if (!added) {
      showToast("Selected exercises are already in the active workout.");
      return;
    }

    if (!currentPlan() || workout.status === "exercise-complete") {
      var next = sortedWorkoutItems().find(function (item) {
        return !isExerciseComplete(item);
      });
      workout.currentItemId = next ? next.itemId : sortedWorkoutItems()[0].itemId;
      workout.setNumber = 1;
      workout.status = "ready";
    }

    persistActiveWorkout().then(function () {
      renderBuilder();
      renderPlayer();
      switchTab("player");
      showToast(added + " exercise" + (added === 1 ? "" : "s") + " added.");
    });
  }

  function discardWorkout() {
    if (!state.activeWorkout) {
      return;
    }
    confirmDialog({
      title: "Discard current workout?",
      message: "Discard the current workout and start a new one? Saved set logs will remain in the log database.",
      confirmText: "Discard",
      danger: true
    }).then(function (confirmed) {
      if (!confirmed) {
        return;
      }
      state.activeWorkout = null;
      persistActiveWorkout().then(function () {
        renderBuilder();
        renderPlayer();
        showToast("Current workout discarded. Choose exercises and start again.");
      });
    });
  }

  function normalizeActiveWorkout() {
    var workout = state.activeWorkout;
    if (!workout || !Array.isArray(workout.exercises)) {
      return;
    }
    workout.completedSets = Array.isArray(workout.completedSets) ? workout.completedSets : [];
    workout.exercises.forEach(function (item, index) {
      item.itemId = item.itemId || localItemId(item.id || "exercise");
      item.order = cleanNumber(item.order, index + 1);
      item.sets = cleanNumber(item.sets, 1);
      item.target = cleanNumber(item.target, 1);
      item.restSeconds = cleanNumber(item.restSeconds, 15);
    });
    workout.exercises.sort(function (a, b) {
      return a.order - b.order;
    });
    workout.exercises.forEach(function (item, index) {
      item.order = index + 1;
    });
    if (!workout.currentItemId) {
      var legacy = workout.exercises[workout.exerciseIndex || 0] || workout.exercises[0];
      workout.currentItemId = legacy ? legacy.itemId : null;
    }
    workout.setNumber = cleanNumber(workout.setNumber, 1);
    var plan = currentPlan();
    if (plan && workout.status === "working" && plan.type === "time" && !workout.setEndsAt && workout.setStartedAt) {
      workout.setEndsAt = workout.setStartedAt + plan.target * 1000;
    }
  }

  function sortedWorkoutItems() {
    if (!state.activeWorkout) {
      return [];
    }
    return state.activeWorkout.exercises.slice().sort(function (a, b) {
      return a.order - b.order;
    });
  }

  function maxOrder(items) {
    return items.reduce(function (max, item) {
      return Math.max(max, cleanNumber(item.order, 0));
    }, 0);
  }

  function currentPlan() {
    if (!state.activeWorkout) {
      return null;
    }
    var items = sortedWorkoutItems();
    return items.find(function (item) {
      return item.itemId === state.activeWorkout.currentItemId;
    }) || items[0] || null;
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
      renderActiveWorkoutPlan();
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
    if (workout.status === "working" && plan.type === "time") {
      els.setTimer.textContent = formatTime(Math.max(0, secondsBetween(Date.now(), workout.setEndsAt)));
    } else {
      els.setTimer.textContent = workout.setStartedAt ? formatTime(secondsBetween(workout.setStartedAt, Date.now())) : "00:00";
    }
    els.restTimer.textContent = workout.status === "resting" ? formatTime(Math.max(0, secondsBetween(Date.now(), workout.restEndsAt))) : "00:00";
    renderActiveWorkoutPlan();
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
    var workout = state.activeWorkout;
    var plan = currentPlan();
    if (!workout || !plan || workout.status === "working" || workout.status === "resting" || workout.status === "exercise-complete") {
      return;
    }
    workout.status = "working";
    workout.setStartedAt = Date.now();
    workout.setEndsAt = plan.type === "time" ? workout.setStartedAt + plan.target * 1000 : null;
    persistActiveWorkout();
    renderPlayer();
  }

  function finishSet(options) {
    options = options || {};
    var workout = state.activeWorkout;
    var plan = currentPlan();
    if (!workout || workout.status !== "working" || !plan) {
      return;
    }
    var setKey = plan.itemId + ":" + workout.setNumber;
    if (workout.savingSetKey === setKey) {
      return;
    }

    if (hasCompletedSet(plan, workout.setNumber)) {
      workout.status = "resting";
      workout.setStartedAt = null;
      workout.setEndsAt = null;
      workout.restStartedAt = Date.now();
      workout.restEndsAt = workout.restStartedAt + plan.restSeconds * 1000;
      persistActiveWorkout();
      renderPlayer();
      return;
    }

    var elapsed = Math.max(1, secondsBetween(workout.setStartedAt, Date.now()));
    var duration = plan.type === "time" && options.auto ? plan.target : elapsed;
    els.finishSetBtn.disabled = true;
    workout.savingSetKey = setKey;
    var repsInput = plan.type === "reps" ?
      numberDialog({
        title: "Finish set",
        message: plan.name + " · Set " + workout.setNumber,
        label: "Actual reps",
        value: plan.target,
        min: 1,
        max: 999,
        confirmText: "Save Set"
      }) :
      Promise.resolve(null);

    repsInput.then(function (actualReps) {
      if (plan.type === "reps" && actualReps === null) {
        workout.savingSetKey = null;
        renderPlayer();
        return null;
      }
      var setLog = {
        sessionId: workout.id,
        workoutItemId: plan.itemId,
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

      return WorkoutDb.saveSet(setLog).then(function (savedSet) {
        workout.completedSets.push(Object.assign(setLog, savedSet || {}));
        workout.status = "resting";
        workout.savingSetKey = null;
        workout.setStartedAt = null;
        workout.setEndsAt = null;
        workout.restStartedAt = Date.now();
        workout.restEndsAt = workout.restStartedAt + plan.restSeconds * 1000;
        return persistActiveWorkout();
      });
    }).then(function (saved) {
      if (saved === null) {
        return;
      }
      updateModeWarning();
      renderPlayer();
    }).catch(function () {
      workout.savingSetKey = null;
      showToast("Set save failed.");
      updateModeWarning();
      renderPlayer();
    });
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

    var hasMoreSets = workout.setNumber < plan.sets;
    if (hasMoreSets) {
      workout.setNumber += 1;
      workout.status = "ready";
    } else {
      prepareNextExercise();
    }
    workout.restStartedAt = null;
    workout.restEndsAt = null;
    persistActiveWorkout().then(function () {
      renderPlayer();
      if (!skipped && hasMoreSets && currentPlan() && currentPlan().type === "time" && workout.status === "ready") {
        startSet();
      }
    });
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

    if (prepareNextExercise()) {
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
      var plan = currentPlan();
      if (workout && plan && workout.status === "working" && plan.type === "time" && Date.now() >= workout.setEndsAt) {
        finishSet({ auto: true });
        return;
      }
      if (workout && workout.status === "resting" && Date.now() >= workout.restEndsAt) {
        beep();
        completeRest(false);
      }
      if (state.activeTab === "player") {
        renderPlayer();
      }
    }, 1000);
  }

  function hasCompletedSet(plan, setNumber) {
    return completedSetsForItem(plan).some(function (set) {
      return Number(set.setNumber) === Number(setNumber);
    });
  }

  function completedSetsForItem(plan) {
    var workout = state.activeWorkout;
    if (!workout || !plan) {
      return [];
    }
    return workout.completedSets.filter(function (set) {
      if (set.workoutItemId) {
        return set.workoutItemId === plan.itemId;
      }
      return set.exerciseId === plan.id;
    });
  }

  function completedSetCount(plan) {
    return completedSetsForItem(plan).length;
  }

  function isExerciseComplete(plan) {
    return completedSetCount(plan) >= plan.sets;
  }

  function prepareNextExercise() {
    var workout = state.activeWorkout;
    var plan = currentPlan();
    if (!workout || !plan) {
      return false;
    }
    var items = sortedWorkoutItems();
    var currentIndex = items.findIndex(function (item) {
      return item.itemId === plan.itemId;
    });
    var next = items.slice(currentIndex + 1).find(function (item) {
      return !isExerciseComplete(item);
    });
    if (!next) {
      workout.status = "exercise-complete";
      workout.setStartedAt = null;
      workout.setEndsAt = null;
      workout.restStartedAt = null;
      workout.restEndsAt = null;
      return false;
    }
    workout.currentItemId = next.itemId;
    workout.setNumber = Math.min(completedSetCount(next) + 1, next.sets);
    workout.status = "ready";
    workout.setStartedAt = null;
    workout.setEndsAt = null;
    workout.restStartedAt = null;
    workout.restEndsAt = null;
    return true;
  }

  function renderActiveWorkoutPlan() {
    var workout = state.activeWorkout;
    if (!els.activeWorkoutPlan) {
      return;
    }
    els.activeWorkoutPlan.innerHTML = "";
    if (!workout || !workout.exercises.length) {
      els.activeWorkoutPlan.textContent = "No active workout plan.";
      els.activeWorkoutPlan.classList.add("empty");
      return;
    }

    els.activeWorkoutPlan.classList.remove("empty");
    var items = sortedWorkoutItems();
    items.forEach(function (item, index) {
      var completed = completedSetCount(item);
      var complete = completed >= item.sets;
      var current = currentPlan() && currentPlan().itemId === item.itemId;
      var row = document.createElement("div");
      row.className = "active-plan-row" + (current ? " current" : "");
      row.innerHTML =
        '<div class="active-plan-main">' +
        '<span class="order-badge">' + (index + 1) + "</span>" +
        "<div><strong>" + escapeHtml(item.name) + "</strong>" +
        "<small>" + completed + " / " + item.sets + " sets · " + targetLabel(item, item.target) + " · " + item.restSeconds + "s rest</small></div>" +
        "</div>" +
        '<div class="row-actions active-plan-actions">' +
        '<button class="ghost-btn small-btn" type="button" data-action="up">Up</button>' +
        '<button class="ghost-btn small-btn" type="button" data-action="down">Down</button>' +
        '<button class="ghost-btn small-btn" type="button" data-action="edit">Edit</button>' +
        '<button class="danger-btn small-btn" type="button" data-action="remove">Remove</button>' +
        "</div>";

      var buttons = row.querySelectorAll("button");
      buttons[0].disabled = index === 0;
      buttons[1].disabled = index === items.length - 1;
      buttons[2].disabled = complete || (current && workout.status === "working");
      buttons[3].disabled = complete || (current && workout.status === "working");
      buttons.forEach(function (button) {
        button.addEventListener("click", function () {
          handleActivePlanAction(item.itemId, button.dataset.action);
        });
      });
      els.activeWorkoutPlan.appendChild(row);
    });
  }

  function handleActivePlanAction(itemId, action) {
    if (action === "up" || action === "down") {
      moveActiveWorkoutItem(itemId, action === "up" ? -1 : 1);
      return;
    }
    if (action === "edit") {
      editActiveWorkoutItem(itemId);
      return;
    }
    if (action === "remove") {
      removeActiveWorkoutItem(itemId);
    }
  }

  function findWorkoutItem(itemId) {
    if (!state.activeWorkout) {
      return null;
    }
    return state.activeWorkout.exercises.find(function (item) {
      return item.itemId === itemId;
    }) || null;
  }

  function moveActiveWorkoutItem(itemId, direction) {
    var workout = state.activeWorkout;
    var items = sortedWorkoutItems();
    var index = items.findIndex(function (item) {
      return item.itemId === itemId;
    });
    var swapIndex = index + direction;
    if (!workout || index < 0 || swapIndex < 0 || swapIndex >= items.length) {
      return;
    }
    var order = items[index].order;
    items[index].order = items[swapIndex].order;
    items[swapIndex].order = order;
    workout.exercises = sortedWorkoutItems().map(function (item, idx) {
      item.order = idx + 1;
      return item;
    });
    persistActiveWorkout().then(function () {
      renderPlayer();
    });
  }

  function editActiveWorkoutItem(itemId) {
    var item = findWorkoutItem(itemId);
    var workout = state.activeWorkout;
    if (!item || !workout) {
      return;
    }
    if (workout.currentItemId === itemId && workout.status === "working") {
      showToast("Finish or cancel the current set before editing it.");
      return;
    }

    var completed = completedSetCount(item);
    numberDialog({
      title: "Edit " + item.name,
      message: completed ? completed + " completed sets will be preserved." : "Update the pending plan for this exercise.",
      label: "Target sets",
      value: item.sets,
      min: 1,
      max: 12,
      confirmText: "Next"
    }).then(function (sets) {
      if (sets === null) {
        return null;
      }
      if (sets < completed) {
        sets = completed;
        showToast("Target sets clamped to completed sets.");
      }
      return numberDialog({
        title: "Edit " + item.name,
        message: "Set the " + (item.type === "time" ? "seconds" : "reps") + " target.",
        label: item.type === "time" ? "Target seconds" : "Target reps",
        value: item.target,
        min: 1,
        max: 300,
        confirmText: "Next"
      }).then(function (target) {
        if (target === null) {
          return null;
        }
        return numberDialog({
          title: "Edit " + item.name,
          message: "Set rest after each set.",
          label: "Rest seconds",
          value: item.restSeconds,
          min: 1,
          max: 600,
          confirmText: "Save"
        }).then(function (restSeconds) {
          if (restSeconds === null) {
            return null;
          }
          return {
            sets: sets,
            target: target,
            restSeconds: restSeconds
          };
        });
      });
    }).then(function (values) {
      if (!values) {
        return;
      }
      item.sets = values.sets;
      item.target = values.target;
      item.restSeconds = values.restSeconds;
      if (workout.currentItemId === itemId && workout.setNumber > item.sets) {
        workout.setNumber = item.sets;
      }
      persistActiveWorkout().then(function () {
        renderPlayer();
        showToast("Active workout plan updated.");
      });
    });
  }

  function removeActiveWorkoutItem(itemId) {
    var workout = state.activeWorkout;
    var item = findWorkoutItem(itemId);
    if (!workout || !item) {
      return;
    }
    var completed = completedSetCount(item);
    if (completed >= item.sets) {
      showToast("Completed exercises cannot be removed.");
      return;
    }
    if (workout.currentItemId === itemId && workout.status === "working") {
      showToast("Finish the active set before removing this exercise.");
      return;
    }
    confirmRemoveActiveWorkoutItem(workout, item, itemId, completed);
  }

  function confirmRemoveActiveWorkoutItem(workout, item, itemId, completed) {
    var confirmation = completed > 0 ? confirmDialog({
      title: "Remove pending exercise?",
      message: "Remove this partially completed exercise from the remaining plan? Completed set logs will stay saved.",
      confirmText: "Remove",
      danger: true
    }) : Promise.resolve(true);

    confirmation.then(function (confirmed) {
      if (!confirmed) {
        return;
      }

      workout.exercises = workout.exercises.filter(function (plan) {
        return plan.itemId !== itemId;
      });
    workout.exercises.sort(function (a, b) {
      return a.order - b.order;
    }).forEach(function (plan, index) {
      plan.order = index + 1;
    });

    if (!workout.exercises.length) {
      finishWorkout();
      return;
    }

    if (workout.currentItemId === itemId) {
      var next = sortedWorkoutItems().find(function (plan) {
        return !isExerciseComplete(plan);
      });
      workout.currentItemId = next ? next.itemId : sortedWorkoutItems()[0].itemId;
      workout.setNumber = next ? Math.min(completedSetCount(next) + 1, next.sets) : 1;
      workout.status = next ? "ready" : "exercise-complete";
      workout.setStartedAt = null;
      workout.setEndsAt = null;
      workout.restStartedAt = null;
      workout.restEndsAt = null;
    }

    persistActiveWorkout().then(function () {
      renderPlayer();
      showToast("Exercise removed from active workout.");
    });
    });
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
      var amount = set.type === "time" ? (set.target || set.setDurationSeconds) + "s" : set.reps + " reps";
      item.innerHTML =
        "<strong>" + escapeHtml(set.exerciseName) + " · Set " + set.setNumber + "</strong>" +
        "<span>" + amount +
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
        '<span class="session-summary-meta">' + formatTime(session.totalDurationSeconds) + " · " +
        session.completedSets.length + " sets · " + totalReps + " reps</span>" +
        "</summary>";
      var sessionActions = document.createElement("div");
      sessionActions.className = "log-actions";
      sessionActions.innerHTML =
        '<button class="danger-btn small-btn" type="button">Remove Session</button>';
      sessionActions.querySelector("button").addEventListener("click", function (event) {
        event.preventDefault();
        removeLoggedSession(session);
      });

      var detailList = document.createElement("div");
      detailList.className = "session-detail";
      detailList.appendChild(sessionActions);
      session.completedSets.forEach(function (set) {
        var row = document.createElement("div");
        row.className = "set-row log-set-row";
        var amount = set.type === "time" ? (set.target || set.setDurationSeconds) + "s" : set.reps + " reps";
        row.innerHTML =
          '<div class="set-row-main">' +
          "<strong>" + escapeHtml(set.exerciseName) + " · Set " + set.setNumber + "</strong>" +
          "<span>" + amount +
          " · work " + formatTime(set.setDurationSeconds) +
          " · rest " + formatTime(set.restDurationSeconds) + "</span>" +
          "</div>" +
          '<div class="log-actions">' +
          '<button class="ghost-btn small-btn" type="button" data-action="edit">Edit</button>' +
          '<button class="danger-btn small-btn" type="button" data-action="remove">Remove</button>' +
          "</div>";
        row.querySelector('[data-action="edit"]').addEventListener("click", function () {
          editLoggedSet(set);
        });
        row.querySelector('[data-action="remove"]').addEventListener("click", function () {
          removeLoggedSet(set);
        });
        detailList.appendChild(row);
      });
      details.appendChild(detailList);
      els.sessionList.appendChild(details);
    });
  }

  function editLoggedSet(set) {
    var firstInput = numberDialog({
      title: "Edit log",
      message: set.exerciseName + " · Set " + set.setNumber,
      label: set.type === "time" ? "Actual duration seconds" : "Actual reps",
      value: set.type === "time" ? set.setDurationSeconds || set.target || 1 : set.reps || set.target || 1,
      min: 1,
      max: 999,
      confirmText: "Next"
    });

    firstInput.then(function (amount) {
      if (amount === null) {
        return null;
      }
      if (set.type === "time") {
        return editLoggedSetRest(set, Object.assign({}, set, {
          reps: null,
          setDurationSeconds: amount
        }));
      }
      return numberDialog({
        title: "Edit log",
        message: "Adjust work duration.",
        label: "Work seconds",
        value: set.setDurationSeconds || amount || 1,
        min: 1,
        max: 9999,
        confirmText: "Next"
      }).then(function (workSeconds) {
        if (workSeconds === null) {
          return null;
        }
        return numberDialog({
          title: "Edit log",
          message: "Adjust rest duration.",
          label: "Rest seconds",
          value: set.restDurationSeconds || 1,
          min: 1,
          max: 9999,
          confirmText: "Save"
        }).then(function (restSeconds) {
          if (restSeconds === null) {
            return null;
          }
          return Object.assign({}, set, {
            reps: set.type === "reps" ? amount : null,
            setDurationSeconds: workSeconds,
            restDurationSeconds: restSeconds
          });
        });
      });
    }).then(function (updated) {
      if (!updated) {
        return;
      }
      WorkoutDb.updateSet(set.id, updated).then(function () {
        return refreshSessions();
      }).then(function () {
        showToast("Log updated.");
      }).catch(function () {
        showToast("Log update failed.");
        updateModeWarning();
      });
    });
  }

  function editLoggedSetRest(set, updated) {
    return numberDialog({
      title: "Edit log",
      message: "Adjust rest duration.",
      label: "Rest seconds",
      value: set.restDurationSeconds || 1,
      min: 1,
      max: 9999,
      confirmText: "Save"
    }).then(function (restSeconds) {
      if (restSeconds === null) {
        return null;
      }
      updated.restDurationSeconds = restSeconds;
      return updated;
    });
  }

  function removeLoggedSet(set) {
    confirmDialog({
      title: "Remove set log?",
      message: "Remove " + set.exerciseName + " set " + set.setNumber + " from the log?",
      confirmText: "Remove",
      danger: true
    }).then(function (confirmed) {
      if (!confirmed) {
        return;
      }
      WorkoutDb.deleteSet(set.id).then(function () {
        return refreshSessions();
      }).then(function () {
        showToast("Set log removed.");
      }).catch(function () {
        showToast("Set log remove failed.");
        updateModeWarning();
      });
    });
  }

  function removeLoggedSession(session) {
    confirmDialog({
      title: "Remove workout log?",
      message: "Remove this entire workout log and all of its set logs?",
      confirmText: "Remove",
      danger: true
    }).then(function (confirmed) {
      if (!confirmed) {
        return;
      }
      WorkoutDb.deleteSession(session.id).then(function () {
        return refreshSessions();
      }).then(function () {
        showToast("Workout log removed.");
      }).catch(function () {
        showToast("Workout log remove failed.");
        updateModeWarning();
      });
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
          normalizeActiveWorkout();
          seedBuilderDefaults();
          renderAll();
          updateModeWarning();
          showToast("Backup imported. Use Sync Local Logs to upload imported sessions.");
        });
      } catch (error) {
        showToast("Import failed. Choose a valid JSON backup.");
      }
      event.target.value = "";
    };
    reader.readAsText(file);
  }

  function syncLocalLogs() {
    els.syncLocalBtn.disabled = true;
    WorkoutDb.syncLocalSessions().then(function (result) {
      return refreshSessions().then(function () {
        if (!result.total) {
          showToast("No local logs to sync.");
          return;
        }
        showToast("Synced " + result.synced + " local log" + (result.synced === 1 ? "" : "s") + ".");
      });
    }).catch(function () {
      showToast("Local log sync failed. Check Supabase connection.");
      updateModeWarning();
    }).finally(function () {
      els.syncLocalBtn.disabled = false;
    });
  }

  function resetDemoData() {
    confirmDialog({
      title: "Reset demo data?",
      message: "Reset exercises, saved workouts, and active workout?",
      confirmText: "Reset",
      danger: true
    }).then(function (confirmed) {
      if (!confirmed) {
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

  function confirmDialog(options) {
    return openAppDialog(Object.assign({
      type: "confirm",
      kicker: "Confirm",
      confirmText: "OK",
      cancelText: "Cancel"
    }, options || {}));
  }

  function numberDialog(options) {
    return openAppDialog(Object.assign({
      type: "number",
      kicker: "Input",
      confirmText: "OK",
      cancelText: "Cancel"
    }, options || {}));
  }

  function openAppDialog(options) {
    return new Promise(function (resolve) {
      state.appDialogResolve = resolve;
      state.appDialogOptions = options;
      els.appDialogKicker.textContent = options.kicker || "Workout Watch";
      els.appDialogTitle.textContent = options.title || "Confirm action";
      els.appDialogMessage.textContent = options.message || "";
      els.appDialogConfirmBtn.textContent = options.confirmText || "OK";
      els.appDialogCancelBtn.textContent = options.cancelText || "Cancel";
      els.appDialogConfirmBtn.className = options.danger ? "danger-btn" : "primary-btn";
      els.appDialogInputRow.hidden = options.type !== "number";
      if (options.type === "number") {
        els.appDialogInputLabel.textContent = options.label || "Value";
        els.appDialogInput.value = options.value || 1;
        els.appDialogInput.min = options.min || 1;
        els.appDialogInput.max = options.max || "";
        els.appDialogInput.step = options.step || 1;
      }
      els.appDialog.hidden = false;
      els.appDialog.classList.add("is-open");
      document.body.classList.add("modal-open");
      window.setTimeout(function () {
        if (options.type === "number") {
          els.appDialogInput.focus();
          els.appDialogInput.select();
        } else {
          els.appDialogConfirmBtn.focus();
        }
      }, 0);
    });
  }

  function submitAppDialog(event) {
    event.preventDefault();
    var options = state.appDialogOptions || {};
    if (options.type === "number") {
      closeAppDialog(clamp(cleanNumber(els.appDialogInput.value, options.value || 1), options.min || 1, options.max || 9999));
      return;
    }
    closeAppDialog(true);
  }

  function cancelAppDialog() {
    var options = state.appDialogOptions || {};
    closeAppDialog(options.type === "number" ? null : false);
  }

  function closeAppDialog(value) {
    var resolve = state.appDialogResolve;
    state.appDialogResolve = null;
    state.appDialogOptions = null;
    els.appDialog.classList.remove("is-open");
    els.appDialog.hidden = true;
    if (els.exerciseModal.hidden) {
      document.body.classList.remove("modal-open");
    }
    if (resolve) {
      resolve(value);
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
