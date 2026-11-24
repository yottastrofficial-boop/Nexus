import { test, expect } from "@playwright/test";

const expectedWorldId = String(process.env.FOUNDRY_TEST_WORLD_ID ?? "").trim();
const allPageErrors = [];
const nexusPageErrors = [];

test.beforeEach(async ({ page }) => {
  if (!expectedWorldId) {
    throw new Error("Defina FOUNDRY_TEST_WORLD_ID com o ID exato do mundo descartável.");
  }

  allPageErrors.length = 0;
  nexusPageErrors.length = 0;
  page.on("pageerror", error => {
    const entry = { message: error.message, stack: error.stack ?? "" };
    allPageErrors.push(entry);
    if (/(?:systems[\\/]nexus|NEXUS)/i.test(entry.stack + "\n" + entry.message)) {
      nexusPageErrors.push(entry);
    }
  });

  await page.goto("/");
  await page.waitForFunction(
    () => Boolean(window.game?.ready && window.game?.system),
    undefined,
    { timeout: 45_000 }
  );

  const runtime = await page.evaluate(() => ({
    systemId: game.system?.id ?? null,
    worldId: game.world?.id ?? null,
    isGM: Boolean(game.user?.isGM)
  }));
  expect(runtime.systemId).toBe("nexus");
  expect(runtime.worldId).toBe(expectedWorldId);
  expect(runtime.isGM).toBe(true);
});

test.afterEach(async ({}, testInfo) => {
  if (allPageErrors.length) {
    await testInfo.attach("page-errors.json", {
      body: Buffer.from(JSON.stringify(allPageErrors, null, 2)),
      contentType: "application/json"
    });
  }
  expect(nexusPageErrors, "Erros JavaScript atribuídos ao NEXUS").toEqual([]);
});

test("Foundry iniciou o mundo descartável com o sistema NEXUS", async ({ page }) => {
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

test("cria, renderiza e remove uma ficha temporária NEXUS", async ({ page }) => {
  const actorName = `NEXUS TESTE ${new Date().toISOString()}`;
  let actorId;

  try {
    actorId = await page.evaluate(async name => {
      const actor = await Actor.create({ name, type: "player-character" });
      if (!actor) throw new Error("Foundry não criou o Actor temporário.");
      return actor.id;
    }, actorName);

    if (!actorId) throw new Error("O Actor temporário não retornou um ID.");

    await page.evaluate(async id => {
      const actor = game.actors.get(id);
      if (!actor) throw new Error("Actor temporário não encontrado após a criação.");
      await actor.sheet.render({ force: true });
    }, actorId);

    const sheet = page.locator("form.nexus-sheet");
    await expect(sheet).toBeVisible();
    await expect(sheet.locator(".nexus-workspace")).toBeVisible();
    await expect(sheet.locator(".nexus-canvas-stage")).toBeVisible();

    const sheetState = await sheet.evaluate(form => ({
      mode: form.dataset.mode ?? null,
      componentCount: form.querySelectorAll("[data-component-id]").length,
      hasCanvasStage: Boolean(form.querySelector(".nexus-canvas-stage")),
      hasLayoutControls: form.querySelectorAll("[data-layout-setting]").length > 0
    }));

    expect(sheetState.mode).toBeTruthy();
    expect(sheetState.hasCanvasStage).toBe(true);
    expect(sheetState.hasLayoutControls).toBe(true);

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
