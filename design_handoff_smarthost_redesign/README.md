# Handoff: SmartHost Guest Messages Redesign

## Overview
This is a visual and structural redesign of the Guest Message Generator, a mobile-first PWA (repo `nivancev-raf/guest-message-generator`). It covers six screens: Generate, Generated message, Apartments, Add/Edit apartment, Templates (formerly "Edit messages"), and Profile.

Main changes:
- The palette now matches the SmartHost logo: near-black and gold on warm ivory. The blue gradient and green buttons are gone.
- The large blue hero header is replaced by a compact black top bar on every screen.
- A bottom tab bar replaces the side drawer menu. Log out moves to the Profile tab.
- All emoji icons are removed and replaced with simple line icons.
- Form fields are grouped into labelled sections.
- The `{{placeholder}}` chips are replaced by a grouped variable picker that shows human-readable labels.

## About the Design Files
The file in this bundle, `SmartHost Redesign.dc.html`, is a **design reference made in HTML**. It is a prototype that shows the intended look and behaviour; it is not production code. Recreate these designs in the existing app's own stack. That app currently uses plain HTML, CSS and vanilla JS: `index.html`, `styles.css` and `app.js`, plus the newer screens for accounts, apartments, message editing and profile. Follow the app's established patterns and keep the existing data and logic. Only the UI changes.

To view the design, open the file in a browser. It shows all six screens side by side as 390px-wide phone artboards.

## Fidelity
**High fidelity.** Colours, type, spacing, radii and copy are final. Match them closely.

## Global Layout (all screens)
- Viewport: mobile, designed at 390px wide. Content padding is 16px left and right.
- Page background: `#F6F4EF`.
- Each screen is a vertical stack, top to bottom:
  1. Top bar
  2. Scrollable content: padding `18px 16px 8px`, 18px gap between sections
  3. An optional sticky primary action: padding `8px 16px 14px`
  4. The bottom tab bar

### Top bar
- Background: `#0E0D0B`. Padding: `18px 16px 14px` (add `env(safe-area-inset-top)` in production). Flex row, items centred, 12px gap.
- **Root screens** (Generate, Apartments, Templates, Profile):
  - On the left, the logo (`icon-512.png`) at 36×36 with a 9px radius.
  - Next to it, two stacked lines:
    - Kicker "SMARTHOST": 10px, weight 700, letter-spacing .18em, `#D2AE76`
    - Screen title: 17px, weight 700, `#F6F1E7`
- **Sub-screens** (Generated message, Edit apartment):
  - The logo is replaced by a 36px circular back button: background `#1F1D19`, chevron-left icon in `#E2C08A` with a 2.2 stroke.
  - The kicker becomes the parent context ("APARTMENTS", "RESERVATION MESSAGE" or "GARAGE INFO").
- **Generate only:** on the right, a 34px avatar circle with a 1px `#6E5636` border and the user's initial in `#E2C08A`, 14px, weight 700.
- **Apartments only:** on the right, an "Add" pill button: height 34, padding 0 14, background `#C9A06A`, text `#16140F` at 13px weight 800, with a plus icon.

### Bottom tab bar
- Background `#fff`, 1px top border `#E4DFD4`. Padding `6px 4px 22px` (use the safe-area inset in production).
- Four equal columns: **Generate, Apartments, Templates, Profile**.
- Each item is a column: 24px icon, a 4px gap, then an 11px label. Minimum hit area is 44px tall.
- Inactive item: colour `#8F887B`, label weight 600, icon stroke 1.8.
- Active item: colour `#16140F`, label weight 800, icon stroke 2.2, plus a 28×3px gold bar (`#C9A06A`, bottom radius 3) pinned to the top edge of the bar.
- Icons are 24×24, stroke-only, with round caps and joins:
  - Generate (speech bubble): `M4 5h16v11H9l-5 4z`
  - Apartments (building): `M5 20V4h9v16M14 9h5v11M3 20h18M8 8h3M8 12h3M8 16h3`
  - Templates (document): `M5 4h14v16H5zM8 8h8M8 12h8M8 16h5`
  - Profile (person): circle at (12, 8) with r 4, plus `M4 20c1.5-4 4.5-6 8-6s6.5 2 8 6`
