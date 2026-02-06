const path = require("path");
const fs = require("fs");
const os = require("os");
const { test, expect, _electron: electron } = require("@playwright/test");

test("renders plain text as preformatted", async () => {
  const appPath = path.join(__dirname, "..", "..");
  const filePath = path.join(__dirname, "..", "fixtures", "sample.txt");

  const electronApp = await electron.launch({
    args: [appPath, filePath]
  });

  const window = await electronApp.firstWindow();
  await window.waitForSelector("pre.preformatted");

  await expect(window.locator("pre.preformatted")).toContainText(
    "Plain text fixture line 1."
  );

  await electronApp.close();
});

test("renders code files with highlighting and line numbers", async () => {
  const appPath = path.join(__dirname, "..", "..");
  const filePath = path.join(__dirname, "..", "fixtures", "sample.js");

  const electronApp = await electron.launch({
    args: [appPath, filePath]
  });

  const window = await electronApp.firstWindow();
  await window.waitForSelector(".codehilitetable");

  await expect(window.locator(".codehilitetable .linenos")).toContainText("1");
  await expect(window.locator(".codehilitetable .code")).toContainText(
    "function hello"
  );

  await electronApp.close();
});

test("renders html files directly", async () => {
  const appPath = path.join(__dirname, "..", "..");
  const filePath = path.join(__dirname, "..", "fixtures", "sample.html");

  const electronApp = await electron.launch({
    args: [appPath, filePath]
  });

  const window = await electronApp.firstWindow();
  await window.waitForSelector("h1");

  await expect(window.locator("h1")).toHaveText("HTML Preview");
  await expect(window.locator("p")).toHaveText("Rendered directly.");

  await electronApp.close();
});

test("edits and saves non-markdown files", async () => {
  const appPath = path.join(__dirname, "..", "..");
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "md-client-"));
  const filePath = path.join(tempDir, "note.txt");
  fs.writeFileSync(filePath, "Line 1\n", "utf-8");

  const electronApp = await electron.launch({
    args: [appPath, filePath]
  });

  const mainWindow = await electronApp.firstWindow();
  const popupPromise = electronApp.waitForEvent("window");
  await mainWindow.click("#edit-button");
  const editorWindow = await popupPromise;

  const editor = editorWindow.locator("#editor");
  await editor.fill("Line 1\nLine 2\n");
  await editorWindow.click("#save-button");
  await expect(editorWindow.locator("#dirty-indicator")).toHaveText("");

  await electronApp.close();
  expect(fs.readFileSync(filePath, "utf-8")).toContain("Line 2");
});
