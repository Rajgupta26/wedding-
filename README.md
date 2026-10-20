# Wedding invitation website

A single-page invitation whose opening recreates the reference video frame by frame, driven by scroll.

## View it

Run a local server from this folder, then open http://localhost:5173 (best at phone width):

```bash
python3 -m http.server 5173
```

Opening `index.html` directly also works. Fonts load from Google Fonts, so you need an internet connection.

Add `?to=Guest%20Name` to the URL to personalise the "Dear …" line on the curtains.

## Edit the content

Everything shown on the invitation is in `js/config.js`: names, parents, date, events, venues, map links, story, hashtag and closing note. The intro title (`The Wedding of / Bride & Groom`) reads the short names from the same file.

## How the intro works

- `assets/intro/*.webp` holds 89 frames from the first 5.5 s of the video (curtains part, then the mandap builds up). They're sampled densely where motion is fast and blended in between, so the original timing is preserved.
- `assets/scene-loop.mp4` is the rest of the video with the baked-in title removed. It's a seamless 8.8 s ambient loop (swaying florals, butterflies).
- The title is live HTML text (Great Vibes + EB Garamond), positioned to match the original frame. Its letters blur in one by one in random order, as in the video.
- **Open Invitation** plays the reveal at the video's own pace. Scrolling scrubs it forwards and backwards.

## Rebuild the assets (optional)

The scripts in `tools/` need Python with `opencv-python` and an ffmpeg binary.

```bash
python3 tools/extract_all.py /path/to/video.mp4 /tmp/frames
python3 tools/build_assets.py /tmp/frames . /path/to/ffmpeg
python3 tools/flowers.py assets/card-bg.jpg /tmp/card && python3 tools/flowers2.py assets/card-bg.jpg /tmp/card
```

`flowers*.py` split the card background (`assets/card-bg.jpg`) into a flower-free card and two pearl-flower cut-outs. Copy `card-clean.jpg`, `flower-tl.webp` and `flower-br.webp` from `/tmp/card` into `assets/`.
