# Roadmap

Este documento reúne direções de desenvolvimento discutidas para o NEXUS. Ele não é uma promessa de entrega nem uma declaração de que os recursos listados já existem.

## Base estável — 1.0.0.1\n\n## Próxima atualização — 1.0.0.2 (em preparação)\n\n- Fortalecer a persistência e separar migrações do preparo de contexto.\n- Corrigir e ampliar os testes de integridade do pacote.\n- Modularizar progressivamente a lógica da ficha, preservando os contratos existentes.\n- Reorganizar CSS e templates sem alterar o comportamento visual intencional.\n- Validar em instalação real do Foundry VTT V14 antes da publicação.\n\n## Base estável — 1.0.0.1

A versão atual fornece uma ficha Canvas modular, biblioteca de elementos, personalização visual, editor de propriedades e integração inicial com os tipos de documento declarados no manifesto.

Consulte o [README](../README.md) e o [CHANGELOG](../CHANGELOG.md) para o escopo e as alterações desta versão.

## Direções planejadas

### Editor de fichas

- Aprimorar a organização livre dos componentes.
- Oferecer modelos de ficha reutilizáveis.
- Evoluir os recursos de edição e configuração do Canvas.

### Componentes

- Desenvolver um modo visual de criação de componentes.
- Estudar um modo avançado com HTML, CSS e JavaScript sob controles de segurança.
- Manter uma estrutura interna compartilhada entre os modos.
- Permitir importar, exportar e reutilizar componentes personalizados.

### Arquitetura de módulos e propriedades

- Estruturar um registro central de propriedades.
- Permitir que módulos registrem atributos, recursos e metadados próprios.
- Preservar identificadores estáveis quando nomes e apresentações mudarem.
- Definir regras de dependência, substituição e migração antes de permitir redefinições profundas.

### Design e mídia

- Consolidar a separação entre funcionalidade, formato e estilo.
- Evoluir temas e herança visual.
- Ampliar o gerenciamento de imagens, GIFs, vídeos e outros recursos.
- Planejar cache, miniaturas, carregamento sob demanda e controle de animações.

### Compatibilidade e qualidade

- Testar os fluxos completos dentro do Foundry VTT.
- Reforçar compatibilidade com a arquitetura e APIs oficiais.
- Evitar conflitos com módulos externos.
- Documentar migrações sempre que alterações afetarem dados existentes.

## Critérios para considerar um recurso concluído

Um recurso só deve ser marcado como implementado quando:

1. Seu comportamento estiver presente no código.
2. Seus dados e estados estiverem definidos.
3. Os fluxos relevantes tiverem sido testados.
4. Limitações conhecidas estiverem documentadas.
5. A documentação e o changelog refletirem o comportamento real.

## Como priorizamos

A prioridade é construir uma fundação confiável. Recursos que dependem de registros, propriedades, componentes ou migrações devem aguardar uma definição arquitetural suficiente para evitar retrabalho e perda de compatibilidade.
