const fs = require('fs');
const path = require('path');

const LOG_FILE = path.join(__dirname, 'hook_debug.log');

function logDebug(message) {
  try {
    const timestamp = new Date().toISOString();
    fs.appendFileSync(LOG_FILE, `[${timestamp}] ${message}\n`, 'utf8');
  } catch {}
}

function readStdin() {
  return new Promise((resolve) => {
    let input = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => {
      input += chunk;
    });
    process.stdin.on('end', () => resolve(input));
    setTimeout(() => resolve(input), 2000);
  });
}

function loadPatterns() {
  const possiblePaths = [
    path.join(__dirname, 'patterns.json'),
    path.join(__dirname, 'plugins', 'regex-permissions', 'patterns.json'),
    path.join(process.cwd(), '.agents', 'plugins', 'regex-permissions', 'patterns.json'),
    path.join(process.cwd(), '.agents', 'patterns.json')
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      try {
        const content = fs.readFileSync(p, 'utf8');
        return JSON.parse(content);
      } catch (err) {
        logDebug(`Error reading patterns from ${p}: ${err}`);
      }
    }
  }

  return {
    allow: [
      "^npm(\\s+.*)?$",
      "^npx(\\s+.*)?$",
      "^cargo(\\s+.*)?$",
      "^git\\s+(status|diff|log|branch)(\\s+.*)?$",
      "^pytest(\\s+.*)?$",
      "^python\\s+-m\\s+pytest(\\s+.*)?$"
    ],
    deny: []
  };
}

function extractCommandLine(payload) {
  const toolCall = payload.toolCall || payload.tool_call || payload.step?.toolCall || {};
  let args = toolCall.args || toolCall.arguments || payload.args || {};
  
  if (typeof args === 'string') {
    try { args = JSON.parse(args); } catch {}
  }

  return args.CommandLine || args.commandLine || args.command || args.cmd || payload.commandLine || payload.CommandLine || '';
}

function evaluateCommand(commandLine, patterns) {
  const cmd = commandLine.trim();
  if (!cmd) {
    return { decision: 'force_ask', reason: 'Empty command line' };
  }

  for (const pattern of patterns.deny || []) {
    if (new RegExp(pattern, 'i').test(cmd)) {
      return { decision: 'deny', reason: `Matched deny pattern: ${pattern}` };
    }
  }

  for (const pattern of patterns.allow || []) {
    if (new RegExp(pattern, 'i').test(cmd)) {
      return {
        decision: 'allow',
        reason: `Matched auto-allow pattern: ${pattern}`
      };
    }
  }

  return { decision: 'force_ask', reason: `Command '${cmd}' not in regex allowlist` };
}

async function main() {
  try {
    const raw = await readStdin();
    logDebug(`RAW INPUT: ${raw}`);

    if (!raw.trim()) {
      const response = { decision: 'force_ask', reason: 'No input received' };
      logDebug(`OUTPUT: ${JSON.stringify(response)}`);
      console.log(JSON.stringify(response));
      return;
    }

    const payload = JSON.parse(raw);
    const commandLine = extractCommandLine(payload);
    logDebug(`EXTRACTED COMMAND: "${commandLine}"`);

    const patterns = loadPatterns();
    const result = evaluateCommand(commandLine, patterns);
    logDebug(`EVALUATION RESULT: ${JSON.stringify(result)}`);
    console.log(JSON.stringify(result));
  } catch (error) {
    logDebug(`ERROR: ${error.stack || error}`);
    console.log(JSON.stringify({ decision: 'force_ask', reason: String(error) }));
  }
}

main();
