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

  const mainWindow = await electronApp.firstWindow();
  const popupPromise = electronApp.waitForEvent("window");
  await mainWindow.click("#edit-button");
  const editorWindow = await popupPromise;

  const editor = editorWindow.locator("#editor");
  await editor.fill("# Updated\n\n- Item 1\n");

  await expect(mainWindow.locator("h1")).toHaveText("Updated");
  await expect(mainWindow.locator("li")).toHaveText("Item 1");
  await editorWindow.click("#save-button");
  await expect(editorWindow.locator("#dirty-indicator")).toHaveText("");

  await electronApp.close();
  expect(fs.readFileSync(filePath, "utf-8")).toContain("# Updated");
});

test("ctrl/cmd + click opens editor and jumps near clicked text", async () => {
  const appPath = path.join(__dirname, "..", "..");
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "md-client-"));
  const filePath = path.join(tempDir, "jump-target.md");
  fs.writeFileSync(
    filePath,
    "# Intro\n\nParagraph one.\n\nAnchor token unique-jump-target here.\n",
    "utf-8"
  );

  const electronApp = await electron.launch({
    args: [appPath, filePath]
  });

  const mainWindow = await electronApp.firstWindow();
  const popupPromise = electronApp.waitForEvent("window");
  const jumpModifier = process.platform === "darwin" ? "Meta" : "Control";

  await mainWindow
    .locator("text=Anchor token unique-jump-target here.")
    .click({ modifiers: [jumpModifier] });

  const editorWindow = await popupPromise;
  await editorWindow.waitForSelector("#editor");

  const cursorNearClickedLine = await editorWindow.evaluate(() => {
    const editor = document.getElementById("editor");
    const line = "Anchor token unique-jump-target here.";
    const linePos = editor.value.indexOf(line);
    if (linePos < 0) {
      return false;
    }
    const cursor = editor.selectionStart;
    return cursor >= linePos && cursor <= linePos + line.length;
  });

  expect(cursorNearClickedLine).toBeTruthy();
  await electronApp.close();
});

test("renders README screenshot images", async () => {
  const appPath = path.join(__dirname, "..", "..");
  const filePath = path.join(appPath, "README.md");

  const electronApp = await electron.launch({
    args: [appPath, filePath]
  });

  const mainWindow = await electronApp.firstWindow();
  await mainWindow.waitForFunction(() => {
    const images = Array.from(document.querySelectorAll("img"));
    return (
      images.length >= 2 &&
      images.every((image) => image.complete && image.naturalWidth > 0)
    );
  });

  await electronApp.close();
});
