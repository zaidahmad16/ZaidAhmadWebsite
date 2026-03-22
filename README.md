# Zaid Ahmad - Personal Portfolio Website

My personal portfolio website showcasing projects, skills, and experience as a Computer Science student at Carleton University.

## Features

- Editorial design with dramatic typography and grain texture overlay
- Viewport-filling hero with animated text reveal
- Horizontal scrolling marquee for tech stack
- Full-width project cards with gradient visuals and hover effects
- Experience grid table with role descriptions
- 3D MacBook model (Three.js + GLB) that spins into view on scroll
- Click the MacBook screen to open resume in a new tab
- Contact form with Web3Forms integration
- Nav that hides/shows on scroll
- Responsive design for all devices
- Smooth scroll animations and staggered reveals

## Live Site

[zaidahmad.dev](https://zaidahmad.dev)

## Tech Stack

- HTML5
- CSS3 (Custom properties, Flexbox, Grid, clamp() fluid typography)
- JavaScript (ES6+ modules)
- Three.js (3D MacBook model rendering)
- Web3Forms API (contact form)
- Font Awesome Icons
- Google Fonts (Inter, JetBrains Mono)

## Project Structure

```
ZaidAhmadWebsite/
├── index.html                          # Main HTML file
├── static/
│   ├── styles.css                      # All styles
│   ├── script.js                       # UI interactions and animations
│   ├── macbook.js                      # Three.js 3D MacBook scene
│   ├── macbook_pro_14_inch_M5.glb      # 3D MacBook model
│   └── ZaidAhmadCV.pdf                 # Resume PDF
└── README.md
```

## Sections

- **Hero** - Full-viewport name with availability status and CTAs
- **Marquee** - Scrolling tech stack ticker
- **About** - Personal statement with animated stat counters
- **Work** - Featured projects (BuildAtlas, ShelterMatch Ottawa, Portfolio, Multithreaded C Sim)
- **Experience** - Role history and education with course tags
- **Resume** - Interactive 3D MacBook displaying resume
- **Contact** - Form + direct links (email, GitHub, LinkedIn)

## Deployment

Hosted on Netlify as a static website.

### Local Development

```bash
python -m http.server 3000
```

Then open http://localhost:3000

## License

© 2025 Zaid Ahmad. All rights reserved.

## Contact

- Email: zaidahmad8060@gmail.com
- GitHub: [zaidahmad16](https://github.com/zaidahmad16)
- LinkedIn: [zaid-ahmad-ba9b10224](https://linkedin.com/in/zaid-ahmad-ba9b10224)
