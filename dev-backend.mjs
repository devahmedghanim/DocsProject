//#region Edit By AI
import { spawn } from 'node:child_process';
import { createReadStream } from 'node:fs';
import { mkdir, rename, rm, stat, unlink, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';

const host = '127.0.0.1';
const port = 8000;
const rootDir = resolve('public');

const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.gif': 'image/gif',
  '.htm': 'text/html; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.mp4': 'video/mp4',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.webm': 'video/webm',
  '.webp': 'image/webp',
};

function baseHeaders() {
  return {
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, HEAD, PUT, MKCOL, DELETE, OPTIONS',
    'Access-Control-Allow-Origin': 'http://localhost:4200',
  };
}

function safePathFromUrl(url) {
  const pathname = new URL(url, `http://${host}:${port}`).pathname;
  const decoded = decodeURIComponent(pathname);
  const normalizedPath = normalize(decoded).replace(/^([.][.][/\\])+/, '');
  const fullPath = resolve(join(rootDir, normalizedPath.replace(/^[/\\]+/, '')));

  if (!fullPath.startsWith(rootDir)) {
    throw new Error('Forbidden path');
  }

  return fullPath;
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

function isVideoUpload(filePath, contentType) {
  if ((contentType || '').startsWith('video/')) {
    return true;
  }

  return ['.mp4', '.webm', '.mov', '.m4v'].includes(extname(filePath).toLowerCase());
}

async function transcodeVideoForWeb(filePath) {
  const tempOutputPath = `${filePath}.transcoded.mp4`;

  await new Promise((resolvePromise, rejectPromise) => {
    const ffmpeg = spawn('ffmpeg', [
      '-y',
      '-i',
      filePath,
      '-vf',
      "scale='min(1280,iw)':-2",
      '-c:v',
      'libx264',
      '-profile:v',
      'high',
      '-level',
      '4.1',
      '-pix_fmt',
      'yuv420p',
      '-movflags',
      '+faststart',
      '-preset',
      'medium',
      '-crf',
      '23',
      '-an',
      tempOutputPath,
    ]);

    let stderr = '';
    ffmpeg.stderr.on('data', (chunk) => {
      stderr += String(chunk || '');
    });

    ffmpeg.on('error', rejectPromise);
    ffmpeg.on('close', (code) => {
      if (code === 0) {
        resolvePromise(undefined);
        return;
      }

      rejectPromise(new Error(stderr.trim() || `ffmpeg exited with code ${code}`));
    });
  });

  await rename(tempOutputPath, filePath);
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    ...baseHeaders(),
    'Content-Type': 'application/json; charset=utf-8',
  });
  res.end(JSON.stringify(payload, null, 2));
}

function sendText(res, statusCode, message) {
  res.writeHead(statusCode, {
    ...baseHeaders(),
    'Content-Type': 'text/plain; charset=utf-8',
  });
  res.end(message);
}

async function handleGet(req, res, filePath) {
  let actualPath = filePath;

  try {
    const info = await stat(actualPath);
    if (info.isDirectory()) {
      actualPath = join(actualPath, 'index.html');
    }
  } catch {
    if (req.url === '/' || req.url === '') {
      actualPath = join(rootDir, 'index.html');
    }
  }

  try {
    const info = await stat(actualPath);
    if (!info.isFile()) {
      sendText(res, 404, 'Not Found');
      return;
    }

    const contentType = mimeTypes[extname(actualPath).toLowerCase()] || 'application/octet-stream';
    const rangeHeader = req.headers.range;

    if (rangeHeader) {
      const match = /bytes=(\d*)-(\d*)/.exec(rangeHeader);
      if (!match) {
        res.writeHead(416, {
          ...baseHeaders(),
          'Accept-Ranges': 'bytes',
          'Content-Range': `bytes */${info.size}`,
        });
        res.end();
        return;
      }

      const start = match[1] ? Number(match[1]) : 0;
      const end = match[2] ? Number(match[2]) : info.size - 1;
      if (!Number.isFinite(start) || !Number.isFinite(end) || start > end || start >= info.size) {
        res.writeHead(416, {
          ...baseHeaders(),
          'Accept-Ranges': 'bytes',
          'Content-Range': `bytes */${info.size}`,
        });
        res.end();
        return;
      }

      const chunkEnd = Math.min(end, info.size - 1);
      const chunkSize = chunkEnd - start + 1;
      res.writeHead(206, {
        ...baseHeaders(),
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Range': `bytes ${start}-${chunkEnd}/${info.size}`,
        'Content-Type': contentType,
      });

      if (req.method === 'HEAD') {
        res.end();
        return;
      }

      createReadStream(actualPath, { start, end: chunkEnd }).pipe(res);
      return;
    }

    res.writeHead(200, {
      ...baseHeaders(),
      'Accept-Ranges': 'bytes',
      'Content-Type': contentType,
      'Content-Length': info.size,
    });

    if (req.method === 'HEAD') {
      res.end();
      return;
    }

    createReadStream(actualPath).pipe(res);
  } catch {
    sendText(res, 404, 'Not Found');
  }
}

async function handlePut(req, res, filePath) {
  await mkdir(resolve(filePath, '..'), { recursive: true });
  const body = await readBody(req);
  await writeFile(filePath, body);

  if (isVideoUpload(filePath, req.headers['content-type'])) {
    try {
      await transcodeVideoForWeb(filePath);
    } catch (error) {
      await unlink(filePath).catch(() => undefined);
      throw error;
    }
  }

  sendText(res, 201, 'Created');
}

async function handleMkcol(res, filePath) {
  await mkdir(filePath, { recursive: true });
  sendText(res, 201, 'Collection created');
}

async function handleDelete(res, filePath) {
  await rm(filePath, { recursive: true, force: true });
  sendText(res, 204, 'Deleted');
}

const server = createServer(async (req, res) => {
  try {
    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        ...baseHeaders(),
      });
      res.end();
      return;
    }

    const filePath = safePathFromUrl(req.url || '/');

    if (req.method === 'GET' || req.method === 'HEAD') {
      await handleGet(req, res, filePath);
      return;
    }

    if (req.method === 'PUT') {
      await handlePut(req, res, filePath);
      return;
    }

    if (req.method === 'MKCOL') {
      await handleMkcol(res, filePath);
      return;
    }

    if (req.method === 'DELETE') {
      await handleDelete(res, filePath);
      return;
    }

    sendText(res, 405, 'Method Not Allowed');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    sendJson(res, message === 'Forbidden path' ? 403 : 500, { error: message });
  }
});

server.listen(port, host, () => {
  console.log(`Dev backend listening on http://${host}:${port}`);
});
//#endregion Edit By AI
