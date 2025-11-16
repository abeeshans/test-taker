Placeholder icon files

Files added to this folder:
  - icon.svg        (vector placeholder you can edit)
  - icon.ico        (placeholder text file: replace with a real .ico)
  - icon.icns       (placeholder text file: replace with a real .icns)

How to generate platform icons from the SVG:

1) Using Inkscape (free) or an image editor:
   - Open build/icon.svg
   - Export PNG at 1024x1024 (or 512x512)

2) Generate .ico for Windows (recommended sizes inside):
   - Use https://icoconvert.com/ or ImageMagick + ico support
   - Recommended: include 256x256, 128x128, 64x64, 32x32, 16x16
   - Save as build/icon.ico

3) Generate .icns for macOS:
   - Use iconutil on macOS or an online converter
   - Create an iconset folder with PNGs at 16x16,32x32,128x128,256x256,512x512,1024x1024
   - Run: iconutil -c icns Your.iconset -> build/icon.icns

4) If you prefer CLI tools:
   - ImageMagick example (generate PNGs):
       magick convert -background none build/icon.svg -resize 1024x1024 build/icon-1024.png
   - Then use icnsutil or iconutil on mac to build .icns.

Note: electron-builder looks for build/icon.ico (Windows) and build/icon.icns (macOS).
Replace the placeholder files with valid icons before releasing.