# Instagram Bulk Unsaver

A Manifest V3 Chrome Extension to bulk-unsave multiple saved posts on Instagram.

## Features

- **Multi-Selection Checkboxes**: Injects checkboxes onto saved post thumbnails.
- **Shift + Click Range Selection**: Select or deselect a range of posts.
- **Session Recovery**: Stores the queue in `localStorage`. If the page is refreshed or closed, it prompts to resume.
- **Action Block Protection**: Detects "Try again later" blocks, pauses for 5 minutes, and retries the post.
- **Background Execution**: Uses a Web Worker background timer to avoid browser throttling in background tabs.
- **Accidental Navigation Guard**: Prevents accidental page navigation or closure while running.
- **Performance Summary**: Displays stats (unsaved, skipped, elapsed time) and auto-reloads after completion.

## Installation

1. Clone or download this repository.
2. Open Chrome and navigate to `chrome://extensions/`.
3. Enable **Developer mode** (top-right).
4. Click **Load unpacked** (top-left) and select the project directory.

## How to Use

1. Navigate to your Saved posts page on Instagram (e.g., `https://www.instagram.com/username/saved/`).
2. Use the floating control panel in the top-right to select posts.
3. Click **Unsave Selected**.
4. The extension will sequentially open, unsave, and close each post using randomized delays (1.2s - 2.2s) and cooldown periods (4s every 15 posts) to avoid rate limits.

## Project Structure

- `manifest.json`: Extension manifest configuration.
- `content.js`: Main automation engine.
- `content.css`: Injected UI styles.
- `icon16.png`, `icon48.png`, `icon128.png`: Extension icons.
