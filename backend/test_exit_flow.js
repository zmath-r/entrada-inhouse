const http = require('http');

async function runTests() {
    console.log("=================================================");
    console.log("🧪 TESTES VIRTUAIS DO FLUXO DE SAÍDA E AUDITORIA");
    console.log("=================================================\n");

    try {
        // 1. Login do Morador (Apto 101)
        console.log("1. Efetuando login do morador (Apto 101)...");
        const loginRes = await request('/api/auth/login', { apartment: '101', password: 'morador123' });
        if (!loginRes.token) throw new Error("Falha no login do morador: " + JSON.stringify(loginRes));
        const residentToken = loginRes.token;
        console.log("   ✅ Morador autenticado com sucesso via JWT.");

        // 2. Aceitar Termos LGPD (garante permissão)
        console.log("2. Garantindo aceite dos termos LGPD...");
        await request('/api/auth/terms/accept', {}, residentToken);
        console.log("   ✅ Termos LGPD ativos.");

        // Reset inicial do morador para garantir teste limpo
        await request('/api/access/exit', { user_id: loginRes.user?.id || 2, method: 'TEST_RESET' });

        // 3. Gerar Chave Dinâmica TOTP
        console.log("3. Morador gerando chave dinâmica TOTP para entrada...");
        const genRes = await request('/api/tokens/generate', {}, residentToken);
        if (genRes.error) throw new Error("Erro ao gerar token: " + genRes.error);
        const qrToken = genRes.token;
        console.log(`   ✅ Token TOTP gerado: ${qrToken} (Validade: 30s)`);

        // 4. Simulação de Leitura na Entrada pelo ESP32
        console.log("4. ESP32 validando entrada na porta do mercado...");
        const entryRes = await request('/api/tokens/validate', { token: qrToken });
        if (entryRes.status !== 'GRANTED') throw new Error("Entrada negada indevidamente: " + JSON.stringify(entryRes));
        console.log(`   ✅ ENTRADA AUTORIZADA: ${entryRes.message} (Apto: ${entryRes.apartment})`);

        // 5. Teste de Violação de Anti-Passback
        console.log("5. Testando bloqueio de Anti-Passback (tentativa de reentrada sem ter saído)...");
        const passbackRes = await request('/api/tokens/generate', {}, residentToken);
        if (passbackRes.error && passbackRes.error.includes('Anti-Passback')) {
            console.log(`   ✅ SUCESSO: Anti-Passback bloqueou reentrada! [${passbackRes.error}]`);
        } else {
            throw new Error("FALHA: Sistema deveria ter bloqueado a reentrada!");
        }

        // 6. Login do Admin para Checar Ocupação Inicial
        console.log("6. Autenticando Admin (Apto Master) para checar KPIs...");
        const adminLogin = await request('/api/auth/login', { apartment: 'Master', password: 'admin123' });
        if (!adminLogin.token) throw new Error("Falha no login do Admin: " + JSON.stringify(adminLogin));
        const adminToken = adminLogin.token;

        const metricsBeforeExit = await request('/api/monitoring/metrics', {}, adminToken, true, 'GET');
        console.log(`   ✅ Lotação Inicial: ${metricsBeforeExit.current_occupancy} pessoa(s) no interior.`);
        if (metricsBeforeExit.current_occupancy < 1) {
            throw new Error("FALHA: A ocupação deveria ser de pelo menos 1 morador.");
        }

        // 7. Simulação de Saída Legal pela Botoeira No-Touch (Livre Egress)
        console.log("7. Cliente acionando a Botoeira No-Touch de Saída Livre...");
        const exitRes = await request('/api/access/exit', { method: 'NO_TOUCH_SENSOR' });
        if (exitRes.status !== 'GRANTED' || exitRes.action !== 'EXIT') {
            throw new Error("Erro na liberação de saída: " + JSON.stringify(exitRes));
        }
        console.log(`   ✅ SAÍDA LIBERADA: ${exitRes.message}`);
        console.log(`   ✅ Porta destravada (Fail-Safe): ${exitRes.door_unlocked}`);

        // 8. Teste de Liberação de Anti-Passback (Reentrada Permitida)
        console.log("8. Testando se Anti-Passback foi liberado após a saída...");
        const reEntryGen = await request('/api/tokens/generate', {}, residentToken);
        if (reEntryGen.token) {
            console.log(`   ✅ SUCESSO: Morador conseguiu gerar nova chave TOTP: ${reEntryGen.token}`);
        } else {
            throw new Error("FALHA: Morador ainda está bloqueado após a saída!");
        }

        // 9. Checagem de Ocupação Após Saída
        const metricsAfterExit = await request('/api/monitoring/metrics', {}, adminToken, true, 'GET');
        console.log(`9. Lotação Atualizada: ${metricsAfterExit.current_occupancy} pessoa(s) no interior.`);

        // 10. Teste de Saída Nominal com Passe de Visitante
        console.log("10. Testando ciclo completo de Passe Visitante com saída identificada...");
        const inviteRes = await request('/api/invites', { guest_name: 'Ana Visitante Virtual', valid_hours: 2 }, residentToken);
        const inviteCode = inviteRes.invite ? inviteRes.invite.invite_code : inviteRes.invite_code;
        console.log(`    Passe Visitante emitido: ${inviteCode}`);

        // Entrada da visitante
        const visitorEntry = await request('/api/tokens/validate', { token: inviteCode });
        console.log(`    Entrada Visitante: ${visitorEntry.status} - ${visitorEntry.message}`);
        if (visitorEntry.status !== 'GRANTED') throw new Error("Falha na entrada da visitante!");

        // Saída da visitante
        const visitorExit = await request('/api/access/exit', { token: inviteCode, method: 'QR_SAIDA' });
        console.log(`    Saída Visitante: ${visitorExit.status} - ${visitorExit.message}`);
        if (visitorExit.action !== 'EXIT') throw new Error("Falha na saída da visitante!");

        // 11. Auditoria dos Logs
        console.log("\n11. Consultando logs de auditoria do sistema...");
        const logs = await request('/api/logs', {}, adminToken, true, 'GET');
        if (!Array.isArray(logs)) throw new Error("Erro ao obter logs: " + JSON.stringify(logs));

        const entryLog = logs.find(l => l.action === 'ENTRY');
        const exitLog = logs.find(l => l.action === 'EXIT');

        console.log(`    Último registro ENTRY: [${entryLog?.timestamp}] ${entryLog?.details}`);
        console.log(`    Último registro EXIT:  [${exitLog?.timestamp}] ${exitLog?.details}`);

        if (!entryLog || !exitLog) {
            throw new Error("Logs de ENTRY ou EXIT não foram encontrados!");
        }

        console.log("\n=================================================");
        console.log("🎉 TODOS OS 11 TESTES PASSARAM COM 100% DE SUCESSO!");
        console.log("=================================================\n");

    } catch (err) {
        console.error("\n❌ ERRO NO TESTE VIRTUAL:", err.message);
        process.exit(1);
    }
}

function request(path, bodyData = {}, token = null, expectJson = true, method = 'POST') {
    return new Promise((resolve, reject) => {
        const data = method === 'POST' ? JSON.stringify(bodyData) : '';
        const headers = {};
        if (method === 'POST') {
            headers['Content-Type'] = 'application/json';
            headers['Content-Length'] = Buffer.byteLength(data);
        }
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const options = {
            hostname: 'localhost',
            port: 3000,
            path: path,
            method: method,
            headers: headers
        };

        const req = http.request(options, (res) => {
            let responseData = '';
            res.on('data', (chunk) => { responseData += chunk; });
            res.on('end', () => {
                try {
                    const parsed = responseData ? JSON.parse(responseData) : {};
                    resolve(parsed);
                } catch (e) {
                    resolve(responseData);
                }
            });
        });

        req.on('error', (e) => reject(e));
        if (method === 'POST') req.write(data);
        req.end();
    });
}

runTests();
