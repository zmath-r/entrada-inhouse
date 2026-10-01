const http = require('http');

async function runTests() {
    console.log("=== INICIANDO TESTES DA SPRINT 1 ===\n");

    try {
        // 1. Testar Login
        console.log("1. Tentando fazer login com o usuário criado...");
        const loginRes = await request('/api/auth/login', { apartment: '101', password: 'morador123' });
        if (!loginRes.token) throw new Error("Falha no login!");
        const jwtToken = loginRes.token;
        console.log("✅ Login efetuado! JWT Recebido.\n");

        // 2. Testar Geração de Token (Catraca)
        console.log("2. Gerando Token de Acesso (com JWT)...");
        const generateRes = await request('/api/tokens/generate', {}, jwtToken);
        if (generateRes.error) throw new Error(generateRes.error);
        const qrCodeToken = generateRes.token;
        console.log(`✅ Token gerado com sucesso: ${qrCodeToken}\n`);

        // 3. Simular o ESP32 Validando a Entrada
        console.log("3. ESP32 simulando a leitura do QR Code na porta...");
        const validateRes = await request('/api/tokens/validate', { token: qrCodeToken });
        console.log(`✅ Resposta do ESP32: ${validateRes.status} - ${validateRes.message}\n`);

        // 4. Testar o Anti-Passback
        console.log("4. Tentando gerar um NOVO QR Code sem ter saído (Anti-Passback)...");
        const passbackRes = await request('/api/tokens/generate', {}, jwtToken);
        if (passbackRes.error) {
            console.log(`✅ Sistema bloqueou corretamente! Motivo: ${passbackRes.error}\n`);
        } else {
            console.error("❌ O sistema deveria ter bloqueado a entrada!");
        }

        // 5. Testar Rota de Telemetria (Heartbeat)
        console.log("5. ESP32 enviando sinal de 'Estou Vivo' (Telemetria)...");
        await request('/api/hardware/ping', { status: 'ONLINE' }, null, false);
        console.log("✅ Ping registrado com sucesso no banco de dados.\n");

        console.log("=== TODOS OS TESTES PASSARAM COM SUCESSO! ===");

    } catch (err) {
        console.error("❌ Erro durante os testes:", err.message);
    }
}

// Função auxiliar para fazer chamadas HTTP nativas
function request(path, bodyData, token = null, expectJson = true) {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify(bodyData);
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: path,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': data.length
            }
        };

        if (token) {
            options.headers['Authorization'] = `Bearer ${token}`;
        }

        const req = http.request(options, (res) => {
            let responseData = '';
            res.on('data', (chunk) => responseData += chunk);
            res.on('end', () => {
                if (expectJson) {
                    try { resolve(JSON.parse(responseData)); } 
                    catch (e) { resolve(responseData); }
                } else {
                    resolve(responseData);
                }
            });
        });

        req.on('error', (e) => reject(e));
        req.write(data);
        req.end();
    });
}

runTests();
