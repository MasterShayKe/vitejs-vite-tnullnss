# Twister Card

A single-card Twister caller: tap the card and it draws a random limb (right hand, left hand,
right foot, left foot) and a random colour (red, yellow, blue, green). The card takes on the
colour it drew, so it doubles as the call-out sign.

- Tap the card or press space for the next move
- The same limb/colour pair never comes up twice in a row

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
| `src/game.ts` | Colours, limbs, and the random draw |
| `src/App.tsx` | The card and its input handling |
| `src/index.css` | Styles |
