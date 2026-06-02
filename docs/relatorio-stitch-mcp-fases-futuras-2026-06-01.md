# Relatorio Stitch MCP e Fases Futuras Maestro

Data: 2026-06-01  
Projeto Stitch: Maestro Gateway Desktop  
ID: 13935900288237004121

## 1. Resultado do teste MCP

O MCP Stitch respondeu corretamente ao handshake `initialize` e disponibilizou ferramentas de leitura e geracao, incluindo `get_project`, `list_screens` e `get_screen`.

Resultado da validacao:

- Projeto acessivel: sim.
- Visibilidade do projeto: privado, com permissao de proprietario.
- Telas solicitadas localizadas: 16 de 16.
- Screenshots baixadas: 16 de 16.
- Codigo HTML das telas: nao disponibilizado pelo MCP nas telas consultadas. O campo `htmlCode` veio vazio tanto em `list_screens` quanto em `get_screen`.
- Artefatos locais: `docs/stitch-mcp-qa-2026-06-01/`.
- Inventario local: `docs/stitch-mcp-qa-2026-06-01/manifest.json`.

Observacao tecnica: algumas telas com titulo mobile foram retornadas pelo Stitch com `deviceType=DESKTOP` e dimensoes desktop. Para fins de migracao UX, a classificacao deve considerar o titulo e a composicao visual, nao somente o metadado `deviceType`.

## 2. Telas Stitch usadas como referencia

Foram baixadas as seguintes telas:

- Maestro Refined Settings Sidebar Desktop V2.
- Maestro Manual ID Entry Mobile.
- Maestro Admin Analytics Mobile.
- Maestro Refined Settings Sidebar Desktop V1.
- Maestro Admin Analytics Desktop.
- Maestro Mobility Radar Mobile.
- Maestro Registration Stepper Desktop.
- Maestro Gateway Mobile.
- Maestro Mobility Radar Mobile.
- Maestro Profile Hub Desktop.
- Maestro Digital Wallet & Radar Desktop.
- Maestro Admin Audit Dashboard Desktop.
- Maestro Profile Hub Mobile.
- Maestro Digital Wallet & Radar Desktop.
- Maestro Gateway Desktop.
- Maestro Fiscal Scanner Mobile.

## 3. Leitura UX das referencias

### Gateway

O Gateway conceitual apresenta uma entrada institucional limpa, com card central, seletor de municipio/cliente, acao primaria unica e rodape compacto. A proposta e adequada para o Maestro, desde que seja conectada aos tokens vindos da planilha e mantenha os contratos atuais de boot, configuracao PWA e tenant.

### Inscricao

O stepper de inscricao e uma boa direcao para organizar triagem, dados, comprovantes e limpeza/revisao final. Antes de migrar, os campos de estagio, declaracao, uploads e validacoes devem estar plenamente normalizados no frontend e backend.

### Auditoria

A tela de auditoria conceitual e a referencia mais forte: KPIs no topo, lista densa de alunos e raio-X lateral. Entretanto, a migracao visual deve aguardar a correcao da mesa real, pois hoje ha risco de a fila nao exibir todos os estudantes e filtros ficarem instaveis.

### Dashboard

O dashboard conceitual aponta uma direcao desktop-first: sidebar fixa, KPIs escaneaveis, graficos centrais e acoes rapidas. A implementacao deve preservar `dashboardStats`, semestre atual e permissoes por perfil.

### Carteira e Radar

A carteira com radar reforca a ideia de uma experiencia visual forte para estudante e mobilidade. A execucao real precisa respeitar seguranca do QR, permissao de GPS, fallback offline, modo estudante e tokens de turno/estagio.

### Fiscal e Motorista

O scanner fiscal em tela cheia e coerente para uso operacional. Deve ser adaptado com icones vetoriais, botoes grandes, estados criticos claros, leitura manual alternativa e baixa distracao.

### Configuracoes

A sidebar de configuracoes e util para Sala das Maquinas, semestre, tema, notificacoes e suporte. No Maestro, deve respeitar permissoes: moderador com acesso total, supervisor sem sala de maquinas e perfis operacionais com visibilidade restrita.

