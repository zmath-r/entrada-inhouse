const http = require('http');

async function runTests() {
    console.log("=================================================");
    console.log("🧪 TESTES VIRTUAIS: GESTÃO DE MORADORES & CONVITES");
    console.log("=================================================\n");

    try {
        // 1. Autenticar Morador 101 e gerar um convite
        console.log("1. Efetuando login do morador 101...");
        const resLogin = await request('/api/auth/login', { apartment: '101', password: 'morador123' });
        if (!resLogin.token) throw new Error("Falha no login do morador!");
        const resToken = resLogin.token;

        console.log("2. Morador gerando convite para visitante...");
        const inviteRes = await request('/api/invites', { guest_name: 'Marcos Convidado Admin Test', valid_hours: 4 }, resToken);
        const inviteCode = inviteRes.invite ? inviteRes.invite.invite_code : inviteRes.invite_code;
        const inviteId = inviteRes.invite ? inviteRes.invite.id : inviteRes.id;
        console.log(`   ✅ Convite gerado: ${inviteCode} (ID: ${inviteId})`);

        // 2. Autenticar Admin (Master)
        console.log("3. Efetuando login do Administrador (Master)...");
        const adminLogin = await request('/api/auth/login', { apartment: 'Master', password: 'admin123' });
        if (!adminLogin.token) throw new Error("Falha no login do Administrador!");
        const adminToken = adminLogin.token;
        console.log("   ✅ Administrador autenticado.");

        // 3. Consultar /api/admin/residents
        console.log("4. Consultando endpoint /api/admin/residents...");
        const residents = await request('/api/admin/residents', {}, adminToken, true, 'GET');
        if (!Array.isArray(residents)) throw new Error("Retorno não é um array: " + JSON.stringify(residents));
        console.log(`   ✅ Retornados ${residents.length} moradores cadastrados.`);

        // Valida se o morador Jose Matheus (Apto 101) está presente
        const morador101 = residents.find(r => r.apartment === '101');
        if (!morador101) throw new Error("Morador do Apto 101 não foi encontrado na listagem!");
        console.log(`   ✅ Morador 101 encontrado: ${morador101.name} (Status: ${morador101.status})`);
        console.log(`   ✅ Total de convites do morador 101: ${morador101.invites?.length}`);

        // Valida se o convite gerado está nos invites do morador 101
        const conviteEncontrado = morador101.invites?.find(inv => inv.invite_code === inviteCode);
        if (!conviteEncontrado) throw new Error("O convite gerado não foi indexado ao morador 101!");
        console.log(`   ✅ Convite indexado corretamente: [${conviteEncontrado.guest_name}] - Status: ${conviteEncontrado.status}`);

        // 4. Testar revogação administrativa
        console.log("5. Testando revogação administrativa do convite...");
        const revokeRes = await request(`/api/admin/invites/${inviteId}`, {}, adminToken, true, 'DELETE');
        console.log(`   ✅ Resposta da revogação: ${revokeRes.message}`);

        // 5. Reconsultar e validar status REVOKED
        const residentsAfterRevoke = await request('/api/admin/residents', {}, adminToken, true, 'GET');
        const moradorAfter = residentsAfterRevoke.find(r => r.apartment === '101');
        const conviteRevogado = moradorAfter.invites?.find(inv => inv.id === inviteId);
        if (conviteRevogado.status !== 'REVOKED') throw new Error("Status do convite não foi alterado para REVOKED!");
        console.log(`   ✅ Status confirmado como REVOKED para o convite ${inviteCode}.`);

        console.log("\n=================================================");
        console.log("🎉 TODOS OS TESTES ADMINISTRATIVOS PASSARAM COM SUCESSO!");
        console.log("=================================================\n");

    } catch (err) {
        console.error("\n❌ ERRO NO TESTE:", err.message);
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
