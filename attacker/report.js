const bruteForce = require('./scenarios/brute-force');
const jwtTampering = require('./scenarios/jwt-tampering');
const sqlInjection = require('./scenarios/sql-injection');
const rateLimitBypass = require('./scenarios/rate-limit-bypass');
const corsProbe = require('./scenarios/cors-probe');

const BASE_URL = process.env.TARGET_URL || 'http://localhost:4000';

const RESET = '\x1b[0m';
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const CYAN = '\x1b[36m';
const BOLD = '\x1b[1m';

async function runReport() {
  console.log(`\n${BOLD}${CYAN}╔══════════════════════════════════════════════════════╗`);
  console.log(`║       API SECURITY TESTING LAB — ATTACK REPORT      ║`);
  console.log(`╠══════════════════════════════════════════════════════╣`);
  console.log(`║ Target: ${BASE_URL.padEnd(45)}║`);
  console.log(`║ Time:   ${new Date().toISOString().padEnd(45)}║`);
  console.log(`╠══════════════════════════════════════════════════════╣${RESET}`);

  const scenarios = [bruteForce, jwtTampering, sqlInjection, rateLimitBypass, corsProbe];
  const results = [];

  for (const scenario of scenarios) {
    process.stdout.write(`  Running ${scenario.name || 'scenario'}...`);
    const result = await scenario(BASE_URL);
    results.push(result);
    const icon = result.pass ? `${GREEN}[PASS]${RESET}` : `${RED}[FAIL]${RESET}`;
    console.log(`\r${icon} ${result.name.padEnd(22)} → ${result.detail}`);
  }

  const passed = results.filter(r => r.pass).length;
  const total = results.length;

  console.log(`${BOLD}${CYAN}╠══════════════════════════════════════════════════════╣`);
  const summary = `${passed}/${total} attacks blocked`;
  const status = passed === total ? `${GREEN}ALL DEFENSES HELD ✓${RESET}` : `${RED}VULNERABILITIES FOUND ✗${RESET}`;
  console.log(`${CYAN}║ Result: ${summary} — ${status}${CYAN}`);
  console.log(`╚══════════════════════════════════════════════════════╝${RESET}\n`);
}

runReport().catch(console.error);
