# Histórico de Mudanças e Evoluções do Sistema (Changelog)
**Projeto:** Entrada InHouse • Controle de Acesso Autônomo para Mercados em Condomínios  
**Repositório:** Projeto da Visita Técnica  
**Última Atualização:** Setembro / 2026  

---

## Sumário Executivo
Este documento registra cronologicamente todas as versões, refatorações, correções de bugs e evoluções de engenharia de software e hardware do sistema **Entrada InHouse**. Cada release segue práticas de auditoria, conformidade com a LGPD e robustez de missão crítica para operação autônoma 24/7.

---

## [v1.8.1] - 2026-09-18 - Central de Inicialização Autônoma e Scripts em 1 Clique

### 🎯 Objetivos
- Permitir que o proprietário/administrador do projeto inicialize e encerre os servidores (Backend e Frontend) de forma 100% autônoma, sem depender do assistente de IA.
- Oferecer documentação completa passo a passo e scripts executáveis diretos para Windows.

### 🔄 Modificações Realizadas
1. **Pasta de Inicialização (`como_iniciar_sistema/`):**
   - Criação do documento central [`COMO_INICIAR_O_SISTEMA.md`](file:///c:/Users/Jose%20Matheus/OneDrive/Documentos/Projeto%20da%20Visita%20T%C3%A9cnica/como_iniciar_sistema/COMO_INICIAR_O_SISTEMA.md), detalhando portas, comandos manuais, acesso local, acesso pelo celular de amigos na mesma rede Wi-Fi, credenciais e solução de dúvidas.
   - Script executável batch `iniciar_sistema.bat`: inicia backend, frontend em modo host Wi-Fi e abre o navegador automaticamente em `http://localhost:5173`.
   - Script executável batch `parar_sistema.bat`: finaliza instâncias ativas do Node e Vite liberando as portas 3000 e 5173.
   - Script PowerShell `iniciar_sistema.ps1`: alternativa nativa moderna para PowerShell.
2. **Atalhos na Raiz do Repositório:**
   - Criação de `INICIAR_TUDO.bat` e `PARAR_TUDO.bat` na pasta raiz do projeto para acesso imediato em 1 duplo clique no Windows Explorer.

---

## [v1.8.0] - 2026-09-18 - Ciclo Completo de Saída no PWA do Morador e Ações Rápidas no Painel

### 🎯 Objetivos
- Resolver o bloqueio de "morador preso dentro do minimercado" no ambiente web/PWA e em testes virtuais.
- Permitir que o morador registre sua saída diretamente pelo aplicativo com destravamento da fechadura.
- Oferecer sincronização automática em tempo real (auto-polling) e suporte a geração contextual de chave de saída (`type: 'EXIT'`).
- Disponibilizar botões de liberação rápida de saída no painel do administrador (tanto geral via botoeira virtual quanto individual por condômino).

### 🔄 Modificações Realizadas
1. **Aplicativo do Morador (`ResidentView.jsx`):**
   - **Auto-polling em Tempo Real:** Atualização automática do perfil (`fetchProfile`) a cada 3 segundos, refletindo instantaneamente se a saída foi acionada por botão físico, sensor ou painel administrativo.
   - **Visão Dedicada de "Visita em Andamento":** Quando o morador está dentro (`is_inside === 1`), a aba principal exibe o card interativo de presença com o botão de destaque **`Destrancar Porta & Registrar Saída`** (`handleExitStore`).
   - **Botão de Saída Rápida no Cabeçalho:** Adicionado botão compacto `🚪 Sair` no topo do app para acionamento imediato em qualquer aba.
   - **Chaves Dinâmicas Contextuais:** Caso o morador prefira gerar QR Code enquanto estiver dentro, o sistema gera uma chave do tipo `EXIT` ("Chave de Saída TOTP") em vez de disparar bloqueio por Anti-Passback.
   - **Feedback Visual de Saída:** Banner de confirmação de destrancamento da porta e liberação do Anti-Passback.
2. **Dashboard do Administrador (`AdminDashboard.jsx`):**
   - **Botão `Simular Saída Livre`:** Adicionado no cabeçalho de monitoramento ao lado de "Abertura Remota", permitindo acionar a botoeira virtual No-Touch de saída a qualquer instante.
   - **Liberação Individual por Unidade:** No card de cada morador com presença ativa (`No Mercado`), adicionado o botão direto `Liberar Saída`.
3. **Validação e Testes:**
   - Suíte de 11 testes ponta a ponta (`backend/test_exit_flow.js`) validada com 100% de sucesso.
   - Teste de gestão administrativa (`backend/test_admin_residents.js`) 100% aprovado.
   - Build de produção (`npm run build`) validado no Vite sem erros.

---

## [v1.7.1] - 2026-09-18 - Privacidade e Segurança do Endereço IP do Administrador

### 🎯 Objetivos
- Proteger dados de infraestrutura de rede (endereço IP e porta do gateway/servidor) durante demonstrações, capturas de tela ou compartilhamento de tela pelo Administrador/Síndico.

### 🔄 Modificações Realizadas
1. **Controle de Visualização de IP com Botão de Olhinho (`AdminDashboard.jsx`):**
   - Inclusão do botão alternador com ícones `Eye` e `EyeOff` da biblioteca `lucide-react` imediatamente ao lado do endereço IP no banner de hardware e telemetria.
   - Máscara de segurança dinâmica: exibe `••••••••••••••` quando oculto e o endereço IP real (`192.168.18.14:3000`) quando revelado.
   - Persistência de preferência via `localStorage` (`admin_show_ip`), preservando a escolha do usuário entre recarregamentos de página.
   - Feedback tátil e visual com tooltip descritivo e classes de transição de cor no padrão Obsidian Glass.
2. **Validação de Compilação:**
   - Validação com `npm run build` no Vite concluída com 100% de sucesso.

---

## [v1.7.0] - 2026-09-18 - Governança de Moradores Cadastrados e Gestão de Passes Visitantes

### 🎯 Objetivos
- Oferecer visibilidade completa ao Síndico/Administrador sobre todas as unidades autônomas cadastradas no condomínio.
- Permitir a auditoria e governança de todos os passes e links de visitantes gerados pelos moradores, prevenindo acessos indevidos e permitindo cancelamentos administrativos preventivos.

### 🔄 Modificações Realizadas
1. **Backend & Endpoints Administrativos:**
   - **`GET /api/admin/residents`**: Retorna todos os moradores cadastrados (`role = 'RESIDENT'`) agrupando seus respectivos convites e passes visitantes da tabela `visitor_invites`.
   - **`DELETE /api/admin/invites/:id`**: Permite a revogação administrativa imediata de passes de visitantes.
2. **Dashboard do Administrador (`AdminDashboard.jsx`):**
   - **3 KPIs Rápidos:** Contadores de Moradores Ativos, Passes Visitante Emitidos e Aprovações Pendentes.
   - **Visualização das Unidades Cadastradas:** Cards no padrão Obsidian Glass contendo avatar, nome, apartamento, data de cadastro, status do termo LGPD e indicador de presença no mercado em tempo real.
   - **Listagem de Passes de Visitantes por Unidade:** Exibição do nome do convidado, código (`VISIT-XXXXXXXX`), validade, contagem de usos, status visual (*Ativo*, *Utilizado*, *Expirado*, *Revogado*), botão para **Copiar Link** público direto com feedback, atalho para abrir o passe e botão de revogação.
   - **Minimização / Accordion dos Passes Emitidos (Ergonomia de Tela):**
     - Subseção de passes retrátil e minimizada por padrão por morador, prevenindo que um morador com muitos convites empurre os demais para fora do viewport.
     - Botão interativo `Ver Passes ▾` / `Recolher Passes ▴` com badge indicando o número de convites e quantos estão ativos.
     - Botão global no cabeçalho **`Expandir Todos / Recolher Todos`** com alternância sincronizada.
3. **Validação e Testes Automatizados (`backend/test_admin_residents.js` & Build de Produção):**
   - Suíte de testes validando geração de convite por morador, recuperação completa pelo endpoint administrativo com indexação correta à unidade 101, e revogação de passe com status `REVOKED`. 100% de sucesso.
   - Validação de compilação sem erros no Vite (`npm run build`) com 1947 módulos transformados com sucesso.

---

## [v1.6.0] - 2026-09-18 - Detecção e Registro de Saída Legal (Fluxo Livre, AVCB e Botoeira No-Touch)

### 🎯 Objetivos
- Atender com rigor irrestrito às normas de segurança da vida (NBR 9077 e Instruções Técnicas do Corpo de Bombeiros / AVCB), eliminando qualquer possibilidade de retenção física ou cárcere involuntário no interior do minimercado autônomo.
- Implementar a detecção e registro forense completo do ciclo de saída (`action: 'EXIT'`).
- Automatizar a liberação da regra de Anti-Passback para reentradas e o decremento do medidor de lotação do mercado (`current_occupancy`).

### 🔄 Modificações Realizadas
1. **Backend & Endpoint de Saída (`POST /api/access/exit`):**
   - Criação da rota com suporte a múltiplos métodos de disparo: Botoeira No-Touch (`NO_TOUCH_SENSOR`), botão de saída (`EXIT_BUTTON`), identificação por totem QR de saída (`QR_SAIDA`) ou solicitação via aplicativo do residente.
   - Atualização automática do estado de permanência do usuário no banco (`users.is_inside = 0`), liberando o Anti-Passback.
   - Registro detalhado na tabela `access_logs` com timestamp UTC, método utilizado e vínculo correspondente.
2. **Dashboard de Monitoramento (Obsidian Glass UI):**
   - Inclusão do botão de filtro segmentado **`Fluxo de Saída`**.
   - Renderização estilizada dos eventos `EXIT` com badge em ciano escuro, ícone dedicado de porta aberta (`DoorOpen`), identificação do meio de saída e horário formatado.
   - Sincronização em tempo real do card de **Ocupação Atual**, refletindo a diminuição da quantidade de pessoas dentro da loja no momento da saída.
3. **Firmware ESP32 & Simulação Wokwi:**
   - Adição do pino `#define PIN_EXIT_BUTTON 18` com `INPUT_PULLUP`.
   - Implementação da rotina `triggerExit()` na FSM, destravando a fechadura por 5 segundos, emitindo aviso no LCD ("SAIDA LIBERADA / ATE BREVE!") e enviando telemetria HTTP para `/api/access/exit`.
   - Adição de comando de teste via terminal Serial (`"SAIDA"` ou `"EXIT"`).
   - Inclusão de botão virtual verde (`btn_exit`) no diagrama esquemático `wokwi/diagram.json`.
4. **Validação e Testes Automatizados em Ambiente Virtual (`backend/test_exit_flow.js`):**
   - Suíte de 11 testes cobrindo todo o ciclo: autenticação JWT, aceite LGPD, geração de TOTP, validação de entrada, bloqueio de Anti-Passback, checagem de ocupação inicial, acionamento de saída No-Touch, liberação do Anti-Passback, decremento de ocupação, saída identificada de visitante e auditoria forense dos logs no banco. Resultado: 100% de aprovação.

---

## [v1.5.0] - 2026-09-18 - Padronização "Entrada InHouse", Suporte Multi-Loja e Limpeza de Escopo

### 🎯 Objetivos
- Adequação da identidade do produto para **"Entrada InHouse • [Nome do Condomínio]"**.
- Suporte a administradores/proprietários com múltiplos micromercados instalados em diferentes condomínios residenciais ou comerciais.
- Eliminação de dependências de hardware não prioritárias (módulo de câmeras/snapshots) mantendo o foco exclusivo em telemetria, controle de acesso, auditoria e segurança.

### 🔄 Modificações Realizadas
1. **Identidade Visual e Topologia Multi-Unidade:**
   - Substituição de termos estáticos como "Torniquete e Catraca" por **`Entrada InHouse • {config.name}`**.
   - Integração da topologia configurada via Admin (`/api/config`), permitindo que a mesma interface gerencie instâncias personalizadas por empreendimento.
   - Atualização de textos contextuais de liberação remota ("Porta Liberada!").

2. **Remoção do Subsistema de Captura de Câmeras (Snapshot):**
   - Exclusão do modal de câmeras de segurança CFTV mockado (`snapshotModalLog`).
   - Remoção da coluna de "Instantâneo" e do botão de disparo de câmera na tabela de registros em tempo real.
   - Otimização do grid de exibição da tabela (redução para 6 colunas auditáveis) com alinhamento visual de badges de status.
   - Limpeza das dependências de ícones não utilizados (`Camera`, `X`).

3. **Criação da Central de Auditoria e Logs:**
   - Criação da pasta `/logs_e_mudancas_sistema/` para guarda de histórico técnico de releases e especificações dos logs de acesso.

4. **Padronização de Nomenclatura: Passe Visitante:**
   - Substituição do termo "Passe Solidário" / "Passes Solidários" por **"Passe Visitante"** / **"Passes Visitante"** nos badges da tabela de auditoria, filtros segmentados, cards de KPI e aba do aplicativo do morador.

---

## [v1.4.0] - 2026-09-18 - Redesign Obsidian Glass & Dashboard de Telemetria Avançada

### 🎯 Objetivos
- Implementar uma interface refinada inspirada em padrões dark mode industriais ("Obsidian Glass"), trazendo visibilidade operacional instantânea ao operador.

### 🔄 Modificações Realizadas
1. **Cards de KPIs Operacionais em Tempo Real:**
   - **Ocupação Atual:** Contador dinâmico de pessoas no interior do mercado com barra de progresso colorida baseada na capacidade máxima (`max_capacity: 6`).
   - **Fluxo Diário:** Total de acessos autorizados nas últimas 24 horas.
   - **Passes de Visitantes Ativos:** Monitoramento de convites QR/código com status ativo no momento.
   - **Alertas de Segurança:** Indicador de tentativas negadas e acionamentos de emergência.

2. **Banner de Telemetria de Hardware IoT (ESP32):**
   - Status de comunicação via ping em tempo real (`ONLINE & SINCRONIZADO`).
   - Botão para envio de comando `Manual Ping` e diagnóstico de rede.
   - Botão de abertura de emergência remota com feedback tátil e sonoro visual.

3. **Tabela de Registros com Filtros Segmentados:**
   - Filtros instantâneos estilo macOS/Apple: `Todos os Registros`, `Apenas Moradores`, `Apenas Visitantes` e `Tentativas Negadas`.
   - Busca textual instantânea por nome, unidade, método ou detalhes.
   - Exportação direta de relatórios para formato CSV em conformidade com RFC 4180.

---

## [v1.3.0] - 2026-09-18 - Conformidade LGPD, TOTP Rotativo e Convites com Responsabilidade Solidária

### 🎯 Objetivos
- Blindagem jurídica do condomínio através de termos de consentimento prévio.
- Prevenção de clonagem ou compartilhamento indevido de credenciais.
- Gestão de convites a visitantes com vínculo civil explícito ao morador responsável.

### 🔄 Modificações Realizadas
1. **Termos LGPD de Acesso e Reconhecimento de Riscos:**
   - Adicionado modal e flag obrigatória `lgpd_accepted` no cadastro e primeiro login do morador.
   - Registro de consentimento para tratamento de dados cadastrais e logs de segurança física (Art. 7º, IX da Lei 13.709/2018).

2. **Geração de Senha Dinâmica Rotativa (TOTP 30s):**
   - Algoritmo de geração de token de 6 dígitos criptografado com ciclo de renovação a cada 30 segundos.
   - Barra regressiva circular/linear para feedback visual do tempo de expiração do morador no app.

3. **Convites de Visitante com Responsabilidade Solidária:**
   - Modal para o morador cadastrar visitantes informando nome, previsão de validade e termo de ciência de que eventuais danos no minimercado serão vinculados à sua unidade autônoma.
   - Rota pública `/guest-pass/:id` gerando link compartilhável via WhatsApp com QR Code descartável e cronômetro de expiração.

---

## [v1.2.0] - 2026-09-17 - Arquitetura Frontend em React 18, Vite e Tailwind CSS

### 🎯 Objetivos
- Criar a Single Page Application (SPA) para gerenciamento condominial e operação dos moradores.

### 🔄 Modificações Realizadas
1. **Configuração do Dashboard Administrativo:**
   - Navegação em abas: Monitoramento em Tempo Real, Aprovação de Novos Moradores e Configurações de Topologia Predial.
   - Polling inteligente de 500ms para sincronização com o banco SQLite.

2. **Painel do Morador / Usuário:**
   - Interface mobile-first para exibição da credencial de entrada, chave dinâmica, histórico individual e botão de convite.

---

## [v1.1.0] - 2026-09-16 - Firmware ESP32 em C++, FSM e Segurança AVCB

### 🎯 Objetivos
- Garantir tempo de resposta < 100ms na leitura de QR Code / teclado físico e atendimento irrestrito às normas de bombeiros (AVCB).

### 🔄 Modificações Realizadas
1. **Máquina de Estados Finita (FSM):**
   - Estados: `IDLE` (Aguardando credencial) -> `VALIDATING` (Comunicação com backend ou NVS) -> `OPEN` (Pulso de relé na fechadura magnética) -> `PASS_DETECTED` (Sensor de feixe infravermelho de passagem) -> `TIMEOUT_WARNING` -> `ALARM`.

2. **Norma de Emergência AVCB (Pânico Físico):**
   - Interrupção por hardware no pino GPIO do botão de emergência / alarme de incêndio, desenergizando instantaneamente o solenoide da porta e enviando log `EMERGENCY` para o servidor.

3. **Chaves Mestres Offline (Memória NVS):**
   - Armazenamento de hash de credenciais de emergência (síndico, equipe de manutenção e segurança) para abertura mesmo com queda total do sinal Wi-Fi.

---

## [v1.0.0] - 2026-09-15 - Arquitetura de Microsserviço Backend & SQLite

### 🎯 Objetivos
- Estabelecer a API REST com isolamento de transações e regras de segurança contra fraudes.

### 🔄 Modificações Realizadas
1. **Modelo Relacional SQLite (`db.sqlite`):**
   - Tabelas: `users`, `guest_passes`, `access_logs`, `condo_config`, `system_metrics`.
2. **Motor Anti-Passback Rigoroso:**
   - Bloqueio de reentradas consecutivas sem registro prévio de saída, evitando que um mesmo QR Code seja passado para terceiros que estão fora.
3. **Autenticação Segura:**
   - Hash de senhas com bcrypt e tokens de sessão no padrão JWT (JSON Web Token).
