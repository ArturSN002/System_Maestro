# Fase 7 - Mapa tecnico de componentes Stitch x Maestro

Data: 2026-06-02

## 1. Objetivo

Traduzir as telas conceituais do Stitch em um mapa tecnico de componentes para a nova interface Maestro, conectando cada referencia visual aos includes Jekyll atuais, aos modulos JavaScript existentes, aos contexts `MaestroData` e aos contratos `apiCall` ja estabilizados.

Esta fase nao importa HTML do Stitch. O MCP disponibilizou screenshots e metadados, mas nao codigo HTML. Portanto, as telas Stitch devem ser usadas como direcao visual, densidade, hierarquia e comportamento responsivo, enquanto a implementacao real deve permanecer sobre a arquitetura atual do Maestro.

## 2. Artefatos de referencia

- Manifesto Stitch: `docs/stitch-mcp-qa-2026-06-01/manifest.json`.
- Relatorio base: `docs/relatorio-stitch-mcp-fases-futuras-2026-06-01.md`.
- Screenshots: `docs/stitch-mcp-qa-2026-06-01/*.png`.
- PDF de referencia: `C:\Users\asn03\Downloads\Stitch project screens.pdf`.

## 3. Pontos reais de montagem Jekyll

O frontend Maestro continua montado por Jekyll/GitHub Pages:

- `index.html`
  - `_includes/modais.html`
  - `_includes/portal_publico.html`
  - `_includes/portal_estudante.html`
  - `_includes/radar_mobilidade.html`
  - `_includes/portal_admin.html`

- `app.js`
  - `_includes/js/js_global.js`
  - `_includes/js/maestro_icons.js`
  - `_includes/js/main_core.js`
  - `_includes/js/api_auth.js`
  - `_includes/js/data_layer.js`
  - `_includes/js/carteira.js`
  - `_includes/js/consulta.js`
  - `_includes/js/inscricao.js`
  - `_includes/js/mobilidade.js`
  - `_includes/js/operacao.js`
  - `_includes/js/admin_dashboard.js`
  - `_includes/js/admin_semestres.js`
  - `_includes/js/admin_fiscal.js`
  - `_includes/js/admin_sos.js`

## 4. Regras de preservacao

1. Manter os contratos `apiCall` existentes.
2. Manter os payload builders e response adapters ja criados em `MaestroData`.
3. Manter `tenantContext`, `semesterContext`, `themeConfig`, `studentIdentity` e `operatorSession` como fontes de verdade da UI.
4. Manter os tokens visuais vindos da planilha como camada primaria de tema.
5. Manter os includes Jekyll como fronteira de montagem, sem criar SPA nova.
6. Preservar rotas/views atuais, substituindo composicao visual de forma incremental.
7. Usar iconografia vetorial padronizada, sem introduzir novos emojis.
8. Nao alterar semantica de permissoes por perfil durante a migracao visual.

## 5. Mapa Stitch para Maestro

