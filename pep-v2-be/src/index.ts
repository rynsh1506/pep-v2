import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { authRoutes } from './routes/auth';
import { candidateRoutes } from './routes/candidates';
import { approvalRoutes } from './routes/approvals';
import { scraperRoutes } from './routes/scraper';
import { dtotRoutes } from './routes/dtot';
import { logger } from './utils/logger';

const app = new Elysia()
  .use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }))
  .get('/health', () => ({
    success: true,
    status: 'ok',
    timestamp: new Date().toISOString(),
  }))
  .group('/api', app => 
    app
      .use(authRoutes)
      .use(candidateRoutes)
      .use(approvalRoutes)
      .use(scraperRoutes)
      .use(dtotRoutes)
  );

const port = process.env.PORT || 3000;
app.listen(port);

logger.info(`=========================================`);
logger.info(`  PEP V2 Backend (ElysiaJS)`);
logger.info(`  Server running at http://localhost:${port}`);
logger.info(`  Health Check: http://localhost:${port}/health`);
logger.info(`=========================================`);
