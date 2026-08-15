# Scavenger Hunt — Neobrutalist UI Redesign Prompt

## Scope

This is a **UI-only** redesign. Do not touch Supabase schema, Realtime subscriptions, routing logic, QR parsing logic, or state management. Every screen keeps its current data flow and props; only the markup, styling (CSS Modules), and Framer Motion layer change. If a visual change requires a new piece of local UI state (e.g. `isRevealed`, `activeTab`), that's fine, but game state stays untouched.

Reference image: the attached neobrutalism mobile mockup (three phone screens, orange/lime/pink). Treat it as the literal art direction, not a mood board — match its border weight, shadow style, and color saturation exactly, then apply that system to this app's own screens and content.

## Design direction

The current UI leans Duolingo: soft rounded cards, pastel gradients, friendly but generic. Move it to **neobrutalism**: flat saturated color blocks, thick black outlines, hard offset drop shadows (no blur), high-contrast type, and a slightly irreverent, sticker-collage feel. Keep the bounce and warmth from Duolingo in the *motion*, not the shapes — the personality now comes from animation timing and illustrated characters, not soft edges.

### Token system

**Color** — four team colors double as the app's core palette, each fully saturated, no gradients:
- Blue `#3D5AFE`
- Red `#FF3B3B`
- Yellow `#FFD93D`
- Orange `#FF7A00`
- Ink (borders, text, shadows) `#0D0D0D`
- Paper (base background) `#F5F1E8` or pure white, pick one and hold it everywhere

**Borders & shadows** — the signature neobrutalist move:
- 3px solid Ink border on every interactive surface (cards, buttons, inputs, badges)
- Hard offset shadow, no blur: `box-shadow: 6px 6px 0 #0D0D0D` (4px on small elements like chips, 8-10px on hero cards)
- On press/tap, the shadow collapses and the element shifts into it (`translate(6px, 6px)`, shadow to `0 0 0`) — this is the primary tactile feedback pattern, use it on every button and the QR scan trigger
- Border radius: pick one lane and stay in it. Either sharp corners everywhere (0px, true brutalist) or a single consistent chunky radius (16-20px, softer/Duolingo-adjacent brutalism like the reference image). The reference image uses the softer lane — recommend matching that since it bridges from the existing Duolingo feel.

**Typography** — a heavy, characterful display face paired with a plain workhorse body face:
- Display: something like Archivo Black, Space Grotesk (bold weight), or Clash Display for headlines, team names, clue numbers, the winning screen
- Body: Inter or General Sans for clue text, instructions, admin table content
- Set the display face big and tight-tracked. Numbers (clue count, timer, step X of Y) get their own oversized treatment, they're a structural device in this game, not decoration

**Illustration** — flat, thick-outline character illustrations (matching the burger/cake character style in the reference) for the mascot, wellness moments, and empty states. Source these rather than generating from scratch:
- IconScout's neobrutalism collection (iconscout.com/all-assets/neobrutalism) has matching PNG, SVG, and Lottie/GIF animated assets in this exact outlined-character style
- Figma Community "Neo-Brutalism illustration pack" (search "Brutaldy") is a free, ready-to-export set in the same family
- LottieFiles (lottiefiles.com) for lightweight animated JSON — search "neobrutalism" or "brutalist" for on-style loaders and micro-animations; these drop straight into `lottie-react`
- For a mascot with more interactive personality (idle blink, wave on load, react to scans), Rive (rive.app) supports state-machine-driven characters in the same flat-outline style and is worth evaluating over static Lottie if the agent has time
- Keep every sourced asset within the same outline weight and palette — mixing illustration styles is the fastest way back to "templated" territory

## Animation direction

Framer Motion stays, but the motion vocabulary shifts from "smooth glide" to "snappy, physical, a little cheeky" — springs with real overshoot, not eased eases.

- Default spring: `{ type: "spring", stiffness: 400, damping: 17 }` for anything that pops in (cards, modals, the clue reveal)
- Stagger children by 60-80ms on any list or multi-element reveal (team picker, clue steps, admin table rows)
- Press states use the shadow-collapse pattern above, timed fast (~100ms), no spring, this needs to feel like a physical click
- Reserve one orchestrated "big moment" per screen rather than animating everything: the startup logo sequence, the team lock-in thump, the QR-to-clue transition, the winning confetti burst. Everything else (hover, tab switches) stays quick and quiet so the big moments still read as big.

## Screen-by-screen plan

### 1. Startup / loading (`app/page.tsx`)

Current state: lists "Made by ID7 - Creative Edge" and the wellness welcome line as plain text. Give this an actual sequence instead of a static screen:

