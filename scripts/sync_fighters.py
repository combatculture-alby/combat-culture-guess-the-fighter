#!/usr/bin/env python3
"""Refresh public Guess the Fighter data from the approved Apps Script read-only feed."""
import datetime as dt
import json
import os
from pathlib import Path
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
SPORTS = ("Muay Thai", "Boxing", "Kickboxing", "MMA")
MODES = SPORTS + ("Expert (All Sports)",)
LEVELS = ("Easy", "Medium", "Hard")
FIELDS = ("name", "country", "style", "stance", "era", "difficulty", "sport", "nickname", "funFact", "sourceUrl")


def fnv32(text):
    h = 2166136261
    for char in text:
        h = ((h ^ ord(char)) * 16777619) & 0xFFFFFFFF
    return h


def get_fighters(url):
    if not url.startswith("https://"):
        raise ValueError("Feed must be an HTTPS URL")
    req = Request(url, headers={"User-Agent": "CombatCultureGuessTheFighter/1.0"})
    with urlopen(req, timeout=45) as response:
        blob = response.read(2_000_001)
    if len(blob) > 2_000_000:
        raise ValueError("Feed is unexpectedly large")
    payload = json.loads(blob)
    rows = payload.get("fighters") if isinstance(payload, dict) else payload
    if not isinstance(rows, list) or len(rows) < 100:
        raise ValueError("Feed is missing most of the roster; keeping old version")
    out, seen = [], set()
    for row in rows:
        if not isinstance(row, dict):
            raise ValueError("Invalid fighter row")
        fighter = {field: str(row.get(field) or "").strip() for field in FIELDS}
        if not all(fighter[k] for k in ("name", "country", "style", "era", "difficulty")):
            raise ValueError("Missing required fighter values: " + repr(fighter))
        if fighter["sport"] not in SPORTS or fighter["difficulty"] not in LEVELS:
            raise ValueError("Unknown sport or difficulty: " + repr(fighter))
        key = (fighter["sport"], fighter["name"].casefold())
        if key in seen:
            raise ValueError("Duplicate fighter: " + repr(key))
        seen.add(key)
        out.append(fighter)
    if set(row["sport"] for row in out) != set(SPORTS):
        raise ValueError("Not all four sports were returned")
    for mode in MODES:
        for level in LEVELS:
            if not any(f["difficulty"] == level and (mode == "Expert (All Sports)" or f["sport"] == mode) for f in out):
                raise ValueError("No fighters for " + mode + " " + level)
    return out


def pick_schedule(roster, old):
    # Maintain existing entries, including the current day, even when rows are added.
    today = dt.datetime.now(dt.timezone.utc).date()
    result = {k: v for k, v in old.items() if k >= (today - dt.timedelta(days=40)).isoformat() and isinstance(v, dict)}
    for offset in (-2, -1, 0, 1, 2):
        day = (today + dt.timedelta(days=offset)).isoformat()
        values = result.setdefault(day, {})
        for mode in MODES:
            for level in LEVELS:
                key = mode + "::" + level
                if key in values:
                    continue
                candidates = [f for f in roster if f["difficulty"] == level and (mode == "Expert (All Sports)" or f["sport"] == mode)]
                # Avoid recently used answers in the same mode and level.
                # Never alter previously scheduled answers, including today's.
                recent = set()
                for back in range(1, 15):
                    previous = (dt.date.fromisoformat(day) - dt.timedelta(days=back)).isoformat()
                    prior = result.get(previous, {}).get(key)
                    if prior:
                        recent.add(prior)
                eligible = [f for f in candidates if f["sport"] + "::" + f["name"] not in recent]
                if not eligible:
                    eligible = candidates
                chosen = eligible[fnv32("combatculture-v4|" + day + "|" + mode + "|" + level) % len(eligible)]
                values[key] = chosen["sport"] + "::" + chosen["name"]
    return result


def write_if_changed(path, data):
    serialized = json.dumps(data, ensure_ascii=False, indent=2) + "\n"
    if path.exists() and path.read_text(encoding="utf-8") == serialized:
        return False
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(serialized, encoding="utf-8")
    return True


def main():
    feed = os.environ.get("FIGHTER_FEED_URL", "").strip()
    if not feed:
        raise RuntimeError("Configure the FIGHTER_FEED_URL GitHub Actions secret first")
    fighters = get_fighters(feed)
    picks_path = ROOT / "data" / "daily-picks.json"
    existing = json.loads(picks_path.read_text(encoding="utf-8")) if picks_path.exists() else {}
    picks = pick_schedule(fighters, existing)
    changed_roster = write_if_changed(ROOT / "data" / "fighters.json", fighters)
    changed_picks = write_if_changed(picks_path, picks)
    print(f"Validated {len(fighters)} fighters. Roster changed: {changed_roster}. Daily picks changed: {changed_picks}.")


if __name__ == "__main__":
    main()
