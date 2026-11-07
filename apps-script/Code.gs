/** Public read-only roster feed for Guess the Fighter.
 * This exposes only the four game tabs and seven game columns, not the full master spreadsheet.
 * Deploy as Web App: execute as Me; access Anyone.
 */
function doGet() {
  const workbook = SpreadsheetApp.openById('1lH5AXjZkJD1m6Qddx-awPigFeL_-us_VcVLrByYwjuo');
  const sports = ['Muay Thai', 'Boxing', 'Kickboxing', 'MMA'];
  const fighters = [];
  for (const sport of sports) {
    const sheet = workbook.getSheetByName(sport);
    if (!sheet) throw new Error('Missing tab: ' + sport);
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) throw new Error('No fighters in: ' + sport);
    const values = sheet.getRange(2, 1, lastRow - 1, 7).getDisplayValues();
    for (const row of values) {
      if (!row[0] || !row[0].trim()) continue;
      fighters.push({
        name: row[0].trim(),
        country: row[1].trim(),
        style: row[2].trim(),
        stance: row[3].trim(),
        era: row[4].trim(),
        difficulty: row[5].trim(),
        sport: sport,
        nickname: row[6].trim()
      });
    }
  }
  return ContentService.createTextOutput(JSON.stringify({fighters: fighters}))
    .setMimeType(ContentService.MimeType.JSON);
}
