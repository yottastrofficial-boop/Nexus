# NEXUS — Foundry Testing Bridge

Harness local de testes funcionais com Playwright. Controla um Chromium no computador em que o Foundry está sendo executado e gera relatório HTML, screenshots, traces e vídeos quando um teste falha.

Este é um executor de testes local, não um agente remoto conectado ao computador. O Foundry precisa estar acessível no mesmo computador.

## Requisitos

- Node.js 20 ou superior.
- Foundry VTT 14 em execução.
- Sistema NEXUS instalado.
- Um mundo descartável de teste usando NEXUS.
- Acesso de GM nesse mundo.
- O ID interno do mundo de teste.

## Preparação

A partir desta pasta:

```bash
npm install
npx playwright install chromium
```

Configure o endereço local do Foundry e o ID exato do mundo descartável.

PowerShell:

```powershell
$env:FOUNDRY_URL = "http://127.0.0.1:30000"
$env:FOUNDRY_TEST_WORLD_ID = "nexus-test"
npm run auth
```

O Chromium abrirá o Foundry. Entre manualmente como GM e abra o mundo cujo ID foi informado. O script só salva o estado da sessão se confirmar o sistema `nexus`, a permissão GM e a correspondência exata do ID do mundo.

A senha não é gravada. O arquivo `.auth/storage-state.json` contém cookies e dados de sessão reutilizáveis; trate-o como credencial, não o compartilhe e nunca o adicione ao Git.

## Executar

No mesmo terminal em que as variáveis de ambiente foram definidas:

```powershell
npm test
```

Para visualizar o navegador:

```powershell
npm run test:headed
```

Para abrir o relatório HTML:

```powershell
npm run report
```

Os relatórios ficam em `playwright-report/`; traces, screenshots e vídeos de falhas ficam em `test-results/`.

## Cobertura atual

1. Confirma que o Foundry está pronto, que o sistema carregado é `nexus`, que a sessão é GM e que o mundo corresponde ao ID configurado.
2. Cria um Actor temporário do tipo `player-character`, abre sua ficha e verifica a estrutura principal.
3. Remove o Actor temporário em um bloco `finally`, inclusive quando uma asserção falha.
4. Captura erros de página; falhas atribuídas ao NEXUS reprovam o smoke test. Erros de outros módulos são anexados ao relatório para diagnóstico, sem reprovar automaticamente o NEXUS.

## Diagnóstico do sidebar V14

O teste `sidebar-diagnostic.spec.js` registra, sem modificar a interface:
- DOM real de `#sidebar`, navegação, conteúdo e controles de abas;
- dimensões e estilos calculados dos elementos relevantes;
- classes, atributos, posição e hierarquia dos controles;
- classes e fontes calculadas dos ícones, incluindo pseudo-elementos;
- disponibilidade das famílias Font Awesome e screenshot do sidebar.

Execute junto com a suíte usando `npm test`. O relatório HTML inclui os anexos `foundry-v14-sidebar-dom-diagnostic.json` e `foundry-v14-sidebar-screenshot.png`. Não compartilhe `.auth/storage-state.json`, pois contém dados de sessão.

## Segurança e limites

- Execute exclusivamente em um mundo descartável, nunca na campanha principal.
- O teste exige `FOUNDRY_TEST_WORLD_ID`; não há fallback para qualquer mundo disponível.
- O harness não abre portas de rede adicionais; acessa somente o endereço configurado.
- A sessão fica em `.auth/`, ignorada pelo Git. Não compartilhe esse diretório.
- O teste cria e exclui somente o Actor temporário que ele próprio criou.
- O harness não altera o código do sistema nem corrige dados existentes.
- O smoke test não cobre ainda Canvas, Biblioteca, mídia, layouts, persistência ou concorrência. Esses cenários continuam pendentes e devem ser adicionados gradualmente.

Consulte também [a estratégia de testes](../../docs/TESTING.md).
