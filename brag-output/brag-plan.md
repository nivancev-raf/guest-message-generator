# /brag plan: SmartHost Guest Messages

**What it is:** A phone web app that writes the welcome message for each apartment booking. You pick the apartment and fill in the guest, the dates and the price, and the full message is written for you, ready to send on WhatsApp or Viber.
**For:** Short-stay hosts and property managers who send the same detailed message for every booking.
**What sets it apart:** It already knows each apartment (address, entrance, floor, parking spot, garage pillar). It writes in Serbian or English, and each apartment can have its own templates.
**Most impressive claim:** One form becomes a complete message, with the address and check-in rules filled in and the key details in bold, ready for WhatsApp.
**Visual hook:** The pain point is typed out in front of you: "Another welcome message to type." Then the app answers it.
**Real UI shown:** The app itself (index.html, styles.css, app.js) running in a phone frame: the Generate form, then the Ready to send screen, then the Templates editor.
**Tone:** `default` leaning `polished`: punchy, warm and premium, in the app's own dark and gold palette.
**Share caption:** see share-copy.txt

## Privacy
The real app loads data from Supabase, so the video uses an offline stand-in (`work/app/mock-supabase.js`) filled with **fictional** data. The host is "Mila", the guest is "Ana Marković", and the apartments are "Riverside Loft" and the like, at made-up addresses with the phone number +381 64 123 4567. No real apartments, guests, emails or keys appear.

## Visual identity (from styles.css)
- Background: topbar ink `#0E0D0B` with a soft gold glow; app paper `#F6F4EF`
- Gold `#C9A06A`, kicker gold `#D2AE76`, light gold `#E2C08A`
- Type: Manrope 800 for headlines, IBM Plex Mono for kickers (as in the app)
- Logo: icon-512.png

## Music
120 BPM (beat = 0.5s, bar = 2s), D major, I–V–vi–IV (D, A, Bm, G), synthesized in code. A quiet pad and typing ticks play under the hook, and drums and bass come in on the reveal at 3.0s. Taps, whooshes and typing ticks are tuned to the key and land on the 8th-note grid. The last chord rings out under the outro.

## Storyboard (21.0s; every cut on a beat)
| # | Time | Scene | On screen | Motion / SFX |
|---|---|---|---|---|
| 1 | 0.0–3.0 | Hook | "Another booking." then "Another welcome message to type." typed out with a cursor | Typing on the 1/64 grid; text blurs out at 2.75 |
| 2 | 3.0–6.0 | Reveal | Logo pops in, kicker SMARTHOST, "Guest messages", sub "Welcome messages, ready to send." | Drop hits at 3.0; at 5.45 the text lifts and blurs out, and the phone rises in |
| 3 | 6.0–11.0 | Highlight 1: fill in the stay | Caption "01 · FILL IN THE STAY" / "Guest, dates, price. That's it." The real form gets typed into: name, number, dates, price; "4 nights" appears; tap Generate | Taps on the beat; typing on the 1/32 grid; the button press shows "Generating…" |
| 4 | 11.0–15.0 | Highlight 2: ready to send | The real Ready to send screen slides in (iOS push) and the message lines appear one by one. Caption "02 · READY TO SEND" / "The whole message, written. One tap to WhatsApp or Viber." Tap WhatsApp | Push whoosh; tap |
| 5 | 15.0–18.5 | Highlight 3: your templates | Switch to the Templates tab. Tap "+ Guest name" to insert {{guest_name}}; the "Custom" badge appears; tap EN to switch the template to English. Caption "03 · YOUR TEMPLATES" / "Your words, per apartment. Srpski or English." | Taps |
| 6 | 18.5–21.0 | Outro | The phone moves out; logo, "Guest messages", "Add it to your home screen.", URL `nivancev-raf.github.io/guest-message-generator` | Final chord |
