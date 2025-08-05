const readline = require('readline');
const winston = require("winston");
const express = require('express');
const pb = require('./algo/pb');
const app = express();

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function ask(question) {
    return new Promise(resolve => {
        rl.question(question, answer => {
            resolve(answer);
        });
    });
}

let total_damage = {};
let total_count = {};
let dps_window = {};
let damage_time = {};
let realtime_dps = {};

async function main() {
    console.log('Welcome to use Damage Counter for Star Resonance by Dimole!');
    console.log('Version: V2.1 (Demo Version)');
    console.log('This is a demo version for testing packaging.');
    console.log('The actual network capture functionality requires the cap module.');
    
    const log_level = await ask('Please enter log level (info|debug): ') || 'info';
    if (!log_level || !['info', 'debug'].includes(log_level)) {
        console.log('Invalid log level!');
        process.exit(1);
    }
    rl.close();
    
    const logger = winston.createLogger({
        level: log_level,
        format: winston.format.combine(
            winston.format.colorize({ all: true }),
            winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
            winston.format.printf(info => {
                return `[${info.timestamp}] [${info.level}] ${info.message}`;
            })
        ),
        transports: [
            new winston.transports.Console()
        ]
    });

    // 模拟数据更新
    setInterval(() => {
        const now = Date.now();
        for (const uid of Object.keys(dps_window)) {
            while (dps_window[uid].length > 0 && now - dps_window[uid][0].time > 1000) {
                dps_window[uid].shift();
            }
            if (!realtime_dps[uid]) {
                realtime_dps[uid] = {
                    value: 0,
                    max: 0,
                }
            }
            let total = 0;
            for (const item of dps_window[uid]) {
                total += item.damage;
            }
            realtime_dps[uid].value = total;
            if (total > realtime_dps[uid].max) {
                realtime_dps[uid].max = total;
            }
        }
    }, 1000);

    // 模拟一些测试数据
    const testUid = "114514";
    total_damage[testUid] = {
        normal: 75000,
        critical: 25000,
        lucky: 25000,
        crit_lucky: 10000,
        hpLessen: 75000,
        total: 135000
    };
    total_count[testUid] = {
        normal: 45,
        critical: 30,
        lucky: 15,
        total: 90
    };
    realtime_dps[testUid] = {
        value: 1250,
        max: 2100
    };

    // Web服务器设置
    app.use(express.static('public'));
    app.use(express.json());

    app.get('/api/data', (req, res) => {
        const result = {
            code: 0,
            user: {}
        };
        
        for (const uid of Object.keys(total_damage)) {
            const totalDps = total_damage[uid].total / Math.max(1, (Date.now() - damage_time[uid] || 1000) / 1000);
            result.user[uid] = {
                realtime_dps: realtime_dps[uid]?.value || 0,
                realtime_dps_max: realtime_dps[uid]?.max || 0,
                total_dps: totalDps,
                total_damage: total_damage[uid],
                total_count: total_count[uid]
            };
        }
        
        res.json(result);
    });

    app.get('/api/clear', (req, res) => {
        total_damage = {};
        total_count = {};
        dps_window = {};
        damage_time = {};
        realtime_dps = {};
        res.json({ code: 0, msg: "Statistics have been cleared!" });
    });

    const PORT = 8989;
    app.listen(PORT, () => {
        logger.info(`Demo server started on http://localhost:${PORT}`);
        logger.info('This is a demo version. Network capture is not available.');
        logger.info('Please build the full version with cap module support for actual functionality.');
    });
}

main().catch(console.error);