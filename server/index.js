// 무상태 정적 파일 서버.
// LLM 호출과 개인 데이터 저장은 전부 브라우저가 담당하므로,
// 이 서버는 빌드 산출물(dist/)만 서빙한다. API/DB/세션 없음.
import express from 'express';
import compression from 'compression';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST_DIR = join(__dirname, '..', 'dist');

const PORT = process.env.PORT || 8000;
const HOST = process.env.HOST || '0.0.0.0';

const app = express();

app.use(compression());

// 경량 보안 헤더
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  next();
});

app.use(
  express.static(DIST_DIR, {
    index: 'index.html',
    maxAge: '1h',
  }),
);

// 단일 페이지 fallback (직접 경로 진입 대비)
app.get('*', (_req, res) => {
  res.sendFile(join(DIST_DIR, 'index.html'));
});

app.listen(PORT, HOST, () => {
  console.log(`\n  Persona Mirror (static) → http://localhost:${PORT}`);
  console.log(`  같은 네트워크의 휴대폰: http://[이 PC의 IP]:${PORT}\n`);
});
