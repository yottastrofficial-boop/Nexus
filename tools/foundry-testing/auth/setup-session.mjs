import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import readline from "node:readline/promises";
import process from "node:process";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const authDir = resolve(root, ".auth");
const statePath = resolve(authDir, "storage-state.json");
const url = process.env.FOUNDRY_URL || "http://127.0.0.1:30000";

await mkdir(authDir, { recursive: true });
const browser = await chromium.launch({ headless: false });
const context = await browser.newContext();
const page = await context.newPage();

console.log("\nNEXUS Testing Bridge — preparação da sessão");
console.log("1. Uma janela do Chromium será aberta.");
console.log("2. Entre no Foundry e abra um mundo de TESTE como GM.");
console.log("3. Volte ao terminal e pressione Enter. Nenhuma senha será salva.\n");

try {
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 120_000 });
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  await rl.question("Quando o mundo de teste estiver aberto, pressione Enter...");
  rl.close();

  const ready = await page.evaluate(() => Boolean(window.game?.ready && window.game?.system?.id === "nexus"));
  if (!ready) {
    throw new Error("O mundo não parece estar carregado com o sistema NEXUS. Abra um mundo NEXUS como GM e tente novamente.");
  }

  await context.storageState({ path: statePath });
  console.log("\nSessão de teste salva em tools/foundry-testing/.auth/storage-state.json");
  console.log("Esse arquivo é local, ignorado pelo Git e não contém sua senha.");
} finally {
  await context.close();
  await browser.close();
}
