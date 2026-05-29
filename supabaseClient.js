(function () {
  "use strict";

  var LOCAL_PREFIX = "workout-watch:supabase-fallback:";
  var SESSION_KEY = "workout-watch:supabase-session";
  var online = false;
  var offlineReason = "";
  var session = null;

  function config() {
    return window.WorkoutConfig || {};
  }

  function hasConfig() {
    return Boolean(config().SUPABASE_URL && config().SUPABASE_ANON_KEY);
  }

  function allowedEmail() {
    return (config().ALLOWED_EMAIL || "").trim().toLowerCase();
  }

  function isAllowedEmail(email) {
    var allowed = allowedEmail();
    return Boolean(email && allowed && email.trim().toLowerCase() === allowed);
  }

  function authEndpoint(path) {
    return config().SUPABASE_URL.replace(/\/$/, "") + "/auth/v1/" + path;
  }

  function headers(extra) {
    var anonKey = config().SUPABASE_ANON_KEY;
    var bearer = session && session.access_token ? session.access_token : anonKey;
    return Object.assign({
      apikey: anonKey,
      Authorization: "Bearer " + bearer,
      "Content-Type": "application/json"
    }, extra || {});
  }

  function endpoint(path) {
    return config().SUPABASE_URL.replace(/\/$/, "") + "/rest/v1/" + path;
  }

  function request(path, options) {
    if (!hasConfig()) {
      online = false;
      offlineReason = "Missing Supabase anon key.";
      return Promise.reject(new Error(offlineReason));
    }

    return fetch(endpoint(path), Object.assign({
      headers: headers()
    }, options || {})).then(function (response) {
      if (!response.ok) {
        return response.text().then(function (text) {
          throw new Error(text || response.statusText);
        });
      }

      return response.text().then(function (text) {
        return text ? JSON.parse(text) : null;
      });
    }).then(function (data) {
      online = true;
      offlineReason = "";
      return data;
    }).catch(function (error) {
      online = false;
      offlineReason = error.message || "Supabase request failed.";
      throw error;
    });
  }

  function loadSession() {
    session = localGet("session", null);
    if (session && session.expires_at && Date.now() >= session.expires_at * 1000) {
      clearSession();
    }
    return session;
  }

  function saveSession(authSession) {
    session = authSession;
    localStorage.setItem(SESSION_KEY, JSON.stringify(authSession));
    localSet("session", authSession);
    return session;
  }

  function clearSession() {
    session = null;
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(LOCAL_PREFIX + "session");
  }

  function sessionFromHash() {
    if (!window.location.hash || window.location.hash.indexOf("access_token=") < 0) {
      return null;
    }
    var params = new URLSearchParams(window.location.hash.slice(1));
    var accessToken = params.get("access_token");
    if (!accessToken) {
      return null;
    }
    return {
      access_token: accessToken,
      refresh_token: params.get("refresh_token"),
      token_type: params.get("token_type") || "bearer",
      expires_at: Math.floor(Date.now() / 1000) + cleanNumber(params.get("expires_in"), 3600),
      user: null
    };
  }

  function cleanNumber(value, fallback) {
    var parsed = parseInt(value, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  }

  function defaultTarget(exercise) {
    return exercise.type === "time" ?
      cleanNumber(exercise.defaultSeconds, exercise.defaultReps || 30) :
      cleanNumber(exercise.defaultReps, 8);
  }

  function getUser() {
    if (!session || !session.access_token) {
      return Promise.resolve(null);
    }
    return fetch(authEndpoint("user"), {
      headers: headers()
    }).then(function (response) {
      if (!response.ok) {
        throw new Error("Could not load authenticated user.");
      }
      return response.json();
    }).then(function (user) {
      session.user = user;
      saveSession(session);
      return user;
    });
  }

  function initAuthFromUrl() {
    if (!hasConfig()) {
      return Promise.resolve(null);
    }
    var hashSession = sessionFromHash();
    if (hashSession) {
      saveSession(hashSession);
      history.replaceState(null, document.title, window.location.pathname + window.location.search);
    } else {
      loadSession();
    }
    return getUser().catch(function () {
      clearSession();
      return null;
    });
  }

  function signInWithPassword(email, password) {
    if (!isAllowedEmail(email)) {
      return Promise.reject(new Error("This email is not allowed for this app."));
    }
    return fetch(authEndpoint("token?grant_type=password"), {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({
        email: email,
        password: password
      })
    }).then(function (response) {
      if (!response.ok) {
        return response.text().then(function (text) {
          throw new Error(text || "Sign in failed.");
        });
      }
      return response.json();
    }).then(function (authSession) {
      saveSession(authSession);
      return getUser();
    });
  }

  function signOut() {
    clearSession();
    return Promise.resolve();
  }

  function currentUser() {
    return session && session.user ? session.user : null;
  }

  function isAuthenticated() {
    var user = currentUser();
    return Boolean(user && isAllowedEmail(user.email));
  }

  function localGet(key, fallback) {
    try {
      var raw = localStorage.getItem(LOCAL_PREFIX + key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (error) {
      return fallback;
    }
  }

  function localSet(key, value) {
    localStorage.setItem(LOCAL_PREFIX + key, JSON.stringify(value));
    return value;
  }

  function localRemove(key) {
    localStorage.removeItem(LOCAL_PREFIX + key);
  }

  function localId(prefix) {
    if (window.crypto && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return prefix + "-" + Date.now() + "-" + Math.random().toString(16).slice(2);
  }

  function seedToDbExercise(exercise) {
    return {
      name: exercise.name,
      body_part: exercise.bodyPart,
      type: exercise.type,
      default_sets: exercise.defaultSets,
      default_reps: exercise.type === "reps" ? exercise.defaultReps : null,
      default_seconds: exercise.type === "time" ? defaultTarget(exercise) : null,
      default_rest_seconds: exercise.defaultRestSeconds,
      difficulty: exercise.difficulty || "normal",
      note: exercise.note || ""
    };
  }

  function exerciseToDb(exercise) {
    return {
      name: exercise.name,
      body_part: exercise.bodyPart,
      type: exercise.type,
      default_sets: exercise.defaultSets,
      default_reps: exercise.type === "reps" ? exercise.defaultReps : null,
      default_seconds: exercise.type === "time" ? defaultTarget(exercise) : null,
      default_rest_seconds: exercise.defaultRestSeconds,
      difficulty: exercise.difficulty || "normal",
      note: exercise.note || ""
    };
  }

  function dbToExercise(row) {
    return {
      id: row.id,
      name: row.name,
      bodyPart: row.body_part,
      defaultSets: row.default_sets || 3,
      defaultReps: row.type === "time" ? row.default_seconds : row.default_reps,
      defaultSeconds: row.type === "time" ? row.default_seconds : null,
      defaultRestSeconds: row.default_rest_seconds || 60,
      type: row.type,
      difficulty: row.difficulty || "normal",
      note: row.note || ""
    };
  }

  function presetToDb(preset) {
    return {
      name: preset.name,
      items: Array.isArray(preset.items) ? preset.items : []
    };
  }

  function dbToPreset(row) {
    return {
      id: row.id,
      name: row.name,
      items: Array.isArray(row.items) ? row.items : [],
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  function setToDb(set) {
    return {
      session_id: set.sessionId,
      exercise_id: set.exerciseId,
      exercise_name: set.exerciseName,
      set_number: set.setNumber,
      target_reps: set.type === "reps" ? set.target : null,
      actual_reps: set.type === "reps" ? set.reps : null,
      target_seconds: set.type === "time" ? set.target : null,
      actual_duration_seconds: set.setDurationSeconds,
      rest_seconds: set.restDurationSeconds
    };
  }

  function setToSyncDb(set, remoteSessionId, exerciseId) {
    return {
      session_id: remoteSessionId,
      exercise_id: exerciseId || null,
      exercise_name: set.exerciseName,
      set_number: set.setNumber,
      target_reps: set.type === "reps" ? set.target : null,
      actual_reps: set.type === "reps" ? set.reps : null,
      target_seconds: set.type === "time" ? set.target : null,
      actual_duration_seconds: set.setDurationSeconds,
      rest_seconds: set.restDurationSeconds
    };
  }

  function dbToSet(row) {
    return {
      id: row.id,
      sessionId: row.session_id,
      exerciseId: row.exercise_id,
      exerciseName: row.exercise_name,
      type: row.target_seconds ? "time" : "reps",
      setNumber: row.set_number,
      target: row.target_seconds || row.target_reps || 0,
      reps: row.actual_reps || row.target_seconds || 0,
      setDurationSeconds: row.actual_duration_seconds || 0,
      restDurationSeconds: row.rest_seconds || 0,
      loggedAt: row.created_at
    };
  }

  function dbToSession(row) {
    var sets = (row.workout_sets || []).map(dbToSet).sort(function (a, b) {
      return new Date(a.loggedAt) - new Date(b.loggedAt);
    });
    var exerciseMap = {};
    sets.forEach(function (set) {
      exerciseMap[set.exerciseId] = {
        id: set.exerciseId,
        name: set.exerciseName,
        type: set.type
      };
    });

    return {
      id: row.id,
      startedAt: row.started_at,
      finishedAt: row.finished_at,
      totalDurationSeconds: row.total_duration_seconds || 0,
      selectedExercises: Object.keys(exerciseMap).map(function (key) {
        return exerciseMap[key];
      }),
      completedSets: sets
    };
  }

  function localExercises() {
    if (!isAuthenticated()) {
      return Promise.reject(new Error("Sign in required."));
    }
    var exercises = localGet("exercises", null);
    if (!exercises || !exercises.length) {
      exercises = window.WorkoutSeed.exercises.map(function (exercise) {
        return Object.assign({}, exercise, { id: exercise.id || localId("exercise") });
      });
      localSet("exercises", exercises);
    } else {
      missingSeedExercises(exercises).forEach(function (exercise) {
        exercises.push(Object.assign({}, exercise, { id: exercise.id || localId("exercise") }));
      });
      exercises = syncLocalSeedExercises(exercises);
      localSet("exercises", exercises);
    }
    return Promise.resolve(exercises);
  }

  function listExercises() {
    return request("exercises?select=*&order=body_part.asc,name.asc").then(function (rows) {
      if (!rows.length) {
        return seedExercises().then(listExercises);
      }
      if (missingSeedExercises(rows).length) {
        return seedExercises().then(listExercises);
      }
      if (seedExerciseUpdates(rows).length) {
        return syncSeedExerciseUpdates(rows).then(listExercises);
      }
      var exercises = rows.map(dbToExercise);
      localSet("exercises", exercises);
      return exercises;
    }).catch(localExercises);
  }

  function seedExercises() {
    return request("exercises?select=name").then(function (rows) {
      return missingSeedExercises(rows);
    }).then(function (missingExercises) {
      if (!missingExercises.length) {
        return [];
      }
      return request("exercises", {
        method: "POST",
        headers: headers({ Prefer: "return=representation" }),
        body: JSON.stringify(missingExercises.map(seedToDbExercise))
      }).then(function (rows) {
        return rows.map(dbToExercise);
      });
    }).catch(function () {
      if (!isAuthenticated()) {
        return Promise.reject(new Error("Sign in required."));
      }
      return localExercises();
    });
  }

  function missingSeedExercises(rows) {
    var existingNames = {};
    rows.forEach(function (row) {
      existingNames[String(row.name || "").trim().toLowerCase()] = true;
    });
    return window.WorkoutSeed.exercises.filter(function (exercise) {
      return !existingNames[String(exercise.name || "").trim().toLowerCase()];
    });
  }

  function seedExerciseMap() {
    var map = {};
    window.WorkoutSeed.exercises.forEach(function (exercise) {
      map[String(exercise.name || "").trim().toLowerCase()] = exercise;
    });
    return map;
  }

  function seedExerciseUpdates(rows) {
    var map = seedExerciseMap();
    return rows.filter(function (row) {
      var seed = map[String(row.name || "").trim().toLowerCase()];
      return seed && needsSeedExerciseUpdate(row, seed);
    }).map(function (row) {
      return {
        id: row.id,
        exercise: map[String(row.name || "").trim().toLowerCase()]
      };
    });
  }

  function needsSeedExerciseUpdate(row, seed) {
    return row.body_part !== seed.bodyPart ||
      row.type !== seed.type ||
      cleanNumber(row.default_sets, 0) !== cleanNumber(seed.defaultSets, 0) ||
      cleanNumber(row.default_reps, 0) !== (seed.type === "reps" ? cleanNumber(seed.defaultReps, 0) : 0) ||
      cleanNumber(row.default_seconds, 0) !== (seed.type === "time" ? defaultTarget(seed) : 0) ||
      cleanNumber(row.default_rest_seconds, 0) !== cleanNumber(seed.defaultRestSeconds, 0) ||
      (row.difficulty || "normal") !== (seed.difficulty || "normal") ||
      (row.note || "") !== (seed.note || "");
  }

  function syncSeedExerciseUpdates(rows) {
    var updates = seedExerciseUpdates(rows);
    return Promise.all(updates.map(function (update) {
      return request("exercises?id=eq." + encodeURIComponent(update.id), {
        method: "PATCH",
        headers: headers({ Prefer: "return=minimal" }),
        body: JSON.stringify(seedToDbExercise(update.exercise))
      });
    }));
  }

  function syncLocalSeedExercises(exercises) {
    var map = seedExerciseMap();
    return exercises.map(function (exercise) {
      var seed = map[String(exercise.name || "").trim().toLowerCase()];
      return seed ? Object.assign({}, exercise, seed, { id: exercise.id }) : exercise;
    });
  }

  function seedAllExercises() {
    return request("exercises", {
      method: "POST",
      headers: headers({ Prefer: "return=representation" }),
      body: JSON.stringify(window.WorkoutSeed.exercises.map(seedToDbExercise))
    }).then(function (rows) {
      return rows.map(dbToExercise);
    }).catch(function () {
      if (!isAuthenticated()) {
        return Promise.reject(new Error("Sign in required."));
      }
      return localExercises();
    });
  }

  function createExercise(exercise) {
    return request("exercises", {
      method: "POST",
      headers: headers({ Prefer: "return=representation" }),
      body: JSON.stringify(exerciseToDb(exercise))
    }).then(function (rows) {
      var saved = dbToExercise(rows[0]);
      var exercises = localGet("exercises", []);
      exercises.push(saved);
      localSet("exercises", exercises);
      return saved;
    }).catch(function () {
      if (!isAuthenticated()) {
        return Promise.reject(new Error("Sign in required."));
      }
      var exercises = localGet("exercises", []);
      var saved = Object.assign({}, exercise, { id: localId("exercise") });
      exercises.push(saved);
      localSet("exercises", exercises);
      return saved;
    });
  }

  function updateExercise(exerciseId, exercise) {
    return request("exercises?id=eq." + encodeURIComponent(exerciseId), {
      method: "PATCH",
      headers: headers({ Prefer: "return=representation" }),
      body: JSON.stringify(exerciseToDb(exercise))
    }).then(function (rows) {
      var saved = dbToExercise(rows[0]);
      var exercises = localGet("exercises", []);
      localSet("exercises", exercises.map(function (item) {
        return item.id === exerciseId ? saved : item;
      }));
      return saved;
    }).catch(function () {
      if (!isAuthenticated()) {
        return Promise.reject(new Error("Sign in required."));
      }
      var exercises = localGet("exercises", []);
      var saved = Object.assign({}, exercise, { id: exerciseId });
      localSet("exercises", exercises.map(function (item) {
        return item.id === exerciseId ? saved : item;
      }));
      return saved;
    });
  }

  function deleteExercise(exerciseId) {
    return request("workout_sets?exercise_id=eq." + encodeURIComponent(exerciseId), {
      method: "PATCH",
      headers: headers({ Prefer: "return=minimal" }),
      body: JSON.stringify({ exercise_id: null })
    }).then(function () {
      return request("exercises?id=eq." + encodeURIComponent(exerciseId), { method: "DELETE" });
    }).then(function () {
      var exercises = localGet("exercises", []);
      localSet("exercises", exercises.filter(function (item) {
        return item.id !== exerciseId;
      }));
    }).catch(function () {
      if (!isAuthenticated()) {
        return Promise.reject(new Error("Sign in required."));
      }
      var exercises = localGet("exercises", []);
      localSet("exercises", exercises.filter(function (item) {
        return item.id !== exerciseId;
      }));
    });
  }

  function listPresets() {
    return request("workout_presets?select=*&order=name.asc").then(function (rows) {
      var presets = rows.map(dbToPreset);
      localSet("presets", presets);
      return presets;
    }).catch(function () {
      if (!isAuthenticated()) {
        return Promise.reject(new Error("Sign in required."));
      }
      return Promise.resolve(localGet("presets", []));
    });
  }

  function createPreset(preset) {
    return request("workout_presets", {
      method: "POST",
      headers: headers({ Prefer: "return=representation" }),
      body: JSON.stringify(presetToDb(preset))
    }).then(function (rows) {
      var saved = dbToPreset(rows[0]);
      var presets = localGet("presets", []);
      presets.push(saved);
      localSet("presets", sortPresets(presets));
      return saved;
    }).catch(function () {
      if (!isAuthenticated()) {
        return Promise.reject(new Error("Sign in required."));
      }
      var presets = localGet("presets", []);
      var saved = Object.assign({}, preset, {
        id: localId("preset"),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      presets.push(saved);
      localSet("presets", sortPresets(presets));
      return saved;
    });
  }

  function updatePreset(presetId, preset) {
    return request("workout_presets?id=eq." + encodeURIComponent(presetId), {
      method: "PATCH",
      headers: headers({ Prefer: "return=representation" }),
      body: JSON.stringify(Object.assign(presetToDb(preset), {
        updated_at: new Date().toISOString()
      }))
    }).then(function (rows) {
      var saved = dbToPreset(rows[0]);
      var presets = localGet("presets", []);
      localSet("presets", sortPresets(presets.map(function (item) {
        return item.id === presetId ? saved : item;
      })));
      return saved;
    }).catch(function () {
      if (!isAuthenticated()) {
        return Promise.reject(new Error("Sign in required."));
      }
      var presets = localGet("presets", []);
      var saved = Object.assign({}, preset, {
        id: presetId,
        updatedAt: new Date().toISOString()
      });
      localSet("presets", sortPresets(presets.map(function (item) {
        return item.id === presetId ? saved : item;
      })));
      return saved;
    });
  }

  function deletePreset(presetId) {
    return request("workout_presets?id=eq." + encodeURIComponent(presetId), {
      method: "DELETE",
      headers: headers({ Prefer: "return=minimal" })
    }).then(function () {
      removeLocalPreset(presetId);
    }).catch(function () {
      if (!isAuthenticated()) {
        return Promise.reject(new Error("Sign in required."));
      }
      removeLocalPreset(presetId);
    });
  }

  function removeLocalPreset(presetId) {
    var presets = localGet("presets", []);
    localSet("presets", presets.filter(function (preset) {
      return preset.id !== presetId;
    }));
  }

  function sortPresets(presets) {
    return (presets || []).slice().sort(function (a, b) {
      return String(a.name || "").localeCompare(String(b.name || ""));
    });
  }

  function createSession(startedAt) {
    return request("workout_sessions", {
      method: "POST",
      headers: headers({ Prefer: "return=representation" }),
      body: JSON.stringify({ started_at: startedAt })
    }).then(function (rows) {
      return rows[0];
    }).catch(function () {
      if (!isAuthenticated()) {
        return Promise.reject(new Error("Sign in required."));
      }
      var sessions = localGet("sessions", []);
      var session = {
        id: localId("session"),
        startedAt: startedAt,
        finishedAt: null,
        totalDurationSeconds: 0,
        selectedExercises: [],
        completedSets: []
      };
      sessions.unshift(session);
      localSet("sessions", sessions);
      upsertPendingSession(session);
      return { id: session.id, started_at: startedAt };
    });
  }

  function saveSet(set) {
    return request("workout_sets", {
      method: "POST",
      headers: headers({ Prefer: "return=representation" }),
      body: JSON.stringify(setToDb(set))
    }).then(function (rows) {
      return dbToSet(rows[0]);
    }).catch(function () {
      if (!isAuthenticated()) {
        return Promise.reject(new Error("Sign in required."));
      }
      return Promise.resolve(Object.assign({ id: localId("set") }, set));
    });
  }

  function updateSetRest(setId, restSeconds) {
    if (!setId) {
      return Promise.resolve();
    }

    return request("workout_sets?id=eq." + encodeURIComponent(setId), {
      method: "PATCH",
      headers: headers({ Prefer: "return=minimal" }),
      body: JSON.stringify({ rest_seconds: restSeconds })
    }).catch(function () {
      return Promise.resolve();
    });
  }

  function updateSet(setId, set) {
    return request("workout_sets?id=eq." + encodeURIComponent(setId), {
      method: "PATCH",
      headers: headers({ Prefer: "return=representation" }),
      body: JSON.stringify(setToDb(set))
    }).then(function (rows) {
      return dbToSet(rows[0]);
    }).catch(function () {
      if (!isAuthenticated()) {
        return Promise.reject(new Error("Sign in required."));
      }
      var sessions = localGet("sessions", []);
      var updated = Object.assign({}, set, { id: setId });
      sessions.forEach(function (session) {
        session.completedSets = (session.completedSets || []).map(function (item) {
          return item.id === setId ? updated : item;
        });
      });
      localSet("sessions", sessions);
      return updated;
    });
  }

  function deleteSet(setId) {
    return request("workout_sets?id=eq." + encodeURIComponent(setId), {
      method: "DELETE",
      headers: headers({ Prefer: "return=minimal" })
    }).then(function () {
      removeLocalSet(setId);
    }).catch(function () {
      if (!isAuthenticated()) {
        return Promise.reject(new Error("Sign in required."));
      }
      removeLocalSet(setId);
    });
  }

  function removeLocalSet(setId) {
    var sessions = localGet("sessions", []);
    sessions.forEach(function (session) {
      session.completedSets = (session.completedSets || []).filter(function (set) {
        return set.id !== setId;
      });
      session.selectedExercises = selectedExercisesFromSets(session.completedSets);
    });
    localSet("sessions", sessions);
  }

  function deleteSession(sessionId) {
    return request("workout_sessions?id=eq." + encodeURIComponent(sessionId), {
      method: "DELETE",
      headers: headers({ Prefer: "return=minimal" })
    }).then(function () {
      removeLocalSession(sessionId);
    }).catch(function () {
      if (!isAuthenticated()) {
        return Promise.reject(new Error("Sign in required."));
      }
      removeLocalSession(sessionId);
    });
  }

  function removeLocalSession(sessionId) {
    var sessions = localGet("sessions", []);
    localSet("sessions", sessions.filter(function (session) {
      return session.id !== sessionId;
    }));
  }

  function selectedExercisesFromSets(sets) {
    var exerciseMap = {};
    (sets || []).forEach(function (set) {
      exerciseMap[set.exerciseId] = {
        id: set.exerciseId,
        name: set.exerciseName,
        type: set.type
      };
    });
    return Object.keys(exerciseMap).map(function (key) {
      return exerciseMap[key];
    });
  }

  function finishSession(sessionId, finishedAt, totalDurationSeconds, selectedExercises, completedSets) {
    return request("workout_sessions?id=eq." + encodeURIComponent(sessionId), {
      method: "PATCH",
      headers: headers({ Prefer: "return=representation" }),
      body: JSON.stringify({
        finished_at: finishedAt,
        total_duration_seconds: totalDurationSeconds
      })
    }).then(function (rows) {
      return rows[0];
    }).catch(function () {
      if (!isAuthenticated()) {
        return Promise.reject(new Error("Sign in required."));
      }
      var sessions = localGet("sessions", []);
      var session = sessions.find(function (item) {
        return item.id === sessionId;
      });

      if (!session) {
        session = { id: sessionId, completedSets: [] };
        sessions.unshift(session);
      }

      session.startedAt = session.startedAt || finishedAt;
      session.finishedAt = finishedAt;
      session.totalDurationSeconds = totalDurationSeconds;
      session.selectedExercises = selectedExercises || [];
      session.completedSets = completedSets || [];
      localSet("sessions", sessions);
      upsertPendingSession(session);
      return session;
    });
  }

  function listSessions() {
    return request("workout_sessions?select=*,workout_sets(*)&order=started_at.desc").then(function (rows) {
      var sessions = rows.map(dbToSession);
      localSet("sessions", sessions);
      return sessions;
    }).catch(function () {
      if (!isAuthenticated()) {
        return Promise.reject(new Error("Sign in required."));
      }
      return Promise.resolve(localGet("sessions", []));
    });
  }

  function upsertPendingSession(session) {
    var pending = localGet("pendingSessions", []);
    var index = pending.findIndex(function (item) {
      return item.id === session.id;
    });
    if (index >= 0) {
      pending[index] = session;
    } else {
      pending.unshift(session);
    }
    localSet("pendingSessions", pending);
  }

  function localSyncCandidates() {
    var byKey = {};
    localGet("sessions", []).concat(localGet("pendingSessions", [])).forEach(function (session) {
      if (!session || !session.startedAt || !Array.isArray(session.completedSets) || !session.completedSets.length) {
        return;
      }
      byKey[sessionSignature(session)] = session;
    });
    return Object.keys(byKey).map(function (key) {
      return byKey[key];
    });
  }

  function sessionSignature(session) {
    return [
      session.startedAt || "",
      session.finishedAt || "",
      session.completedSets ? session.completedSets.length : 0,
      session.totalDurationSeconds || 0
    ].join("|");
  }

  function syncLocalSessions() {
    if (!isAuthenticated()) {
      return Promise.reject(new Error("Sign in required."));
    }
    var candidates = localSyncCandidates();
    if (!candidates.length) {
      return Promise.resolve({ total: 0, synced: 0, skipped: 0 });
    }

    return Promise.all([
      request("workout_sessions?select=*,workout_sets(*)&order=started_at.desc"),
      request("exercises?select=id,name")
    ]).then(function (values) {
      var remoteSessions = values[0].map(dbToSession);
      var exerciseMap = {};
      values[1].forEach(function (exercise) {
        exerciseMap[String(exercise.name || "").trim().toLowerCase()] = exercise.id;
      });

      var synced = 0;
      var skipped = 0;
      var syncedSignatures = [];
      var chain = Promise.resolve();
      candidates.forEach(function (localSession) {
        chain = chain.then(function () {
          if (hasRemoteSession(remoteSessions, localSession)) {
            skipped += 1;
            syncedSignatures.push(sessionSignature(localSession));
            return null;
          }
          return uploadLocalSession(localSession, exerciseMap).then(function () {
            synced += 1;
            syncedSignatures.push(sessionSignature(localSession));
          });
        });
      });

      return chain.then(function () {
        removePendingSessionSignatures(syncedSignatures);
        return {
          total: candidates.length,
          synced: synced,
          skipped: skipped
        };
      });
    });
  }

  function hasRemoteSession(remoteSessions, localSession) {
    return remoteSessions.some(function (remoteSession) {
      return sessionSignature(remoteSession) === sessionSignature(localSession);
    });
  }

  function uploadLocalSession(localSession, exerciseMap) {
    return request("workout_sessions", {
      method: "POST",
      headers: headers({ Prefer: "return=representation" }),
      body: JSON.stringify({
        started_at: localSession.startedAt,
        finished_at: localSession.finishedAt || null,
        total_duration_seconds: localSession.totalDurationSeconds || 0
      })
    }).then(function (rows) {
      var remoteSessionId = rows[0].id;
      var sets = (localSession.completedSets || []).map(function (set) {
        var exerciseId = exerciseMap[String(set.exerciseName || "").trim().toLowerCase()] || null;
        return setToSyncDb(set, remoteSessionId, exerciseId);
      });
      if (!sets.length) {
        return null;
      }
      return request("workout_sets", {
        method: "POST",
        headers: headers({ Prefer: "return=minimal" }),
        body: JSON.stringify(sets)
      });
    });
  }

  function removePendingSessionSignatures(signatures) {
    var signatureMap = {};
    signatures.forEach(function (signature) {
      signatureMap[signature] = true;
    });
    var pending = localGet("pendingSessions", []).filter(function (session) {
      return !signatureMap[sessionSignature(session)];
    });
    if (pending.length) {
      localSet("pendingSessions", pending);
    } else {
      localRemove("pendingSessions");
    }
  }

  function saveActiveWorkout(workout) {
    if (workout) {
      localSet("activeWorkout", workout);
    } else {
      localStorage.removeItem(LOCAL_PREFIX + "activeWorkout");
    }
    return Promise.resolve();
  }

  function getActiveWorkout() {
    return Promise.resolve(localGet("activeWorkout", null));
  }

  function deleteAllData() {
    return request("workout_presets?id=not.is.null", { method: "DELETE" }).catch(function () {
      return null;
    }).then(function () {
      return request("workout_sets?id=not.is.null", { method: "DELETE" });
    }).then(function () {
      return request("workout_sessions?id=not.is.null", { method: "DELETE" });
    }).then(function () {
      return request("exercises?id=not.is.null", { method: "DELETE" });
    }).then(function () {
      return seedAllExercises();
    }).catch(function () {
      if (!isAuthenticated()) {
        return Promise.reject(new Error("Sign in required."));
      }
      localSet("sessions", []);
      localSet("exercises", window.WorkoutSeed.exercises);
      localSet("presets", []);
      localStorage.removeItem(LOCAL_PREFIX + "activeWorkout");
      return window.WorkoutSeed.exercises;
    });
  }

  function exportData() {
    return Promise.all([listExercises(), listSessions(), getActiveWorkout(), listPresets()]).then(function (values) {
      return {
        version: 2,
        exportedAt: new Date().toISOString(),
        source: online ? "supabase" : "local",
        exercises: values[0],
        sessions: values[1],
        activeWorkout: values[2],
        presets: values[3]
      };
    });
  }

  function importData(data) {
    localSet("exercises", Array.isArray(data.exercises) ? data.exercises : window.WorkoutSeed.exercises);
    localSet("presets", Array.isArray(data.presets) ? data.presets : []);
    localSet("sessions", mergeSessions(localGet("sessions", []), Array.isArray(data.sessions) ? data.sessions : []));
    localSet("pendingSessions", mergeSessions(localGet("pendingSessions", []), Array.isArray(data.sessions) ? data.sessions : []));
    if (data.activeWorkout) {
      localSet("activeWorkout", data.activeWorkout);
    }
    return Promise.resolve();
  }

  function mergeSessions(existing, incoming) {
    var bySignature = {};
    existing.concat(incoming).forEach(function (session) {
      if (!session || !session.startedAt) {
        return;
      }
      bySignature[sessionSignature(session)] = session;
    });
    return Object.keys(bySignature).map(function (key) {
      return bySignature[key];
    }).sort(function (a, b) {
      return new Date(b.startedAt) - new Date(a.startedAt);
    });
  }

  window.WorkoutDb = {
    listExercises: listExercises,
    seedExercises: seedExercises,
    createExercise: createExercise,
    updateExercise: updateExercise,
    deleteExercise: deleteExercise,
    listPresets: listPresets,
    createPreset: createPreset,
    updatePreset: updatePreset,
    deletePreset: deletePreset,
    createSession: createSession,
    saveSet: saveSet,
    updateSetRest: updateSetRest,
    updateSet: updateSet,
    deleteSet: deleteSet,
    deleteSession: deleteSession,
    finishSession: finishSession,
    listSessions: listSessions,
    syncLocalSessions: syncLocalSessions,
    saveActiveWorkout: saveActiveWorkout,
    getActiveWorkout: getActiveWorkout,
    deleteAllData: deleteAllData,
    exportData: exportData,
    importData: importData,
    initAuthFromUrl: initAuthFromUrl,
    signInWithPassword: signInWithPassword,
    signOut: signOut,
    currentUser: currentUser,
    isAuthenticated: isAuthenticated,
    isAllowedEmail: isAllowedEmail,
    isOnline: function () {
      return online;
    },
    offlineReason: function () {
      return offlineReason;
    }
  };
})();
