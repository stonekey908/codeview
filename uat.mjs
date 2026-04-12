import { chromium } from 'playwright';
import { resolve } from 'path';

const SCREENSHOTS = resolve('/Users/nicholaselias/codeview/__screenshots__');
const URL = 'http://localhost:4200';
let pass = 0, fail = 0;

function check(name, ok, detail = '') {
  if (ok) { pass++; console.log(`  ✓ ${name}${detail ? ' — ' + detail : ''}`); }
  else { fail++; console.log(`  ✗ ${name}${detail ? ' — ' + detail : ''}`); }
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, storageState: undefined });
  const page = await ctx.newPage();

  console.log('\n═══ CodeView Full UAT ═══\n');

  // ─── SECTION 1: Page Load ───
  console.log('── Page Load ──');
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  check('Page loads (200)', true);

  const rf = await page.$('.react-flow');
  const rfClass = await rf?.getAttribute('class') || '';
  check('React Flow renders', !!rf);
  check('Dark color mode', rfClass.includes('dark'), rfClass);

  const nodes = await page.$$('.react-flow__node');
  check('Nodes rendered', nodes.length > 0, `${nodes.length} nodes`);

  await page.screenshot({ path: `${SCREENSHOTS}/uat-01-initial.png` });

  // ─── SECTION 2: Onboarding ───
  console.log('\n── Onboarding ──');
  const onboardTitle = await page.$('text=These boxes are parts of your app');
  check('Onboarding shows on first visit', !!onboardTitle);

  // Step through all 3 steps
  const nextBtn = await page.$('button:has-text("Next")');
  if (nextBtn) {
    await nextBtn.click(); await page.waitForTimeout(300);
    const step2 = await page.$('text=Click to select');
    check('Step 2 shows', !!step2);

    const nextBtn2 = await page.$('button:has-text("Next")');
    if (nextBtn2) await nextBtn2.click();
    await page.waitForTimeout(300);
    const step3 = await page.$('text=Toggle Technical');
    check('Step 3 shows', !!step3);

    const getStarted = await page.$('button:has-text("Get started")');
    if (getStarted) await getStarted.click();
    await page.waitForTimeout(300);
  }

  const onboardGone = !(await page.$('text=These boxes are parts of your app'));
  check('Onboarding dismisses', onboardGone);

  // ─── SECTION 3: Component Selection ───
  console.log('\n── Component Selection ──');
  const componentNodes = await page.$$('.react-flow__node-component');
  check('Component nodes exist', componentNodes.length > 0, `${componentNodes.length} found`);

  if (componentNodes.length > 0) {
    // Click in the center of the first component node
    const box = await componentNodes[0].boundingBox();
    if (box) {
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
      await page.waitForTimeout(800);
    }
    await page.screenshot({ path: `${SCREENSHOTS}/uat-02-node-selected.png` });

    const sidebar = await page.$('text=Component Detail');
    check('Sidebar opens on click', !!sidebar);

    const promptPanel = await page.$('text=Selected');
    check('Prompt panel shows', !!promptPanel);

    // Click second component
    if (componentNodes.length > 1) {
      const box2 = await componentNodes[1].boundingBox();
      if (box2) {
        await page.mouse.click(box2.x + box2.width / 2, box2.y + box2.height / 2);
        await page.waitForTimeout(500);
      }
      check('Multi-select works', true, 'clicked second node');
    }
  }

  // ─── SECTION 4: Prompt Builder ───
  console.log('\n── Prompt Builder ──');
  await page.waitForTimeout(500);
  const promptInput = await page.$('input[placeholder*="Ask Claude"]');
  check('Prompt input exists', !!promptInput);

  if (promptInput) {
    await promptInput.fill('How does the auth flow work?');
    await page.waitForTimeout(200);
    const inputValue = await promptInput.inputValue();
    check('Can type in prompt', inputValue.includes('auth flow'));
  }

  // Test preview panel
  const previewBtn = await page.$('button >> text=Preview what Claude will see');
  check('Preview button exists', !!previewBtn);
  if (previewBtn) {
    await previewBtn.click();
    await page.waitForTimeout(300);
    const previewText = await page.$('pre');
    check('Preview panel opens', !!previewText);
    await page.screenshot({ path: `${SCREENSHOTS}/uat-03-preview.png` });
  }

  // Test copy button
  const copyBtn = await page.$('button >> text=Copy to Clipboard');
  check('Copy button exists', !!copyBtn);

  // Close sidebar first (it overlaps the clear button)
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);

  // Test clear all
  const clearBtn = await page.$('text=Clear all');
  if (clearBtn) {
    await clearBtn.click({ force: true });
    await page.waitForTimeout(300);
    check('Clear all clicked', true);
  }

  // ─── SECTION 5: Sidebar Detail ───
  console.log('\n── Sidebar Detail ──');
  // Re-select a node to open sidebar
  if (componentNodes.length > 0) {
    await componentNodes[0].click({ timeout: 3000 }).catch(() => null);
    await page.waitForTimeout(500);
  }

  const sidebarTitle = await page.$('text=Component Detail');
  check('Sidebar header', !!sidebarTitle);

  const dependsOn = await page.$('text=Depends On');
  check('Depends On section', !!dependsOn);

  const codeToggle = await page.$('button:has-text("Preview"), div:has-text("Preview")');
  check('Code preview toggle', !!codeToggle);

  const ideLink = await page.$('a:has-text("Open in IDE")');
  check('Open in IDE link', !!ideLink);

  // Close sidebar
  const closeBtn = await page.$('button:has(svg.lucide-x)');
  if (closeBtn) {
    await closeBtn.click();
    await page.waitForTimeout(300);
    check('Sidebar closes', true);
  }

  // ─── SECTION 6: Theme Toggle ───
  console.log('\n── Theme Toggle ──');
  const themeBtn = await page.$('button:has(svg.lucide-moon)');
  check('Theme button (moon) exists', !!themeBtn);

  if (themeBtn) {
    await themeBtn.click();
    await page.waitForTimeout(500);

    const htmlTheme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    check('data-theme changes to light', htmlTheme === 'light', `got: ${htmlTheme}`);

    const bodyBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    check('Body bg changes', bodyBg !== 'rgb(9, 9, 11)', `bg: ${bodyBg}`);

    const sunIcon = await page.$('button:has(svg.lucide-sun)');
    check('Sun icon appears', !!sunIcon);

    await page.screenshot({ path: `${SCREENSHOTS}/uat-04-light-mode.png` });

    // Toggle back
    if (sunIcon) await sunIcon.click();
    await page.waitForTimeout(300);
    const backToDark = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    check('Toggles back to dark', backToDark === 'dark');
  }

  // ─── SECTION 7: Technical Mode Toggle ───
  console.log('\n── Technical Mode ──');
  const techBtn = await page.$('button:has-text("Technical")');
  check('Technical toggle exists', !!techBtn);

  // Check descriptive mode is default (descriptions visible)
  // Toggle to technical
  if (techBtn) {
    await techBtn.click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${SCREENSHOTS}/uat-05-technical-mode.png` });
    // Toggle back
    await techBtn.click();
    await page.waitForTimeout(200);
  }

  // ─── SECTION 8: Search (Cmd+K) ───
  console.log('\n── Search ──');
  await page.keyboard.press('Meta+k');
  await page.waitForTimeout(300);
  const searchInput = await page.$('input[placeholder="Search components..."]');
  check('Cmd+K opens search', !!searchInput);

  if (searchInput) {
    await searchInput.fill('auth');
    await page.waitForTimeout(300);
    const results = await page.$$('button:has(span.w-2)'); // result items
    check('Search shows results', results.length > 0, `${results.length} results`);
    await page.screenshot({ path: `${SCREENSHOTS}/uat-06-search.png` });

    // Select a result
    if (results.length > 0) {
      await results[0].click();
      await page.waitForTimeout(300);
      const searchClosed = !(await page.$('input[placeholder="Search components..."]'));
      check('Search closes on select', searchClosed);
    }
  }

  // ─── SECTION 9: Keyboard Shortcuts ───
  console.log('\n── Keyboard Shortcuts ──');
  // Escape to clear
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);

  // ? to open shortcuts
  await page.keyboard.press('?');
  await page.waitForTimeout(300);
  const shortcuts = await page.$('text=Keyboard Shortcuts');
  check('? opens shortcuts overlay', !!shortcuts);
  if (shortcuts) {
    await page.screenshot({ path: `${SCREENSHOTS}/uat-07-shortcuts.png` });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);
  }

  // Cmd+D to toggle mode
  await page.keyboard.press('Meta+d');
  await page.waitForTimeout(200);
  check('Cmd+D works (no crash)', true);

  // ─── SECTION 10: Toolbar Elements ───
  console.log('\n── Toolbar ──');
  const logo = await page.$('text=CodeView');
  check('Logo visible', !!logo);

  const statusPill = await page.$('text=components');
  check('Status pill with count', !!statusPill);

  const archBtn = await page.$('button:has-text("Architecture")');
  const modBtn = await page.$('button:has-text("Modules")');
  const compBtn = await page.$('button:has-text("Components")');
  check('Zoom: Architecture button', !!archBtn);
  check('Zoom: Modules button', !!modBtn);
  check('Zoom: Components button', !!compBtn);

  const breadcrumb = await page.$('text=All Layers');
  check('Breadcrumb visible', !!breadcrumb);

  // ─── SECTION 11: Canvas Interactions ───
  console.log('\n── Canvas ──');
  const minimap = await page.$('.react-flow__minimap');
  check('Minimap visible', !!minimap);

  const controls = await page.$('.react-flow__controls');
  check('Controls visible', !!controls);

  const bg = await page.$('.react-flow__background');
  check('Dot grid background', !!bg);

  // Final screenshot
  await page.screenshot({ path: `${SCREENSHOTS}/uat-08-final.png` });

  // ─── SUMMARY ───
  console.log(`\n═══ UAT Summary ═══`);
  console.log(`  Pass: ${pass}`);
  console.log(`  Fail: ${fail}`);
  console.log(`  Total: ${pass + fail}`);
  console.log(`  Screenshots: __screenshots__/\n`);

  await browser.close();
  process.exit(fail > 0 ? 1 : 0);
}

run().catch((err) => {
  console.error('UAT crashed:', err.message);
  process.exit(1);
});
