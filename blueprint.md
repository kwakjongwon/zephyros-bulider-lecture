# Lotto Number Generator

## Overview

This is a simple web application that generates random lottery numbers. The user can click a button to get a new set of 6 unique numbers between 1 and 45.

## Design and Features

*   **Modern UI:** The application will have a clean and modern user interface with a visually appealing color scheme and typography.
*   **Responsive Design:** The layout will be responsive and work well on both desktop and mobile devices.
*   **Web Components:** The lottery numbers will be displayed using a custom web component to encapsulate the styling and behavior of each number ball.
*   **CSS Variables:** CSS variables will be used for easy theming and maintenance.
*   **Animations:** Subtle animations will be used to enhance the user experience.

## Current Plan

*   **HTML Structure:** Create the basic HTML structure for the lottery generator, including a title, a button, and a container for the numbers.
*   **CSS Styling:** Style the page with a modern design, including a color palette, fonts, and layout.
*   **JavaScript Logic:**
    *   Create a web component for the lottery balls.
    *   Implement the logic to generate 6 unique random numbers.
    *   Add an event listener to the button to trigger the number generation and display the results.

---

# Dot Homepage Templates (`templates/`)

## Overview

Five framework-less homepage templates that use pixel art / dot-matrix graphics in different ways, plus a gallery page at `templates/index.html`. Each template works with zero image assets: all dot art is drawn in code from pixel maps in `main.js` and can be swapped for real PNG sprite sheets by setting paths in the `ASSETS` object at the top of `main.js`. See `templates/README.md` and each `assets/README.md`.

## Design and Features

| Template | Palette (bg / surface / text / accent) | Fonts | Key interaction |
|---|---|---|---|
| `01-mono-dot` DOTLINE | #111214 / #1B1D20 / #F2F2EC / #F05243 | Pretendard + Doto | 25×25 round-dot hero symbol morphing through 4 shapes; feature tablist swaps dot pattern + example UI |
| `02-pixel-editorial` MONUN STUDIO | #F5F3ED / #22231F / #D8D6CF / #D94D2B (+ #BF4325 for small text) | Pretendard + Galmuri | Click-to-play loop artworks, catalog spec labels, inquiry form |
| `03-desktop-hideout` HIDEOUT.FM | #E7ECE7 / #FAFBF7 / #26372E / #385AC8 | Pretendard + Galmuri | Desktop window manager, music player with dot EQ (demo mode), localStorage guestbook; stacked layout + bottom player on mobile |
| `04-night-diorama` NIGHT HARBOR | #111D2B / #20364A / #F2EBDD / #E2B66C (+ teal #2F7F7A) | Pretendard + Galmuri | Parallax harbor hero with windows lighting on scroll, separate portrait composition on mobile, mini puzzle, character tabs, trailer dialog |
| `05-butter-character` BUTTY | #FFFDF4 / #F3D86A / #243E32 / #E7EBDD | Pretendard + Galmuri | 32×32 mascot with 10 poses; focus/rest/done demo buttons; phone mocks; FAQ accordion |

Shared rules: Korean body text in Pretendard, pixel fonts only for logos/short headings/numbers; color tokens on `:root` only; no glow/neon/noise/particles; reduced-motion support; animations pause off-screen; no horizontal scroll from 320px up.

Hosting: `firebase.json` no longer sets `trailingSlash: false`, so directory URLs such as `/templates/01-mono-dot/` keep their trailing slash and relative asset links resolve.

## Current Plan

- Collect real assets and content from the client per each `assets/README.md` (logos, sprite sheets, screenshots, audio, copy, prices, links).
- Plug assets in via `ASSETS` in each `main.js`; replace example copy and numbers.
- Connect demo forms (02 inquiry, 04 newsletter, 03 guestbook) to real endpoints.
