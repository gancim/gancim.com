# Gancim.com Website

This repository contains the source code for [www.gancim.com](https://www.gancim.com).

## About

Marco Ganci's personal site: **Dad, Surfer, Pizza Expert and sometimes Software Maker!**.

The homepage is one WebGL particle system on a near-black page. The same particles hold a different shape for each section (the sea, two boys and a black shiba running down the shore, a breaking wave, a pizza, a wall of code).

It's a static site served by GitHub Pages from `main`, with **no build step**. Edit a file, push, done.

## File Structure

```
gancim.com/
├── index.html              # Homepage: all the copy and links live here
├── 404.html                # Self-contained
├── assets/
│   ├── css/site.css        # Layout, type, reveals, no-WebGL fallback
│   ├── js/main.js          # Scroll position, hover wiring, cursor, boot
│   ├── js/world.js         # three.js renderer, particle shaders, where each shape sits on screen
│   ├── js/shapes.js        # The shapes themselves: one function each
│   ├── img/                # Smaller copies of the drawing that the particles sample (b is the wink)
│   └── vendor/             # three.js r170, vendored (no CDN, no npm)
├── logo.png, logo_2.png    # The original drawing
├── images/                 # Icons
├── bentobii/, sesh/, japananas/, webcam/   # Project pages, not linked from the homepage
├── sitemap.xml, robots.txt
└── README.md
```

Visitors with no WebGL get a static version, `prefers-reduced-motion` is respected, and the renderer lowers its resolution automatically on slower GPUs.

## Social Media Links

- **LinkedIn**: [linkedin.com/in/marcoganci](https://linkedin.com/in/marcoganci)
- **GitHub**: [github.com/gancim](https://github.com/gancim)
- **X (Twitter)**: [twitter.com/MrGanci](https://twitter.com/MrGanci)
- **Instagram**: [instagram.com/gancirama](https://www.instagram.com/gancirama/)
- **Email**: marco.ganci@gmail.com

## Development

Modules need a local server rather than `file://`:

```bash
python3 -m http.server 4173
```

Then open http://localhost:4173.

## Deployment

The website is automatically deployed via GitHub Pages. After pushing changes:

1. Commit and push to GitHub
2. GitHub Pages will automatically rebuild and deploy
3. Changes typically appear within a few minutes

## License

This project is for personal use. Modify as needed for your website.
