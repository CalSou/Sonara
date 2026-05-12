# Sonara — FE Design Mockups

High-fidelity UI mockups of Sonara for design reference. These are **exploratory targets**, not pixel-perfect specs — the shipping UI may diverge based on component library constraints and user testing.

| Screen | File |
| :--- | :--- |
| Landing / marketing page | [`01_landing.png`](./01_landing.png) |
| Production Studio | [`02_studio.png`](./02_studio.png) |
| DJ Console | [`03_dj.png`](./03_dj.png) |
| Mobile Studio + Register | [`04_mobile_register.png`](./04_mobile_register.png) |

## Visual language

- **Background:** near-black `#0A0A0F` with subtle grid texture and soft purple radial glow behind hero surfaces.
- **Primary:** purple `#A855F7` — Studio accents, primary CTAs, playhead.
- **Secondary:** cyan `#22D3EE` — DJ accents, outline icons.
- **Accent:** pink `#EC4899` — stems highlight, "vocals" swatch.
- **Supporting:** amber, emerald, blue for track colours (drums / bass / other).
- **Type:** geometric sans-serif (Inter / Geist), `text-balance` tagline; readouts (BPM, timecode) in a mono-ish tabular variant.
- **Surfaces:** `rounded-2xl` cards, 1 px low-opacity borders, soft purple glow on the primary CTA.

## Aesthetic references

- Linear / Vercel / Arc for layout density and glow treatments
- Ableton-web / Serato-web for studio and DJ metaphors

## Usage

Reference these when reviewing PRs that touch landing, Studio, DJ, or onboarding surfaces. Raise a design PR to update a mockup alongside any significant UI change so the two stay in sync.

**Production Studio:** `/studio` is visually aligned with [`02_studio.png`](./02_studio.png) — circular purple Play with glow, tabular time/BPM readouts, shared timeline playhead across all lanes, rounded waveform wells with progress shading, pill mute/solo + volume strip + draggable Pan knob, and an elevated AI Co-Pilot deck panel.
