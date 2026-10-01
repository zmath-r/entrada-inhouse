# Especificação Técnica de Logs e Auditoria do Sistema
**Sistema:** Entrada InHouse  
**Módulo:** Auditoria, Segurança e Rastreabilidade  
**Legislação Aplicável:** Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018, Art. 7º, IX)

---

## 1. Visão Geral da Arquitetura de Logs
O sistema **Entrada InHouse** opera com controle rigoroso de eventos para garantir integridade pericial em estabelecimentos autônomos dentro de condomínios. Como não há operadores físicos na portaria do micromercado, todos os eventos de validação, liberação, negação e pânico são salvos em banco transacional com timestamp UTC e atributos de rastreabilidade.

---

## 2. Estrutura do Esquema de Dados (`access_logs`)

No banco de dados SQLite (`backend/db.sqlite`), cada evento é armazenado na tabela `access_logs`:

| Coluna | Tipo | Descrição |
| :--- | :--- | :--- |
| `id` | INTEGER PRIMARY KEY | Identificador único sequencial do evento. |
| `user_id` | INTEGER | ID de morador (tabela `users`) ou `NULL` para visitantes/pânico. |
| `action` | TEXT | Tipo do evento: `ENTRY`, `EXIT`, `DENIED`, `EMERGENCY`. |
| `method` | TEXT | Meio físico de acesso: `APP_QR`, `GUEST_PASS`, `NO_TOUCH_SENSOR`, `EXIT_BUTTON`, `QR_SAIDA`, `REMOTE_OVERRIDE`, `FIRE_BUTTON`. |
| `details` | TEXT | Metadados auditáveis: apartamento, nome, código do convite, método ou motivo do bloqueio. |
| `timestamp` | DATETIME | Data e hora em formato ISO 8601 UTC gerada no momento da ocorrência. |

---

## 3. Classificação dos Tipos de Evento

### 🟢 `ENTRY` (Acesso Autorizado)
Disparado quando a credencial apresentada atende a todos os requisitos:
- **Morador:** Usuário ativo, com cadastro aprovado pelo Administrador, termo LGPD aceito e regra de Anti-Passback validada.
- **Visitante:** Código de convite ou QR Code válido, dentro da janela de validade e com unidade do morador anfitrião identificada.
- **Ação de Hardware:** Pulso de 5000ms enviado ao relé do solenoide/fechadura magnética.

### 🔵 `EXIT` (Saída Autorizada & Desimpedida - Conformidade AVCB)
Disparado para garantir a rota de fuga desimpedida (NBR 9077 e Código Penal):
- **Botoeira No-Touch / Sensor de Fluxo:** Acionamento por aproximação física, destravando o eletroímã incondicionalmente (Fail-Safe) e enviando telemetria imediata para `POST /api/access/exit`.
- **Totem de Saída / App Morador:** Identificação nominal do morador ou visitante que desocupou a loja, encerrando o intervalo de permanência.
- **Efeitos no Sistema:**
  - Ocupação atual do mercado decrementada instantaneamente (`current_occupancy`).
  - Flag de Anti-Passback do morador resetada para `is_inside = 0`, liberando nova entrada.
- **Ação de Hardware:** Pulso de 5000ms na trava eletroímã, aviso luminoso/LCD ("SAIDA LIBERADA / ATE BREVE!") e bipe suave.

### 🔴 `DENIED` (Tentativa de Acesso Negada)
Registrado imediatamente com o motivo específico nos `details`:
- `Código de visitante expirado`
- `Credencial inexistente ou inválida`
- `Usuário com cadastro pendente de aprovação`
- `Violação de Anti-Passback (usuário já consta no interior da loja)`
- **Ação de Hardware:** Pulso sonoro de alerta no buzzer e LED vermelho no leitor.

### ⚠️ `EMERGENCY` (Liberação de Emergência / AVCB)
Registrado para auditoria de segurança da vida e patrimônio:
- `Liberação remota acionada pelo Administrador via painel web`
- `Acionamento físico do botão de emergência / Alarme de incêndio AVCB`
- **Ação de Hardware:** Fechadura magnética desenergizada por hardware instantaneamente (Fail-Safe).

---

## 4. Conformidade com a LGPD (Lei 13.709/2018)

1. **Base Legal (Art. 7º, IX):**
   - O tratamento e armazenamento dos logs de acesso baseia-se no legítimo interesse da administração condominial para salvaguardar a segurança física das pessoas e a proteção patrimonial da área privativa do mercado.
2. **Minimização de Dados:**
   - O sistema não registra biometrias invasivas nem imagens desnecessárias; apenas identificadores de credenciais, horários e unidade condominial responsável.
3. **Responsabilidade Solidária do Morador:**
   - Convites emitidos para visitantes ficam criptograficamente indexados à unidade autônoma que gerou o convite, gerando vínculo civil explícito para fins de ressarcimento em caso de danos ou furtos.

---

## 5. Exportação de Relatórios Auditáveis (CSV)

O painel de monitoramento conta com funcionalidade de exportação direta para arquivos `.csv` padrão RFC 4180 contendo:
- ID sequencial;
- Data e Hora formatadas em fuso horário local (`pt-BR`);
- Identificação do Usuário e Unidade;
- Vínculo (Morador Titular, Dependente ou Convidado);
- Método de Entrada;
- Status da Operação;
- Rastreamento de detalhes forenses.
