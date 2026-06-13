# Instagram Saved Posts Bulk Unsaver

A premium, lightweight Manifest V3 Chrome Extension that allows users to select and bulk-unsave multiple saved posts on Instagram at once. 

It uses safe UI automation (sequentially opening modal items, clicking the bookmark, and closing them) with human-like randomized delays, adaptive cooling throtles, Web Worker background timers, and navigation guards to keep your account safe from rate limits or automated actions flagging.

---

## 🌟 Key Features

- **Circular Selection Checkboxes**: Integrates seamless overlays on top of Instagram saved post thumbnails.
- **Shift + Click Range Selection**: Click a post's checkbox, hold the `Shift` key, and click another post's checkbox to select or deselect all posts in between instantly.
- **localStorage Session Recovery**: Automatically stores progress queue in local cache. If you refresh or close the tab, it prompts you to resume where you left off.
- **Instagram Action Block Detection**: Automatically detects temporary blocks (e.g. "Try again later"), closes the error dialog, enters a **5-minute cooldown period**, and retries the post.
- **Dynamic Scroll Injection**: Injects selection checkboxes on the fly using a `MutationObserver` as you scroll down the infinite-loading grid.
- **Select All / Deselect All**: Select all currently loaded thumbnails on the viewport at once.
- **Smart Human Emulation**: 
  - Randomizes click delays (1.2s to 2.2s) between posts.
  - Pauses for a **4-second cooling period after every 15 posts** to prevent triggering Instagram's rate limiters.
- **Background Tab Support (Web Worker)**: Uses an inline Web Worker thread to coordinate the automation intervals. The extension runs at full speed in the background even if you minimize the browser or switch to other tabs.
- **Accidental Navigation Guard**: Intercepts click events on page routing links and intercepts page closures (`beforeunload`) while the automation is running, preventing loss of progress.
- **Theme-Native Styling**: Automatically detects Instagram's light/dark mode and adapts to look like an official, built-in feature.

---

## 🛠️ Installation

Since this is a custom extension, you can easily load it directly into Google Chrome (or other Chromium browsers like Brave, Edge, and Opera) in **Developer Mode**:

1. Clone or download this repository to your local computer.
2. Open your browser and navigate to: `chrome://extensions/`
3. In the top-right corner of the Extensions page, toggle the **"Developer mode"** switch to **ON**.
4. In the top-left, click **"Load unpacked"**.
5. Select the project directory (`Insta_Actions`) containing the `manifest.json`.
6. The extension is now loaded and ready to use!

---

## 🚀 How to Use

1. Log in to **[Instagram.com](https://www.instagram.com/)**.
2. Go to your Saved page (e.g., `https://www.instagram.com/username/saved/all-posts/` or `https://www.instagram.com/saved/`).
3. A sleek control panel will float in the **top-right** corner.
4. Select the posts you want to unsave (either check them manually, use **Shift + Click**, or click **Select All**).
5. Click **"Unsave Selected"**.
6. **Watch the automation run**:
   - The grid automatically scrolls to keep the currently automated post centered in the viewport.
   - The modal opens, clicks the bookmark button, closes, and waits.
   - Processed thumbnails fade to `30%` opacity to provide visual feedback.
   - Any temporary block prompts trigger a 5-minute cooldown countdown before automatically retrying.
7. **Review Execution Summary**:
   - On completion, the panel displays a **Performance Summary Dashboard** showing time taken, success rates, and skipped counts.
   - A **5-second countdown** automatically reloads the page to update the grid layout. You can click **"Dismiss"** to stay on the page and verify changes.
8. Click **"Stop Unsaving"** at any time to pause or halt the process safely.

---

## ⚙️ How It Works (Under the Hood)

- **Single Page Application (SPA) Routing Sync**: Instagram navigates page routes in React without reloading. The extension's content script runs a background URL scanner. When a post is clicked, it extracts the shortcode (e.g. `Cs51x77y7B`) and waits for the browser path to change to `/p/Cs51x77y7B/` before resolving DOM elements, ensuring zero timing bugs.
- **Strict Element Scoping**: Queries for bookmark and close buttons are executed **exclusively** inside the active modal container's `<article>` tag, preventing the script from picking up background elements.
- **Throttling Bypass**: Standard browser tabs throttle `setTimeout` calls to `1000ms` when in the background. The Web Worker thread bypasses this restriction entirely.
- **Escape Key Emulation**: Dismisses details modals by dispatching an `Escape` KeyboardEvent to the document, which acts as a robust close fallback.

---

## 📂 File Structure

```text
Insta_Actions/
├── manifest.json   # Extension configuration (Manifest V3)
├── content.js      # Core UI automation engine & controls
├── content.css     # Injected layout styles (adaptive dark/light)
├── icon16.png      # Extension icon (16x16)
├── icon48.png      # Extension icon (48x48)
├── icon128.png     # Extension icon (128x128)
└── README.md       # Project documentation
```
