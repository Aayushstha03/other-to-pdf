import { spawnSync } from 'child_process';
import path from 'path';

function runScript(scriptPath: string, label: string) {
    console.log(`\n=== Running ${label} ===`);
    const result = spawnSync('bun', ['run', scriptPath], { stdio: 'inherit' });
    if (result.error) {
        console.error(`❌ Error running ${label}:`, result.error);
        process.exit(1);
    }
    if (result.status !== 0) {
        console.error(`❌ ${label} exited with code ${result.status}`);
        process.exit(result.status || 1);
    }
}

function main() {
    const utilsDir = path.join(__dirname, '..', 'utils');
    runScript(path.join(utilsDir, 'getNonPDFS.ts'), 'getNonPDFS');
    runScript(path.join(utilsDir, 'downloadOtherFiles.ts'), 'downloadOtherFiles');
    runScript(path.join(utilsDir, 'toPDF.ts'), 'toPDF');
    console.log('\n✅ All steps completed!');
}

main();
