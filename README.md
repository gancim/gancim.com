# Gancim.com Website

This repository contains the source code for [www.gancim.com](https://www.gancim.com).

## Features

- Clean, minimalistic white-based design
- Responsive layout for all devices
- Smooth scrolling navigation
- Modern web standards

## Setup Instructions

### 1. GitHub Pages Setup

1. Push this repository to GitHub
2. Go to your repository settings
3. Scroll down to "GitHub Pages" section
4. Select "Deploy from a branch"
5. Choose the `main` branch (or your default branch)
6. Click "Save"

Your site will be available at: `https://yourusername.github.io/gancim.com`

### 2. Custom Domain Setup

#### Option A: Using GitHub Pages Custom Domain
1. In the GitHub Pages settings, add your custom domain: `gancim.com`
2. Check "Enforce HTTPS" if available
3. Create a file called `CNAME` in the root directory with content:
   ```
   gancim.com
   ```

#### Option B: Using GoDaddy DNS (Recommended for full control)

1. **Create CNAME record in GoDaddy:**
   - Type: `CNAME`
   - Name: `www`
   - Value: `yourusername.github.io`
   - TTL: 600 (or default)

2. **Create A record for root domain:**
   - Type: `A`
   - Name: `@` (or leave blank)
   - Value: `185.199.108.153`
   - TTL: 600

   Also add these additional A records:
   - `185.199.109.153`
   - `185.199.110.153`
   - `185.199.111.153`

3. **Wait for DNS propagation** (can take up to 48 hours)

### 3. Local Development

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

## File Structure

```
gancim.com/
├── index.html          # Main HTML file
├── styles.css          # CSS styles
├── script.js           # JavaScript functionality
├── README.md           # This file
├── CNAME              # Custom domain file (if using GitHub custom domain)
├── bentobii/          # Subpage accessible at gancim.com/bentobii/
│   └── index.html     # Bentobii subpage
└── _template/         # Template for creating new subpages
    └── index.html     # Template file (copy to create new subpages)
```

## Customization

- Edit `index.html` to change content
- Modify `styles.css` to adjust styling
- Update `script.js` for additional functionality
- Replace placeholder text and images with your own content

## Creating New Subpages

To create a new subpage (e.g., `projects`):

1. **Create a new folder:** `mkdir projects`
2. **Copy the template:** `cp _template/index.html projects/index.html`
3. **Edit the new file:** Replace all instances of `PAGE_NAME` with your actual page name
4. **Update navigation:** Add the new subpage link to the main navigation in `index.html`
5. **Customize content:** Modify the content, features, and styling as needed

The subpage will be accessible at `gancim.com/projects/` once deployed.

## Deployment

After making changes:

1. Commit and push to GitHub
2. GitHub Pages will automatically rebuild and deploy
3. Changes typically appear within a few minutes

## Support

For issues with:
- **GitHub Pages**: Check [GitHub Pages documentation](https://docs.github.com/en/pages)
- **DNS**: Contact GoDaddy support or check their DNS management guide
- **Website code**: Review the HTML, CSS, and JavaScript files

## License

This project is for personal use. Modify as needed for your website.