| Tela Stitch | Papel UX | Include/view atual | Modulos atuais | Componentes alvo | Contratos preservados |
| --- | --- | --- | --- | --- | --- |
| Maestro Gateway Desktop | Entrada institucional desktop | `_includes/portal_publico.html`, `view-gateway`, `view-hub` | `main_core.js`, `api_auth.js`, `data_layer.js` | `MaestroGateway`, `TenantSelector`, `ProfileEntryGrid`, `PublicFooter` | `getConfiguracoesPWA`, boot, tenant, `GAS_URL` |
| Maestro Gateway Mobile | Entrada publica mobile | `_includes/portal_publico.html`, `view-gateway`, `view-hub` | `main_core.js`, `data_layer.js` | `MobileGatewaySheet`, `ProfileEntryButton`, `InstallPromptBlock` | Config PWA, tenant salvo, selecao de cliente |
| Maestro Profile Hub Desktop | Hub do estudante desktop | `_includes/portal_estudante.html`, `view-aluno-menu` | `consulta.js`, `carteira.js`, `inscricao.js` | `StudentHub`, `StudentActionRail`, `StatusSummaryCard` | CPF, estudante autenticado, consulta/carteira |
| Maestro Profile Hub Mobile | Hub do estudante mobile-first | `_includes/portal_estudante.html`, `view-aluno-menu` | `consulta.js`, `carteira.js` | `StudentHomeStack`, `PrimaryStudentActions`, `CompactStatusCard` | `studentIdentity`, localStorage compativel |
| Maestro Manual ID Entry Mobile | Entrada manual de identificacao | `_includes/portal_estudante.html`, `view-consult`; `_includes/portal_admin.html`, `view-fiscal` | `consulta.js`, `admin_fiscal.js` | `ManualIdEntry`, `CpfInputGroup`, `ValidationFeedback` | Consulta CPF, validacao publica, fiscalizacao manual |
| Maestro Registration Stepper Desktop | Inscricao/renovacao guiada | `_includes/portal_estudante.html`, `view-inscricao` | `inscricao.js`, `data_layer.js` | `RegistrationStepper`, `StepPanel`, `UploadDropzone`, `StageFieldsPanel`, `ReviewSubmitBar` | Inscricao, renovacao, uploads, estagio, `semestreId` |
| Maestro Digital Wallet & Radar Desktop | Carteira + mobilidade | `_includes/portal_estudante.html`, `view-wallet`; `_includes/radar_mobilidade.html`, `view-radar` | `carteira.js`, `mobilidade.js` | `DynamicWalletCard`, `TurnColorSurface`, `QrSecurityPanel`, `RadarSplitView` | QR, carteira offline, GPS, turnos, estagio |
| Maestro Digital Wallet & Radar Desktop/mobile | Versao responsiva carteira/radar | `_includes/portal_estudante.html`, `_includes/radar_mobilidade.html` | `carteira.js`, `mobilidade.js` | `WalletMobileStack`, `RadarBottomSheet`, `MapActionDock` | GPS, offline, student mode, rota |
| Maestro Mobility Radar Mobile | Radar operacional mobile | `_includes/radar_mobilidade.html`, `view-radar` | `mobilidade.js`, `admin_sos.js` | `RadarMapCanvas`, `RadarStatusSheet`, `RouteEventList`, `EmergencyButton` | Localizacao, check-in, fiscalizacao de rota |
| Maestro Mobility Radar Mobile alt | Radar com enfase em lista/detalhe | `_includes/radar_mobilidade.html` | `mobilidade.js` | `MasterDetailRadar`, `VehicleList`, `RouteDetailSheet` | Contratos de mobilidade e filtros |
| Maestro Fiscal Scanner Mobile | Fiscalizacao QR/mobile | `_includes/portal_admin.html`, `view-fiscal` | `admin_fiscal.js`, `operacao.js` | `FiscalScannerShell`, `ScannerViewport`, `ManualFallback`, `ValidationResultPanel` | Scanner QR, busca manual, permissao fiscal/motorista |
| Maestro Admin Analytics Desktop | Dashboard secretaria desktop | `_includes/portal_admin.html`, `view-dashboard` | `admin_dashboard.js`, `data_layer.js` | `AdminDashboardShell`, `KpiGrid`, `ChartPanel`, `FilterToolbar` | `dashboardStats`, `semesterContext`, tenant |
| Maestro Admin Analytics Mobile | Dashboard admin compacto | `_includes/portal_admin.html`, `view-dashboard` | `admin_dashboard.js` | `MobileKpiCarousel`, `MetricSection`, `DashboardBottomNav` | `dashboardStats`, filtros atuais |
| Maestro Admin Audit Dashboard Desktop | Mesa de auditoria | `_includes/portal_admin.html`, `view-auditoria`; `_includes/modais.html` | `operacao.js`, `data_layer.js` | `AuditWorkspace`, `AuditKpiStrip`, `AuditQueueTable`, `StudentXRayPanel`, `AuditDecisionBar` | `getListaAuditoria`, `auditStudent`, parecer/status |
| Maestro Refined Settings Sidebar Desktop V1 | Configuracoes e atalhos admin | `_includes/admin/menu.html`, `view-admin-hub`; `view-semestres`; `view-moderador` | `admin_semestres.js`, `operacao.js`, `main_core.js` | `SettingsSidebar`, `AdminShortcutList`, `SemesterShortcut`, `ThemePreview` | Permissoes, semestres, tokens, machine room |
| Maestro Refined Settings Sidebar Desktop V2 | Sidebar refinada/sala tecnica | `_includes/admin/menu.html`, `_includes/portal_admin.html` | `admin_semestres.js`, `operacao.js`, `admin_sos.js` | `AdminShellSidebar`, `MachineRoomPanel`, `HealthStatusCard`, `PermissionAwareNav` | Moderador/supervisor/operador, healthcheck, motores |

