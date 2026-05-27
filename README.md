# Workout Watch

A GitHub Pages friendly calisthenics workout tracker built with HTML, CSS, and vanilla JavaScript. It uses Supabase Auth and Row Level Security so only the configured owner account can read or write workout data.

## Features

- Default home calisthenics exercise library with 29 upper body, arms, back, core, legs, and full-body movements.
- Workout builder with editable sets, reps or seconds, and rest time.
- Active workout editing: add more exercises, adjust pending targets, remove unfinished exercises, and reorder the active plan without restarting the session.
- Intelligent default rest suggestions:
  - Easy, accessory, and core work: 30-45 seconds.
  - Normal strength work: 60-90 seconds.
  - Hard compound movements: 90-120 seconds.
- Workout timer with elapsed time, set timer, rest countdown, skip rest, timed-set auto-finish, and manual workout finish.
- Workout logs with expandable session details.
- Exercise statistics and weekly summary.
- Supabase cloud persistence using the public anon key plus authenticated RLS.
- Password sign-in restricted to the configured owner email.
- Offline/local mode fallback after the owner is signed in.
- Active workout restore after page refresh.
- JSON export and import for backups.
- Reset demo data button.

## Files

- `index.html` - static page structure.
- `style.css` - mobile-first dark UI.
- `seed.js` - seeded body parts and the default home calisthenics exercise library.
- `config.js` - local Supabase URL and public anon key.
- `config.example.js` - config template.
- `supabaseClient.js` - Supabase REST client with localStorage fallback.
- `app.js` - workout builder, timer, logs, stats, import/export.
- `schema.sql` - tables and owner-only authenticated RLS policies.
- `.gitignore` - ignores local secret files such as `.env`.
- `README.md` - project notes.

## Supabase Setup

1. Open your Supabase project SQL editor.
2. Run `schema.sql`.
3. Copy the project's public anon key.
4. Put it in `config.js` with your owner email:

```js
window.WorkoutConfig = {
  SUPABASE_URL: "https://bnhjttnbmjaukjjtwyoi.supabase.co",
  SUPABASE_ANON_KEY: "your-public-anon-key",
  ALLOWED_EMAIL: "you@example.com"
};
```

Do not put a `service_role` key in this app. Frontend code must only use the public anon key. The anon key is visible in every static frontend app; Supabase Auth and RLS are what protect the data.

## Locking It To One User

`schema.sql` currently allows only `thint2908@gmail.com`. If you change owner accounts, update both:

- `ALLOWED_EMAIL` in `config.js`.
- The email inside `public.is_allowed_owner()` in `schema.sql`.

In Supabase Auth, create the owner user for that email and set a password. Then disable public signups in Supabase Auth settings. RLS will still block non-owner accounts from the workout tables.

The password is never stored in this repository. The app sends it directly to Supabase Auth, receives a user session, and uses that session for database requests.

## Running Locally

Open `index.html` directly in a browser.

The app also works from a static server, for example:

```sh
python -m http.server 8000
```

Then visit `http://localhost:8000`.

## Workout Flow

Use **Builder** to select exercises and set target sets, reps or seconds, and rest. If no workout is active, **Start Workout** creates one session and opens the timer. If a workout is already active, the button changes to **Add to Current Workout**; selected exercises that are not already in the active plan are appended without resetting the current exercise, set, timer, or saved logs.

The timer page includes an active plan editor. Each row shows its order, completed sets, target sets, target reps or seconds, and rest. Use **Up** and **Down** to reorder exercises before or during the workout. Use **Edit** to change pending targets. If an exercise already has completed sets, those logs are preserved; target sets cannot be reduced below the completed set count. Use **Remove** for unfinished exercises. Fully completed exercises cannot be removed from the active plan.

Timed and reps exercises behave differently:

- **Timed exercises** start a countdown from the target seconds. When the countdown reaches zero, the set is saved automatically with `actual_duration_seconds` equal to the target, rest starts automatically, and after rest the next timed set starts automatically. You can still finish early; the elapsed time is saved.
- **Reps exercises** start a stopwatch. You manually finish the set, enter actual reps, and then rest starts automatically. After rest, the next reps set is prepared but not auto-started.

Active workout state is saved to localStorage after workout changes, including starting, adding, removing, reordering, starting or finishing sets, rest changes, and finishing the workout. Refreshing the page restores the active session, plan order, current exercise, current set, elapsed time, timer mode, rest countdown, and completed set logs.

## GitHub Pages

Push these files to a GitHub repository and enable GitHub Pages for the branch that contains `index.html`. No build step is required.

## Data

Workout data is saved to Supabase after the owner signs in. If Supabase cannot be reached after sign-in, the app shows **Offline/local mode** and temporarily uses localStorage in the current browser profile. Use **Export JSON** for backups.
