# Stillwave — Sound & Frequency Rituals

A mobile-first, browser-based prototype for mindful frequency listening and mixable ambient soundscapes.

## Run locally

This project uses browser ES modules and `fetch()` for its editable frequency library, so run it from a local web server rather than opening `index.html` directly.

From the project folder, run:

```bash
python -m http.server 8000
```

Then open `http://localhost:8000` in your browser.

## Project structure

- `index.html` — app sections and accessible controls
- `styles.css` — visual design, responsive layout, contrast, and selected states
- `src/app.js` — interface logic, presets, timer, and ambient mix selection
- `src/audio-engine.js` — Web Audio API tone generator and procedural ambient textures
- `src/library.js` — loads the editable frequency library
- `data/frequencies.json` — frequency preset descriptions and evidence notes
- `assets/buddha-water-garden.png` — nature-inspired background image supplied for this prototype

## Adding or editing frequency presets

Edit `data/frequencies.json`. Each frequency can include `name`, `frequency_hz`, `overview`, `try_for`, `suggested_duration`, `device_guidance`, `evidence_summary`, `traditional_association`, and `note`. Keep wellness traditions distinct from claims supported by clinical evidence.

## Ambient sound note

Rain, Sea Waves, Campfire, Nebula, Jungle, and Jungle at Night are currently generated procedural audio textures using the Web Audio API. They are not recorded nature sound files. Multiple layers can be enabled at once. A future version can replace these textures with properly licensed field recordings while retaining the same UI.

## Safety and evidence

This is a listening and relaxation prototype, not a medical device or treatment. Suggested durations are personal listening ideas, not validated therapeutic doses. Keep volume comfortable and stop if sound causes discomfort. Evidence for music and natural sound exposure does not establish specific healing effects for individual frequencies such as 174 Hz or 528 Hz.

## Browser notes

Audio starts only after the user presses Play, as required by common browser autoplay policies. Mobile background playback behaviour varies by browser and operating system and will need dedicated testing in a future app build.


## Soundscape art and mindful descriptions (v7)

Ambient tiles use original lightweight SVG illustrations inspired by the user's visual references (nature, water, fire, cosmic imagery and energy-centred meditation art). Social-media screenshots are not embedded in the app. Frequency copy describes traditional associations as personal symbolism and does not present claims such as DNA repair, organ regeneration, or disease treatment as established effects. Suggested durations are personal listening guidance, not medical doses.


## Version 8 audio notes

- Each ambient card includes **Add to mix** and **Preview** controls.
- Rain, Sea Waves, Campfire, Jungle, and Jungle at Night search the SFXMint CC0 sound library when needed. An internet connection is required for those library clips.
- Nebula remains an intentionally synthesized, imagined cosmic ambience.
- The guided frequency card has its own **Play this frequency** button so listeners can start without scrolling to the bottom.
- The main soundscape button starts the frequency session and any selected ambience layers. Use Stop to end the session.
- SFXMint's library is described by its publisher as AI-generated or procedurally synthesized CC0 audio, not necessarily field recordings. Review individual sound choices before public release.

## Version 12 playback repair

- Connected both **Play this frequency** and **Play** buttons to the frequency playback controls, and connected **Stop**.
- Synchronized the two play buttons when pausing, resuming, or stopping a frequency session.
- Replaced remote ambience lookups with local Web Audio synthesis so the six ambient cards do not depend on third-party API endpoints or network-hosted audio URLs.
- Ambient cards now toggle independently and can be layered. Selecting an ambient sound stops the frequency tone; starting a frequency session stops and clears ambient sounds.
- Ambient volume updates each currently playing ambience track.

Note: these ambience sounds are generated sound textures, not authentic field recordings. The browser may require a user click before audio can begin.


## Version 14 — mobile reliability and touch experience

- Ambient layers now share a single Web Audio context, reducing the chance of mobile browser limits being reached when several ambience cards are layered.
- Ambient layers disconnect their own audio nodes when toggled off without closing the shared context used by other active layers.
- Added a guard for a sound toggled off while audio is still starting.
- Added a visibility-change recovery attempt for mobile browsers that suspend ambient audio in the background.
- Refined mobile spacing, tap targets, frequency number inputs, and the ambient-card layout for narrow screens.
- The ambient sounds remain procedural textures rather than authentic field recordings. Background playback still varies by mobile browser and operating system.


## Inner Resonance visual update

- The guided frequency card now features the supplied Shiva-at-sunrise mountain image. The full artwork is kept centered and visible, with a softly blended image backdrop on wider screens.
- Introductory copy describes mindful listening intentions (grounding, reflection, rest, and fresh starts) without presenting individual frequencies as proven treatments.


Deployment reliability note: the Shiva artwork is embedded directly in the page as a data URI, so it will display even if a static-hosting upload omits or misroutes the separate image asset. The separate asset is retained in the project for future editing.
