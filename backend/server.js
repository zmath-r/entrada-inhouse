const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('./database');

const app = express();
app.use(cors());
app.use(express.json());

// Tratamento gracioso para erros de JSON malformado (ex: caracteres de controle do Serial)
app.use((err, req, res, next) => {
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
        console.warn('Alerta: JSON malformado recebido na requisição:', err.message);
        return res.status(400).json({ status: 'DENIED', message: 'JSON malformado' });
    }
    next();
});

const PORT = process.env.PORT || 3000;
const JWT_SECRET = 'SmartCondo-SuperSecretKey-2026';

// Middleware de Autenticação JWT
function authenticateJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    if (authHeader) {
        const token = authHeader.split(' ')[1];
        jwt.verify(token, JWT_SECRET, (err, user) => {
            if (err) {
                return res.sendStatus(403);
            }
            req.user = user;
            next();
        });
    } else {
        res.sendStatus(401);
    }
}

// ----------------------------------------------------
// ROTAS DE AUTENTICAÇÃO E PERFIL
// ----------------------------------------------------
app.post('/api/auth/login', (req, res) => {
    const { apartment, password } = req.body;
    
    db.get(`SELECT * FROM users WHERE apartment = ?`, [apartment], (err, user) => {
        if (err || !user) {
            return res.status(401).json({ error: 'Usuário ou senha incorretos.' });
        }
        
        if (user.status === 'PENDING') {
            return res.status(403).json({ error: 'Cadastro em análise pelo Síndico.' });
        }

        if (bcrypt.compareSync(password, user.password)) {
            // Gera o token JWT
            const token = jwt.sign({ id: user.id, role: user.role, apartment: user.apartment }, JWT_SECRET, { expiresIn: '8h' });
            res.json({ 
                token, 
                user: { 
                    id: user.id,
                    name: user.name, 
                    role: user.role, 
                    apartment: user.apartment,
                    lgpd_accepted: user.lgpd_accepted === 1
                } 
            });
        } else {
            res.status(401).json({ error: 'Usuário ou senha incorretos.' });
        }
    });
});

app.get('/api/auth/me', authenticateJWT, (req, res) => {
    db.get(`SELECT id, name, apartment, role, status, lgpd_accepted, is_inside FROM users WHERE id = ?`, [req.user.id], (err, user) => {
        if (err || !user) return res.status(404).json({ error: 'Usuário não encontrado.' });
        res.json({
            id: user.id,
            name: user.name,
            apartment: user.apartment,
            role: user.role,
            status: user.status,
            lgpd_accepted: user.lgpd_accepted === 1,
            is_inside: user.is_inside === 1
        });
    });
});

