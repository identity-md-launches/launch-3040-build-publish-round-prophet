# Round Prophet design

## Overview

Round Prophet is a dark, playful prediction arena for a human versus an explainable Wheel Brain. The visual idea is a single original hamster wheel between two minds, with coral identifying the human and pale lime identifying Brain, active work, and the primary call action. The game is the entry screen; explanatory material stays beside or below it.

The reusable hierarchy is a restrained header, mode navigation, a short product heading, one large arena, and an unboxed model panel. The source of truth is [`src/styles.css`](src/styles.css); the page composition is in [`src/App.tsx`](src/App.tsx).

## Colors

Colors use a hex primitive tier and semantic aliases in `:root`. Components consume semantic roles; original inline SVG art also contains its own coordinated illustration palette.

| Semantic token        | Implemented value | Role                                                         |
| --------------------- | ----------------- | ------------------------------------------------------------ |
| `--bg`                | `#141619`         | Page background (`--ink-950`)                                |
| `--surface`           | `#1b1e23`         | Arena and dialog (`--ink-900`)                               |
| `--raised`            | `#23272b`         | Selects, secondary buttons, meter tracks (`--ink-850`)       |
| `--border`            | `#30353a`         | Structural separators (`--ink-800`)                          |
| `--border-control`    | `#454c50`         | Neutral control boundaries (`--ink-700`)                     |
| `--text`              | `#f4f1e9`         | Primary text (`--ink-100`)                                   |
| `--muted`             | `#a4aaa9`         | Supporting copy (`--ink-400`)                                |
| `--accent`            | `#c6ef86`         | Primary button, Brain, active-work cues (`--lime-300`)       |
| `--accent-hover`      | `#b4dc76`         | Primary hover (`--lime-400`)                                 |
| `--on-accent`         | `#202719`         | Text on lime controls                                        |
| `--selection`         | `#20291b`         | Selected prediction surface (`--lime-950`)                   |
| `--human`, `--danger` | `#f39f8b`         | Human score and clearly labeled error states (`--coral-300`) |
| `--warning`           | `#ebc584`         | Stale feed (`--amber-300`)                                   |
| `--focus`             | `#edfbcf`         | Two-pixel focus outline, four-pixel offset                   |

Freshness has a text label and a dot; round histories include “Active”/“Idle” and work values. Color alone never communicates a result. The selected side and band use a border and `aria-pressed`, with an additional check mark on the side.

Measured rendered WCAG contrast at rest in Chromium: text on page **16.06:1**, muted text on arena **7.08:1**, selected side text **13.34:1**, primary button label **11.78:1**, Brain score **12.81:1**, human score **8.07:1**. These are the actual solid pairs in the checked state, not a claim about every possible browser. See validation for coverage. The site intentionally has one dark theme.

## Typography

Two locally bundled WOFF2 faces, with `font-display: swap`:

- `--font-body`: **DM Sans**, fallback `sans-serif`; `public/fonts/dm-sans-latin.woff2`.
- `--font-display`: **Space Grotesk**, fallback `sans-serif`; `public/fonts/space-grotesk-latin.woff2`.

CSS declares normal weights 400–700; the interface uses **400, 500 and 700**. Both faces were observed loaded in Chromium. Font metadata axes were not separately inspected. OFL license files accompany the fonts.

| Token            | Desktop | Mobile ≤760px | Usage                                      |
| ---------------- | ------- | ------------- | ------------------------------------------ |
| `--text-small`   | 13px    | 13px          | Labels, captions, model copy, compact data |
| `--text-body`    | 16px    | 16px          | Controls, body, selects                    |
| `--text-lead`    | 20px    | 20px          | Section headings, brand                    |
| `--text-heading` | 28px    | 28px          | Brain call and result title                |
| `--text-title`   | 40px    | 28px          | Product heading                            |
| `--text-score`   | 72px    | 40px          | Duel scores                                |

The root remains the browser’s normal font size; the pixel equivalents above assume 16px. Headings use 700, balanced wrapping, and tight display tracking. Main title line height is 1.15 with `-.045em`; scores use 1.1 and `-.055em`; section headings use 1.3 and `-.025em`. Body line height is 1.5; model and rules prose uses 1.6. Numeric scores, work, percentages and round identifiers use tabular numbers. Prose remains sans-serif; no monospace face is loaded. Long values wrap rather than truncate. Mobile selects remain 16px to avoid input zoom.

## Layout

The shared `.shell` is at most **1248px**, including desktop **32px** inline padding. The spacing vocabulary declared in `:root` is 4, 8, 12, 16, 24, 32 and 48px; existing components also use 18, 20 and 28px optical insets.

- Default arena/model grid: flexible arena, **300px** model panel, **32px** gap.
- At **1100px and above**: model panel **308px**, gap **40px**.
- At **761–1050px**: shell padding **24px**, model panel **260px**, gap **24px**; avatar detail is reduced and the wheel stacks above controls inside the arena.
- At **760px and below**: one column, shell padding **20px**; model panel follows the playable arena. A native persona selector appears in the arena’s top row. The wheel is **120px** tall, scores become 40px, and the redundant “Make your first call” heading is hidden. The question’s fieldset legend remains visible.
- At **360px and below**: shell padding **16px**, smaller brand text, and decorative mode/choice icons are removed to preserve control labels.

