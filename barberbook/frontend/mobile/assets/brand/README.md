# BarberBook brand assets

The vector sources in this folder are the source of truth. PNGs in the
`assets/` parent folder are derived; regenerate them when the brand
changes.

## Quick rebuild (uses `librsvg`)

```bash
brew install librsvg              # macOS
sudo apt install librsvg2-bin     # Debian/Ubuntu

cd frontend/mobile/assets
rsvg-convert -w 1024 -h 1024 brand/icon.svg     > icon.png
rsvg-convert -w 1024 -h 1024 brand/adaptive.svg > adaptive-icon.png
rsvg-convert -w 1024 -h 1024 brand/splash.svg   > splash-icon.png
rsvg-convert -w 48   -h 48   brand/icon.svg     > favicon.png
```

## Without librsvg (pure JS)

```bash
npx -y @resvg/resvg-cli brand/icon.svg     -o icon.png      --width 1024
npx -y @resvg/resvg-cli brand/adaptive.svg -o adaptive-icon.png --width 1024
npx -y @resvg/resvg-cli brand/splash.svg   -o splash-icon.png --width 1024
npx -y @resvg/resvg-cli brand/icon.svg     -o favicon.png    --width 48
```

## Palette

| Token         | Hex     | Use                                  |
| ------------- | ------- | ------------------------------------ |
| `cream`       | #FAF7F2 | Splash background, logomark on dark  |
| `charcoal`    | #1B1A18 | Logomark, headlines                  |
| `red.signal`  | #D4322C | Adaptive-icon background, accents    |
| `ink.0`       | #0E0E10 | Dark backgrounds, hero gradients     |
