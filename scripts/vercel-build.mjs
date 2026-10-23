import { spawnSync } from 'node:child_process';

function runNpm(args) {
  const result = spawnSync('npm', args, {
    stdio: 'inherit',
    env: process.env,
    shell: process.platform === 'win32',
  });

  if (result.error) throw result.error;
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

if (process.env.VERCEL_ENV === 'production') {
  if (!process.env.DATABASE_URL_UNPOOLED) {
    throw new Error(
      'DATABASE_URL_UNPOOLED is required to migrate the Production database.',
    );
  }
  runNpm(['run', 'db:migrate']);
}

runNpm(['run', 'build']);
