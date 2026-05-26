# Workout Watch

A GitHub Pages friendly calisthenics workout tracker built with HTML, CSS, and vanilla JavaScript. It uses Supabase as the cloud database and falls back to localStorage when Supabase is unavailable.

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
- Supabase cloud persistence using the public anon key.
- Offline/local mode fallback using localStorage.
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
- `schema.sql` - tables and simple public RLS policies.
- `README.md` - project notes.

## Supabase Setup

1. Open your Supabase project SQL editor.
2. Run `schema.sql`.
3. Copy the project's public anon key.
4. Put it in `config.js`:

```js
window.WorkoutConfig = {
  SUPABASE_URL: "https://bnhjttnbmjaukjjtwyoi.supabase.co",
  SUPABASE_ANON_KEY: "your-public-anon-key"
};
```

Do not put a `service_role` key in this app. Frontend code must only use the public anon key.

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

Workout data is saved to Supabase when configured. If Supabase cannot be reached, the app shows **Offline/local mode** and temporarily uses localStorage in the current browser profile. Use **Export JSON** for backups.
