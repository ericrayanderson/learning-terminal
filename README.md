# Learning Terminal

https://ericrayanderson.github.io/learning-terminal/

Phonics-first learning app for little kids (~ages 3–6). Teach letter **sounds** before reading words.

## How kids learn here

1. **Phonics path** — five letter sets (Phase 2 style: s a t p → … → h b f l)
2. **Meet letters** — big letter + **human pure sound** + picture word
3. **Practice** — hear a sound → pick the letter, or see a picture → pick the first letter
4. **Sound board** — free play: tap any letter to hear it

Progress (which sets you’ve practiced) is saved in the browser.

Other mini-games (counting, shapes, etc.) are under **More play**.

## Audio

| Kind | Source |
| --- | --- |
| **Letter sounds** | Human recordings from [Buzzphonics](https://github.com/hellodeborahuk/buzzphonics) (**MIT**) in `/sounds/*.m4a` |
| Praise / UI tones | Soft synthesized beeps (Web Audio) |
| Optional phrases | Browser speech synthesis only if needed (not used for phonemes) |

See `vendor-credits/buzzphonics-sounds.txt`.

Computer TTS is **not** used for letter sounds — pure phonemes need a clear human voice, which is what the Buzzphonics files provide.

## Run locally

```bash
python3 -m http.server 8080 --bind 0.0.0.0
```

Open the site and allow sound on first tap.

## Deploy

GitHub Actions deploys the repo root to GitHub Pages on push to `main`.
