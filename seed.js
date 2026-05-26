(function () {
  "use strict";

  var BODY_PARTS = [
    "Upper body",
    "Arms",
    "Back",
    "Core",
    "Legs",
    "Full body"
  ];

  var EXERCISES = [
    {
      id: "push-up",
      name: "Push-up",
      bodyPart: "Upper body",
      defaultSets: 3,
      defaultReps: 8,
      defaultRestSeconds: 75,
      type: "reps",
      difficulty: "normal",
      note: "Keep a straight line from shoulders to heels."
    },
    {
      id: "pike-push-up",
      name: "Pike push-up",
      bodyPart: "Upper body",
      defaultSets: 3,
      defaultReps: 6,
      defaultRestSeconds: 90,
      type: "reps",
      difficulty: "hard",
      note: "Hips high, head travels toward the floor."
    },
    {
      id: "chair-dips",
      name: "Dips between chairs",
      bodyPart: "Arms",
      defaultSets: 3,
      defaultReps: 6,
      defaultRestSeconds: 90,
      type: "reps",
      difficulty: "hard",
      note: "Use stable chairs and stop before shoulder discomfort."
    },
    {
      id: "pull-up-australian-row",
      name: "Pull-up / Australian row",
      bodyPart: "Back",
      defaultSets: 3,
      defaultReps: 5,
      defaultRestSeconds: 105,
      type: "reps",
      difficulty: "hard",
      note: "Pick the variation that matches your current strength."
    },
    {
      id: "squat",
      name: "Squat",
      bodyPart: "Legs",
      defaultSets: 3,
      defaultReps: 12,
      defaultRestSeconds: 60,
      type: "reps",
      difficulty: "normal",
      note: "Control the descent and keep knees tracking over toes."
    },
    {
      id: "lunge",
      name: "Lunge",
      bodyPart: "Legs",
      defaultSets: 3,
      defaultReps: 10,
      defaultRestSeconds: 60,
      type: "reps",
      difficulty: "normal",
      note: "Count total reps across both legs."
    },
    {
      id: "glute-bridge",
      name: "Glute bridge",
      bodyPart: "Legs",
      defaultSets: 3,
      defaultReps: 12,
      defaultRestSeconds: 45,
      type: "reps",
      difficulty: "easy",
      note: "Pause briefly at the top without arching your lower back."
    },
    {
      id: "plank",
      name: "Plank",
      bodyPart: "Core",
      defaultSets: 3,
      defaultReps: 30,
      defaultRestSeconds: 45,
      type: "time",
      difficulty: "easy",
      note: "Brace hard and stop before your hips sag."
    },
    {
      id: "dead-bug",
      name: "Dead bug",
      bodyPart: "Core",
      defaultSets: 3,
      defaultReps: 8,
      defaultRestSeconds: 30,
      type: "reps",
      difficulty: "easy",
      note: "Move slowly while keeping your lower back quiet."
    },
    {
      id: "mountain-climber",
      name: "Mountain climber",
      bodyPart: "Full body",
      defaultSets: 3,
      defaultReps: 30,
      defaultRestSeconds: 45,
      type: "time",
      difficulty: "normal",
      note: "Keep shoulders stacked over hands and move smoothly."
    }
  ];

  window.WorkoutSeed = {
    bodyParts: BODY_PARTS,
    exercises: EXERCISES
  };
})();
