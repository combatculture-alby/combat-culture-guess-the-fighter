# Combat Culture Glove Finder — launch notes

## Hosted quiz
https://combatculture-alby.github.io/combat-culture-guess-the-fighter/glove-finder/

The quiz is a standalone HTML page in this repository. It is not yet automatically synced to Google Sheets. Current data is a manually refreshed snapshot of 51 owner-approved and owner-rated gloves. It asks seven questions and can present up to four options: up to three competitive in-budget picks, with optional lower-cost or stretch alternatives when space and quality allow. An unlimited budget has no stretch pick.

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
Source of truth: https://docs.google.com/spreadsheets/d/1-H28Qmx2oOZOmeHeFzHbaELldi5wNo07SV2nCeiiem4/edit#gid=126113403

**Only edit the visible `Gloves Master` tab.** It contains all 152 records, with 51 quiz-approved gloves at the top. Columns A-C are brand, model, and quiz approval; D-J are owner-rated 1–3 Protection, Comfort, Build Quality, Wrist Support, Feedback, Versatility, and Value; K-M are the 1–3 Compactness, Muay Thai Clinch Mobility, and MMA Grappling Mobility ratings; N is the six-quality completion indicator. Columns O-AU retain the review, fit, usage, material, price, and source data. `Best Use` is column Q, `Hand Fit` is column S, `Glove Style` is T, `Material` is U, `Quiz Online USD Price` is AG, and `Suitable Uses` is AU. Historical 1–5 scores in X-AB remain hidden to avoid confusion with the new scoring scale.

The previous `Rate Gloves (1-3)`, `Sheet1`, `Gloves I own`, and community research tabs are hidden backups, **not sources for new quiz syncs**. A snapshot called `Backup - master before extra ratings` also preserves the exact former categorical fields. The quiz is still refreshed manually, not from a live spreadsheet feed. Do not fill unknown values; retail price and other optional attributes remain unverified until the owner confirms them.


## Scoring (owner-rated, 1-3 scale)
**1 = Bad, 2 = Fine, 3 = Good. Blank means unverified, never an invented 2.** A 2 contributes zero; a 1 subtracts its weight; a 3 adds its weight. Protection and Build Quality require owner ratings before a model can enter the shortlist.

| Attribute | Sparring | Bag & Pads | All-Around | Cardio |
| --- | ---: | ---: | ---: | ---: |
| Protection | 4 | 1 | 3 | 1 |
| Build Quality | 3 | 3 | 3 | 2 |
| Comfort | 2 | 2 | 2 | 3 |
| Wrist Support | 1 | 1 | 1 | 1 |
| Feedback | 1 | 4 | 2 | 1 |
| Versatility | 1 | 1 | 3 | 1 |
| Value | 1 | 1 | 1 | 4 |

For $300+ / no limit, Value has no baseline weight unless specifically selected. Each selected rated priority adds 4 to that category's weight. MMA sparring uses purpose-built gloves and its own grappling-mobility rating; Muay Thai clinch scores are separate. Fitness/cardio bag work has a $200 ceiling even when a higher budget is selected. Boxing, Muay Thai and kickboxing have no brand/sport bonuses.

Use, price, style, material and glove type are eligibility requirements; explicit style and material preferences are never overridden. Suitable Uses can authorize a model for both sparring and bag/pad work even when Best Use says Sparring; the field must be personally verified. A sparring glove rated 1 for Protection is ineligible for sparring. With an explicit fit preference: exact +3, reasonably compatible +1, incompatible -3. No editorial, brand or premium-budget bonuses.



### Additional ratings and sport-specific scoring
Compactness, Muay Thai clinch, and MMA grappling use the same scale: **1 = Bad/Restricted, 2 = Okay/Unknown (neutral), 3 = Good**. A blank is unrated and does not create an artificial average.

- **Compactness (K):** Bulky = 1, Standard = 2, Compact = 3. A minor baseline factor for any sport; user priority adds 4 weight.
- **Clinch Mobility (L): Muay Thai ONLY.** Counts for Muay Thai sparring and all-around training (weight 3; +4 if selected as a priority). It does not affect boxing, kickboxing, fitness/cardio, MMA, or Muay Thai bag/pads-only.
- **MMA Grappling Mobility (M): MMA sparring ONLY.** Distinct from Muay Thai clinching. Small default MMA sparring weight 2; +8 when Grappling Mobility is selected as a priority. The three firsthand MMA assessments were moved here from the old Clinch Mobility field.
- **Availability removed.** Geo-specific inventory cannot be assessed consistently. Neither the master ratings tab nor the quiz scoring includes an Availability field. Previous values are preserved in the hidden `Backup - before discipline scoring` tab.

`Muay Thai Clinch Mobility` is offered only on the Muay Thai sparring/all-around priorities question. `Grappling Mobility` remains an MMA-specific choice. No sport-specific rules are applied to other combat sports.

## Refreshing the live quiz
The live quiz is **not automatically synced to Google Sheets**. Its index.html includes a snapshot of approved models with embedded ratings fields and, when verified, suitableUses. After editing **Gloves Master** (not the hidden backup tabs), synchronize the approved rows and 1–3 ratings into the website snapshot, preserving IDs and verified eligibility fields, then run node glove-finder/qa.js. Do not fill in unknown ratings, style, material, weight or use merely to create more recommendations. The quiz is published from the repository's main branch with GitHub Pages.

### Cleto Reyes Traditional Laces
The owner reviewed 16 oz, Normal fit, Mexican style, Genuine Leather, Best Use: Sparring, Suitable Uses: Sparring and Bag & Pads. Cleto Reyes USA's exact Traditional Training Gloves listing was USD 269 on 2026-11-08: https://cletoreyesboxing.com/product/cleto-reyes-traditional-training-gloves/

## QA
Run `node glove-finder/qa.js` after modifying the quiz. It checks approved ratings, UI syntax, all 28,800 answer permutations, budget limits, training safety, score neutrality, Cleto Reyes suitability, and completing the quiz twice with Start Over.

## Launch checklist
- Open the GitHub Pages link on iPhone and desktop.
- Complete all seven questions and verify results render, then press Start Over and complete all seven again.
- Check a cardio-boxing scenario, a sparring scenario, and a high-budget bag-work scenario.
- Verify the WordPress page's button or iframe.
- Check the published page's mobile appearance.
- Refresh data manually from Google Sheets after future edits.
