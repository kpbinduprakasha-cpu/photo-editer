/**
 * Remotion Standalone CLI Render Runner
 * Usage: node render.js --props <props.json> --output <output.mp4>
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

function parseArgs() {
  const args = process.argv.slice(2);
  let propsPath = null;
  let outputPath = null;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--props' && i + 1 < args.length) {
      propsPath = args[i + 1];
      i++;
    } else if (args[i] === '--output' && i + 1 < args.length) {
      outputPath = args[i + 1];
      i++;
    }
  }

  return { propsPath, outputPath };
}

const { propsPath, outputPath } = parseArgs();

if (!outputPath) {
  console.error('Error: --output argument is required');
  process.exit(1);
}

try {
  let remotionCmd = `npx remotion render src/index.ts ReelComposition "${outputPath}" --overwrite`;

  if (propsPath && fs.existsSync(propsPath)) {
    remotionCmd += ` --props="${propsPath}"`;
  }

  console.log(`Executing: ${remotionCmd}`);
  execSync(remotionCmd, {
    cwd: __dirname,
    stdio: 'inherit',
    timeout: 300000,
  });

  console.log('Remotion render completed successfully.');
  process.exit(0);
} catch (err) {
  console.error('Remotion render failed:', err.message);
  process.exit(1);
}
