const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.resolve(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Erro ao abrir o banco de dados:', err.message);
    } else {
        console.log('Conectado ao banco de dados SQLite.');
        
        // Ativa chaves estrangeiras
        db.run('PRAGMA foreign_keys = ON;');

        db.serialize(() => {
            // Tabela de Usuários (Admins e Moradores)
            db.run(`CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                apartment TEXT NOT NULL,
                role TEXT CHECK( role IN ('ADMIN', 'RESIDENT') ) DEFAULT 'RESIDENT',
                status TEXT CHECK( status IN ('PENDING', 'APPROVED') ) DEFAULT 'PENDING',
                lgpd_accepted INTEGER DEFAULT 0,
                lgpd_accepted_at DATETIME,
                password TEXT NOT NULL,
                is_inside INTEGER DEFAULT 0,
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
            )`);

            // Tabela de Configuração do Condomínio
            db.run(`CREATE TABLE IF NOT EXISTS condo_config (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                topology TEXT CHECK( topology IN ('VERTICAL', 'HORIZONTAL') ) DEFAULT 'VERTICAL',
                name TEXT NOT NULL,
                updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
            )`);

            // Tabela de Tokens refatorada com expiração para TOTP
            db.run(`CREATE TABLE IF NOT EXISTS tokens (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                token TEXT UNIQUE NOT NULL,
                user_id INTEGER NOT NULL,
                isConsumed INTEGER DEFAULT 0,
                type TEXT CHECK( type IN ('ENTRY', 'EXIT') ) DEFAULT 'ENTRY',
                expires_at DATETIME,
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )`);

            // Nova Tabela de Convites para Visitantes (Responsabilidade Solidária)
            db.run(`CREATE TABLE IF NOT EXISTS visitor_invites (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                resident_id INTEGER NOT NULL,
                guest_name TEXT NOT NULL,
                invite_code TEXT UNIQUE NOT NULL,
                valid_until DATETIME NOT NULL,
                max_uses INTEGER DEFAULT 1,
                used_count INTEGER DEFAULT 0,
                status TEXT CHECK( status IN ('ACTIVE', 'USED', 'EXPIRED', 'REVOKED') ) DEFAULT 'ACTIVE',
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (resident_id) REFERENCES users(id)
            )`);

            // Tabela de Logs de Acesso e Auditoria com detalhes
            db.run(`CREATE TABLE IF NOT EXISTS access_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                token_id INTEGER,
                action TEXT CHECK( action IN ('ENTRY', 'EXIT', 'DENIED', 'EMERGENCY') ) NOT NULL,
                details TEXT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id),
                FOREIGN KEY (token_id) REFERENCES tokens(id)
            )`);

            // Tabela de Telemetria (Heartbeat) do ESP32
            db.run(`CREATE TABLE IF NOT EXISTS telemetry (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                status TEXT NOT NULL,
                last_ping DATETIME DEFAULT CURRENT_TIMESTAMP
            )`);

            console.log('Tabelas criadas com sucesso (Schema Sprint 4).');
            seedDatabase();
        });
    }
});

// Semear banco inicial para testes
function seedDatabase() {
    db.get("SELECT COUNT(*) AS count FROM users", (err, row) => {
        if (row && row.count === 0) {
            console.log("Semeando banco de dados com usuários de teste...");
            
            const salt = bcrypt.genSaltSync(10);
            const adminPass = bcrypt.hashSync('admin123', salt);
            const userPass = bcrypt.hashSync('morador123', salt);

            const stmt = db.prepare(`INSERT INTO users (name, apartment, role, status, lgpd_accepted, password) VALUES (?, ?, ?, ?, ?, ?)`);
            stmt.run("Admin Geral", "Master", "ADMIN", "APPROVED", 1, adminPass);
            stmt.run("Jose Matheus", "101", "RESIDENT", "APPROVED", 0, userPass);
            stmt.run("João Pendente", "102", "RESIDENT", "PENDING", 0, userPass);
            stmt.finalize();

            db.run(`INSERT INTO condo_config (name, topology) VALUES ('SmartCondo Base', 'VERTICAL')`);
            console.log("Banco semeado: Admin (admin123), Jose Matheus (morador123) e João Pendente criados.");
        }
    });
}

module.exports = db;
