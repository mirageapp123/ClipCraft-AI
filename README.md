# ClipCraft AI — Browser AI Video Editor

[![Live App](https://img.shields.io/badge/Live_App-ClipCraft_AI-35ead9?style=flat-square)](https://clip-craft-ai-weld.vercel.app)
[![MIT License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](CONTRIBUTING.md)

ClipCraft AI is a local-first AI video editor that runs in the browser. It combines a multi-track timeline with AI voiceovers, automatic captions, AI music, smart framing, talking avatars, visual effects, and deterministic video export — without uploading your project media to an editing server.

- **Live application:** <https://clip-craft-ai-weld.vercel.app>
- **Source code:** <https://github.com/mirageapp123/ClipCraft-AI>

ClipCraft AI is an independent application built on the MIT-licensed Timeline Studio codebase. See [License and attribution](#license-and-attribution).

## What ClipCraft AI does

ClipCraft AI is a complete editing workspace, not a one-click generator. You can import media, arrange it on a multi-track timeline, generate a voiceover, add automatic or manual captions, apply effects and keyframes, mix audio, and export the finished video — all inside a modern browser.

Core editing is local-first: playback uses native browser media, and export uses a separate deterministic rendering path so the exported result matches the preview.

## Features

### Editing and timeline

- Contiguous main Visuals track plus timed picture-in-picture overlays.
- Captions, stickers, voiceover, separated source audio, and music on independent timed tracks.
- Direct canvas selection, movement, proportional resize, rotation, masks, filters, effects, animation, speed, and explicit keyframes.
- Desktop color grading with keyframeable temperature, tint, saturation, hue, wheel saturation, and luminance.
- CapCut-style snapping, alignment guides, clip menus, split/duplicate/delete, timeline zoom, undo/redo, and portable `.timeline` projects.
- Desktop and touch-first mobile layouts.

### Audio and voice

- Multilingual text-to-speech voiceovers with multiple built-in voices.
- Record your own voice, import audio from your computer, or use generated voiceover clips on the timeline.
- AI vocal separation: isolate vocals and place the instrumental on the music track.
- Per-clip volume, fades, speed, and spatial controls.

### Captions

- Automatic captions with Whisper running locally in the browser.
- Manual caption editing, caption styles, caption fonts, and timeline timing controls.
- Caption-linked voiceovers that align generated speech to caption clips.

### Visual AI

- **Smart framing:** subject detection and portrait matting for smart crop, caption avoidance, and background removal.
- **AI Repair:** browser-local object/watermark removal and detail restoration with before/after comparison.
- **AI music:** prompt-based music generation with selectable durations and automatic insertion into My Assets.
- **Digital human:** audio-to-motion and neural portrait rendering for talking-avatar clips.
- **Depth and parallax effects** for photos and video.

### Export

- WebCodecs-based MP4/WebM composition with a MediaRecorder fallback.
- Shared preview/export geometry, audio mixing, captions, overlays, effects, and filters.
- Optional audio-only export.
- Installable progressive web app (PWA) with a cached app shell.

### Languages

The interface is available in multiple languages, including English, Chinese, Japanese, Korean, Spanish, French, German, Portuguese, Thai, Vietnamese, and Russian.

## Technology

ClipCraft AI is built with:

- **React 19** and **Vite 6** for the web application.
- **JavaScript/JSX** for the editor UI, with **TypeScript** for the optional local host.
- **ONNX Runtime Web** and **Transformers.js** for in-browser AI inference.
- **WebGPU** and **WebAssembly** for accelerated local model execution.
- **WebCodecs**, **Mediabunny**, **FFmpeg.wasm**, and **libav.js** for media decoding, encoding, and compatibility handling.
- **Kokoro**, **Piper**, and **Hojo TTS** voice engines for text-to-speech.
- **Whisper** for speech recognition and caption timing.
- **Zod** for local host request validation and **Fastify** for the optional local service.
- **Phosphor Icons** for the interface icon set.
- A service worker for model/app caching and PWA installation.

Large AI models are downloaded on demand, cached by the browser, and pinned to immutable revisions. No API keys are required for the core browser workflows.

## Getting started

### Requirements

- Node.js 20 or newer
- npm
- A modern Chromium-based browser (Chrome or Edge recommended)
- WebGPU-capable hardware for the heaviest AI workflows (optional; most editing works without it)

### Install and run locally

```bash
git clone https://github.com/mirageapp123/ClipCraft-AI.git
cd ClipCraft-AI
npm install
npm run dev
```

Open the local URL printed by Vite (usually `http://localhost:5173`).

The first AI run may download model files. Later runs reuse the browser cache.

### Build and preview

```bash
npm run build
npm run preview
```

### Validate the repository

```bash
npm run lint
npm run typecheck
npm run build
```

Or run the complete check:

```bash
npm run check
```

## Deploy

The repository includes [`vercel.json`](vercel.json) with SPA rewrites for the legal pages (`/privacy-policy` and `/terms-of-service`) so they resolve on Vercel.

Deploy the production build to Vercel:

```bash
npm run build
npx vercel deploy --prod
```

Or connect the GitHub repository to Vercel and let it run `npm run build` with `dist` as the output directory.

## Project structure

```text
src/            React editor UI, hooks, and browser AI runtimes
apps/host/      Optional local host service (TypeScript, Fastify)
apps/launcher/  Local launcher
docs/           Technical documentation and screenshots
skills/         Agent skill definitions for timeline automation
scripts/        Build, serving, and timeline command-line tools
```

## Browser support

ClipCraft AI targets current Chromium-based browsers. Some workflows (WebGPU inference, certain codecs, and large model caches) depend on the browser version, GPU, and available memory. Safari and Firefox may support basic editing with reduced AI capability.

## Responsible use of deep synthesis

This tool uses deep-synthesis technology and is intended for lawful creative and technical work.

Users must ensure that they:

- use only facial images or videos of themselves or people who have provided lawful authorization;
- do not create or distribute illegal, infringing, false, or misleading content;
- do not present generated content as authentic footage or impersonate another person without consent.

Users are solely responsible for any legal liability arising from their use of the application.

## Contributing

Contributions are welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md) for development setup, coding practices, and pull request guidelines. By participating, you agree to follow the [Code of Conduct](CODE_OF_CONDUCT.md).

- Report bugs: <https://github.com/mirageapp123/ClipCraft-AI/issues>
- Request features: <https://github.com/mirageapp123/ClipCraft-AI/issues>

Do not include private media, credentials, or personal information in issues or pull requests.

## License and attribution

ClipCraft AI is distributed under the [MIT License](LICENSE).

The original source code this project is based on is copyright © 2026 **MartinDelophy** (Timeline Studio) and is used under the MIT License. The original copyright notice and permission notice are retained in [`LICENSE`](LICENSE). Any distribution of this project or a substantial portion of it must keep that notice.

ClipCraft AI's own modifications, branding, documentation, and application-specific features are provided under the same MIT License unless stated otherwise. Nothing in this repository claims ownership of the upstream Timeline Studio code.

The MIT License does **not** automatically apply to third-party models, model weights, datasets, fonts, stock media, or other bundled or remotely downloaded assets. Those materials remain subject to their respective upstream licenses and terms. Review [`MODEL_LICENSES.md`](MODEL_LICENSES.md) before redistribution or commercial use.

Model repositories, service names, and links that retain the `timeline-studio` identifier refer to the upstream model hosting used by this codebase. They are kept for attribution and because the application downloads those artifacts.

## Acknowledgements

- Timeline Studio and its contributors for the original MIT-licensed editor.
- The maintainers of the open models, fonts, and libraries used by the browser AI workflows.
