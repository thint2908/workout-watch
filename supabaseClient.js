(function () {
  "use strict";

  var LOCAL_PREFIX = "workout-watch:supabase-fallback:";
  var online = false;
  var offlineReason = "";

  function config() {
    return window.WorkoutConfig || {};
  }

  function hasConfig() {
    return Boolean(config().SUPABASE_URL && config().SUPABASE_ANON_KEY);
  }

  function headers(extra) {
    var anonKey = config().SUPABASE_ANON_KEY;
    return Object.assign({
      apikey: anonKey,
      Authorization: "Bearer " + anonKey,
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

      if (response.status === 204) {
        return null;
      }
      return response.json();
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
      default_seconds: exercise.type === "time" ? exercise.defaultReps : null,
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
      defaultRestSeconds: row.default_rest_seconds || 60,
      type: row.type,
      difficulty: row.difficulty || "normal",
      note: row.note || ""
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
    var exercises = localGet("exercises", null);
    if (!exercises || !exercises.length) {
      exercises = window.WorkoutSeed.exercises.map(function (exercise) {
        return Object.assign({}, exercise, { id: exercise.id || localId("exercise") });
      });
      localSet("exercises", exercises);
    }
    return Promise.resolve(exercises);
  }

  function listExercises() {
    return request("exercises?select=*&order=body_part.asc,name.asc").then(function (rows) {
      if (!rows.length) {
        return seedExercises().then(listExercises);
      }
      var exercises = rows.map(dbToExercise);
      localSet("exercises", exercises);
      return exercises;
    }).catch(localExercises);
  }

  function seedExercises() {
    return request("exercises", {
      method: "POST",
      headers: headers({ Prefer: "return=representation" }),
      body: JSON.stringify(window.WorkoutSeed.exercises.map(seedToDbExercise))
    }).then(function (rows) {
      return rows.map(dbToExercise);
    }).catch(function () {
      return localExercises();
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
      return session;
    });
  }

  function listSessions() {
    return request("workout_sessions?select=*,workout_sets(*)&order=started_at.desc").then(function (rows) {
      var sessions = rows.map(dbToSession);
      localSet("sessions", sessions);
      return sessions;
    }).catch(function () {
      return Promise.resolve(localGet("sessions", []));
    });
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
    return request("workout_sets?id=not.is.null", { method: "DELETE" }).then(function () {
      return request("workout_sessions?id=not.is.null", { method: "DELETE" });
    }).then(function () {
      return request("exercises?id=not.is.null", { method: "DELETE" });
    }).then(function () {
      return seedExercises();
    }).catch(function () {
      localSet("sessions", []);
      localSet("exercises", window.WorkoutSeed.exercises);
      localStorage.removeItem(LOCAL_PREFIX + "activeWorkout");
      return window.WorkoutSeed.exercises;
    });
  }

  function exportData() {
    return Promise.all([listExercises(), listSessions(), getActiveWorkout()]).then(function (values) {
      return {
        version: 2,
        exportedAt: new Date().toISOString(),
        source: online ? "supabase" : "local",
        exercises: values[0],
        sessions: values[1],
        activeWorkout: values[2]
      };
    });
  }

  function importData(data) {
    localSet("exercises", Array.isArray(data.exercises) ? data.exercises : window.WorkoutSeed.exercises);
    localSet("sessions", Array.isArray(data.sessions) ? data.sessions : []);
    if (data.activeWorkout) {
      localSet("activeWorkout", data.activeWorkout);
    }
    online = false;
    offlineReason = "Imported into local fallback storage.";
    return Promise.resolve();
  }

  window.WorkoutDb = {
    listExercises: listExercises,
    seedExercises: seedExercises,
    createSession: createSession,
    saveSet: saveSet,
    updateSetRest: updateSetRest,
    finishSession: finishSession,
    listSessions: listSessions,
    saveActiveWorkout: saveActiveWorkout,
    getActiveWorkout: getActiveWorkout,
    deleteAllData: deleteAllData,
    exportData: exportData,
    importData: importData,
    isOnline: function () {
      return online;
    },
    offlineReason: function () {
      return offlineReason;
    }
  };
})();
