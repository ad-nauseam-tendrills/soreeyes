// Usage: npm run hash-password  (prompts; nothing is echoed or stored)
// Prints an OWNER_PASSWORD_HASH value for your env file.
import { randomBytes, scryptSync } from "node:crypto";
import { createInterface } from "node:readline";

const N = 2 ** 15, r = 8, p = 1, LEN = 32;

function ask(q) {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    rl._writeToOutput = (s) => { if (s.includes(q)) rl.output.write(s); };
    rl.question(q, (a) => { rl.close(); process.stdout.write("\n"); resolve(a); });
  });
}

const pw = process.argv[2] ?? (await ask("Owner password: "));
if (!pw || pw.length < 10) {
  console.error("Use at least 10 characters.");
  process.exit(1);
}
const salt = randomBytes(16);
const hash = scryptSync(pw, salt, LEN, { N, r, p, maxmem: 256 * 1024 * 1024 });
console.log(`OWNER_PASSWORD_HASH='scrypt:${N}:${r}:${p}:${salt.toString("base64")}:${hash.toString("base64")}'`);
