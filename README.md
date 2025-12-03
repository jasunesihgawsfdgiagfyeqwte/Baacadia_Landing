# BAACADIA Landing Page

A Moebius-inspired landing page for BAACADIA - A healing adventure through sound.

## Project Structure

```
baacadia-landing/
├── index.html          # Main HTML file
├── css/
│   └── styles.css      # All styles (CSS variables, animations, responsive)
├── js/
│   └── main.js         # WebGL scene (Three.js) + interactions
├── sheep.glb           # 3D Cloudfen model (optional - falls back to procedural)
└── README.md
```

## Features

- **WebGL Background**: Interactive 3D scene with animated Cloudfens using Three.js
- **Moebius Art Style**: Toon shading, ligne claire aesthetic
- **Scroll Animations**: Parallax camera movement, reveal animations
- **Mobile Optimized**: Reduced particle count, simplified rendering on mobile
- **Accessibility**: Respects `prefers-reduced-motion`, semantic HTML
- **Performance**: Lazy loading, optimized render loop

## Quick Start

### Option 1: Static File Server
```bash
# Using Python
python -m http.server 8000

# Using Node.js
npx serve
```

Then open `http://localhost:8000`

### Option 2: GitHub Pages
1. Push to GitHub repository
2. Go to Settings → Pages
3. Select "Deploy from a branch" → `main` → `/ (root)`
4. Your site will be live at `https://username.github.io/repo-name`

### Option 3: Netlify / Vercel
Just drag & drop the folder or connect your Git repository.

## 3D Model

The page expects a `sheep.glb` file in the root directory. If not found, it automatically falls back to procedural Cloudfen generation.

To add the custom model:
1. Place `sheep.glb` in the root directory
2. The model should have meshes named with "wool" for white parts
3. All other meshes will be rendered black

## Color Palette (Art Bible)

| Purpose       | Color     | Hex       |
|---------------|-----------|-----------|
| Sky Peach     | Primary   | `#f5d5c8` |
| Sky Lavender  | Secondary | `#c8b8c0` |
| Sand          | Terrain   | `#d4a574` |
| Flora Dark    | Accent    | `#8b5a5a` |
| Crystal Pink  | Highlight | `#e8a8b8` |
| Ink           | Text      | `#2a2420` |

## Browser Support

- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

## Credits

- **Project**: USC Games · Advanced Games Project 2025-2026
- **Cloudfen Model**: Hannah
- **Design Document**: Baacadia Team

## License

All rights reserved. This is a student project for USC Games.
