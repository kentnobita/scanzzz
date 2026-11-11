const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = process.cwd();
const outputZip = path.join(rootDir, 'scan-phieu-chatgpt-bundle.zip');

if (fs.existsSync(outputZip)) {
  fs.unlinkSync(outputZip);
}

const tempDir = path.join(rootDir, '.temp_chatgpt_bundle');
if (fs.existsSync(tempDir)) {
  fs.rmSync(tempDir, { recursive: true, force: true });
}
fs.mkdirSync(tempDir, { recursive: true });

const targets = [
  'app',
  'components',
  'lib',
  'scripts',
  'package.json',
  'README.md',
  'CHATGPT_PROJECT_CONTEXT.md',
  'tailwind.config.js',
  'postcss.config.js',
  'next.config.mjs'
];

function copyRecursive(src, dest) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const item of fs.readdirSync(src)) {
      copyRecursive(path.join(src, item), path.join(dest, item));
    }
  } else {
    fs.copyFileSync(src, dest);
  }
}

for (const t of targets) {
  const srcPath = path.join(rootDir, t);
  if (fs.existsSync(srcPath)) {
    const destPath = path.join(tempDir, t);
    copyRecursive(srcPath, destPath);
  }
}

try {
  // Dùng PowerShell Compress-Archive
  execSync(`powershell -NoProfile -Command "Compress-Archive -Path '${tempDir}\\*' -DestinationPath '${outputZip}' -CompressionLevel Optimal"`, {
    stdio: 'inherit'
  });
  console.log('✅ File zip đã tạo thành công:', outputZip);
  const sizeKb = (fs.statSync(outputZip).size / 1024).toFixed(1);
  console.log(`📦 Kích thước file: ${sizeKb} KB`);
} catch (e) {
  console.error('Lỗi khi nén zip:', e);
} finally {
  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}