## 6. Camada de componentes alvo

### 6.1 Shell, tema e navegacao

Componentes:

- `MaestroShell`
- `MaestroHeader`
- `MaestroSidebar`
- `MaestroMobileNav`
- `SettingsDrawer`
- `ThemeBridge`

Includes atuais:

- `index.html`
- `_includes/admin/menu.html`
- `_includes/portal_publico.html`

Contexts:

- `MaestroData.contexts.theme`
- `MaestroData.contexts.tenant`
- `MaestroData.contexts.semester`
- `MaestroData.contexts.operator`

Tokens obrigatorios:

- `LOGO_URL_LIGHT`
- `LOGO_URL_DARK`
- `COR_PRIMARIA_LIGHT`
- `COR_SECUNDARIA_LIGHT`
- `COR_DE_DESTAQUE_LIGHT`
- `COR_PRIMARIA_DARK`
- `COR_SECUNDARIA_DARK`
- `COR_DE_DESTAQUE_DARK`
- `ICONE_APP_PWA`
- `NOME_APP_PWA`
- `NOME_ABREV_SECRETARIA`

### 6.2 Gateway e portal publico

Componentes:

- `MaestroGateway`
- `TenantSelector`
- `ProfileEntryGrid`
- `PublicValidatorCard`
- `PublicNoticePreview`

Includes atuais:

- `_includes/portal_publico.html`

Contratos:

- `getConfiguracoesPWA`
- Validacao publica de documento/CPF
- Boot e selecao de cliente

Direcao Stitch:

- Usar a limpeza visual do Gateway Desktop/Mobile.
- Dar uma acao primaria clara por tela.
- Manter rodape institucional compacto com contato, CNPJ e endereco vindos da planilha.

### 6.3 Estudante, inscricao e carteira

Componentes:

- `StudentHub`
- `StudentActionTile`
- `RegistrationStepper`
- `UploadDropzone`
- `StageEvidenceFields`
- `DynamicWalletCard`
- `WalletSecurityQr`
- `OfflineWalletBanner`

Includes atuais:

- `_includes/portal_estudante.html`

Modulos:

- `inscricao.js`
- `consulta.js`
- `carteira.js`
- `data_layer.js`

Contratos:

- Inscricao nova
- Renovacao
- Consulta CPF/status
- Carteira digital
- Atualizacao de estagio uma vez por ciclo

Direcao Stitch:

- Stepper visual para inscricao.
- Hub mobile-first para estudante.
- Carteira com destaque visual forte, mas mantendo QR, status, turno, estagio e offline como regras de dados.

### 6.4 Radar e mobilidade

Componentes:

- `RadarSplitView`
- `RadarBottomSheet`
- `RadarMapSurface`
- `RouteTimeline`
- `VehicleStatusCard`
- `EmergencyActionBar`

Includes atuais:

- `_includes/radar_mobilidade.html`
- `_includes/admin/viagem.html`

Modulos:

- `mobilidade.js`
- `admin_sos.js`

Contratos:

- GPS
- Fiscalizacao de rota
- Check-in
- Viagens
- SOS/emergencia

Direcao Stitch:

- Desktop com split-view.
- Mobile com mapa em primeiro plano e bottom sheet para detalhes.
- Botoes grandes e estados criticos de baixa ambiguidade.

### 6.5 Secretaria/admin

Componentes:

