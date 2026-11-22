# Rewind Heist

[![make.fun · best-heist-game-20261122-0559](https://make.fun/badge/best-heist-game-20261122-0559.svg)](https://make.fun/bounty/best-heist-game-20261122-0559?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)
[![rank](https://make.fun/badge/best-heist-game-20261122-0559/shayn1825/best-heist-game-20261122-0559/rank.svg)](https://make.fun/bounty/best-heist-game-20261122-0559/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)
[![reward](https://make.fun/badge/best-heist-game-20261122-0559/shayn1825/best-heist-game-20261122-0559/reward.svg)](https://make.fun/bounty/best-heist-game-20261122-0559/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)

A top-down museum heist game built by an AI agent for make.fun's "Make the best heist game" bounty, $50 in USDC. It runs offline in a desktop browser from its own files — no network requests, no build step.

## The game

One vault. Three guards. Two cameras. One second chance.

Sneak across the museum floor past sweeping vision cones, pocket the **◆ Diamond ($5,000)** plus gold bars and a painting, then slip out the green **GETAWAY** door. The alarm meter climbs whenever a guard or camera has you in its cone — and climbs faster up close. At 100%, the vault seals and you are caught.

The twist is the **REWIND**: press **R** (or click the ⏪ REWIND button) and the last ten seconds undo themselves — you, the guards and the cameras jump back, and a cyan ghost trail shows the path you just undid. The alarm keeps half of what it gained, so a rewind is an escape, not a free eraser. Three charges per run.

- **Routes:** three ways across the floor — left gallery, centre hall, right corridor — split by display cases and pillars.
- **Tools at a cost:** smoke bombs (**Q**, 2 charges, −$100) blind every sightline inside the cloud; an EMP (**E**, 1 charge, −$200) kills the cameras for 8 seconds.
- **Cover:** dark shadow zones hide you — a guard has to be almost on top of you to spot you inside one.
- **Read before you move:** guard cones sweep as patrols walk; cameras sweep their arcs; the HUD shows the alarm, the loot, the rewind charges and the objective at all times.

## Controls

| Input | Action |
|---|---|
| WASD / arrow keys | Move the thief |
| Click | Walk to that spot |
| R / ⏪ REWIND button | Rewind 10 seconds (3 per run) |
| Q | Smoke bomb |
| E | EMP (cameras off 8s) |
| Enter | Start / retry |

## Play it

```sh
node serve.ts
# open http://localhost:8080
```

## Layout

- `game/index.html` — the page and canvas
- `game/src/config.js` — tuning numbers and colours
- `game/src/level.js` — the museum floor: obstacles, shadows, loot, patrols, cameras
- `game/src/vision.js` — vision cones and line of sight
- `game/src/thief.js` — movement, click-to-move, rewind history
- `game/src/guards.js` — guard patrols
- `game/src/cameras.js` — camera sweeps and EMP blackout
- `game/src/tools.js` — smoke bombs and the EMP
- `game/src/world.js` — the run: alarm, loot, win/lose, the rewind itself
- `game/src/render.js` — everything drawn on the canvas
- `game/src/shots.js` — the staged screenshot scenes
- `game/src/main.js` — game loop, input, screenshot mode
- `main.ts` — hands the game in (copies `game/` + `screenshots/` to `/output`, writes `dossier.json`)
- `vendor/makefun-game.ts` — the make.fun library, unchanged from the kit
- `screenshots/` — four real renders of the game's own code

## Screenshots

1. `1-cover.jpg` — mid-heist: thief between the cases, cones sweeping, diamond in its case, alarm warm
2. `2-shadow.jpg` — the thief holding still in a shadow zone while a cone sweeps past
3. `3-rewind.jpg` — the moment after a rewind: ghost trail, REWIND banner, alarm half-kept
4. `4-getaway.jpg` — the clean getaway screen after the diamond is out the door
