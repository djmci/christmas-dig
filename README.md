# Christmas Dig

A Red Ant web toy. Draw a message in the dirt, release the ants, and they dig it out stroke by stroke. Share the link and whoever opens it watches the colony dig up your message over a little pixel-art farm.

## How it works

There is no backend. Your message is the link:

- Strokes are normalized to a 0-1023 grid over the dirt, simplified with Ramer-Douglas-Peucker, packed into bytes, deflate-compressed, and base64url-encoded into the URL hash (`#d=...`).
- The link also stores the aspect ratio of the dirt it was drawn in, so a message drawn on a wide screen still has the right proportions on a phone.
- The dig replay uses your recorded stroke timing, eased into a fixed range so quick scribbles still get a proper dig.

## Running it

It's plain HTML and ES modules with no build step. Serve the directory statically:

```
python3 -m http.server 8000
```

Deploys to Render as a static site (see `render.yaml`).

## URL parameters

- `#d=...` a shared dig message
- `?play` auto-release the ants when opening a shared dig
- `?digto=<seconds>` start the dig partway through
- `?dayt=<hours>` offset the farm's day/night cycle
- `?probe` put dig timing in the document title for debugging

## Layout

- `src/main.js` state machine (draw, share, watch, digging, done) and render loop
- `src/scene.js` the dirt, buried secrets, and scene dimensions (portrait screens get a taller scene with the farm cropped to its left two thirds)
- `src/farm.js` the procedural pixel-art farm strip, animated per frame
- `src/geom.js` path math: smoothing, dig route, timing
- `src/codec.js` packing strokes into the URL hash and back
- `src/letters.js` the "ant farm" attract-mode lettering and a pixel font
- `src/ants.js`, `src/sprites.js` critters and pixel sprites
