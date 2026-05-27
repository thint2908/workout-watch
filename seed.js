(function () {
  "use strict";

  var BODY_PARTS = [
    "Upper body",
    "Arms",
    "Back",
    "Core",
    "Legs",
    "Cardio",
    "Full body"
  ];

  var EXERCISES = [
    {
      id: "push-up",
      name: "Push-up",
      bodyPart: "Upper body",
      type: "reps",
      defaultSets: 3,
      defaultReps: 8,
      defaultRestSeconds: 60,
      difficulty: "normal",
      note: "Keep body straight, lower chest close to floor"
    },
    {
      id: "incline-push-up",
      name: "Incline push-up",
      bodyPart: "Upper body",
      type: "reps",
      defaultSets: 3,
      defaultReps: 10,
      defaultRestSeconds: 45,
      difficulty: "easy",
      note: "Use table or chair if regular push-up is too hard"
    },
    {
      id: "knee-push-up",
      name: "Knee push-up",
      bodyPart: "Upper body",
      type: "reps",
      defaultSets: 3,
      defaultReps: 10,
      defaultRestSeconds: 45,
      difficulty: "easy",
      note: "Easier push-up variation for practicing form"
    },
    {
      id: "pike-push-up",
      name: "Pike push-up",
      bodyPart: "Upper body",
      type: "reps",
      defaultSets: 3,
      defaultReps: 6,
      defaultRestSeconds: 75,
      difficulty: "hard",
      note: "Hips high, shoulder-focused push-up"
    },
    {
      id: "diamond-push-up",
      name: "Diamond push-up",
      bodyPart: "Arms",
      type: "reps",
      defaultSets: 3,
      defaultReps: 6,
      defaultRestSeconds: 75,
      difficulty: "hard",
      note: "Triceps-focused, keep elbows controlled"
    },
    {
      id: "close-grip-push-up",
      name: "Close-grip push-up",
      bodyPart: "Arms",
      type: "reps",
      defaultSets: 3,
      defaultReps: 8,
      defaultRestSeconds: 60,
      difficulty: "normal",
      note: "Hands narrower than shoulders, targets triceps"
    },
    {
      id: "chair-dips",
      name: "Chair dips",
      bodyPart: "Arms",
      type: "reps",
      defaultSets: 3,
      defaultReps: 8,
      defaultRestSeconds: 75,
      difficulty: "normal",
      note: "Requires stable chairs, do not drop shoulders too deep"
    },
    {
      id: "pull-up",
      name: "Pull-up",
      bodyPart: "Back",
      type: "reps",
      defaultSets: 4,
      defaultReps: 3,
      defaultRestSeconds: 120,
      difficulty: "hard",
      note: "Pull chest toward bar, control the descent"
    },
    {
      id: "chin-up",
      name: "Chin-up",
      bodyPart: "Back",
      type: "reps",
      defaultSets: 4,
      defaultReps: 3,
      defaultRestSeconds: 120,
      difficulty: "hard",
      note: "Palms facing you, usually easier than pull-up"
    },
    {
      id: "negative-pull-up",
      name: "Negative pull-up",
      bodyPart: "Back",
      type: "reps",
      defaultSets: 3,
      defaultReps: 5,
      defaultRestSeconds: 90,
      difficulty: "normal",
      note: "Jump to top and lower slowly for 3-5 seconds"
    },
    {
      id: "dead-hang",
      name: "Dead hang",
      bodyPart: "Back",
      type: "time",
      defaultSets: 3,
      defaultSeconds: 20,
      defaultRestSeconds: 60,
      difficulty: "easy",
      note: "Hang relaxed, lightly engage shoulders"
    },
    {
      id: "scapular-pull-up",
      name: "Scapular pull-up",
      bodyPart: "Back",
      type: "reps",
      defaultSets: 3,
      defaultReps: 8,
      defaultRestSeconds: 60,
      difficulty: "normal",
      note: "Keep arms straight, move only shoulder blades"
    },
    {
      id: "bodyweight-squat",
      name: "Bodyweight squat",
      bodyPart: "Legs",
      type: "reps",
      defaultSets: 3,
      defaultReps: 15,
      defaultRestSeconds: 60,
      difficulty: "easy",
      note: "Slow descent, knees track over toes"
    },
    {
      id: "split-squat",
      name: "Split squat",
      bodyPart: "Legs",
      type: "reps",
      defaultSets: 3,
      defaultReps: 8,
      defaultRestSeconds: 75,
      difficulty: "normal",
      note: "8 reps each side, does not need much space"
    },
    {
      id: "reverse-lunge",
      name: "Reverse lunge",
      bodyPart: "Legs",
      type: "reps",
      defaultSets: 3,
      defaultReps: 8,
      defaultRestSeconds: 75,
      difficulty: "normal",
      note: "Step backward, good for small space"
    },
    {
      id: "glute-bridge",
      name: "Glute bridge",
      bodyPart: "Legs",
      type: "reps",
      defaultSets: 3,
      defaultReps: 15,
      defaultRestSeconds: 45,
      difficulty: "easy",
      note: "Squeeze glutes at the top"
    },
    {
      id: "wall-sit",
      name: "Wall sit",
      bodyPart: "Legs",
      type: "time",
      defaultSets: 3,
      defaultSeconds: 30,
      defaultRestSeconds: 60,
      difficulty: "normal",
      note: "Back against wall, thighs near parallel"
    },
    {
      id: "calf-raise",
      name: "Calf raise",
      bodyPart: "Legs",
      type: "reps",
      defaultSets: 3,
      defaultReps: 20,
      defaultRestSeconds: 45,
      difficulty: "easy",
      note: "Hold wall for balance if needed"
    },
    {
      id: "plank",
      name: "Plank",
      bodyPart: "Core",
      type: "time",
      defaultSets: 3,
      defaultSeconds: 30,
      defaultRestSeconds: 45,
      difficulty: "normal",
      note: "Brace core, avoid lower back sagging"
    },
    {
      id: "side-plank",
      name: "Side plank",
      bodyPart: "Core",
      type: "time",
      defaultSets: 3,
      defaultSeconds: 20,
      defaultRestSeconds: 45,
      difficulty: "normal",
      note: "20 seconds each side"
    },
    {
      id: "dead-bug",
      name: "Dead bug",
      bodyPart: "Core",
      type: "reps",
      defaultSets: 3,
      defaultReps: 10,
      defaultRestSeconds: 45,
      difficulty: "easy",
      note: "Keep lower back pressed to floor"
    },
    {
      id: "bird-dog",
      name: "Bird dog",
      bodyPart: "Core",
      type: "reps",
      defaultSets: 3,
      defaultReps: 10,
      defaultRestSeconds: 45,
      difficulty: "easy",
      note: "Move slowly, keep hips stable"
    },
    {
      id: "hollow-hold",
      name: "Hollow hold",
      bodyPart: "Core",
      type: "time",
      defaultSets: 3,
      defaultSeconds: 20,
      defaultRestSeconds: 60,
      difficulty: "hard",
      note: "Keep lower back from arching"
    },
    {
      id: "mountain-climber",
      name: "Mountain climber",
      bodyPart: "Full body",
      type: "time",
      defaultSets: 3,
      defaultSeconds: 30,
      defaultRestSeconds: 45,
      difficulty: "normal",
      note: "Cardio in place, keep core tight"
    },
    {
      id: "high-knees",
      name: "High knees",
      bodyPart: "Full body",
      type: "time",
      defaultSets: 3,
      defaultSeconds: 30,
      defaultRestSeconds: 45,
      difficulty: "normal",
      note: "Run in place with knees high"
    },
    {
      id: "jumping-jacks",
      name: "Jumping jacks",
      bodyPart: "Full body",
      type: "time",
      defaultSets: 3,
      defaultSeconds: 40,
      defaultRestSeconds: 45,
      difficulty: "easy",
      note: "Light cardio, requires arm span"
    },
    {
      id: "burpee-no-push-up",
      name: "Burpee no push-up",
      bodyPart: "Full body",
      type: "reps",
      defaultSets: 3,
      defaultReps: 8,
      defaultRestSeconds: 75,
      difficulty: "hard",
      note: "Easier burpee variation without push-up"
    },
    {
      id: "squat-to-calf-raise",
      name: "Squat to calf raise",
      bodyPart: "Full body",
      type: "reps",
      defaultSets: 3,
      defaultReps: 12,
      defaultRestSeconds: 60,
      difficulty: "normal",
      note: "Squat then rise onto toes"
    },
    {
      id: "step-jack",
      name: "Step jack",
      bodyPart: "Full body",
      type: "time",
      defaultSets: 3,
      defaultSeconds: 40,
      defaultRestSeconds: 30,
      difficulty: "easy",
      note: "Low-impact jumping jack alternative"
    },
    {
      id: "jump-rope-imaginary",
      name: "Jump rope imaginary",
      bodyPart: "Cardio",
      type: "time",
      defaultSets: 4,
      defaultSeconds: 60,
      defaultRestSeconds: 30,
      difficulty: "easy",
      note: "Simulated jump rope without actual rope"
    },
    {
      id: "fast-feet",
      name: "Fast feet",
      bodyPart: "Cardio",
      type: "time",
      defaultSets: 4,
      defaultSeconds: 30,
      defaultRestSeconds: 30,
      difficulty: "easy",
      note: "Very quick small running steps in place"
    },
    {
      id: "skater-step",
      name: "Skater step",
      bodyPart: "Cardio",
      type: "time",
      defaultSets: 4,
      defaultSeconds: 40,
      defaultRestSeconds: 45,
      difficulty: "normal",
      note: "Side-to-side stepping cardio"
    },
    {
      id: "shadow-boxing",
      name: "Shadow boxing",
      bodyPart: "Cardio",
      type: "time",
      defaultSets: 4,
      defaultSeconds: 60,
      defaultRestSeconds: 30,
      difficulty: "easy",
      note: "Light boxing combinations for cardio"
    },
    {
      id: "burpee",
      name: "Burpee",
      bodyPart: "Cardio",
      type: "reps",
      defaultSets: 4,
      defaultReps: 10,
      defaultRestSeconds: 90,
      difficulty: "hard",
      note: "High intensity full body cardio"
    },
    {
      id: "half-burpee",
      name: "Half burpee",
      bodyPart: "Cardio",
      type: "reps",
      defaultSets: 4,
      defaultReps: 12,
      defaultRestSeconds: 60,
      difficulty: "normal",
      note: "Burpee variation without push-up"
    },
    {
      id: "squat-pulse",
      name: "Squat pulse",
      bodyPart: "Cardio",
      type: "time",
      defaultSets: 3,
      defaultSeconds: 40,
      defaultRestSeconds: 45,
      difficulty: "normal",
      note: "Continuous squat pulse movement"
    },
    {
      id: "jump-squat",
      name: "Jump squat",
      bodyPart: "Cardio",
      type: "reps",
      defaultSets: 4,
      defaultReps: 10,
      defaultRestSeconds: 75,
      difficulty: "hard",
      note: "Explosive squat jumps, land softly"
    },
    {
      id: "lateral-shuffle",
      name: "Lateral shuffle",
      bodyPart: "Cardio",
      type: "time",
      defaultSets: 4,
      defaultSeconds: 30,
      defaultRestSeconds: 30,
      difficulty: "normal",
      note: "Quick side shuffle in small space"
    },
    {
      id: "bear-crawl-hold",
      name: "Bear crawl hold",
      bodyPart: "Cardio",
      type: "time",
      defaultSets: 3,
      defaultSeconds: 30,
      defaultRestSeconds: 45,
      difficulty: "normal",
      note: "Static bear crawl hold"
    },
    {
      id: "bear-crawl-steps",
      name: "Bear crawl steps",
      bodyPart: "Cardio",
      type: "time",
      defaultSets: 3,
      defaultSeconds: 30,
      defaultRestSeconds: 45,
      difficulty: "hard",
      note: "Small forward/backward crawl"
    },
    {
      id: "plank-jack",
      name: "Plank jack",
      bodyPart: "Cardio",
      type: "time",
      defaultSets: 3,
      defaultSeconds: 30,
      defaultRestSeconds: 45,
      difficulty: "normal",
      note: "Plank with jumping feet"
    },
    {
      id: "toe-taps",
      name: "Toe taps",
      bodyPart: "Cardio",
      type: "time",
      defaultSets: 4,
      defaultSeconds: 45,
      defaultRestSeconds: 30,
      difficulty: "easy",
      note: "Rapid alternating toe taps"
    },
    {
      id: "step-up-on-chair",
      name: "Step-up on chair",
      bodyPart: "Cardio",
      type: "reps",
      defaultSets: 3,
      defaultReps: 12,
      defaultRestSeconds: 60,
      difficulty: "normal",
      note: "Requires stable chair"
    },
    {
      id: "sprint-in-place",
      name: "Sprint in place",
      bodyPart: "Cardio",
      type: "time",
      defaultSets: 5,
      defaultSeconds: 20,
      defaultRestSeconds: 40,
      difficulty: "hard",
      note: "Max effort running in place"
    },
    {
      id: "tabata-mountain-climber",
      name: "Tabata mountain climber",
      bodyPart: "Cardio",
      type: "time",
      defaultSets: 8,
      defaultSeconds: 20,
      defaultRestSeconds: 10,
      difficulty: "hard",
      note: "Tabata style intervals"
    }
  ];

  window.WorkoutSeed = {
    bodyParts: BODY_PARTS,
    exercises: EXERCISES
  };
})();