- `AdminShell`
- `AdminSidebar`
- `PermissionAwareNav`
- `KpiGrid`
- `DashboardChartPanel`
- `SemesterManagementPanel`
- `MachineRoomPanel`

Includes atuais:

- `_includes/portal_admin.html`
- `_includes/admin/menu.html`
- `_includes/admin/login.html`

Modulos:

- `admin_dashboard.js`
- `admin_semestres.js`
- `operacao.js`
- `api_auth.js`

Contratos:

- Login operador
- Menus por perfil
- `dashboardStats`
- Gestao de semestres
- Sala das Maquinas
- IA/DOCS/Push

Direcao Stitch:

- Desktop-first.
- Sidebar administrativa clara.
- KPIs escaneaveis.
- Sala tecnica com estados observaveis, sem loop silencioso.

### 6.6 Auditoria

Componentes:

- `AuditWorkspace`
- `AuditKpiStrip`
- `AuditFilterBar`
- `AuditQueueTable`
- `StudentXRayPanel`
- `DocumentPreviewPanel`
- `AuditDecisionBar`

Includes atuais:

- `_includes/portal_admin.html`
- `_includes/modais.html`

Modulos:

- `operacao.js`
- `data_layer.js`

Contratos:

- `getListaAuditoria`
- Adapter `auditStudent`
- Parecer humano
- Status de auditoria
- Documentos e dados de estagio

Direcao Stitch:

- A tela `Maestro Admin Audit Dashboard Desktop` vira referencia principal.
- A fila deve manter suporte a todos os estudantes do semestre/tenant.
- Filtros devem ficar persistentes e previsiveis.
- O raio-X lateral deve reduzir uso de modal em desktop, mantendo modal/bottom sheet no mobile.

### 6.7 Fiscal e motorista

Componentes:

- `FiscalScannerShell`
- `ScannerViewport`
- `ManualIdEntry`
- `ValidationResultPanel`
- `DriverActionHub`
- `RouteControlSheet`

Includes atuais:

- `_includes/portal_admin.html`
- `_includes/admin/menu.html`
- `_includes/admin/viagem.html`

Modulos:

- `admin_fiscal.js`
- `admin_sos.js`
- `mobilidade.js`

Contratos:

- Fiscalizacao QR
- Entrada manual
- Painel motorista
- Iniciar/encerrar rota
- SOS

Direcao Stitch:

- Scanner em tela cheia no mobile.
- Alternativa manual sempre visivel.
- Feedback critico com cor, texto e icone vetorial.

## 7. Registro de componentes e propriedades esperadas

| Componente alvo | Propriedades esperadas | Estados | Contexts/tokens |
| --- | --- | --- | --- |
| `MaestroGateway` | `tenant`, `theme`, `logo`, `profiles`, `isOffline` | loading, ready, offline, error | theme, tenant |
| `TenantSelector` | `clientes`, `selectedTenant`, `onSelect` | empty, loading, selected, error | tenant |
| `StudentHub` | `studentIdentity`, `status`, `actions` | anonymous, logged, pending, blocked | student, semester |
| `RegistrationStepper` | `currentStep`, `values`, `validation`, `uploads` | editing, validating, submitting, success, error | tenant, semester |
| `StageEvidenceFields` | `tipoVinculo`, `inicio`, `fim`, `declaracao`, `remainingUpdates` | inactive, required, uploaded, invalid, locked | student, semester |
| `DynamicWalletCard` | `student`, `turnos`, `estagio`, `status`, `offlineSnapshot` | valid, outOfTurn, internship, expired, offline | theme, student |
| `RadarSplitView` | `routes`, `selectedRoute`, `vehicles`, `geoStatus` | loading, live, stale, offline, error | tenant, semester |
| `RadarBottomSheet` | `selectedEntity`, `actions`, `criticalState` | collapsed, expanded, critical | theme |
| `AdminSidebar` | `operatorProfile`, `items`, `currentView` | expanded, compact, mobileHidden | operator |
| `KpiGrid` | `stats`, `filters`, `semesterId` | loading, success, empty, stale, error | semester |
| `AuditQueueTable` | `students`, `filters`, `selection`, `limitInfo` | loading, success, empty, stale, error | operator, semester |
| `StudentXRayPanel` | `student`, `documents`, `auditTrail`, `stageData` | loading, ready, missingDocs, decisionPending | semester |
| `MachineRoomPanel` | `health`, `jobs`, `engines`, `lastRun` | loading, running, success, timeout, error | operator, tenant |
| `FiscalScannerShell` | `cameraState`, `manualId`, `result` | idle, scanning, manual, valid, invalid, error | operator |
| `DriverActionHub` | `driver`, `route`, `tripState` | notStarted, active, paused, finished, emergency | operator |

