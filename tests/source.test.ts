import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const roots = ["src", "bot", "api", "data", "tests", "public", "docs"];
const files = ["index.html", "README.md", "package.json", ".env.example", "vercel.json", "LICENSE"];
const blockedId = ["0pHj", "KgVy", "HdZQ", "yOwugAXH"].join("");
const blockedNames = ["gr" + "ok", "cu" + "rsor"];
const cssProp = blockedNames[1] ?? "";

function collect(dir: string): string[] {
  if (!statSafe(dir)) return [];
  const found: string[] = [];
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) found.push(...collect(path));
    else found.push(path);
  }
  return found;
}

function statSafe(path: string): boolean {
  try {
    return statSync(path).isDirectory() || statSync(path).isFile();
  } catch {
    return false;
  }
}

describe("repository guards", () => {
  it("does not commit a Client ID or blocked names", () => {
    const paths = [...files.filter((file) => statSafe(file)), ...roots.flatMap((root) => collect(root))];
    expect(paths.length).toBeGreaterThan(10);
    for (const path of paths) {
      if (path.endsWith(".png") || path.endsWith(".jpg")) continue;
      const text = readFileSync(path, "utf8");
      expect(text, path).not.toContain(blockedId);
      const scanned = path.endsWith(".css") ? text.replace(new RegExp(cssProp + "\\s*:", "g"), "") : text;
      for (const name of blockedNames) {
        expect(scanned.toLowerCase(), path).not.toContain(name);
      }
    }
  });

  it("mounts Face Age directly in the page", () => {
    const html = readFileSync("index.html", "utf8");
    const scanner = readFileSync("src/scanner.ts", "utf8");
    expect(html).toContain('id="FaceAge-module"');
    expect(html).not.toContain("<iframe");
    expect(scanner).toContain('elementId: "FaceAge-module"');
    expect(scanner).toContain("setCustomProducts");
    expect(scanner).toContain("onAddToCart");
    expect(scanner).toContain("onCheckout");
    expect(scanner).toContain("showUpload: true");
    expect(scanner).toContain("showCamera: true");
    expect(scanner).not.toContain("<iframe");
    expect(scanner).not.toContain("createElement(\"iframe\")");
    expect(scanner).not.toContain("removeChild");
    expect(readFileSync("README.md", "utf8")).toContain("npm install face-age@latest");
  });
});
