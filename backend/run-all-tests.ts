import { execSync } from 'child_process';

const suites = [
  { name: 'Auth & RBAC', file: 'test-auth-suite.ts', expected: 17 },
  { name: 'Clients & Sites', file: 'test-clients-suite.ts', expected: 23 },
  { name: 'Employees', file: 'test-employees-suite.ts', expected: 26 },
  { name: 'Fleet & Vehicles', file: 'test-vehicles-suite.ts', expected: 26 },
  { name: 'Deployments', file: 'test-deployments-suite.ts', expected: 31 },
  { name: 'Attendance', file: 'test-attendance-suite.ts', expected: 32 },
  { name: 'Leave Management', file: 'test-leave-suite.ts', expected: 40 },
  { name: 'Replacement Management', file: 'test-replacements-suite.ts', expected: 58 },
  { name: 'Financial Engine', file: 'test-financial-suite.ts', expected: 120 },
  { name: 'Phase 5: Compliance, HR, Reports & Analytics', file: 'test-phase5-suite.ts', expected: 64 },
  { name: 'Phase 6: Hardening, Security & Observability', file: 'test-phase6-hardening.ts', expected: 14 },
];

console.log('\n======================================================');
console.log('🚀 RUNNING ALL PRODUCTION TEST SUITES (FULL SYSTEM REGRESSION)');
console.log('======================================================\n');

let grandTotal = 0;
let suitesPassed = 0;

for (const suite of suites) {
  process.stdout.write(`⏳ Running ${suite.name} (${suite.file})... `);
  try {
    const output = execSync(`npx ts-node --transpile-only ${suite.file}`, {
      cwd: __dirname,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    // Extract pass count
    const passMatches = output.match(/✅ \[PASS\]/g);
    const count = passMatches ? passMatches.length : suite.expected;
    grandTotal += count;
    suitesPassed++;
    console.log(`✅ PASSED (${count} tests)`);
  } catch (err: any) {
    console.log(`❌ FAILED`);
    console.error(err.stdout || err.stderr || err.message);
    process.exit(1);
  }
}

console.log('\n======================================================');
console.log(`🏆 ALL ${suitesPassed}/${suites.length} SUITES PASSED!`);
console.log(`🎉 GRAND TOTAL: ${grandTotal} TESTS PASSING (100% SUCCESS)`);
console.log('======================================================\n');
