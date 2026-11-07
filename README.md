# Combat Culture — Guess the Fighter

A five-guess daily challenge featuring Muay Thai, boxing, kickboxing and MMA fighters. The game supports easy/medium/hard levels, fuzzy name search, nicknames and progressive clues.

**Game:** https://combatculture-alby.github.io/combat-culture-guess-the-fighter/ (available after GitHub Pages is enabled)

## One-time publishing setup

1. In this repository, open **Settings → Pages**.
2. Under **Build and deployment**, choose **Deploy from a branch**.
3. Select **main** and **/(root)**, then **Save**.
4. Check the game URL above after GitHub finishes deploying.

To embed in a WordPress **Custom HTML** block:

```html
<iframe title="Guess the Fighter — Combat Culture" src="https://combatculture-alby.github.io/combat-culture-guess-the-fighter/" width="100%" height="1100" loading="lazy" style="border:0;max-width:100%;background:#101215"></iframe>
```

## One-time Google Sheets automatic sync

The private [master fighter spreadsheet](https://docs.google.com/spreadsheets/d/1lH5AXjZkJD1m6Qddx-awPigFeL_-us_VcVLrByYwjuo/edit) stays the source of truth. The public game feed returns **only** seven permitted columns from the four fighter tabs. It does not expose your private Google Sheet file or give anyone edit access.

1. The Apps Script feed is deployed by the master spreadsheet owner. It returns the four game tabs and seven fighter columns only.
2. The public feed URL is configured in [the refresh workflow](.github/workflows/sync-fighters.yml). No GitHub secret is required for this public, read-only endpoint.
3. [GitHub Actions](https://github.com/combatculture-alby/combat-culture-guess-the-fighter/actions/workflows/sync-fighters.yml) synchronizes the roster every three hours and when the workflow is manually run.
4. Future Apps Script deployments can be connected by updating the `FIGHTER_FEED_URL` value in the refresh workflow.

Do not publish the entire master workbook to the web; the Apps Script is a narrower read-only data feed. Only enable the Web App's public access if you're comfortable making the game's fighter names, nicknames, styles, etc. visible to anyone.

## How updates work

- Spreadsheet edits get imported into [`data/fighters.json`](data/fighters.json), validated, and committed by GitHub Actions.
- Existing scheduled daily answers are kept unchanged when the roster changes, so puzzles don't switch partway through the day. New fighters become eligible as new days are scheduled.
- Source files and HTML live here in GitHub, and GitHub Pages publishes changes automatically.
- The game shows a friendly reload message if the JSON data cannot be fetched; the previously published data remains intact if a feed sync fails.

## File structure

- `index.html`: browser game interface and logic.
- `data/fighters.json`: generated game roster.
- `data/daily-picks.json`: locked picks by date, sport and difficulty.
- `scripts/sync_fighters.py`: roster validation and daily-pick scheduler.
- `.github/workflows/sync-fighters.yml`: scheduled background updates.
- `apps-script/Code.gs`: read-only Google Sheets feed for the workflow.

**Publishing note:** GitHub Pages must be enabled once in repo settings. Automatic roster sync also needs the Apps Script Web App URL configured once. Neither step is enabled simply by adding files here.