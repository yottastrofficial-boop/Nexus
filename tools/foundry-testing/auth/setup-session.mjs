import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import readline from "node:readline/promises";
import process from "node:process";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const authDir = resolve(root, ".auth");
const statePath = resolve(authDir, "storage-state.json");
const url = process.env.FOUNDRY_URL || "http://127.0.0.1:30000";
const expectedWorldId = String(process.env.FOUNDRY_TEST_WORLD_ID ?? "").trim();

if (!expectedWorldId) {
  throw new Error("Defina FOUNDRY_TEST_WORLD_ID com o ID exato do mundo descartável antes de preparar a sessão.");
}

await mkdir(authDir, { recursive: true });
const browser = await chromium.launch({ headless: false });
const context = await browser.newContext();
const page = await context.newPage();

console.log("\nNEXUS Testing Bridge — preparação da sessão");
console.log("1. Uma janela do Chromium será aberta.");
console.log("2. Entre no Foundry e abra o mundo descartável configurado.");
console.log("3. Volte ao terminal e pressione Enter.");
console.log("4. O estado de sessão será salvo localmente; não compartilhe esse arquivo.\n");

try {
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 120_000 });
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  await rl.question("Quando o mundo de teste estiver aberto, pressione Enter...");
  rl.close();

  const runtime = await page.evaluate(() => ({
    ready: Boolean(window.game?.ready),
    systemId: window.game?.system?.id ?? null,
    worldId: window.game?.world?.id ?? null,
    isGM: Boolean(window.game?.user?.isGM)
  }));

  if (!runtime.ready || runtime.systemId !== "nexus" || !runtime.isGM) {
    throw new Error("O mundo não está pronto com o sistema NEXUS e uma sessão GM.");
  }
  if (runtime.worldId !== expectedWorldId) {
    throw new Error(`Mundo incorreto. Esperado "${expectedWorldId}", recebido "${runtime.worldId}". Nenhuma sessão foi salva.`);
  }

  await context.storageState({ path: statePath });
  console.log("\nSessão de teste salva em tools/foundry-testing/.auth/storage-state.json");
  console.log("O arquivo contém estado de sessão reutilizável. Não o compartilhe nem o envie ao Git.");
} finally {
  await context.close();
  await browser.close();
}
