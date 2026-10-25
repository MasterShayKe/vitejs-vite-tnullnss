# Touchline Manager

A browser football-management game in the spirit of the classic desktop managers. Pick a club in a
20-team league, follow its fixture list across a 38-round season, and run the team from the dugout.

- **Squad** – 23 players per club with nine 1–20 attributes, condition, morale, form and season stats.
- **Tactics** – six formations, a tap-to-assign pitch, mentality, width, tempo and pressing.
- **Set pieces** – corner, free-kick and penalty takers, a target man, corner and free-kick routines,
  zonal or man marking. All of it feeds the match engine.
- **Training** – weekly focus and intensity. Young players grow, veterans decline, heavy weeks risk injury.
- **Match day** – minute-by-minute commentary, live stats, mentality changes from the touchline.
- **Rival mode** – a second person sets the opposition's tactics and set pieces before every match on
  the same device. With it off, the AI manages every other club.
- **Seasons** – league table, top scorers, news inbox, end-of-season awards, then ageing, retirements,
  youth intake and a fresh fixture list. The save lives in the browser.

## Run it

```bash
npm install
npm run dev
```

```bash
npm run build    # type-check and build to dist/
npm run preview  # serve the production build
```

## Layout

| Path | What's in it |
| --- | --- |
| `src/game/match.ts` | Minute-by-minute match engine, including set-piece resolution |
| `src/game/season.ts` | Training, weekly flow, league table, season rollover |
| `src/game/generate.ts` | World generation: squads and fixtures |
| `src/game/ai.ts` | Lineup picking and AI mentality |
| `src/ui/` | Screens: setup, home, squad, tactics, set pieces, training, fixtures, league, match |
