# Motion and sound

All motion respects `prefers-reduced-motion` (fade only). All sound is off until the user enables it once.

## Motion
| Moment | Animation | Duration |
|---|---|---|
| Card lands (from ask) | Drops in with a slight swing on its pin, settles | 450 ms |
| Card held by someone | Candle glow pulses on the edge, holder's name tag | loop 1.6 s |
| AI change parked | Ghost copy at 40% opacity, drifting 2 px | loop |
| Letter arrives | Envelope slides in, wax seal stamps | 700 ms |
| Letter opens | Seal cracks, flap lifts | 500 ms |
| Pet idle | Bob up and down 4 px | 3 s loop |
| Pet state change | Squash and stretch + small particle burst | 400 ms |
| Pet dies | Fades to a tombstone that drops into the graveyard tab | 1.2 s |
| Spirit board lock | Planchette glows, answer letters light up one by one | 800 ms |
| Séance opens | Candle lights, lines fade in one by one | 120 ms stagger |
| Board fog | Slow drift | 40 s loop |

## Sound (files in `public/sounds/`, ours or CC0 with credits in `public/sounds/README.md`)
| Event | Sound |
|---|---|
| Someone joins | Door creak (short) |
| Someone leaves | Door close |
| Card lands | Soft paper thump (replaces `place.mp3`) |
| Vote | Quiet tap (keep `tap.mp3` if license allows, else replace) |
| Letter arrives | Envelope rustle |
| Spirit board locks | Low chime |
| Pet happy / hungry | Tiny chirp / sigh |
Check the license of upstream `place.mp3`, `promote.mp3`, `tap.mp3` (see `public/sounds/README.md`
upstream). Replace any we can't confirm.
