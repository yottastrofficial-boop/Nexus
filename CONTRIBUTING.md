# Contribuindo com o NEXUS

Obrigado pelo interesse em contribuir com o NEXUS RPG.

O projeto está em desenvolvimento. Contribuições devem priorizar estabilidade, clareza e compatibilidade com a versão do Foundry declarada pelo sistema.

## Antes de começar

1. Consulte o [README](README.md) para entender o escopo da versão.
2. Leia [Visão do projeto](docs/PROJECT_OVERVIEW.md) e [Roadmap](docs/ROADMAP.md).
3. Verifique se a funcionalidade já existe ou está registrada como planejada.
4. Para mudanças de comportamento, identifique os arquivos e fluxos afetados antes de editar.

## Diretrizes

- Faça alterações pequenas e focadas.
- Preserve IDs, chaves de dados e caminhos já utilizados por fichas existentes.
- Evite renomear propriedades persistidas sem uma estratégia de migração.
- Prefira APIs públicas do Foundry VTT.
- Mantenha a lógica, os templates e os estilos organizados em seus respectivos diretórios.
- Não adicione entradas à Biblioteca sem confirmar que o tipo correspondente está registrado e pode ser renderizado.
- Não apresente funcionalidades planejadas como se já estivessem disponíveis.
- Atualize o `CHANGELOG.md` quando uma alteração modificar o comportamento do sistema.

## Verificações antes de enviar

Execute as verificações adequadas à alteração:

- Validar sintaxe JavaScript.
- Validar JSON, especialmente `system.json` e arquivos de idioma.
- Verificar consistência dos templates Handlebars.
- Conferir seletores e regras CSS relacionados à interface alterada.
- Testar a instalação e o fluxo afetado em uma instância real do Foundry VTT V14 sempre que possível.

Ao relatar testes, informe o que foi realmente executado. Verificações estáticas e simulações em navegador não equivalem a testes dentro do Foundry.

## Relato de problemas

Inclua, sempre que possível:

- Versão do NEXUS.
- Versão do Foundry VTT.
- Passos para reproduzir.
- Resultado esperado e resultado observado.
- Mensagens relevantes do console.
- Capturas de tela ou arquivos mínimos que ajudem a reproduzir o problema.

## Propostas de funcionalidades

Explique o problema que a proposta resolve, o comportamento desejado e se ela afeta dados já salvos. Para funcionalidades grandes, prefira discutir primeiro a arquitetura e dividir a implementação em etapas menores.