app.post('/api/auth/terms/accept', authenticateJWT, (req, res) => {
    db.run(
        `UPDATE users SET lgpd_accepted = 1, lgpd_accepted_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [req.user.id],
        function (err) {
            if (err) return res.status(500).json({ error: 'Erro ao registrar aceite dos termos.' });
            res.json({ message: 'Termos de Uso e LGPD aceitos com sucesso.', lgpd_accepted: true });
        }
    );
});

// ----------------------------------------------------
// ROTAS DE TOKENS (TOTP Dinâmico com Expiração de 30s)
// ----------------------------------------------------
app.post('/api/tokens/generate', authenticateJWT, (req, res) => {
    const userId = req.user.id;
    const type = req.body.type || 'ENTRY';

    // 1. Valida se o morador aceitou os Termos LGPD
    db.get(`SELECT is_inside, lgpd_accepted FROM users WHERE id = ?`, [userId], (err, user) => {
        if (err || !user) return res.status(500).json({ error: 'Erro ao validar usuário.' });

        if (user.lgpd_accepted !== 1) {
            return res.status(403).json({ error: 'É obrigatório aceitar os Termos de Uso (LGPD) antes de gerar chaves.' });
        }

        // 2. Regra Anti-Passback
        if (type === 'ENTRY' && user.is_inside === 1) {
            return res.status(403).json({ error: 'Regra de Anti-Passback: Usuário já está no interior do mercado.' });
        }

        // 3. Gera token dinâmico TOTP (curto e com validade de 30s)
        const token = 'TOTP-' + uuidv4().substring(0, 8).toUpperCase();
        
        // sqlite calcula expires_at = now + 30 seconds
        db.run(
            `INSERT INTO tokens (token, user_id, type, isConsumed, expires_at) 
             VALUES (?, ?, ?, 0, datetime('now', '+30 seconds'))`,
            [token, userId, type],
            function (err) {
                if (err) {
                    console.error(err);
                    return res.status(500).json({ error: 'Erro ao gerar token dinâmico.' });
                }
                res.json({ 
                    token, 
                    type, 
                    expiresIn: 30,
                    message: 'Chave dinâmica TOTP gerada com sucesso.' 
                });
            }
        );
    });
});

// ----------------------------------------------------
// VALIDAÇÃO DE ACESSO (ESP32 / LEITOR QR CODE)
// ----------------------------------------------------
app.post('/api/tokens/validate', (req, res) => {
    const { token } = req.body;

    if (!token) return res.status(400).json({ status: 'DENIED', message: 'Token não fornecido.' });

    // 1. Tenta validar como Token Dinâmico de Morador
    db.get(`
        SELECT t.*, u.name AS user_name, u.apartment, u.is_inside 
        FROM tokens t 
        JOIN users u ON t.user_id = u.id 
        WHERE t.token = ?`, 
    [token], (err, row) => {
        if (err) {
            logAccess(null, null, 'DENIED', 'Erro no banco durante validação');
            return res.status(500).json({ status: 'ERROR', message: 'Erro interno.' });
        }

        if (row) {
            // Validação de Token de Morador
            if (row.isConsumed) {
                logAccess(row.user_id, row.id, 'DENIED', 'Token já utilizado (Anti-Replay)');
                return res.json({ status: 'DENIED', message: 'Token já utilizado (Anti-Replay).' });
            }

            // Checagem de expiração TOTP (30s)
            if (row.expires_at) {
                const expiresTime = new Date(row.expires_at.replace(' ', 'T') + 'Z').getTime();
                if (Date.now() > expiresTime) {
                    logAccess(row.user_id, row.id, 'DENIED', 'Token expirado (TOTP)');
                    return res.json({ status: 'DENIED', message: 'Chave expirada. Apresente o QR atualizado.' });
                }
            }

            // Anti-Passback
            if (row.type === 'ENTRY' && row.is_inside === 1) {
                logAccess(row.user_id, row.id, 'DENIED', 'Tentativa de dupla entrada (Anti-Passback)');
                return res.json({ status: 'DENIED', message: 'Anti-Passback: Entrada recusada.' });
            }

            // Consome o token e atualiza estado do morador
            const newStatus = row.type === 'ENTRY' ? 1 : 0;
            db.run(`UPDATE tokens SET isConsumed = 1 WHERE id = ?`, [row.id], (err) => {
                if (!err) {
                    db.run(`UPDATE users SET is_inside = ? WHERE id = ?`, [newStatus, row.user_id]);
                    logAccess(row.user_id, row.id, row.type, `Morador: ${row.user_name} - Apto ${row.apartment}`);
                    return res.json({ status: 'GRANTED', apartment: row.apartment, message: 'Acesso liberado.' });
                } else {
                    return res.status(500).json({ status: 'ERROR', message: 'Erro ao processar liberação.' });
                }
            });
            return;
        }

        // 2. Se não encontrou em tokens, busca em CONVITES DE VISITANTES (Responsabilidade Solidária)
        db.get(`
            SELECT v.*, u.name AS host_name, u.apartment AS host_apartment 
            FROM visitor_invites v
            JOIN users u ON v.resident_id = u.id
            WHERE v.invite_code = ?`,
        [token], (err, invite) => {
            if (err || !invite) {
                logAccess(null, null, 'DENIED', 'Token ou convite inexistente');
                return res.json({ status: 'DENIED', message: 'Token inválido ou não encontrado.' });
            }

            if (invite.status !== 'ACTIVE') {
                logAccess(invite.resident_id, null, 'DENIED', `Convite inativo ou revogado (${invite.guest_name})`);
                return res.json({ status: 'DENIED', message: 'Convite cancelado ou inativo.' });
            }

            // Valida janela de horário
            const validUntil = new Date(invite.valid_until.replace(' ', 'T') + 'Z').getTime();
            if (Date.now() > validUntil) {
                db.run(`UPDATE visitor_invites SET status = 'EXPIRED' WHERE id = ?`, [invite.id]);
                logAccess(invite.resident_id, null, 'DENIED', `Convite expirado (${invite.guest_name})`);
                return res.json({ status: 'DENIED', message: 'Convite de visitante expirado.' });
            }

            // Valida contagem de usos
            if (invite.used_count >= invite.max_uses) {
                db.run(`UPDATE visitor_invites SET status = 'USED' WHERE id = ?`, [invite.id]);
                logAccess(invite.resident_id, null, 'DENIED', `Limite de uso atingido (${invite.guest_name})`);
                return res.json({ status: 'DENIED', message: 'Convite já foi utilizado.' });
            }

            // Libera o visitante sob responsabilidade solidária do morador anfitrião
            const newCount = invite.used_count + 1;
            const newStatus = newCount >= invite.max_uses ? 'USED' : 'ACTIVE';

            db.run(
                `UPDATE visitor_invites SET used_count = ?, status = ? WHERE id = ?`,
                [newCount, newStatus, invite.id],
                (err) => {
                    if (err) return res.status(500).json({ status: 'ERROR', message: 'Erro ao validar convite.' });

                    const liabilityLog = `VISITANTE: ${invite.guest_name} (Resp. Solidária: ${invite.host_name} - Apto ${invite.host_apartment})`;
                    logAccess(invite.resident_id, null, 'ENTRY', liabilityLog);

                    return res.json({
                        status: 'GRANTED',
                        apartment: invite.host_apartment,
                        message: `Visitante liberado: ${invite.guest_name}`
                    });
                }
            );
        });
    });
});

// ----------------------------------------------------
// REGISTRO E LIBERAÇÃO DE SAÍDA (Botoeira No-Touch / Fluxo Livre / AVCB)
// ----------------------------------------------------
app.post('/api/access/exit', (req, res) => {
    const { method = 'NO_TOUCH_SENSOR', token, user_id, door_id = 'INHOUSE_DOOR_01' } = req.body;

    // 1. Se fornecido token (ex: totem de saída com leitor QR)
    if (token) {
        db.get(`
            SELECT t.*, u.name AS user_name, u.apartment, u.is_inside 
            FROM tokens t 
            JOIN users u ON t.user_id = u.id 
            WHERE t.token = ?`, 
        [token], (err, row) => {
            if (!err && row) {
                db.run(`UPDATE users SET is_inside = 0 WHERE id = ?`, [row.user_id]);
                logAccess(row.user_id, row.id, 'EXIT', `Saída nominal: ${row.user_name} - Apto ${row.apartment} (${method})`);
                return res.json({ 
                    status: 'GRANTED', 
                    action: 'EXIT',
                    message: `Saída autorizada: ${row.user_name}`,
                    door_unlocked: true 
                });
            }

            // Caso seja convite de visitante
            db.get(`
                SELECT v.*, u.name AS host_name, u.apartment AS host_apartment 
                FROM visitor_invites v
                JOIN users u ON v.resident_id = u.id
                WHERE v.invite_code = ?`, 
            [token], (vErr, invite) => {
                if (!vErr && invite) {
                    const exitLog = `SAÍDA VISITANTE: ${invite.guest_name} (Resp: ${invite.host_name} - Apto ${invite.host_apartment})`;
                    logAccess(invite.resident_id, null, 'EXIT', exitLog);
                    return res.json({ 
                        status: 'GRANTED', 
                        action: 'EXIT',
                        message: `Saída visitante autorizada: ${invite.guest_name}`,
                        door_unlocked: true 
                    });
                }

                // Fallback para saída livre mesmo com token desconhecido (Princípio de Não-Retenção)
                processFreeExit(method, res);
            });
        });
        return;
    }

    // 2. Se fornecido user_id direto (ex: morador clicando "Liberar Saída" no app)
    if (user_id) {
        db.get(`SELECT id, name, apartment, is_inside FROM users WHERE id = ?`, [user_id], (err, user) => {
            if (!err && user) {
                db.run(`UPDATE users SET is_inside = 0 WHERE id = ?`, [user.id]);
                logAccess(user.id, null, 'EXIT', `Saída via App: ${user.name} - Apto ${user.apartment}`);
                return res.json({ 
                    status: 'GRANTED', 
                    action: 'EXIT',
                    message: `Saída autorizada: ${user.name}`,
                    door_unlocked: true 
                });
            }
            processFreeExit(method, res);
        });
        return;
    }

    // 3. Saída Geral por Botoeira No-Touch / Sensor de Saída Livre
    processFreeExit(method, res);
});

function processFreeExit(method, res) {
    // Localiza se há algum morador registrado como dentro para atualizar Anti-Passback
    db.get(`SELECT id, name, apartment FROM users WHERE is_inside = 1 ORDER BY id ASC LIMIT 1`, [], (err, insideUser) => {
        let details = 'Saída autorizada via Botoeira No-Touch (Fluxo Livre)';
        let userId = null;

        if (insideUser) {
            userId = insideUser.id;
            details = `Saída registrada: ${insideUser.name} - Apto ${insideUser.apartment} (${method})`;
            db.run(`UPDATE users SET is_inside = 0 WHERE id = ?`, [insideUser.id]);
        }

        logAccess(userId, null, 'EXIT', details);

        return res.json({
            status: 'GRANTED',
            action: 'EXIT',
            message: 'Saída liberada. Porta destravada.',
            method: method,
            door_unlocked: true
        });
    });
}

// ----------------------------------------------------
// ROTAS DE CONVITES PARA VISITANTES (Responsabilidade Solidária)
// ----------------------------------------------------
app.post('/api/invites', authenticateJWT, (req, res) => {
    const residentId = req.user.id;
    const { guest_name, valid_hours = 4 } = req.body;

    if (!guest_name || guest_name.trim() === '') {
        return res.status(400).json({ error: 'Nome do visitante é obrigatório.' });
    }

    // Checa se o anfitrião aceitou LGPD
    db.get(`SELECT lgpd_accepted FROM users WHERE id = ?`, [residentId], (err, user) => {
        if (err || !user) return res.status(500).json({ error: 'Erro ao verificar usuário.' });
        if (user.lgpd_accepted !== 1) {
            return res.status(403).json({ error: 'Aceite os Termos LGPD antes de emitir convites para terceiros.' });
        }

        const invite_code = 'VISIT-' + uuidv4().substring(0, 8).toUpperCase();
        const hoursModifier = `+${parseInt(valid_hours, 10) || 4} hours`;

        db.run(
            `INSERT INTO visitor_invites (resident_id, guest_name, invite_code, valid_until, max_uses, used_count, status)
             VALUES (?, ?, ?, datetime('now', ?), 1, 0, 'ACTIVE')`,
            [residentId, guest_name.trim(), invite_code, hoursModifier],
            function (err) {
                if (err) {
                    console.error(err);
                    return res.status(500).json({ error: 'Erro ao criar convite de visitante.' });
                }

                db.get(`SELECT * FROM visitor_invites WHERE id = ?`, [this.lastID], (err, created) => {
                    res.json({
                        message: 'Convite criado com sucesso!',
                        invite: created
                    });
                });
            }
        );
    });
});

app.get('/api/invites', authenticateJWT, (req, res) => {
    db.all(
        `SELECT * FROM visitor_invites WHERE resident_id = ? ORDER BY createdAt DESC`,
        [req.user.id],
        (err, rows) => {
            if (err) return res.status(500).json({ error: 'Erro ao carregar convites.' });
            res.json(rows);
        }
    );
});

app.delete('/api/invites/:id', authenticateJWT, (req, res) => {
    const inviteId = req.params.id;
    db.run(
        `UPDATE visitor_invites SET status = 'REVOKED' WHERE id = ? AND resident_id = ?`,
        [inviteId, req.user.id],
        function (err) {
            if (err) return res.status(500).json({ error: 'Erro ao revogar convite.' });
            res.json({ message: 'Convite revogado com sucesso.' });
        }
    );
});

// Rota Pública para o Visitante abrir o passe dele no celular
app.get('/api/invites/public/:code', (req, res) => {
    const { code } = req.params;
    db.get(
        `SELECT v.guest_name, v.invite_code, v.valid_until, v.status, v.max_uses, v.used_count,
                u.name AS host_name, u.apartment AS host_apartment
         FROM visitor_invites v
         JOIN users u ON v.resident_id = u.id
         WHERE v.invite_code = ?`,
        [code],
        (err, row) => {
            if (err || !row) return res.status(404).json({ error: 'Convite não encontrado ou inválido.' });
            res.json(row);
        }
    );
});

function logAccess(userId, tokenId, action, details = null) {
    db.run(
        `INSERT INTO access_logs (user_id, token_id, action, details) VALUES (?, ?, ?, ?)`, 
        [userId, tokenId, action, details]
    );
}

// ----------------------------------------------------
// ROTAS ADMINISTRATIVAS (Dashboard React)
// ----------------------------------------------------
app.get('/api/logs', authenticateJWT, (req, res) => {
    db.all(`
        SELECT l.id, l.action, l.details, l.timestamp, u.name, u.apartment 
        FROM access_logs l
        LEFT JOIN users u ON l.user_id = u.id
        ORDER BY l.timestamp DESC LIMIT 50
    `, [], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Erro ao buscar logs' });
        res.json(rows);
    });
});

app.get('/api/users/pending', authenticateJWT, (req, res) => {
    db.all(`SELECT id, name, apartment FROM users WHERE status = 'PENDING'`, [], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Erro ao buscar moradores pendentes' });
        res.json(rows);
    });
});

app.post('/api/users/approve', authenticateJWT, (req, res) => {
    if (req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Acesso negado' });
    
    const { userId } = req.body;
    db.run(`UPDATE users SET status = 'APPROVED' WHERE id = ?`, [userId], (err) => {
        if (err) return res.status(500).json({ error: 'Erro ao aprovar usuário' });
        res.json({ message: 'Usuário aprovado com sucesso' });
    });
});

app.get('/api/admin/residents', authenticateJWT, (req, res) => {
    if (req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Acesso negado' });

    db.all(`
        SELECT id, name, apartment, role, status, lgpd_accepted, lgpd_accepted_at, is_inside, createdAt 
        FROM users 
        WHERE role = 'RESIDENT'
        ORDER BY apartment ASC, name ASC
    `, [], (err, users) => {
        if (err) return res.status(500).json({ error: 'Erro ao buscar moradores' });

        db.all(`
            SELECT id, resident_id, guest_name, invite_code, valid_until, max_uses, used_count, status, createdAt
            FROM visitor_invites
            ORDER BY createdAt DESC
        `, [], (errInv, invites) => {
            if (errInv) return res.status(500).json({ error: 'Erro ao buscar convites' });

            const usersWithInvites = (users || []).map(user => ({
                ...user,
                invites: (invites || []).filter(inv => inv.resident_id === user.id)
            }));

            res.json(usersWithInvites);
        });
    });
});

app.delete('/api/admin/invites/:id', authenticateJWT, (req, res) => {
    if (req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Acesso negado' });
    const { id } = req.params;
    db.run(`UPDATE visitor_invites SET status = 'REVOKED' WHERE id = ?`, [id], function(err) {
        if (err) return res.status(500).json({ error: 'Erro ao revogar convite' });
        res.json({ message: 'Passe de visitante revogado com sucesso.' });
    });
});

app.get('/api/telemetry', authenticateJWT, (req, res) => {
    db.get(`SELECT status, last_ping FROM telemetry ORDER BY id DESC LIMIT 1`, [], (err, row) => {
        if (err) return res.status(500).json({ error: 'Erro ao buscar telemetria' });
        // Simples cálculo de online/offline (se o ping foi há menos de 4 minutos)
        let isOnline = false;
        if (row && row.last_ping) {
            const lastPingTime = new Date(row.last_ping + "Z").getTime(); // UTC timezone
            const now = Date.now();
            if ((now - lastPingTime) < 4 * 60 * 1000) isOnline = true; // 4 minutos de margem
        }
        res.json({ status: isOnline ? 'ONLINE' : 'OFFLINE', last_ping: row ? row.last_ping : null });
    });
});

app.get('/api/config', authenticateJWT, (req, res) => {
    db.get(`SELECT * FROM condo_config ORDER BY id DESC LIMIT 1`, [], (err, row) => {
        if (err) return res.status(500).json({ error: 'Erro ao buscar configuração' });
        res.json(row);
    });
});

app.post('/api/config', authenticateJWT, (req, res) => {
    if (req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Acesso negado' });
    
    const { topology, name } = req.body;
    db.run(`UPDATE condo_config SET topology = ?, name = ? WHERE id = 1`, [topology, name], (err) => {
        if (err) return res.status(500).json({ error: 'Erro ao atualizar configuração' });
        res.json({ message: 'Configuração atualizada!' });
    });
});

// ----------------------------------------------------
// TELEMETRIA E CONTROLE EXECUTIVO (Obsidian Glass UI)
// ----------------------------------------------------
app.get('/api/monitoring/metrics', authenticateJWT, async (req, res) => {
    try {
        // 1. Total Entries Today
        const entriesToday = await new Promise((resolve, reject) => {
            db.get(`SELECT COUNT(*) as count FROM access_logs WHERE action = 'ENTRY' AND date(timestamp) = date('now')`, (err, row) => {
                if (err) reject(err); else resolve(row ? row.count : 0);
            });
        });

        // 2. Occupancy (people inside)
        const occupants = await new Promise((resolve, reject) => {
            db.all(`SELECT id, name, apartment FROM users WHERE is_inside = 1`, (err, rows) => {
                if (err) reject(err); else resolve(rows || []);
            });
        });

        // 3. Active Passes (visitor invites active and not expired)
        const activePasses = await new Promise((resolve, reject) => {
            db.get(`SELECT COUNT(*) as count FROM visitor_invites WHERE status = 'ACTIVE' AND valid_until >= datetime('now')`, (err, row) => {
                if (err) reject(err); else resolve(row ? row.count : 0);
            });
        });

        // 4. Security Alerts / Denied attempts today
        const securityAlerts = await new Promise((resolve, reject) => {
            db.get(`SELECT COUNT(*) as count FROM access_logs WHERE action IN ('DENIED', 'EMERGENCY') AND date(timestamp) = date('now')`, (err, row) => {
                if (err) reject(err); else resolve(row ? row.count : 0);
            });
        });

        res.json({
            today_entries: entriesToday,
            current_occupancy: occupants.length,
            max_capacity: 6,
            occupants: occupants,
            active_passes: activePasses,
            security_alerts: securityAlerts
        });
    } catch (err) {
        console.error("Erro ao calcular métricas:", err);
        res.status(500).json({ error: 'Erro ao carregar métricas de monitoramento' });
    }
});

app.post('/api/hardware/remote-override', authenticateJWT, (req, res) => {
    if (req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Acesso restrito ao administrador' });
    
    logAccess(req.user.id, null, 'ENTRY', 'Abertura Remota Autorizada pelo Síndico (Painel Web)');
    res.json({ status: 'GRANTED', message: 'Comando de liberação remota disparado com sucesso.' });
});

// ----------------------------------------------------
// ROTAS DE TELEMETRIA E HARDWARE (ESP32)
// ----------------------------------------------------
app.post('/api/hardware/ping', (req, res) => {
    const { status } = req.body;
    db.run(`INSERT INTO telemetry (status) VALUES (?)`, [status || 'ONLINE'], (err) => {
        if (err) return res.status(500).send();
        console.log(`[${new Date().toLocaleTimeString()}] ESP32 enviou um Ping de Telemetria (Status: ${status})`);
        res.status(200).send('Ping recebido.');
    });
});

app.post('/api/hardware/emergency', (req, res) => {
    logAccess(null, null, 'EMERGENCY');
    console.warn("ALERTA CRÍTICO: Rota de fuga / Pânico acionada!");
    res.status(200).send('Alerta registrado.');
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`SmartCondo Backend Sprint 1 rodando na porta ${PORT}`);
});
