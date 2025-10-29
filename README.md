# Test Taker — Local Development & Packaging Notes

This repo is a local Electron renderer UI for a small test-taking app. You asked to use the provided PracticeTests SVG as the app logo and the deployed app icon.

What I changed in this branch

- Added `assets/PracticeTests-icon-03.svg` and replaced the inline header logo with a clickable image that returns the user to the Dashboard.

Packaging / App Icon Notes

- Electron packaging typically requires platform-specific icon files (ICO for Windows, ICNS for macOS, PNG for Linux). The SVG will work as a favicon in the renderer and as the header logo in the app, but packaging tools need raster/icon formats.

Recommended quick workflow

1. Create platform icons from the SVG (example tools):

   - Use ImageMagick or png2ico to produce an ICO: `magick convert -background transparent assets/PracticeTests-icon-03.svg -resize 256x256 icon.png` then `png2ico app-icon.ico icon.png`.
   - For macOS, use `iconutil` with an `.iconset` made from multiple PNG sizes to build an ICNS.

2. If you use `electron-builder`, add the icon paths to `package.json` under `build`:

```json
"build": {
  "icon": "build/icon.ico"
}
```

3. Place the generated icons in a `build/` directory (or update your packager config) and run your packager.

If you want, I can add a small build script that converts the SVG into PNG sizes (requires ImageMagick) and place them under `build/` so your packager can use them automatically.

How to preview in the app

- Start the app and click the logo in the header — it will go to the Dashboard root.
- The header image uses the SVG directly so it should be crisp at any scale.

If you'd like me to also auto-generate ICO/ICNS files from the SVG in this repo (and add `npm` scripts), tell me which platforms you target and I’ll add the scripts and dev-deps.
