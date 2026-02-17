import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🚀 Starting Delivery Dispatch System...\n');

// Start Backend
const backend = spawn('npm', ['run', 'dev'], {
    cwd: join(__dirname, 'backend'),
    stdio: 'inherit',
    shell: true
});

// Start Frontend
const frontend = spawn('npm', ['run', 'dev'], {
    cwd: join(__dirname, 'frontend'),
    stdio: 'inherit',
    shell: true
});

// Handle errors
backend.on('error', (err) => {
    console.error('❌ Backend error:', err);
});

frontend.on('error', (err) => {
    console.error('❌ Frontend error:', err);
});

// Handle exit
const cleanup = () => {
    console.log('\n🛑 Stopping servers...');
    backend.kill();
    frontend.kill();
    process.exit();
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

backend.on('close', (code) => {
    console.log(`Backend exited with code ${code}`);
    cleanup();
});

frontend.on('close', (code) => {
    console.log(`Frontend exited with code ${code}`);
    cleanup();
});
