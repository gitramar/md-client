const path = require("path");
const fs = require("fs");
const os = require("os");
const { test, expect, _electron: electron } = require("@playwright/test");

test("opens and renders a markdown file", async () => {
  const appPath = path.join(__dirname, "..", "..");
  const filePath = path.join(__dirname, "..", "fixtures", "sample.md");

  const electronApp = await electron.launch({
    args: [appPath, filePath]
  });

  const window = await electronApp.firstWindow();
  await window.waitForSelector("text=Sample Doc");

  await expect(window.locator("h1")).toHaveText("Sample Doc");
  await expect(window.locator("table")).toBeVisible();

  await electronApp.close();
});

test("edits and saves markdown from the rendered app", async () => {
  const appPath = path.join(__dirname, "..", "..");
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "md-client-"));
  const filePath = path.join(tempDir, "editable.md");
  fs.writeFileSync(filePath, "# Original\n", "utf-8");

  const electronApp = await electron.launch({
    args: [appPath, filePath]
  });

  const window = await electronApp.firstWindow();
  const editor = window.locator("#editor");

  await editor.fill("# Updated\n\n- Item 1\n");
  await window.click("#save-button");

  await expect(window.locator("h1")).toHaveText("Updated");
  await expect(window.locator("li")).toHaveText("Item 1");
  await expect(window.locator("#dirty-indicator")).toHaveText("");

  await electronApp.close();
  expect(fs.readFileSync(filePath, "utf-8")).toContain("# Updated");
});
