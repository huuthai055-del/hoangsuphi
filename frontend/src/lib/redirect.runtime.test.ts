/**
 * Phase 4.6.3 runtime contract test.
 *
 * It builds the real Next.js middleware with a dedicated internal resolver,
 * then makes HTTP requests against `next start`. The resolver is intentionally
 * a tiny HTTP fixture: PostgreSQL/Redis correctness is covered by the backend
 * integration suite, while this test proves the browser-facing wire contract.
 */
import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import type { Server } from 'bun';

const NEXT_PORT = 4107;
const RESOLVER_PORT = 3007;
const NEXT_BASE = `http://127.0.0.1:${NEXT_PORT}`;
const RESOLVER_BASE = `http://127.0.0.1:${RESOLVER_PORT}`;
const resolverRequests: string[] = [];

let resolverServer: Server<undefined>;
let nextProcess: ReturnType<typeof Bun.spawn> | undefined;

function nextCommand(command: 'build' | 'start', ...args: string[]): string[] {
  // Calling `next.exe` leaves its Node child orphaned when Bun kills the
  // Windows command shim. Run Next's JS entry point with Node directly so the
  // subprocess is exactly the server that teardown owns.
  const nodeExecutable = process.platform === 'win32' ? 'node.exe' : 'node';
  return [nodeExecutable, 'node_modules/next/dist/bin/next', command, ...args];
}

function nextEnvironment(): Record<string, string | undefined> {
  return {
    ...process.env,
    NODE_ENV: 'production',
    PUBLIC_SITE_URL: NEXT_BASE,
    INTERNAL_BACKEND_URL: RESOLVER_BASE,
    REDIRECT_RESOLVER_TIMEOUT_MS: '1000',
  };
}

async function waitForServer(url: string, maxWaitMs = 45_000): Promise<void> {
  const deadline = Date.now() + maxWaitMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(1_000) });
      if (response.status < 500) {
        return;
      }
    } catch {
      // The production server is still starting.
    }
    await Bun.sleep(250);
  }
  throw new Error(`Next.js did not start at ${url}`);
}

async function request(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${NEXT_BASE}${path}`, { redirect: 'manual', ...init });
}

function locationPath(response: Response): URL {
  const location = response.headers.get('location');
  if (!location) {
    throw new Error('Expected redirect response to include Location');
  }
  return new URL(location, NEXT_BASE);
}

async function stopNextServer(): Promise<void> {
  if (!nextProcess) {
    return;
  }
  nextProcess.kill();
  await nextProcess.exited;
  nextProcess = undefined;
}

beforeAll(async () => {
  resolverServer = Bun.serve({
    hostname: '127.0.0.1',
    port: RESOLVER_PORT,
    reusePort: true,
    fetch(request) {
      const url = new URL(request.url);
      if (url.pathname !== '/api/v1/redirects/resolve') {
        return new Response('Not Found', { status: 404 });
      }

      const path = url.searchParams.get('path');
      if (path) {
        resolverRequests.push(path);
      }
      if (path === '/legacy-301') {
        return Response.json({ data: { targetPath: '/cam-nang', statusCode: 301 } });
      }
      if (path === '/legacy-302') {
        return Response.json({ data: { targetPath: '/cam-nang', statusCode: 302 } });
      }
      if (path === '/resolver-unavailable') {
        return new Response('Unavailable', { status: 503 });
      }
      return Response.json({ data: null });
    },
  });

  try {
    const buildProcess = Bun.spawn(nextCommand('build'), {
      cwd: process.cwd(),
      env: nextEnvironment(),
      stdio: ['ignore', 'ignore', 'ignore'],
    });
    const buildExitCode = await buildProcess.exited;
    if (buildExitCode !== 0) {
      throw new Error(`Next.js redirect runtime fixture build failed with exit code ${buildExitCode}`);
    }

    nextProcess = Bun.spawn(nextCommand('start', '--port', String(NEXT_PORT)), {
      cwd: process.cwd(),
      env: nextEnvironment(),
      // Keep startup diagnostics visible. A production-server bootstrap failure
      // must not degrade into an opaque timeout in this end-to-end gate.
      stdio: ['ignore', 'inherit', 'inherit'],
    });
    await waitForServer(`${NEXT_BASE}/cam-nang`);
  } catch (error) {
    await stopNextServer();
    resolverServer.stop(true);
    throw error;
  }
}, 120_000);

afterAll(async () => {
  await stopNextServer();
  if (resolverServer) {
    resolverServer.stop(true);
  }
});

describe('Redirect middleware runtime contract', () => {
  test('executes the backend resolver result as a permanent redirect and strips the query', async () => {
    const response = await request('/legacy-301?utm_source=runtime');

    expect(response.status).toBe(301);
    const location = locationPath(response);
    expect(location.pathname).toBe('/cam-nang');
    expect(location.search).toBe('');
    expect(resolverRequests).toContain('/legacy-301');
  });

  test('executes a temporary redirect without upgrading its status code', async () => {
    const response = await request('/legacy-302');

    expect(response.status).toBe(302);
    expect(locationPath(response).pathname).toBe('/cam-nang');
  });

  test('canonicalizes case and trailing slash in one 308 hop before resolver lookup', async () => {
    resolverRequests.length = 0;
    const response = await request('/LEGACY-301/?keep=canonicalization');

    expect(response.status).toBe(308);
    const location = locationPath(response);
    expect(location.pathname).toBe('/legacy-301');
    expect(location.search).toBe('?keep=canonicalization');
    expect(resolverRequests).toEqual([]);
  });

  test('fails open on resolver unavailability and never applies redirects to protected or non-GET paths', async () => {
    resolverRequests.length = 0;

    const unavailable = await request('/resolver-unavailable');
    expect(unavailable.status).not.toBe(301);
    expect(unavailable.status).not.toBe(302);
    expect(unavailable.status).not.toBe(308);

    const api = await request('/api/v1/redirects/resolve?path=%2Flegacy-301');
    const asset = await request('/images/og-homepage.jpg');
    const post = await request('/legacy-301', { method: 'POST' });
    expect(api.status).not.toBe(301);
    expect(asset.status).not.toBe(301);
    expect(post.status).not.toBe(301);
    expect(resolverRequests).toEqual(['/resolver-unavailable']);
  });
});
