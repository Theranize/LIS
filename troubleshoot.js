/**
 * Node.js Server Troubleshoot Script
 * Run this to check what's preventing the server from starting
 */

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

console.log('🔍 NODE.JS ANALYZER SERVER TROUBLESHOOT');
console.log('=' .repeat(50));

async function troubleshoot() {
    console.log('\n1. Checking file structure...');
    
    const requiredFiles = [
        'lis_server.js',
        'config.js',
        'package.json',
        'managers/AnalyzerManager.js',
        'parsers/astmParser.js',
        'database/pool.js',
        'database/analyzerDb.js'
    ];
    
    for (const file of requiredFiles) {
        if (fs.existsSync(file)) {
            console.log(`   ✅ ${file}`);
        } else {
            console.log(`   ❌ ${file} - MISSING!`);
        }
    }
    
    console.log('\n2. Checking package.json dependencies...');
    try {
        const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
        const deps = packageJson.dependencies || {};
        
        const requiredDeps = ['express', 'mysql2', 'dotenv'];
        for (const dep of requiredDeps) {
            if (deps[dep]) {
                console.log(`   ✅ ${dep}: ${deps[dep]}`);
            } else {
                console.log(`   ❌ ${dep} - MISSING! Run: npm install ${dep}`);
            }
        }
    } catch (e) {
        console.log('   ❌ Cannot read package.json');
    }
    
    console.log('\n3. Checking node_modules...');
    if (fs.existsSync('node_modules')) {
        console.log('   ✅ node_modules exists');
    } else {
        console.log('   ❌ node_modules missing - Run: npm install');
    }
    
    console.log('\n4. Checking .env file...');
    if (fs.existsSync('.env')) {
        console.log('   ✅ .env exists');
        try {
            const envContent = fs.readFileSync('.env', 'utf8');
            const hasDbConfig = envContent.includes('DB_HOST') && 
                               envContent.includes('DB_USER') && 
                               envContent.includes('DB_NAME');
            if (hasDbConfig) {
                console.log('   ✅ Database config found in .env');
            } else {
                console.log('   ⚠️  Database config incomplete in .env');
            }
        } catch (e) {
            console.log('   ⚠️  Cannot read .env file');
        }
    } else {
        console.log('   ❌ .env missing - Copy from .env.example');
    }
    
    console.log('\n5. Testing database connection...');
    try {
        require('dotenv').config();
        
        const dbConfig = {
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'analyzer_engine_db'
        };
        
        console.log(`   Connecting to: ${dbConfig.user}@${dbConfig.host}/${dbConfig.database}`);
        
        const connection = await mysql.createConnection(dbConfig);
        await connection.execute('SELECT 1 as test');
        await connection.end();
        
        console.log('   ✅ Database connection successful');
        
    } catch (e) {
        console.log(`   ❌ Database connection failed: ${e.message}`);
        console.log('   💡 Check your database credentials in .env');
    }
    
    console.log('\n6. Checking ports...');
    const net = require('net');
    
    const checkPort = (port) => {
        return new Promise((resolve) => {
            const server = net.createServer();
            server.listen(port, () => {
                server.once('close', () => resolve(true));
                server.close();
            });
            server.on('error', () => resolve(false));
        });
    };
    
    const port3000Free = await checkPort(3000);
    const port5001Free = await checkPort(5001);
    
    console.log(`   Port 3000 (API): ${port3000Free ? '✅ Available' : '❌ In use'}`);
    console.log(`   Port 5001 (TCP): ${port5001Free ? '✅ Available' : '❌ In use'}`);
    
    console.log('\n' + '=' .repeat(50));
    console.log('🎯 TROUBLESHOOT COMPLETE');
    
    console.log('\n💡 NEXT STEPS:');
    console.log('1. Fix any ❌ issues shown above');
    console.log('2. If all ✅, try: node lis_server.js');
    console.log('3. Look for error messages in the output');
    console.log('4. Check if server starts on http://localhost:3000');
}

troubleshoot().catch(console.error);