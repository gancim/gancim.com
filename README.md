# Gancim.com Website

This repository contains the source code for [www.gancim.com](https://www.gancim.com).

## About

Personal website for Marco Ganci featuring:
- Clean, minimalistic design
- Responsive layout for all devices
- Social media links and professional branding
- BentoBii app showcase subpage

## Features

- **Ultra-minimal single page design** with centered logo
- **Integrated social media icons** with custom hover effects
- **Responsive design** optimized for all screen sizes
- **Logo hover animations** with smooth transitions
- **Custom favicon support** for all platforms
- **Bilingual content** (English/Japanese)

## File Structure

```
gancim.com/
├── index.html                    # Main homepage
├── logo.png                      # Main logo
├── logo_2.png                    # Hover logo
├── favicon.ico                   # Favicon
├── site.webmanifest             # Web app manifest
├── images/                       # Social media icons
│   ├── linkedin.png
│   ├── github.png
│   ├── instagram.png
│   ├── x.png
│   ├── mail.png
│   └── applestore.png
├── bentobii/                     # BentoBii app subpage
│   ├── index.html
│   ├── styles.css
│   ├── privacy-policy.html
│   └── structured-data.json
├── sitemap.xml                   # SEO sitemap
├── robots.txt                    # SEO robots file
└── README.md                     # This file
```

## Social Media Links

- **LinkedIn**: [linkedin.com/in/marcoganci](https://linkedin.com/in/marcoganci)
- **GitHub**: [github.com/gancim](https://github.com/gancim)
- **X (Twitter)**: [twitter.com/MrGanci](https://twitter.com/MrGanci)
- **Instagram**: [instagram.com/gancirama](https://www.instagram.com/gancirama/)
- **App Store**: [Apple Developer Profile](https://apps.apple.com/us/developer/marco-ganci/id1832268650)
- **Email**: marco.ganci@gmail.com

## Development

To run the website locally:

1. Clone the repository
2. Open `index.html` in your browser
3. Or use a local server:
   ```bash
   # Using Python 3
   python -m http.server 8000
   
   # Using Node.js
   npx serve .
   ```

## Deployment

The website is automatically deployed via GitHub Pages. After pushing changes:

1. Commit and push to GitHub
2. GitHub Pages will automatically rebuild and deploy
3. Changes typically appear within a few minutes

## License

This project is for personal use. Modify as needed for your website.