- Sub-screens keep the tab bar visible, with their parent tab active.

### Shared components
- **Section label:** 11px, weight 700, letter-spacing .1em, `#7A7366`, uppercase, 4px left padding, 8px above its card.
- **Card:** background `#fff`, 1px border `#E8E2D6`, radius 16, padding 14, 14px gap between fields.
- **Field label:** 13px, weight 600, `#3D3830`, 6px above the input. Required fields add a `*` in `#A8382B`.
- **Helper text:** 12px, `#7A7366`.
- **Text input / select:**
  - Height 48, 1px border `#E1DACC`, radius 10, padding 0 14, 16px text in `#16140F`, background `#fff`.
  - Focus: border `#B98950` and a `0 0 0 3px rgba(201,160,106,.22)` ring.
  - Selects use `appearance:none` with a custom chevron (16px, stroke `#6B655A`) placed 14px from the right.
  - Read-only inputs: background `#F3F0E9`, border `#EEE9DF`, text `#6B655A`.
- **Primary button:** full width, height 54, radius 14, background `#C9A06A`, text `#16140F` at 16px weight 800, `inset 0 -2px 0 rgba(0,0,0,.12)`. Hover: `#D4AE78`.
- **Dark button:** background `#16140F`, text `#F3E7CF`.
- **Outline button:** 1.5px border `#16140F`, transparent background, text `#16140F`.
- **Segmented control:**
  - Track: background `#E9E4DA` (or `#EFEBE3` for small controls), radius 10–12, padding 3–4, 3–4px gap.
  - Options: height 32–38, radius 7–9, 13–14px text at weight 700.
  - Inactive option: transparent, text `#6B655A`.
  - Active option, dark variant: background `#16140F`, text `#F3E7CF`.
  - Active option, light variant: background `#fff`, text `#16140F`.
- **Switch:** 46×28 track, radius 14. On: `#16140F`. Off: `#D9D3C6`. The knob is a 22px white circle with a `0 1px 3px rgba(0,0,0,.25)` shadow; it moves 18px with a .2s transition.

## Screens

### 01 Generate (tab: Generate)
- **Purpose:** compose a reservation message or garage info for a guest.
- **Top bar:** title "New message", with the avatar on the right.
- **Content, in order:**
  1. **Type segmented control (dark variant, full width):** "Reservation" | "Garage info".
  2. **APARTMENT card:**
     - Apartment select showing the apartment name at weight 600.
     - Below it, a summary line (13px, `#6B655A`): `{building} · {address} · Apt {n} · Parking {spot}, level {level}`.
  3. **GUEST card** (Reservation only):
     - "Name" input, placeholder "Guest name".
     - "Mobile number" input (tel), placeholder "+381 6x xxx xxxx", helper "Include the country code, e.g. +381".
  4. **STAY card** (Reservation only):
     - Two-column grid with a 10px gap: "Check-in" and "Check-out" date inputs.
     - A line below showing the night count, e.g. "4 nights". If check-out is not after check-in, it reads "Check-out must be after check-in".
     - "Total price" input with a "€" suffix placed 14px from the right.
  5. **OPTIONS card** (padding 6px 14px, rows at least 52px tall):
     - Row "Language" with a small light segmented control: "Srpski" | "English".
     - 1px divider `#EEE9DF`.
     - Row (Reservation only): "Airport transport" (15px, weight 600) with the sub-line "Mention the transfer offer" (12px, `#7A7366`). A switch sits on the right; tapping anywhere on the row toggles it. This replaces the "Include transport option" checkbox.
- **Sticky primary button:** "Generate message", or "Generate garage info" when Garage info is selected.
- **Validation:** keep the existing rules from `app.js`. Show invalid fields with a `#A8382B` border and an inline message under the field rather than a single error block.