## 8. Ordem tecnica recomendada

1. Criar classes semanticas de shell e navegacao sem trocar contratos.
2. Modernizar Gateway e Hub publico com tokens da planilha.
3. Modernizar Hub do estudante e Consulta/Resgate.
4. Migrar Inscricao para stepper visual mantendo os payload builders atuais.
5. Modernizar Dashboard e Semestres usando `dashboardStats` e `semesterContext`.
6. Modernizar Mesa de Auditoria com fila, filtros e raio-X lateral.
7. Modernizar Carteira, Radar, Fiscal e Motorista.
8. Revisar Sala das Maquinas com estados observaveis para IA/DOCS/Push.
9. Executar QA visual mobile/tablet/desktop e PWA instalado.

## 9. Dependencias antes de implementar as proximas subfases

- `getListaAuditoria` deve seguir respondendo a lista completa do semestre/tenant.
- Filtros da auditoria devem permanecer funcionais apos a troca visual.
- Sala das Maquinas deve responder com estados claros para healthcheck, IA, DOCS e Push.
- Cache PWA deve invalidar versoes antigas quando mudar URL/cache name.
- Tokens light/dark da planilha devem estar aplicados no root CSS antes do redesign fino.
- Iconografia vetorial deve continuar substituindo emojis residuais.
- `MaestroData.storage` deve continuar sendo usado para cache versionado.

## 10. Criterios de aceite da Fase 7

- Cada tela Stitch possui um destino tecnico no Jekyll atual.
- Nenhum componente proposto exige alterar contrato `apiCall`.
- Nenhum componente depende de HTML bruto do Stitch.
- Todos os componentes indicam seus contexts de dados.
- Todos os componentes indicam dependencia de tokens da planilha quando aplicavel.
- A ordem de implementacao reduz risco: shell e gateway antes de fluxos criticos; auditoria depois de estabilidade confirmada.
- A arquitetura continua compativel com GitHub Pages/Jekyll.

## 11. Prompts de continuidade

Fase 7.1:

`Continue a Fase 7.1: implemente a base visual do MaestroShell, Gateway e Hub publico inspirada no Stitch, usando includes Jekyll atuais, tokens da planilha e contexts MaestroData, sem alterar contratos apiCall.`

Fase 7.2:

`Continue a Fase 7.2: modernize o Hub do Estudante e a Inscricao em stepper responsivo, preservando payload builders, uploads, campos de estagio, localStorage compativel e contratos atuais.`

Fase 7.3:

`Continue a Fase 7.3: modernize Dashboard, Semestres e Sidebar administrativa desktop-first, preservando dashboardStats, semesterContext, permissoes e contratos apiCall.`

Fase 7.4:

`Continue a Fase 7.4: modernize a Mesa de Auditoria com KPIs, filtros persistentes, fila completa e raio-X lateral, preservando getListaAuditoria, auditStudent e acoes de parecer.`

Fase 7.5:

`Continue a Fase 7.5: modernize Carteira, Radar, Fiscal e Motorista com bottom sheets mobile, split-view desktop, scanner QR e estados criticos, preservando GPS, offline e contratos existentes.`

Fase 7.6:

`Continue a Fase 7.6: revise o polimento final da Fase 7 com QA visual mobile/tablet/desktop, acessibilidade, iconografia vetorial, tokens light/dark e PWA/GitHub Pages.`