## 4. Riscos atuais que bloqueiam redesign profundo

- Mesa de auditoria precisa listar todos os estudantes esperados do semestre/tenant, nao apenas subconjuntos.
- Filtros da mesa de auditoria precisam funcionar de forma confiavel em pesquisa textual, status, instituicao e turno.
- Sala das Maquinas apresenta risco operacional quando entra em carregamento continuo ou quando os motores nao retornam status acionavel.
- Fluxos de validacao IA, geracao documental e push dependem de retorno observavel, com erro claro quando falham.
- Emojis devem ser substituidos por icones vetoriais padronizados antes da revisao estetica final.
- Tokens de modo claro e escuro da planilha precisam ser auditados em todas as superficies, incluindo header, manifest, PWA, splash, cards, botoes, foco e estados.
- O erro `AbortError` em `getListaAuditoria` indica timeout ou chamada abortada; a UI precisa diferenciar timeout, indice ausente, erro backend e resposta vazia.

## 5. Fases futuras recomendadas

### Fase 6.2 - Estabilizacao QA antes do redesign final

Objetivo: eliminar instabilidades criticas observadas em producao.

Desenvolvimentos:

- Revisar `getListaAuditoria` ponta a ponta: payload, tenant, semestre, limite, status e resposta Firestore.
- Garantir que a mesa de auditoria exiba todos os estudantes elegiveis do semestre atual.
- Corrigir filtros da auditoria com aplicacao imediata, inclusive pesquisa textual.
- Validar Sala das Maquinas com estados `loading`, `success`, `empty`, `error` e `timeout`.
- Validar motores IA, DOCS e Push com respostas observaveis e logs sem dados sensiveis.
- Auditar tokens da planilha em modo claro e escuro.
- Mapear todos os emojis remanescentes para icones vetoriais.

Prompt de continuidade:

`Continue a Fase 6.2: estabilize os achados criticos de QA antes do redesign final, priorizando mesa de auditoria completa, filtros, sala das maquinas, motores IA/DOCS/Push, tokens claro/escuro e substituicao de emojis por icones vetoriais.`

### Fase 7 - Integracao visual guiada pelo Stitch

Objetivo: transformar as telas conceituais em uma interface Maestro real, preservando Jekyll, contratos e tokens dinamicos.

Desenvolvimentos:

- Criar mapa de equivalencia entre telas Stitch e views/includes atuais.
- Definir quais componentes serao reaproveitados: gateway card, stepper, sidebar admin, KPI cards, audit drawer, bottom sheet radar e scanner operacional.
- Converter referencias visuais em classes CSS semanticas baseadas nos tokens da planilha.
- Evitar importacao direta de HTML do Stitch, pois o MCP nao disponibilizou codigo.
- Preservar contratos `apiCall`, adapters e contexts existentes.

Prompt de continuidade:

`Continue a Fase 7: traduza as referencias visuais do Stitch em um mapa de componentes Maestro, conectando cada tela conceitual aos includes Jekyll atuais, sem importar HTML bruto e preservando contratos apiCall e tokens dinamicos.`

### Fase 7.1 - Gateway e hub publico

Objetivo: modernizar a primeira experiencia publica sem alterar boot, tenant e configuracao PWA.

Desenvolvimentos:

- Redesenhar gateway com card institucional, logo dinamica, seletor de cliente e acoes principais.
- Separar acesso anonimo, estudante e operador de forma mais clara.
- Garantir fallback quando a planilha estiver offline.
- Aplicar tokens `LOGO_URL_LIGHT`, `LOGO_URL_DARK`, cores light/dark e `NOME_APP_PWA`.

Prompt de continuidade:

`Continue a Fase 7.1: modernize o Gateway e hub publico do Maestro inspirado nas telas Stitch, mantendo boot, tenant, configuracao PWA, tokens da planilha e contratos atuais.`

### Fase 7.2 - Inscricao em stepper responsivo

Objetivo: transformar inscricao e renovacao em fluxo guiado, com validacoes visiveis e baixo atrito.