### 02 Generated message (tab: Generate)
- **Top bar:** sub-screen style. Kicker "RESERVATION MESSAGE" or "GARAGE INFO", title "Ready to send".
- **Content:**
  - **Summary chips:** flex-wrap with a 6px gap. Each chip is 12px weight 600, `#4A453C` on `#EDE8DE`, radius 999, padding 5×10. Chips show the apartment, guest name, date range and language (Garage info shows apartment, parking spot and language).
  - **Message bubble:**
    - Background `#fff`, 1px border `#E8E2D6`, radius `18 18 18 6` (chat bubble), padding `16 16 12`.
    - Text: 14.5px, line-height 1.5, `#1E1B16`.
    - Render WhatsApp `*bold*` runs at weight 800 and keep line breaks.
    - Bottom-right: character count, 11px, `#9A9384`.
- **Bottom actions:** a two-column grid (1fr and 1.4fr) with a 10px gap.
  - Outline button "Copy". It changes to "Copied" after tapping; replace the existing `alert()` with this.
  - Dark button "Send on WhatsApp", with a sub-line "to {phone}" in 11px `#C9A06A`. Disable it with the sub-line "Add a number first" when there is no phone number.

### 03 Apartments (tab: Apartments)
- **Top bar:** title "Apartments", with the "Add" pill on the right. This replaces the full-width "+ Add apartment" button.
- **Content:**
  - Section label "{N} APARTMENTS".
  - One card containing a list. Each row:
    - Padding 14, 14px gap. Rows after the first have a 1px `#EEE9DF` top border. Hover background `#FAF8F3`.
    - Left: a 44px square tile (radius 11, background `#16140F`) showing the apartment number in IBM Plex Mono 13px, `#E2C08A`.
    - Middle: the name (16px, weight 700) above a meta line (13px, `#6B655A`, ellipsis): `{building} · {address} · P{spot}, L{level}`.
    - Right: a chevron, stroke `#A39B8B`.
  - The whole row is tappable and opens Edit apartment. This replaces the "Edit ›" link.

### 04 Add / Edit apartment (tab: Apartments)
- **Top bar:** sub-screen style. Kicker "APARTMENTS", title "Edit apartment" or "Add apartment".
- **Sections:**
  - **LISTING:** "Name *", with helper "Shown in your apartment list".
  - **LOCATION:**
    - "Building" (placeholder "e.g. Sunny Residence")
    - "Address"
    - A three-column row: "Apartment" | "Entrance" | "Floor"
  - **PARKING:** a two-column row: "Parking spot" | "Garage level".
- **Sticky primary button:** "Save apartment".

### 05 Templates (tab: Templates; formerly "Edit messages")
- **Top bar:** title "Templates".
- **Selector card:**
  - Row one, a grid of `1fr auto`:
    - "Apartment" select (height 44)
    - A small dark segmented control: "SR" | "EN" (replaces the language radios)
  - Row two: a three-option light segmented control, full width: "With transport" | "No transport" | "Garage" (replaces the message-type radios).
- **MESSAGE header row:**
  - Section label "MESSAGE".
  - A "Custom" badge (11px, weight 700, `#7A5528` on `#F3E6CF`, pill), shown only when the template differs from the default.
  - Right-aligned: a "Reset to default" text button (13px, weight 700, `#8A6233`), shown only when the template is custom.
- **Editor card** (no padding, overflow hidden):
  - Textarea: minimum height 220, no border, padding 14, 15px text, line-height 1.5, vertical resize.
  - Variable picker below it:
    - 1px top border `#EEE9DF`, background `#FAF8F3`, padding `12 14 14`.
    - Hint "Tap a variable to insert it at the cursor" (12px, `#6B655A`).
    - Three groups. Each has an 11px weight-700 label in `#9A9384` with letter-spacing .08em, followed by chips:
      - RESERVATION: Guest name `{{guest_name}}`, Check-in `{{check_in}}`, Check-out `{{check_out}}`, Price `{{price}}`
      - APARTMENT: Location `{{location}}`, Address `{{address}}`, Building `{{building}}`, Apartment `{{apartment}}`, Entrance `{{entrance}}`, Floor `{{floor}}`
      - PARKING: Parking spot `{{parking}}`, Garage level `{{garage_level}}`
    - Chip style: height 32, padding 0 10, 1px border `#E1D6C2`, radius 8, background `#fff`, 13px weight 600 `#3D3830`, with a "+" prefix in IBM Plex Mono 11px `#A57A45`. Hover: border `#C9A06A`, background `#FBF5EA`.
    - Chips show the human-readable label; the raw token is in the `title` attribute.
    - Tapping a chip inserts the token at the textarea cursor, replacing any selection, then puts the cursor right after the inserted token and refocuses the textarea. This is the same behaviour as today.
