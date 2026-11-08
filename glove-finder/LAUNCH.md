# Combat Culture Glove Finder — launch notes

## Hosted quiz
https://combatculture-alby.github.io/combat-culture-guess-the-fighter/glove-finder/

The quiz is a standalone HTML page in this repository. It is not yet automatically synced to Google Sheets. Current data is a manually refreshed snapshot of 47 approved gloves. It asks seven questions and can present up to four options: two in-budget picks, an optional stretch pick, and an under-budget alternative. An unlimited budget has no stretch pick.

## WordPress / Kadence: quickest launch
1. In WordPress, create a page titled **Boxing & Muay Thai Glove Finder**, suggested slug `glove-finder`.
2. Add a brief introduction and a button with the text **Find Your Gloves**.
3. Set the button URL to the hosted quiz above, and publish the page.
4. Link the new page from the Gear Guides or Community section of Combat Culture.

This is the most reliable mobile launch method because it avoids iframe sizing issues.

## Optional inline embed
Add a **Custom HTML** block and paste:

```html
<div style="width:100%;max-width:1100px;margin:0 auto">
  <iframe
    title="Combat Culture Boxing and Muay Thai Glove Finder"
    src="https://combatculture-alby.github.io/combat-culture-guess-the-fighter/glove-finder/"
    loading="lazy"
    style="width:100%;height:1650px;border:0;display:block"
  ></iframe>
  <p><a href="https://combatculture-alby.github.io/combat-culture-guess-the-fighter/glove-finder/">Open the Glove Finder in a new tab</a></p>
</div>
```

Preview the published WordPress page on desktop and phone. An iframe with fixed height can create an inner scrollbar or excess whitespace; use the linked-page method if this happens.

## Database
Source: https://docs.google.com/spreadsheets/d/1-H28Qmx2oOZOmeHeFzHbaELldi5wNo07SV2nCeiiem4/edit

The first 21 columns are the core database. Optional classification columns include Secondary Strength, Availability, Secondary Weakness, Third Strength and Third Weakness. Empty optional fields are treated as unknown and never guessed. Region-specific availability is not yet verified; do not advertise region-based recommendations.

## QA
Run `node glove-finder/qa.js` after modifying the quiz. It checks data count, UI script syntax, all 23,040 answer permutations, four-pick budget restrictions, Muay Thai editorial recommendations, and completing the quiz twice with Start Over.

## Launch checklist
- Open the GitHub Pages link on iPhone and desktop.
- Complete all seven questions and verify results render, then press Start Over and complete all seven again.
- Check a cardio-boxing scenario, a sparring scenario, and a high-budget bag-work scenario.
- Verify the WordPress page's button or iframe.
- Check the published page's mobile appearance.
- Refresh data manually from Google Sheets after future edits.
