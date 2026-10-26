import path from 'node:path';
import express from 'express';
import app from './server';

const port = Number(process.env.PORT || 3000);
const isProduction = process.env.NODE_ENV === 'production';

// Desenvolvimento: Vite em modo middleware no MESMO servidor Express, então
// `npm run dev` entrega frontend e API em http://localhost:3000.
// Produção: serve o build estático de `dist` (npm start / self-host).
if (isProduction) {
  const distDir = path.resolve(process.cwd(), 'dist');
  app.use(express.static(distDir));
  app.get('*', (_req, res) => res.sendFile(path.join(distDir, 'index.html')));
} else {
  const { createServer } = await import('vite');
  const vite = await createServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });
  app.use(vite.middlewares);
}

app.listen(port, '0.0.0.0', () => {
  console.log(
    `REOBOTE SUPORTE na porta ${port} (${isProduction ? 'produção' : 'desenvolvimento'})`
  );
});