- **Sticky primary button:** "Save template".

### 06 Profile (tab: Profile; replaces the drawer menu)
- **Top bar:** title "Profile".
- **Identity row:**
  - A 60px avatar circle: background `#16140F`, initial in `#E2C08A` at 24px weight 800.
  - Beside it, the name (20px, weight 800) above the email (14px, `#6B655A`).
- **ACCOUNT card:**
  - "Email": read-only input.
  - "Name *" input, with helper "Used in the greeting and on your messages".
  - Primary button "Save profile" (height 50, radius 12).
  - On success, an inline row: a check icon and "Profile saved" in `#2F6B4A`, 14px, weight 600. This replaces the green alert box.
- **Log out card:**
  - A single row button: height 54, padding 0 16, 15px weight 700 `#A8382B`, with a log-out icon. Hover background `#FBF3F1`.
  - Keep the existing confirm and logout logic.

## Interactions & Behavior
- Tab bar: switches between the four root screens. Sub-screens push on top of their parent tab.
- Type toggle on Generate: shows or hides the GUEST and STAY sections and the transport row.
- Generate: runs the existing generator from `utils.js`, then opens the Generated message screen.
- Copy: copies the text to the clipboard and shows "Copied" on the button for about 2 seconds.
- WhatsApp: keeps the existing `api.whatsapp.com/send` URL logic.
- Templates: changing the apartment, language or type loads that template. Editing the text marks it as Custom; "Reset to default" restores the default.
- Transitions: .2s ease on the switch and on hover background changes. There are no other animations.

## State
The existing state is unchanged. The UI adds:
- `messageType`: `'res'` or `'garage'`
- `transport`: boolean
- `copied`: a short-lived flag
- `templateIsCustom`: derived by comparing the template with its default
- `profileSaved`: a flag

## Design Tokens
- **Ink:** `#16140F`. Top bar: `#0E0D0B`. Back button background: `#1F1D19`.
- **Background:** `#F6F4EF`. Surface: `#FFFFFF`. Subtle surface: `#FAF8F3`. Read-only: `#F3F0E9`.
- **Borders:** card `#E8E2D6`, input `#E1DACC`, divider `#EEE9DF`, tab bar `#E4DFD4`.
- **Text:** body `#3D3830`, muted `#6B655A`, label `#7A7366`, faint `#9A9384`, inactive tab `#8F887B`.
- **Gold:** primary `#C9A06A`, hover `#D4AE78`, focus `#B98950`, light `#E2C08A`, kicker `#D2AE76`, text-safe bronze `#8A6233`, badge `#7A5528` on `#F3E6CF`.
- **Danger:** `#A8382B`. **Success:** `#2F6B4A`.
- **Fonts:** Manrope (400–800) for the UI and IBM Plex Mono (400/500) for tokens and numbers, both from Google Fonts.
- **Type scale:** 10 / 11 / 12 / 13 / 14.5 / 15 / 16 / 17 / 20 / 24.
- **Radii:** 7–9 for segmented options, 10 for inputs, 12–14 for buttons, 16 for cards, 999 for pills.
- **Spacing:** 4, 6, 8, 10, 12, 14, 16, 18.

## Assets
- `icon-512.png`: the SmartHost logo, taken from the repo.
- Icons are inline SVG paths, listed above. No icon library is needed.

## Files
- `SmartHost Redesign.dc.html`: an interactive reference showing all six screens. Open it in a browser.
- `icon-512.png`: the logo.
- `screenshots/01-generate.png` to `06-profile.png`: a 2x render of each screen at full height.
