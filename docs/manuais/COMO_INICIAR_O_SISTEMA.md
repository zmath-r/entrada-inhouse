# Manual Completo de Inicialização e Operação Autônoma
**Projeto:** Entrada InHouse • Controle de Acesso Autônomo para Mercados em Condomínios  
**Autor:** Engenharia Entrada InHouse  
**Última Atualização:** Setembro / 2026  

---

## 📌 Sumário
1. [Visão Geral dos Componentes](#-1-visão-geral-dos-componentes)
2. [Método 1: Inicialização em 1 Clique (Recomendado)](#-2-método-1-inicialização-em-1-clique-recomendado)
3. [Método 2: Inicialização Manual pelo Terminal](#-3-método-2-inicialização-manual-pelo-terminal)
4. [Como Acessar no PC e no Celular de Amigos](#-4-como-acessar-no-pc-e-no-celular-de-amigos)
5. [Credenciais de Demonstração](#-5-credenciais-de-demonstração)
6. [Roteiro Rápido para Apresentações](#-6-roteiro-rápido-para-apresentações)
7. [Como Desligar o Sistema](#-7-como-desligar-o-sistema)
8. [Perguntas Frequentes e Resolução de Problemas](#-8-perguntas-frequentes-e-resolução-de-problemas)

---

## 🧩 1. Visão Geral dos Componentes

O sistema **Entrada InHouse** é dividido em duas partes fundamentais que trabalham de forma coordenada:

| Componente | Pasta | Porta | O que faz? |
| :--- | :--- | :--- | :--- |
| **Backend API** | `/backend` | `3000` | Servidor Node.js com banco de dados SQLite (`database.sqlite`). Processa autenticação JWT, regras de negócio LGPD, Anti-Passback, logs de auditoria e telemetria de hardware. |
| **Frontend PWA** | `/dashboard` | `5173` | Interface React 19 + Tailwind CSS + Vite (Padrão Obsidian Glass). Contém o Painel do Administrador, o App Web do Morador e as páginas públicas de Passes Visitante. |

Ambos os serviços precisam estar em execução simultânea para que o sistema funcione perfeitamente.

---

## ⚡ 2. Método 1: Inicialização em 1 Clique (Recomendado)

Criamos scripts executáveis automáticos para que você possa iniciar e parar tudo com apenas dois cliques no Windows, sem precisar digitar comandos no terminal.

### 🚀 Para Iniciar Tudo:
1. Abra a pasta do projeto no Windows Explorer:
   `c:\Users\Jose Matheus\OneDrive\Documentos\Projeto da Visita Técnica`
2. Dê um **duplo clique** no arquivo:
   👉 **`INICIAR_TUDO.bat`** (ou dentro da pasta `scripts\iniciar_sistema.bat`)
3. O script irá:
   - Abrir automaticamente a janela preta do **Backend** (porta 3000);
   - Abrir automaticamente a janela preta do **Frontend** (porta 5173 com acesso à rede Wi-Fi);
   - Abrir o seu navegador de internet diretamente na tela de login (`http://localhost:5173`).

> [!TIP]
> Deixe as duas janelinhas pretas (Backend e Frontend) abertas ou minimizadas na barra de tarefas enquanto você ou seus amigos estiverem utilizando o sistema.

---

## 💻 3. Método 2: Inicialização Manual pelo Terminal

Caso você prefira iniciar os serviços manualmente via PowerShell ou Terminal do VS Code:

### Passo 1: Iniciar o Backend
1. Abra um terminal (PowerShell ou CMD).
2. Navegue até a pasta do backend:
   ```powershell
   cd "c:\Users\Jose Matheus\OneDrive\Documentos\Projeto da Visita Técnica\backend"
   ```
3. Inicie o servidor Node:
   ```powershell
   node server.js
   ```
4. Você verá a mensagem:
   `SmartCondo Backend Sprint 1 rodando na porta 3000`  
   `Conectado ao banco de dados SQLite.`

---

### Passo 2: Iniciar o Frontend
1. Abra um **segundo terminal** (mantenha o primeiro rodando).
2. Navegue até a pasta do dashboard:
   ```powershell
   cd "c:\Users\Jose Matheus\OneDrive\Documentos\Projeto da Visita Técnica\dashboard"
   ```
3. Inicie o Vite permitindo conexões de outros dispositivos na rede:
   ```powershell
   npx vite --host
   ```
4. Você verá os endereços disponíveis:
   ```text
   VITE v8.3.0  ready in 400 ms
   ➜  Local:   http://localhost:5173/
   ➜  Network: http://192.168.18.14:5173/
   ```

---

## 📱 4. Como Acessar no PC e no Celular de Amigos

### No seu Computador (Local):
- Abra o navegador e digite:  
  **`http://localhost:5173`**

### No Celular do seu Amigo (Rede Wi-Fi):
Para que seu amigo acesse pelo smartphone dele, **ambos devem estar conectados na mesma rede Wi-Fi**.

1. Descubra o endereço IP do seu computador abrindo o PowerShell e digitando:
   ```powershell
   ipconfig
   ```
   Procure por **"Adaptador de Rede sem Fio Wi-Fi"** -> **"Endereço IPv4"** (Exemplo: `192.168.18.14`).
2. Envie o link para o seu amigo abrir no navegador do celular dele:
   **`http://192.168.18.14:5173`** *(substitua pelo IP caso sua rede mude)*.
3. No celular dele, ele verá a mesma interface moderna PWA perfeitamente responsiva!

---

## 🔑 5. Credenciais de Demonstração

| Perfil | Usuário / Apto | Senha | O que testar? |
| :--- | :--- | :--- | :--- |
| **Administrador (Síndico)** | `Master` | `admin123` | • Botão de olhinho para ocultar/exibir o IP.<br>• KPIs de ocupação em tempo real.<br>• Lista retrátil (*accordion*) de Passes Visitantes.<br>• Botão de Simular Saída Livre e liberação remota. |
| **Morador (Unidade 101)** | `101` | `101` | • Termo de consentimento LGPD.<br>• Chave Dinâmica TOTP de 30 segundos.<br>• Emissão de Passes de Visitante.<br>• Botão de destravar porta e registrar saída. |
| **Morador (Unidade 102)** | `102` | `102` | • Unidade com status para testes e auditoria. |

---

## 🎯 6. Roteiro Rápido para Apresentações

Experimente fazer uma apresentação demonstrando o ciclo completo:

1. **Apresentar o Painel do Administrador:**
   - Faça login como `Master` / `admin123`.
   - Mostre os cards de telemetria em tempo real (Ocupação Atual, Entradas Hoje, Passes Ativos).
   - Clique no **botão de olhinho** ao lado do IP para demonstrar o recurso de privacidade e segurança da infraestrutura de rede.
   - Acesse a aba **Moradores & Unidades** e mostre a lista sanfonada com o botão **Expandir Todos / Recolher Todos**.

2. **Apresentar o Módulo do Morador:**
   - Em outra aba (ou no celular do seu amigo), acesse como morador `101` / `101`.
   - Gere uma Chave Dinâmica TOTP e mostre o cronômetro regressivo de 30 segundos com renovação automática contra fotos/screenshots.
   - Vá na aba **Passes Visitante**, digite o nome do seu amigo (ex: `Lucas Convidado`) e clique em **Gerar Link do Visitante**.
   - Clique em **Copiar Link** e envie o link para ele abrir (ex: `/invite/VISIT-XXXXXXXX`).

3. **Demonstrar a Saída Legal e Anti-Passback:**
   - Mostre que ao entrar na loja, o app do morador indica *"Dentro do Minimercado"*.
   - Para sair, basta clicar no botão verde de destaque: **`Destrancar Porta & Registrar Saída`** ou acionar a botoeira virtual no painel do administrador.
   - O Anti-Passback é imediatamente liberado e a ocupação diminui em tempo real!

---

## 🛑 7. Como Desligar o Sistema

Quando terminar de usar ou apresentar:

### Método Automático:
- Dê um duplo clique no arquivo:
  👉 **`PARAR_TUDO.bat`** (ou `scripts\parar_sistema.bat`).
- Ele encerra os processos Node e Vite rodando nas portas 3000 e 5173 de forma limpa.

### Método Manual:
- Vá até as duas janelas do terminal onde o Node e o Vite estão rodando e aperte `Ctrl + C` em cada uma, seguido de `S` (Sim) se solicitado.

---

## ❓ 8. Perguntas Frequentes e Resolução de Problemas

### 1. "A porta 3000 ou 5173 já está em uso!"
Se o terminal acusar que a porta já está ocupada por outra instância anterior:
- Execute o script `PARAR_TUDO.bat` para liberar as portas.
- Ou rode no PowerShell:
  ```powershell
  Get-Process node | Stop-Process -Force
  ```

### 2. "Meu amigo no celular não consegue abrir o IP!"
- Verifique se o celular dele está conectado no **mesmo sinal Wi-Fi** do computador (não nos dados móveis 4G/5G).
- Caso o Windows Defender Firewall pergunte se permite o Node.js na rede privada, clique em **Permitir Acesso**.

### 3. "Como reiniciar os dados do banco de teste para o estado original?"
O banco de dados fica no arquivo `backend/database.sqlite`. Para executar uma bateria de testes automáticos e validar a integridade de todas as tabelas:
```powershell
node backend/tests/test_exit_flow.js
node backend/tests/test_admin_residents.js
```
Ambos os scripts garantem que o banco está saudável e com 100% de conformidade.
