# Twister Spinner

A small React + TypeScript app that replaces the cardboard Twister spinner: it calls out a
limb (right hand, left hand, right foot, left foot) and a colour (red, yellow, blue, green),
tracks whose turn it is, and shows the mat row you need to reach for.

## Features

- 16-wedge spinner wheel (4 limbs × 4 colours) with an animated needle
- Big call-out of the result, optionally spoken aloud via the browser's speech synthesis
- Turn order for 1–8 players with editable names
- Mat view that highlights the called colour row
- History of the last 8 calls, plus reset
- Spin with the button, the wheel hub, or the space bar

## Run it

```bash
npm install
npm run dev
```

Then open the URL Vite prints (default http://localhost:5173).

```bash
npm run build    # type-check and build to dist/
npm run preview  # serve the production build
```

## Layout

| Path | What's in it |
| --- | --- |
| `src/game.ts` | Colours, limbs, wedge geometry, and the random spin logic |
| `src/components/Spinner.tsx` | The SVG wheel and needle |
| `src/components/Mat.tsx` | The 4×6 mat with the active colour highlighted |
| `src/App.tsx` | Game state: players, turns, history, announcements |