Desenvolvimentos:

- Implementar stepper: triagem, dados pessoais, escola/rota/turnos, estagio, documentos e revisao.
- Integrar campos de estagio: tipo, periodo, declaracao e regra de alteracao por ciclo.
- Padronizar uploads e mensagens de erro.
- Preservar payload builders e adapters.

Prompt de continuidade:

`Continue a Fase 7.2: modernize inscricao e renovacao em stepper responsivo, incluindo campos de estagio, uploads, validacoes e revisao final, preservando payload builders, adapters e contratos existentes.`

### Fase 7.3 - Auditoria desktop-first

Objetivo: alinhar a mesa de auditoria ao modelo KPI + fila + raio-X lateral.

Desenvolvimentos:

- Criar topo com KPIs do semestre atual.
- Exibir fila densa com filtros persistentes.
- Implementar raio-X lateral do estudante com documentos, estagio, parecer e historico.
- Garantir suporte a listas grandes com estado de carregamento e paginacao/limite claro.

Prompt de continuidade:

`Continue a Fase 7.3: modernize a mesa de auditoria em layout desktop-first com KPIs, fila filtravel e raio-X lateral, preservando auditStudent, permissoes e contratos Firestore.`

### Fase 7.4 - Dashboard e semestres

Objetivo: modernizar a gestao administrativa com dashboard escaneavel e governanca de semestre.

Desenvolvimentos:

- Aplicar sidebar administrativa inspirada no Stitch.
- Modernizar `dashboardStats` com KPIs, graficos e atalhos.
- Integrar gestao de semestre atual/passado/arquivado.
- Manter permissoes de moderador e supervisor.

Prompt de continuidade:

`Continue a Fase 7.4: modernize dashboard e gestao de semestres com sidebar administrativa, KPIs, graficos e acoes de semestre, preservando dashboardStats, permissoes e contratos atuais.`

### Fase 7.5 - Carteira, radar e fiscalizacao operacional

Objetivo: consolidar experiencia mobile-first para estudante, fiscal e motorista.

Desenvolvimentos:

- Aplicar carteira dinamica com cores por turno, estagio, status e offline.
- Transformar radar em mapa prioritario com bottom sheet mobile e split-view desktop.
- Modernizar scanner fiscal com leitura QR, digitacao manual e estados criticos.
- Preservar permissao GPS e fallback offline.

Prompt de continuidade:

`Continue a Fase 7.5: modernize carteira, radar e fiscalizacao operacional com mapa prioritario, bottom sheets, scanner QR e estados criticos, preservando GPS, offline, seguranca do QR e contratos atuais.`

### Fase 7.6 - Iconografia vetorial e polimento visual

Objetivo: substituir emojis e padronizar a expressao visual do Maestro.

Desenvolvimentos:

- Mapear todos os emojis do frontend.
- Substituir por icones vetoriais, preferencialmente lucide ou biblioteca ja aceita no projeto.
- Definir tamanhos, pesos, estados e labels acessiveis.
- Revisar contraste, foco, hover, active e disabled.

Prompt de continuidade:

`Continue a Fase 7.6: substitua emojis por iconografia vetorial padronizada e revise foco, contraste, hover, active, disabled e acessibilidade visual em todo o frontend Maestro.`

## 6. Criterios globais de aceite para avancar

- MCP Stitch validado e referencias visuais arquivadas localmente.
- Nenhuma dependencia do redesign depende de HTML inexistente do Stitch.
- Mesa de auditoria lista corretamente todos os estudantes esperados.
- Filtros da auditoria funcionam de forma previsivel.
- Sala das Maquinas nao fica em loop silencioso.
- IA, DOCS e Push retornam estados observaveis.
- Tokens claro/escuro da planilha sao aplicados em todas as superficies principais.
- Emojis criticos foram substituidos por icones vetoriais.
- Layouts mobile, tablet e desktop nao apresentam overflow incoerente.
- Contratos `apiCall`, Jekyll includes e contexts MaestroData permanecem compativeis.