On wide layouts `.arena-play-area` puts the wheel beside the controls, with `.8fr / 1fr` columns. Spectator and result states use `.wide-play-area` to span that space. Navigation wraps when enlarged text needs more room. The round rail scrolls horizontally within its own region, has a keyboard focus target, thin scrollbar and a visible partial next item on mobile; the document itself does not scroll sideways.

The 390×844 first screen contains the product, persona selector, predictions and lock action, including the checked offline state. Widths 320, 390, 760, 1024 and 1440 were checked. CSS text enlarged to 200% at 390 reflows without document overflow; native browser zoom and RTL localization were not verified.

## Elevation & depth

The design is flat. The arena uses a tonal surface and a structural border; internal groups use spacing and separators. There are no component box shadows or gradient text. The rules dialog is the only modal layer, with a translucent black backdrop and native background inertness. The illustration’s drawn floor shadow belongs to the art, not the surface system. Canvas share previews use a one-pixel translucent outline.

## Shapes

Arena corners are **20px** on desktop and **16px** on mobile. Side choices use **10px**; buttons, selects and band choices use **8px**. The rules dialog and empty matchbook surface use **16px**. Dots, avatar details and the wheel use circles. Borders and selected outlines communicate structure and state; no bordered box is nested merely to decorate another box.

## Components

| Component or pattern                       | Source                                           | Behavior and reuse                                                                                                                                               |
| ------------------------------------------ | ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Header and mode navigation                 | `src/App.tsx`, `.site-header`, `.nav-inner`      | Brand leads, help trails; native buttons switch hash views and expose `aria-current`. Navigation wraps under text enlargement.                                   |
| Arena and scoreboard                       | `src/App.tsx`, `.arena`, `.scoreboard`           | Stable human/Brain positions, tabular scores and three round markers. Result updates have a polite text announcement.                                            |
| Side and band fields                       | `src/App.tsx`, `.side-choice`, `.band-choices`   | Native fieldsets and buttons with `aria-pressed`. Selected, hover, focus and disabled states. Bands disable for Idle or insufficient positive history.           |
| Primary action                             | `.primary`, `.lock-cta` in `src/styles.css`      | One lime primary action per active flow. Verb label changes for checking, locked, connecting, verifying and paused states. Disabled controls use neutral colors. |
| Brain panel                                | `src/App.tsx`, `.brain-panel`                    | Native persona select, public call/reasoning, three named native meters, sample size and native fairness disclosure. Unboxed beside the arena.                   |
| `WheelStage`, avatars, `Icon`, `WheelMark` | `src/components/Art.tsx`                         | Original inline SVG art. Decorative SVGs are hidden from accessibility APIs; icon-only controls receive names from their buttons.                                |
| `ShareCard`                                | `src/components/ShareCard.tsx`                   | Canvas with accessible image description, PNG download, copy action and selectable fallback. Reused for current and past results.                                |
| Match and call rows                        | `src/App.tsx`, `.match-rounds`, `.watch-history` | Consistent round/call/result columns, exact work values, explicit missed, tied, pending and unused-round states.                                                 |
| Help dialog                                | `src/App.tsx`, `.help-dialog`                    | Native `<dialog>`, named heading, Tab/Shift+Tab loop, Escape, close action and focus return.                                                                     |
| Connection notice                          | `src/App.tsx`, `.connection-message`             | Plain recovery text and Retry feed; failure does not invent data or enable locks. Compact mobile layout keeps the main action on screen.                         |

Controls use 120ms transitions on named properties only, with `cubic-bezier(.2,0,0,1)` for press feedback. Press scale is `.96`. The wheel rim turns over **28 seconds** only while calls are locked; decorative motion never indicates a settlement. `prefers-reduced-motion: reduce` disables all animations/transitions, smooth scrolling and press scaling. Forced-colors mode preserves a system focus indicator and selected-control outlines.

## Do’s and don’ts

- Start from `.shell`, the six-size type scale, and semantic color roles. Keep the arena as the first useful surface.
- Keep Brain forecasts and real settled outcomes visually and verbally distinct. Label unknown work as pending.
- Keep controls native, named and keyboard reachable. Reuse the existing focus treatment and status announcement pattern.
- Keep decorative motion optional. Never use a timer, animation or token issuance as proof of settlement.
- Add another view through the existing hash navigation and reuse the section/row patterns. Do not add a marketing hero above the game, a new font, extra display sizes, or decorative nested panels.
- Keep local assets and relative paths in the export. Preserve font licenses and the original art’s source.

Design principles were adapted from Jakub Krehel’s Better Interface (MIT); documentation method from Paul Bakaus’s Impeccable (Apache-2.0). Attribution and preserved notices are in [THIRD_PARTY.md](THIRD_PARTY.md) and [artifacts/design-guidance-LICENSE.txt](artifacts/design-guidance-LICENSE.txt).
