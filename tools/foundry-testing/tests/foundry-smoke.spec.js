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

test("Biblioteca mantém miniaturas quadradas, tipografia de tema e ausência de estrelas nos cartões", async ({ page }) => {
  await page.evaluate(async () => {
    if (typeof game.nexus?.library?.open !== "function") {
      throw new Error("A API pública de abertura da Biblioteca não está disponível.");
    }
    await game.nexus.library.open({ source: "foundry-smoke" });
  });

  const app = page.locator(".nexus-library-standalone");
  await expect(app).toBeVisible();

  await app.locator("[data-library-toggle-filters]").click();
  const sizeControl = app.locator("[data-library-card-size]");
  await expect(sizeControl).toBeVisible();
  const themePreview = app.locator('.nexus-library-generic-preview[data-preview-kind="theme"]').first();
  await expect(themePreview).toBeVisible();

  const previewMeasurements = [];
  for (const [size, expected] of [["small", 32], ["medium", 64], ["large", 128]]) {
    await sizeControl.selectOption(size);
    await expect.poll(async () => {
      const box = await app.locator('.nexus-library-generic-preview[data-preview-kind="theme"]').first().boundingBox();
      return box ? Math.round(box.width) : 0;
    }).toBe(expected);
    await expect.poll(async () => {
      const box = await app.locator('.nexus-library-generic-preview[data-preview-kind="theme"]').first().boundingBox();
      return box ? Math.round(box.height) : 0;
    }).toBe(expected);
    const box = await app.locator('.nexus-library-generic-preview[data-preview-kind="theme"]').first().boundingBox();
    previewMeasurements.push({ size, expected, width: box?.width ?? null, height: box?.height ?? null });
  }

  await expect(app.locator(".nexus-library-generic-card .nexus-library-favorite")).toHaveCount(0);

  const themeItem = app.locator('.nexus-library-generic-item:has(.nexus-library-generic-preview[data-preview-kind="theme"])').first();
  await themeItem.click();
  const fullPreview = app.locator('.nexus-library-theme-live-preview[data-preview-shape="square"]');
  await expect(fullPreview).toBeVisible();

  const square = await fullPreview.boundingBox();
  expect(square).not.toBeNull();
  expect(Math.abs(square.width - square.height)).toBeLessThanOrEqual(1.5);

  const typography = await fullPreview.evaluate(element => ({
    body: getComputedStyle(element).fontFamily,
    display: getComputedStyle(element.querySelector(".nexus-library-theme-live-panel > strong")).fontFamily
  }));
  expect(typography.body).toBeTruthy();
  expect(typography.display).toBeTruthy();
  await expect(app.locator(".nexus-library-detail-favorite")).toHaveCount(1);
  await test.info().attach("nexus-library-preview-measurements.json", {
    body: Buffer.from(JSON.stringify({ previewMeasurements, squarePreview: square, typography }, null, 2)),
    contentType: "application/json"
  });
  await test.info().attach("nexus-library-preview.png", {
    body: await app.screenshot(),
    contentType: "image/png"
  });
});
