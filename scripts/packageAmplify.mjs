import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const rootDir = process.cwd();
const amplifyDir = path.join(rootDir, '.amplify-hosting');
const computeDefaultDir = path.join(amplifyDir, 'compute', 'default');
const staticDir = path.join(amplifyDir, 'static');
const nextStaticDir = path.join(staticDir, '_next', 'static');

console.log('=== Step 1: Cleaning and preparing .amplify-hosting directory ===');
if (fs.existsSync(amplifyDir)) {
  fs.rmSync(amplifyDir, { recursive: true, force: true });
}

fs.mkdirSync(computeDefaultDir, { recursive: true });
fs.mkdirSync(nextStaticDir, { recursive: true });

console.log('=== Step 2: Copying .next/standalone into compute/default ===');
const standaloneDir = path.join(rootDir, '.next', 'standalone');
fs.cpSync(standaloneDir, computeDefaultDir, { recursive: true });

console.log('=== Step 3: Copying .next/static into compute/default/.next/static ===');
const standaloneNextStatic = path.join(computeDefaultDir, '.next', 'static');
fs.cpSync(path.join(rootDir, '.next', 'static'), standaloneNextStatic, { recursive: true });

console.log('=== Step 4: Copying .next/static into static/_next/static ===');
fs.cpSync(path.join(rootDir, '.next', 'static'), nextStaticDir, { recursive: true });

if (fs.existsSync(path.join(rootDir, 'public'))) {
  console.log('=== Step 5: Copying public assets into static and compute/default ===');
  fs.cpSync(path.join(rootDir, 'public'), staticDir, { recursive: true });
  fs.cpSync(path.join(rootDir, 'public'), path.join(computeDefaultDir, 'public'), { recursive: true });
}

console.log('=== Step 6: Copying pre-rendered pages & RSC payloads to static ===');
const serverAppDir = path.join(rootDir, '.next', 'server', 'app');
if (fs.existsSync(serverAppDir)) {
  const pages = ['dashboard', 'login', 'incidents', 'knowledge', 'ai-activity', 'analytics', 'settings'];

  // Root index.html
  if (fs.existsSync(path.join(serverAppDir, 'index.html'))) {
    fs.copyFileSync(path.join(serverAppDir, 'index.html'), path.join(staticDir, 'index.html'));
  }
  if (fs.existsSync(path.join(serverAppDir, 'index.rsc'))) {
    fs.copyFileSync(path.join(serverAppDir, 'index.rsc'), path.join(staticDir, 'index.rsc'));
  }
  if (fs.existsSync(path.join(serverAppDir, '_not-found.html'))) {
    fs.copyFileSync(path.join(serverAppDir, '_not-found.html'), path.join(staticDir, '404.html'));
  }

  // Pre-rendered pages
  for (const page of pages) {
    const pageHtml = path.join(serverAppDir, `${page}.html`);
    const pageRsc = path.join(serverAppDir, `${page}.rsc`);
    const targetDir = path.join(staticDir, page);
    fs.mkdirSync(targetDir, { recursive: true });

    if (fs.existsSync(pageHtml)) {
      fs.copyFileSync(pageHtml, path.join(staticDir, `${page}.html`));
      fs.copyFileSync(pageHtml, path.join(targetDir, 'index.html'));
    }
    if (fs.existsSync(pageRsc)) {
      fs.copyFileSync(pageRsc, path.join(staticDir, `${page}.rsc`));
      fs.copyFileSync(pageRsc, path.join(targetDir, 'index.rsc'));
    }
  }
}

console.log('=== Step 7: Generating deploy-manifest.json ===');
const manifest = {
  version: 1,
  framework: {
    name: 'next',
    version: '15.1.7',
  },
  routes: [
    {
      path: '/_next/static/*',
      target: {
        kind: 'Static',
        cacheControl: 'public, max-age=31536000, immutable',
      },
      fallback: {
        status: 404,
      },
    },
    {
      path: '/static/*',
      target: {
        kind: 'Static',
        cacheControl: 'public, max-age=86400',
      },
      fallback: {
        status: 404,
      },
    },
    {
      path: '/*.*',
      target: {
        kind: 'Static',
        cacheControl: 'public, max-age=86400',
      },
      fallback: {
        kind: 'Compute',
        src: 'default',
      },
    },
    {
      path: '/*',
      target: {
        kind: 'Compute',
        src: 'default',
      },
    },
  ],
  computeResources: [
    {
      name: 'default',
      runtime: 'nodejs20.x',
      entrypoint: 'server.js',
    },
  ],
};

fs.writeFileSync(
  path.join(amplifyDir, 'deploy-manifest.json'),
  JSON.stringify(manifest, null, 2)
);

// Also copy deploy-manifest into static for complete coverage
fs.writeFileSync(
  path.join(staticDir, 'deploy-manifest.json'),
  JSON.stringify(manifest, null, 2)
);

console.log('=== Step 8: Creating deployment zip archive ===');
const zipPath = path.join(rootDir, 'sentinel-deployment.zip');
if (fs.existsSync(zipPath)) {
  fs.unlinkSync(zipPath);
}

console.log('Compressing with PowerShell Compress-Archive...');
execSync('powershell -Command "Compress-Archive -Path .amplify-hosting/static/* -DestinationPath sentinel-deployment.zip -Force"', { stdio: 'inherit' });

const stats = fs.statSync(zipPath);
console.log(`[SUCCESS] sentinel-deployment.zip created: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
