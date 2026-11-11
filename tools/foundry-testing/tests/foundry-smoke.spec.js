import { test, expect } from "@playwright/test";

const runtimeErrors = [];

test.beforeEach(async ({ page }) => {
  runtimeErrors.length = 0;
  page.on("pageerror", error => runtimeErrors.push(error.message));
  await page.goto("/");
  await page.waitForFunction(
    () => Boolean(window.game?.ready && window.game?.system),
    { timeout: 45_000 }
  );
});

test.afterEach(async ({ page }, testInfo) => {
  if (runtimeErrors.length) {
    await testInfo.attach("uncaught-page-errors.json", {
      body: Buffer.from(JSON.stringify(runtimeErrors, null, 2)),
      contentType: "application/json"
    });
  }
  expect(runtimeErrors, "Erros JavaScript não tratados na página").toEqual([]);
});

test("Foundry iniciou o mundo com o sistema NEXUS", async ({ page }) => {
  const runtime = await page.evaluate(() => ({
    foundryReady: Boolean(game.ready),
    systemId: game.system?.id ?? null,
    systemTitle: game.system?.title ?? null,
    actorCount: game.actors?.size ?? null,
    isGM: Boolean(game.user?.isGM)
  }));

  expect(runtime.foundryReady).toBe(true);
  expect(runtime.systemId).toBe("nexus");
  expect(runtime.isGM).toBe(true);
  expect(runtime.actorCount).not.toBeNull();

  await expect(page.locator("#sidebar")).toBeVisible();
});

test("cria e renderiza uma ficha temporária NEXUS", async ({ page }) => {
  const actorName = `NEXUS TESTE ${new Date().toISOString()}`;
  let actorId;

  try {
    actorId = await page.evaluate(async name => {
      const actor = await Actor.create({
        name,
        type: "player-character"
      });
      if (!actor) throw new Error("Foundry não criou o Actor temporário.");
      await actor.sheet.render(true);
      return actor.id;
    }, actorName);

    await expect(page.locator("form.nexus-sheet")).toBeVisible();
    await expect(page.locator(".nexus-workspace")).toBeVisible();

    const sheetState = await page.locator("form.nexus-sheet").evaluate(form => ({
      mode: form.dataset.mode ?? null,
      componentCount: form.querySelectorAll("[data-component-id]").length,
      hasCanvas: Boolean(form.querySelector(".nexus-canvas")),
      hasLayoutControls: form.querySelectorAll("[data-layout-setting]").length > 0
    }));

    expect(sheetState.mode).toBeTruthy();
    expect(sheetState.hasLayoutControls || sheetState.hasCanvas).toBe(true);

    await test.info().attach("nexus-sheet-dom-summary.json", {
      body: Buffer.from(JSON.stringify(sheetState, null, 2)),
      contentType: "application/json"
    });
  } finally {
    if (actorId) {
      await page.evaluate(async id => {
        const actor = game.actors.get(id);
        if (actor) await actor.delete();
      }, actorId);
    }
  }
});
