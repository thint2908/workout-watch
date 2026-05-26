# Workout Watch

A GitHub Pages friendly calisthenics workout tracker built with HTML, CSS, and vanilla JavaScript. It uses Supabase Auth and Row Level Security so only the configured owner account can read or write workout data.

## Features

- Beginner exercise library grouped by body part.
- Workout builder with editable sets, reps or seconds, and rest time.
- Intelligent default rest suggestions:
  - Easy, accessory, and core work: 30-45 seconds.
  - Normal strength work: 60-90 seconds.
  - Hard compound movements: 90-120 seconds.
- Workout timer with elapsed time, set timer, rest countdown, skip rest, and manual workout finish.
- Workout logs with expandable session details.
- Exercise statistics and weekly summary.
- Supabase cloud persistence using the public anon key plus authenticated RLS.
- Magic-link sign-in restricted to the configured owner email.
- Offline/local mode fallback after the owner is signed in.
- Active workout restore after page refresh.
- JSON export and import for backups.
- Reset demo data button.

## Files

- `index.html` - static page structure.
- `style.css` - mobile-first dark UI.
- `seed.js` - seeded body parts and exercises.
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

In Supabase, create or invite the owner user for that email. After your first successful sign-in, disable public signups in Supabase Auth settings if you do not want anyone else creating auth accounts. RLS will still block non-owner accounts from the workout tables.

## Running Locally

Open `index.html` directly in a browser.

The app also works from a static server, for example:

```sh
python -m http.server 8000
```

Then visit `http://localhost:8000`.

## GitHub Pages

Push these files to a GitHub repository and enable GitHub Pages for the branch that contains `index.html`. No build step is required.

## Data

Workout data is saved to Supabase after the owner signs in. If Supabase cannot be reached after sign-in, the app shows **Offline/local mode** and temporarily uses localStorage in the current browser profile. Use **Export JSON** for backups.
