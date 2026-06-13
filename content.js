// Instagram Saved Posts Bulk Unsaver - Content Script
let isRunning = false;
let shouldStop = false;
let currentUrl = '';
let checkInterval = null;
let observer = null;
let panelEl = null;

// Start checking URL for Single Page Application navigation
function startUrlCheck() {
  if (checkInterval) return;
  checkInterval = setInterval(() => {
    const href = window.location.href;
    if (href !== currentUrl) {
      currentUrl = href;
      handleUrlChange();
    }
  }, 1000);
  
  // Initial check
  currentUrl = window.location.href;
  handleUrlChange();
}

function handleUrlChange() {
  const path = window.location.pathname;
  const isSavedPage = path.includes('/saved/');
  const isPostModal = path.startsWith('/p/') || path.startsWith('/reels/') || path.startsWith('/tv/');
  
  if (isSavedPage) {
    initExtension();
  } else if (isPostModal) {
    // Keep the panel and state active because the modal is overlayed on top of the saved posts page
  } else {
    // The user has navigated away to a completely different page (home feed, explore, direct, etc.)
    removeExtension();
  }
}

// Injects the control panel and starts monitoring the grid for posts
function initExtension() {
  if (document.getElementById('ibu-floating-panel')) {
    injectCheckboxes(); // Ensure checkboxes are injected on currently loaded items
    return;
  }
  
  // 1. Create floating control panel
  panelEl = document.createElement('div');
  panelEl.id = 'ibu-floating-panel';
  panelEl.className = 'ibu-panel';
  panelEl.innerHTML = `
    <div class="ibu-header">
      <h3 class="ibu-title">
        <svg class="ibu-title-icon" viewBox="0 0 24 24">
          <path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z"/>
        </svg>
        Bulk Unsaver
      </h3>
      <button id="ibu-toggle-btn" class="ibu-toggle-btn" title="Minimize/Maximize">
        <svg viewBox="0 0 24 24">
          <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/>
        </svg>
      </button>
    </div>
    <div class="ibu-body">
      <div class="ibu-counter">
        <span>Selected Posts</span>
        <span id="ibu-selected-count" class="ibu-count-badge">0</span>
      </div>
      
      <div class="ibu-btn-group">
        <button id="ibu-select-all" class="ibu-btn">Select All</button>
        <button id="ibu-deselect-all" class="ibu-btn">Deselect All</button>
        <button id="ibu-action-btn" class="ibu-btn ibu-btn-primary" disabled>Unsave Selected</button>
        <button id="ibu-stop-btn" class="ibu-btn ibu-btn-danger" style="display: none;">Stop Unsaving</button>
      </div>
      
      <div id="ibu-progress" class="ibu-progress-wrapper">
        <div id="ibu-status-text" class="ibu-status-text">Status: Idle</div>
        <div class="ibu-progress-container">
          <div id="ibu-progress-bar" class="ibu-progress-bar"></div>
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(panelEl);
  
  // Attach Event Listeners to Panel Buttons
  document.getElementById('ibu-toggle-btn').addEventListener('click', togglePanel);
  document.getElementById('ibu-select-all').addEventListener('click', selectAllPosts);
  document.getElementById('ibu-deselect-all').addEventListener('click', deselectAllPosts);
  document.getElementById('ibu-action-btn').addEventListener('click', unsaveSelectedPosts);
  document.getElementById('ibu-stop-btn').addEventListener('click', () => {
    shouldStop = true;
    document.getElementById('ibu-status-text').textContent = 'Stopping...';
  });
  
  // 2. Start MutationObserver to monitor dynamically loaded posts
  const targetNode = document.querySelector('main') || document.body;
  observer = new MutationObserver(() => {
    injectCheckboxes();
  });
  observer.observe(targetNode, {
    childList: true,
    subtree: true
  });
  
  // Initial injection
  injectCheckboxes();
}

// Collapses / Expands the control panel
function togglePanel() {
  if (panelEl) {
    panelEl.classList.toggle('collapsed');
  }
}

// Scans the Instagram main grid container and injects checkboxes on post thumbnails
function injectCheckboxes() {
  const main = document.querySelector('main');
  if (!main) return;
  
  // Target anchor tags that point to posts or reels
  const posts = main.querySelectorAll('a[href^="/p/"], a[href^="/reels/"]');
  
  posts.forEach(post => {
    // Check if the checkbox has already been injected
    if (post.querySelector('.ibu-checkbox-wrapper')) return;
    
    // Ensure anchor has relative positioning to place checkbox correctly
    if (window.getComputedStyle(post).position === 'static') {
      post.style.position = 'relative';
    }
    
    // Create Checkbox wrapper
    const cbWrapper = document.createElement('div');
    cbWrapper.className = 'ibu-checkbox-wrapper';
    cbWrapper.innerHTML = `
      <div class="ibu-checkbox">
        <svg class="ibu-checkbox-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
      </div>
    `;
    
    // Prevent default anchor clicks & toggle selection state
    const preventAndToggle = (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      if (isRunning) return; // Ignore input while automation loop is running
      
      cbWrapper.classList.toggle('selected');
      if (cbWrapper.classList.contains('selected')) {
        post.classList.add('ibu-post-selected');
      } else {
        post.classList.remove('ibu-post-selected');
      }
      updateSelectedCount();
    };
    
    cbWrapper.addEventListener('click', preventAndToggle);
    cbWrapper.addEventListener('mousedown', (e) => { e.preventDefault(); e.stopPropagation(); });
    cbWrapper.addEventListener('mouseup', (e) => { e.preventDefault(); e.stopPropagation(); });
    cbWrapper.addEventListener('dblclick', (e) => { e.preventDefault(); e.stopPropagation(); });
    
    post.appendChild(cbWrapper);
  });
}

// Updates Selected Posts badge and button state
function updateSelectedCount() {
  const count = document.querySelectorAll('.ibu-checkbox-wrapper.selected').length;
  const badge = document.getElementById('ibu-selected-count');
  const actionBtn = document.getElementById('ibu-action-btn');
  const statusText = document.getElementById('ibu-status-text');
  
  if (badge) badge.textContent = count;
  if (actionBtn) {
    actionBtn.disabled = count === 0;
  }
  
  // Warning for high selection counts
  if (count > 50 && !isRunning) {
    const progressWrapper = document.getElementById('ibu-progress');
    if (progressWrapper) progressWrapper.style.display = 'flex';
    if (statusText) {
      statusText.innerHTML = '⚠️ Selecting >50 posts. The extension will automatically adjust delays to evade rate limits.';
      statusText.style.color = '#fa383e';
    }
  } else if (!isRunning) {
    const progressWrapper = document.getElementById('ibu-progress');
    if (progressWrapper) progressWrapper.style.display = 'none';
    if (statusText) {
      statusText.textContent = 'Status: Idle';
      statusText.style.color = '';
    }
  }
}

// Selects all currently loaded posts
function selectAllPosts() {
  if (isRunning) return;
  const main = document.querySelector('main');
  if (!main) return;
  
  const checkboxes = main.querySelectorAll('.ibu-checkbox-wrapper');
  checkboxes.forEach(cb => {
    cb.classList.add('selected');
    const post = cb.closest('a');
    if (post) {
      post.classList.add('ibu-post-selected');
    }
  });
  updateSelectedCount();
}

// Unselects all posts
function deselectAllPosts() {
  if (isRunning) return;
  const main = document.querySelector('main');
  if (!main) return;
  
  const checkboxes = main.querySelectorAll('.ibu-checkbox-wrapper');
  checkboxes.forEach(cb => {
    cb.classList.remove('selected');
    const post = cb.closest('a');
    if (post) {
      post.classList.remove('ibu-post-selected');
    }
  });
  updateSelectedCount();
}

// Bookmark Button Detectors (handles multiple languages and SVG properties)
function isBookmarkLabel(label) {
  const l = label.toLowerCase();
  return l.includes('save') || l.includes('remove') || l.includes('unsave') || 
         l.includes('bookmark') || l.includes('enregistr') || l.includes('guardar') || 
         l.includes('salv') || l.includes('speichern') || l.includes('elimin');
}

function getShortcodeFromHref(href) {
  if (!href) return null;
  const match = href.match(/\/(p|reels|tv)\/([A-Za-z0-9_-]+)/);
  return match ? match[2] : null;
}

function findActiveModal() {
  // Find article inside modal dialog overlays
  const dialogs = document.querySelectorAll('div[role="dialog"], div[role="presentation"]');
  for (const dialog of dialogs) {
    // Exclude our own panel
    if (dialog.contains(panelEl)) continue;
    const article = dialog.querySelector('article');
    if (article) return article;
  }
  
  // Fallback: search for the last article tag in the DOM
  const articles = document.querySelectorAll('article');
  if (articles.length > 0) {
    return articles[articles.length - 1];
  }
  return null;
}

function findBookmarkButton(modalArticle) {
  if (!modalArticle) return null;
  
  // Search SVG elements strictly inside the modal article
  const svgs = modalArticle.querySelectorAll('svg');
  for (const svg of svgs) {
    const label = svg.getAttribute('aria-label');
    if (label && isBookmarkLabel(label)) {
      return svg.closest('button') || svg.closest('[role="button"]') || svg;
    }
  }
  
  // Search button elements strictly inside the modal article
  const buttons = modalArticle.querySelectorAll('button, [role="button"]');
  for (const btn of buttons) {
    const label = btn.getAttribute('aria-label');
    if (label && isBookmarkLabel(label)) {
      return btn;
    }
  }
  
  return null;
}

// Check if button is already in unsaved state
function isAlreadyUnsaved(buttonOrSvg) {
  const svg = buttonOrSvg.tagName === 'svg' ? buttonOrSvg : buttonOrSvg.querySelector('svg');
  if (!svg) return false;
  
  const label = (svg.getAttribute('aria-label') || '').toLowerCase();
  
  const unsavedKeywords = ['save', 'guardar', 'enregistrer', 'speichern', 'salva'];
  const savedKeywords = ['remove', 'unsave', 'quitar', 'eliminar', 'retirer', 'speicherung aufheben', 'rimuovi'];
  
  // Explicitly check for saved indicators (meaning we need to click)
  for (const kw of savedKeywords) {
    if (label.includes(kw)) return false; // Is saved
  }
  
  // Check for unsaved indicators (already unsaved)
  for (const kw of unsavedKeywords) {
    if (label.includes(kw)) return true; // Is already unsaved
  }
  
  return false; // Fallback: click it just in case
}

// Close Instagram post details modal
function closeModal() {
  const escapeEvent = new KeyboardEvent('keydown', {
    key: 'Escape',
    code: 'Escape',
    keyCode: 27,
    which: 27,
    bubbles: true,
    cancelable: true
  });
  document.dispatchEvent(escapeEvent);
  window.dispatchEvent(escapeEvent);
  
  // Fallback close button click (find close buttons strictly inside the dialog/modal overlay)
  const dialogs = document.querySelectorAll('div[role="dialog"], div[role="presentation"]');
  for (const dialog of dialogs) {
    if (dialog.contains(panelEl)) continue;
    const closeSvgs = dialog.querySelectorAll('svg[aria-label="Close"], svg[aria-label="Back"], svg[aria-label="Fermer"], svg[aria-label="Cerrar"]');
    for (const svg of closeSvgs) {
      const btn = svg.closest('button') || svg;
      if (btn) {
        btn.click();
        return;
      }
    }
  }
}

// Main Automation Loop
// Web Worker for background tab timer (prevents browser throttling sleep timers when tab is inactive)
let timerWorker = null;
function initTimerWorker() {
  if (timerWorker) return;
  const workerCode = `
    self.onmessage = function(e) {
      setTimeout(function() {
        self.postMessage('tick');
      }, e.data);
    };
  `;
  const blob = new Blob([workerCode], { type: 'application/javascript' });
  timerWorker = new Worker(URL.createObjectURL(blob));
}

function workerSleep(ms) {
  initTimerWorker();
  return new Promise(resolve => {
    const handleMessage = (e) => {
      if (e.data === 'tick') {
        timerWorker.removeEventListener('message', handleMessage);
        resolve();
      }
    };
    timerWorker.addEventListener('message', handleMessage);
    timerWorker.postMessage(ms);
  });
}

// Intercept page navigation attempts when automation is running
function navigationInterceptor(e) {
  if (!isRunning) return;
  const anchor = e.target.closest('a');
  if (anchor) {
    const href = anchor.getAttribute('href');
    if (href && !href.includes('/saved/') && !href.includes('/p/') && !href.includes('/reels/') && !href.includes('/tv/')) {
      e.preventDefault();
      e.stopPropagation();
      showNavigationAlert();
    }
  }
}

function beforeUnloadHandler(e) {
  if (isRunning) {
    e.preventDefault();
    e.returnValue = 'Bulk Unsaver is currently running. If you leave, progress will be lost.';
    return e.returnValue;
  }
}

function showNavigationAlert() {
  const statusText = document.getElementById('ibu-status-text');
  if (statusText) {
    statusText.textContent = '⚠️ Intercepted navigation. Stop first to leave!';
    statusText.style.color = '#fa383e';
    setTimeout(() => {
      if (isRunning) {
        statusText.style.color = '';
      }
    }, 3000);
  }
  alert('Bulk Unsaver is currently running. Please click "Stop Unsaving" before navigating away from this page.');
}

async function unsaveSelectedPosts() {
  const selectedCheckboxes = Array.from(document.querySelectorAll('.ibu-checkbox-wrapper.selected'));
  if (selectedCheckboxes.length === 0) return;

  isRunning = true;
  shouldStop = false;
  
  // Capture page navigation attempts to prevent breaking the script
  document.addEventListener('click', navigationInterceptor, true);
  window.addEventListener('beforeunload', beforeUnloadHandler);
  
  const progressWrapper = document.getElementById('ibu-progress');
  const progressBar = document.getElementById('ibu-progress-bar');
  const statusText = document.getElementById('ibu-status-text');
  const actionBtn = document.getElementById('ibu-action-btn');
  const stopBtn = document.getElementById('ibu-stop-btn');
  const selectAllBtn = document.getElementById('ibu-select-all');
  const deselectAllBtn = document.getElementById('ibu-deselect-all');
  
  // Setup executing UI state
  progressWrapper.style.display = 'flex';
  statusText.style.color = ''; // Reset warning color
  actionBtn.style.display = 'none';
  stopBtn.style.display = 'block';
  selectAllBtn.disabled = true;
  deselectAllBtn.disabled = true;
  
  // Gather shortcodes and checkbox mappings to make them immune to DOM recycling/virtualization
  const selectedShortcodes = [];
  const cbMap = new Map();
  selectedCheckboxes.forEach(cb => {
    const post = cb.closest('a');
    if (post) {
      const shortcode = getShortcodeFromHref(post.href);
      if (shortcode) {
        selectedShortcodes.push(shortcode);
        cbMap.set(shortcode, cb);
      }
    }
  });
  
  const total = selectedShortcodes.length;
  let current = 0;
  
  for (const shortcode of selectedShortcodes) {
    if (shouldStop) {
      break;
    }
    
    current++;
    const percent = Math.round((current / total) * 100);
    progressBar.style.width = `${percent}%`;
    
    // Resolve post element and checkbox dynamically from current DOM state
    const post = document.querySelector(`a[href*="/p/${shortcode}/"], a[href*="/reels/${shortcode}/"], a[href*="/tv/${shortcode}/"]`);
    const cb = cbMap.get(shortcode);
    
    if (!post) {
      console.warn('Post element not found in DOM for shortcode:', shortcode);
      statusText.textContent = `Skipped: Post not found in grid (${current}/${total})`;
      continue;
    }
    
    statusText.textContent = `Scrolling to post ${current} of ${total}...`;
    
    // Smoothly scroll to the target post to load virtualized elements and show visual progress
    post.scrollIntoView({ block: 'center', behavior: 'smooth' });
    await workerSleep(500); // wait for scroll to finish using web worker sleep
    
    statusText.textContent = `Opening post ${current} of ${total}...`;
    
    // 1. Click the post thumbnail to open modal
    post.click();
    
    // Wait for the browser URL to update to the post page (meaning SPA route has changed)
    let urlRetries = 15;
    while (urlRetries > 0 && !shouldStop) {
      if (window.location.pathname.includes(shortcode)) {
        break;
      }
      await workerSleep(100);
      urlRetries--;
    }
    
    // Allow React/DOM rendering animation to settle
    await workerSleep(350);
    
    // 2. Wait for modal load and look for the bookmark button strictly inside the active modal
    let button = null;
    let retries = 15; // Wait up to 4.5 seconds (15 * 300ms)
    while (retries > 0 && !shouldStop) {
      const modalArticle = findActiveModal();
      if (modalArticle) {
        button = findBookmarkButton(modalArticle);
        if (button) break;
      }
      await workerSleep(300);
      retries--;
    }
    
    if (shouldStop) break;
    
    if (!button) {
      console.warn('Bookmark button not found for post:', post.href);
      statusText.textContent = `Skipped: Button not found (${current}/${total})`;
    } else {
      if (isAlreadyUnsaved(button)) {
        statusText.textContent = `Skipping: Already unsaved (${current}/${total})`;
      } else {
        statusText.textContent = `Unsaving post ${current} of ${total}...`;
        button.click();
        await workerSleep(800); // Wait for click to register on server
      }
      
      // Update Grid feedback
      post.style.opacity = '0.3';
      if (cb) {
        cb.classList.remove('selected');
        cb.style.display = 'none'; // Hide the checkbox as it is processed
      }
      post.classList.remove('ibu-post-selected');
    }
    
    // 3. Close the modal
    closeModal();
    
    // Wait for modal to actually close (look for active modal or url change back to saved)
    let closeRetries = 15;
    while (closeRetries > 0) {
      const modalArticle = findActiveModal();
      if (!modalArticle || !findBookmarkButton(modalArticle)) {
        if (window.location.pathname.includes('/saved/')) {
          break;
        }
      }
      await workerSleep(150);
      closeRetries--;
    }
    
    // 4. Baked-in Delay before opening the next post
    // Base delay: 1.2s to 2.2s randomized to mimic human reading/clicking speed
    const baseDelay = 1200 + Math.random() * 1000;
    
    // Adaptive cooling period: after every 15 posts, add a 4s pause
    let coolDelay = 0;
    if (current > 0 && current % 15 === 0) {
      coolDelay = 4000;
    }
    
    const totalDelay = baseDelay + coolDelay;
    
    // Sleep loop in 100ms steps using the Web Worker timer
    const delaySteps = Math.ceil(totalDelay / 100);
    for (let i = 0; i < delaySteps; i++) {
      if (shouldStop) break;
      
      const remainingSec = ((delaySteps - i) * 0.1).toFixed(1);
      if (coolDelay > 0 && i < (coolDelay / 100)) {
        statusText.textContent = `Cooling down... ${remainingSec}s (${current}/${total})`;
      } else {
        statusText.textContent = `Waiting ${remainingSec}s... (${current}/${total})`;
      }
      
      await workerSleep(100);
    }
    
    updateSelectedCount();
  }
  
  // Remove navigation restrictions
  document.removeEventListener('click', navigationInterceptor, true);
  window.removeEventListener('beforeunload', beforeUnloadHandler);
  
  // Restore default UI state
  isRunning = false;
  actionBtn.style.display = 'block';
  stopBtn.style.display = 'none';
  selectAllBtn.disabled = false;
  deselectAllBtn.disabled = false;
  
  if (shouldStop) {
    statusText.textContent = `Stopped! Unsaved ${current - 1} of ${total} posts.`;
  } else {
    statusText.textContent = `Completed! Reloading page in 2s...`;
    progressBar.style.width = '100%';
    await workerSleep(2000);
    window.location.reload();
  }
  
  // Hide progress after a brief layout delay if not running
  setTimeout(() => {
    if (!isRunning) {
      progressWrapper.style.display = 'none';
    }
  }, 4000);
}
// Cleans up all injected elements on navigation away from saved posts
function removeExtension() {
  if (observer) {
    observer.disconnect();
    observer = null;
  }
  
  if (panelEl) {
    panelEl.remove();
    panelEl = null;
  }
  
  // Clean up Web Worker if existing
  if (timerWorker) {
    timerWorker.terminate();
    timerWorker = null;
  }
  
  // Clean up global navigation listeners
  document.removeEventListener('click', navigationInterceptor, true);
  window.removeEventListener('beforeunload', beforeUnloadHandler);
  
  const checkboxes = document.querySelectorAll('.ibu-checkbox-wrapper');
  checkboxes.forEach(cb => cb.remove());
  
  const selectedPosts = document.querySelectorAll('.ibu-post-selected');
  selectedPosts.forEach(post => {
    post.classList.remove('ibu-post-selected');
    post.style.opacity = '';
  });
}

// Initialize content script
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startUrlCheck);
} else {
  startUrlCheck();
}
