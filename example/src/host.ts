import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { createGpuixHost } from "elm-gpuix";

const smokeMode = process.env.ELM_GPUIX_SMOKE === "1";
const host = createGpuixHost({
  window: {
    title: "Elm + GPUI",
    width: 640,
    height: 480,
    minWidth: 480,
    minHeight: 360,
    resizable: true,
  },
});

let elmModule: typeof import("./Main.elm");
try {
  elmModule = await import("./Main.elm");
} catch (error) {
  host.stop();
  throw error;
}

const runtime = host.mount(elmModule.Elm.Main);

if (smokeMode) {
  void runSmoke();
} else {
  console.log("[elm-gpuix] Running. Close the native window to exit.");
}

async function runSmoke(): Promise<void> {
  try {
    const { id, bounds } = await waitForElement("increment");
    const [x, y, width, height] = bounds;

    runtime.renderer.simulateClick(x + width / 2, y + height / 2);

    const text = await waitForText(["Count: 1", "Double: 2"]);
    await sleep(50);

    const screenshotPath =
      process.env.ELM_GPUIX_SCREENSHOT ??
      fileURLToPath(
        new URL("../../artifacts/elm-gpuix-smoke.png", import.meta.url),
      );
    mkdirSync(dirname(screenshotPath), { recursive: true });
    runtime.renderer.captureScreenshot(screenshotPath);

    console.log(
      JSON.stringify({
        ok: true,
        elementId: id,
        buttonBounds: bounds,
        text,
        screenshotPath,
      }),
    );

    stop(0);
  } catch (error) {
    console.error("[elm-gpuix] Smoke test failed:", error);
    stop(1);
  }
}

async function waitForElement(
  testId: string,
): Promise<{ id: number; bounds: [number, number, number, number] }> {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    const tree: unknown = JSON.parse(runtime.renderer.getAutomationTree());
    const id = findElementId(tree, testId);

    if (id !== undefined) {
      const bounds = runtime.renderer.getElementBounds(id);
      if (bounds && bounds.length === 4) {
        return {
          id,
          bounds: [bounds[0]!, bounds[1]!, bounds[2]!, bounds[3]!],
        };
      }
    }

    await sleep(25);
  }

  throw new Error(`The ${JSON.stringify(testId)} element was never painted.`);
}

function findElementId(value: unknown, testId: string): number | undefined {
  if (Array.isArray(value)) {
    for (const child of value) {
      const id = findElementId(child, testId);
      if (id !== undefined) {
        return id;
      }
    }

    return undefined;
  }

  if (typeof value !== "object" || value === null) {
    return undefined;
  }

  if (
    "id" in value &&
    typeof value.id === "number" &&
    "testId" in value &&
    value.testId === testId
  ) {
    return value.id;
  }

  if ("children" in value) {
    return findElementId(value.children, testId);
  }

  return undefined;
}

async function waitForText(expected: readonly string[]): Promise<string[]> {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    const text = runtime.renderer.getAllText();
    if (expected.every((value) => text.includes(value))) {
      return text;
    }

    await sleep(25);
  }

  throw new Error(`Elm never rendered every expected string: ${JSON.stringify(expected)}.`);
}

function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolveSleep) => {
    setTimeout(resolveSleep, milliseconds);
  });
}

function stop(exitCode: number): void {
  runtime.stop();
  process.exit(exitCode);
}
