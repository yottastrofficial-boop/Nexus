import { test, expect } from "@playwright/test";

const expectedWorldId = String(process.env.FOUNDRY_TEST_WORLD_ID ?? "").trim();

test("diagnostica DOM, geometria e ícones do sidebar nativo V14", async ({ page }) => {
  if (!expectedWorldId) {
    throw new Error("Defina FOUNDRY_TEST_WORLD_ID com o ID exato do mundo descartável.");
  }

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

  const diagnostic = await page.evaluate(() => {
    const rect = element => {
      if (!element) return null;
      const r = element.getBoundingClientRect();
      return {
        x: Math.round(r.x * 10) / 10,
        y: Math.round(r.y * 10) / 10,
        width: Math.round(r.width * 10) / 10,
        height: Math.round(r.height * 10) / 10,
        right: Math.round(r.right * 10) / 10,
        bottom: Math.round(r.bottom * 10) / 10
      };
    };
    const style = element => {
      if (!element) return null;
      const s = getComputedStyle(element);
      return {
        display: s.display,
        position: s.position,
        flexDirection: s.flexDirection,
        flexWrap: s.flexWrap,
        gridTemplateColumns: s.gridTemplateColumns,
        gridTemplateRows: s.gridTemplateRows,
        alignItems: s.alignItems,
        justifyContent: s.justifyContent,
        gap: s.gap,
        width: s.width,
        minWidth: s.minWidth,
        height: s.height,
        minHeight: s.minHeight,
        overflow: s.overflow,
        inset: s.inset,
        transform: s.transform,
        zIndex: s.zIndex,
        fontFamily: s.fontFamily,
        fontWeight: s.fontWeight
      };
    };
    const candidates = [
      "#sidebar",
      "#sidebar-tabs",
      "#sidebar .sidebar-tabs",
      "#sidebar nav.tabs",
      "#sidebar [data-group='primary']",
      "#sidebar-content",
      "#sidebar .sidebar-content",
      "#sidebar .tab.sidebar-tab",
      "#sidebar .sidebar-tab"
    ];
    const elements = candidates.map(selector => {
      const nodes = [...document.querySelectorAll(selector)];
      return {
        selector,
        count: nodes.length,
        nodes: nodes.slice(0, 12).map(element => ({
          tag: element.tagName,
          id: element.id || null,
          className: typeof element.className === "string" ? element.className : null,
          role: element.getAttribute("role"),
          dataGroup: element.getAttribute("data-group"),
          dataTab: element.getAttribute("data-tab"),
          ariaLabel: element.getAttribute("aria-label"),
          inlineStyle: element.getAttribute("style"),
          rect: rect(element),
          computed: style(element),
          directChildren: [...element.children].slice(0, 20).map(child => ({
            tag: child.tagName,
            id: child.id || null,
            className: typeof child.className === "string" ? child.className : null,
            rect: rect(child),
            computed: style(child)
          }))
        }))
      };
    });
    const sidebar = document.querySelector("#sidebar");
    const iconNodes = [...(sidebar?.querySelectorAll("i, svg, [class*='fa-'], [class*='icon']") ?? [])]
      .slice(0, 80)
      .map(element => {
        const s = getComputedStyle(element);
        const before = getComputedStyle(element, "::before");
        return {
          tag: element.tagName,
          className: typeof element.className === "string" ? element.className : null,
          text: element.textContent?.trim().slice(0, 50) ?? "",
          rect: rect(element),
          fontFamily: s.fontFamily,
          fontWeight: s.fontWeight,
          beforeFontFamily: before.fontFamily,
          beforeContent: before.content,
          beforeFontWeight: before.fontWeight,
          visibility: s.visibility,
          display: s.display
        };
      });
    const fonts = [
      '16px "Font Awesome 6 Pro"',
      '16px "Font Awesome 6 Free"',
      '16px "Font Awesome 5 Free"',
      '16px "Font Awesome 5 Pro"'
    ].map(font => ({ font, available: document.fonts.check(font) }));

    return {
      capturedAt: new Date().toISOString(),
      htmlClass: document.documentElement.className,
      bodyClass: document.body.className,
      viewport: { width: innerWidth, height: innerHeight, devicePixelRatio },
      runtime: {
        foundryVersion: game.version ?? null,
        systemVersion: game.system?.version ?? null,
        moduleCount: game.modules?.size ?? null
      },
      sidebarRect: rect(sidebar),
      sidebarComputed: style(sidebar),
      candidates: elements,
      iconNodes,
      fontChecks: fonts,
      stylesheets: [...document.styleSheets].map(sheet => sheet.href).filter(Boolean)
    };
  });

  await test.info().attach("foundry-v14-sidebar-dom-diagnostic.json", {
    body: Buffer.from(JSON.stringify({ runtime, diagnostic }, null, 2)),
    contentType: "application/json"
  });
  await test.info().attach("foundry-v14-sidebar-screenshot.png", {
    body: await page.locator("#sidebar").screenshot(),
    contentType: "image/png"
  });

  expect(diagnostic.sidebarRect?.width ?? 0).toBeGreaterThan(0);
  expect(diagnostic.candidates.find(item => item.selector === "#sidebar")?.count).toBe(1);
});
