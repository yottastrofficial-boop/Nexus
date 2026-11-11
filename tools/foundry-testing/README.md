# NEXUS — Foundry Testing Bridge

Harness local de testes funcionais com Playwright. Ele controla um Chromium no computador em que o Foundry está sendo executado, observa a interface e gera relatórios, screenshots, traces e vídeos quando um teste falha.

> Este primeiro estágio é um executor de testes local, não um agente autônomo conectado diretamente à conversa do ChatGPT. Os relatórios podem ser enviados aqui para análise. O Foundry precisa estar acessível no mesmo computador.

## Requisitos

- Node.js 20 ou superior.
- Foundry VTT V14 em execução.
- Sistema NEXUS instalado.
- Um mundo descartável de teste usando NEXUS.
- Acesso de GM nesse mundo.

## Preparação

No terminal, a partir desta pasta:

```bash
npm install
npx playwright install chromium
```

Inicie o Foundry, entre como GM em um mundo de teste NEXUS e execute:

```bash
npm run auth
```

O Chromium abrirá o endereço configurado. Faça login manualmente e abra o mundo de teste. Depois volte ao terminal e pressione Enter. O harness salvará o estado da sessão localmente; não salva sua senha.

Se o Foundry usar outro endereço, configure antes:

PowerShell:

```powershell
$env:FOUNDRY_URL = "http://127.0.0.1:30000"
npm run auth
```

## Executar

Com o mundo de teste aberto no servidor:

```bash
npm test
```

Para visualizar o navegador durante os testes:

```bash
npm run test:headed
```

Para abrir o relatório HTML:

```bash
npm run report
```

## Testes incluídos inicialmente

1. Confirma que o mundo está pronto, que o sistema carregado é `nexus` e que a sessão é GM.
2. Cria um Actor temporário do tipo `player-character`, abre sua ficha e verifica a estrutura básica da interface.
3. Remove o Actor temporário mesmo quando a asserção falha.

Os testes não alteram Actors preexistentes. Ainda não cobrem todas as operações do Canvas, Biblioteca, mídia, layouts ou concorrência; esses fluxos serão adicionados em etapas, conforme os seletores e contratos reais forem confirmados.

## Segurança e limites

- Use exclusivamente um mundo de teste, nunca sua campanha principal.
- O harness acessa o endereço local configurado; não abre uma porta de rede adicional.
- A sessão fica em `.auth/`, ignorada pelo Git.
- Não compartilhe `.auth/storage-state.json`: ele pode permitir reutilizar sua sessão.
- O teste cria e exclui somente o Actor temporário que ele próprio criou.
- Um teste automatizado não equivale à validação de todos os fluxos nem garante ausência de defeitos.
- O harness não executa correções no código do sistema. Ele coleta evidências para diagnóstico.