- Beat 1 (0-0.6s): full-bleed Ink or brand-color background, a single bold graphic mark (compass, magnifying glass, or footprint icon in the sourced illustration style) scales/rotates in with the spring
- Beat 2 (0.6-1.4s): "Made by ID7 · Creative Edge" sets in as a small credit chip, bottom or top corner, understated, not the hero of the screen
- Beat 3 (1.4-2.4s): the wellness welcome becomes a short animated line, not a sentence dump. Split it into three tags that stagger in as physical chip/badge elements: `Mental` `Physical` `Spiritual`, each in a different team color, each with a tiny matching icon (brain, body, compass or similar from the illustration pack). Headline above them: something short and human, e.g. "This hunt's for your whole self." (rewrite copy freely, keep it short, active voice, no filler)
- Beat 4: loading bar or spinner as a thick-bordered progress block (not a thin generic bar), fills with a slight overshoot bounce at 100%, then the screen transitions directly into the team selection lobby, there's no separate session-join step in the current flow

### 2. Team selection lobby (`app/session/[id]/page.tsx`)

- Four team cards (Blue/Red/Yellow/Orange), each a solid color block with thick border, team name in display type, and a small illustrated icon unique to each team (keep it simple: a shape or mascot variant per color)
- Unselected + available: full color, shadow present, tappable
- Selecting: the "thump" — card scales down then up past 100% (spring overshoot) as the shadow collapses, a lock icon badge stamps on with a quick rotate-in
- Locked by another leader (Realtime update): card desaturates to ~40% opacity, border switches to a dashed or hatched pattern, a small "Taken" chip appears, no hover/press affordance
- Stagger all four cards in on mount, 70ms apart

### 3. Gameplay loop (`app/game/[teamId]/page.tsx`)

- Header: oversized "Clue 3 of 8" style step indicator in display type, this is the numbered-marker use case that's actually earned since it's a real sequence
- Clue card: bordered block, clue text in body type, generous padding, maybe a torn-paper or stamped-corner visual detail to reinforce "scavenger hunt" physicality
- Scanner trigger: full-width chunky button, "Scan Code" with a scan-icon, uses the press-collapse pattern, maybe a subtle idle pulse on the border to draw the eye (sparingly, this is the one screen where a little ambient motion earns its keep)

### 4. QR scanner (`components/QRScanner.tsx`)

- Scanner viewport gets a thick bordered frame overlay with corner brackets (classic scan-target styling, but in the brutalist border/shadow language instead of thin corner lines)
- On valid scan: viewport freezes/flashes briefly, then the whole scanner sheet transitions out (slide or scale-out) into the reveal

### 5. Clue + wellness reveal (post-scan transition)

This is the second "list problem" screen, same fix philosophy as the startup:
- Present as a two-beat card flip or sequential reveal, not a stacked list: first the wellness fact appears alone as a full illustrated card (icon + one short sentence, treat it like a mini "fact card" moment worth pausing on), then a tap or auto-advance (1.5-2s) flips/slides to reveal the next clue
- Use a real flip (`rotateY`) or a slide-and-scale, not a fade, this is meant to feel like turning over a card

### 6. Winning screen (`components/WinningScreen.tsx`)

- Confetti in the four team colors (`react-confetti` or `canvas-confetti`, tune particle colors to the palette)
- Winning team's color becomes the full background
- Trophy/flag illustration from the same pack, oversized, scales in with heavy overshoot
- Team name in the largest display type on the site, this is the payoff moment, let it be loud

### 7. Admin dashboard (`app/admin/page.tsx`)

Keep this functionally dense but visually consistent with the rest, admins get the same system, just calmer:
- Clue management table/list: bordered rows, less shadow depth than player-facing cards (2-3px shadow vs 6-8px) so it reads as a workspace, not a celebration screen
- QR/link generator output: display generated pin/link inside a bordered "receipt" style block with a copy button (press-collapse interaction), styled clearly enough that copying into delphi.tools is a one-glance action. Flag to the coding agent that QR code generation is not currently producing output in the app, this needs a functional fix alongside the visual pass, not just new styling on a broken output
- Live leaderboard: team color blocks as progress rows, each showing current clue step, winner gets a small badge treatment matching the winning screen's icon
- New clue / edit clue forms: chunky bordered inputs and selects matching the card and input styling used elsewhere in the app

## Build notes

- Centralize the tokens (colors, border width, shadow values, spring config) in one shared file (CSS variables or a `tokens.ts`/`theme.ts`) so every component pulls from the same source instead of restating hex values
- Audit for AI-slop tells before calling this done: no soft pastel gradients, no blurred shadows, no generic rounded-card-with-icon-in-circle pattern repeated everywhere without variation
- Respect `prefers-reduced-motion`, fall back to simple opacity fades for all the spring/stagger sequences above
- Test the whole flow at actual mobile width (375-390px) first, this is mobile-first, don't design at desktop width and shrink down
