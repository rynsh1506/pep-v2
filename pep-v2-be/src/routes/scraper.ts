import { Elysia, t } from 'elysia';
import * as fs from 'fs';
import * as path from 'path';
import { logger } from '../utils/logger';
import { getCsrfToken, performDirectSearch, parseSearchHtml } from '../services/searchService';
import { scrapeToken, getSettings, updateSettings } from '../services/scraper';

const CACHE_FILE = path.join(__dirname, '../../../cache.json');

// Mutex lock to prevent multiple simultaneous browser launches
let isScraping = false;

interface CacheData {
  cookieString: string;
  csrfToken: string;
}

function getCache(): CacheData | null {
  if (fs.existsSync(CACHE_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
    } catch (_) {
      return null;
    }
  }
  return null;
}

function saveCache(cookieString: string, csrfToken: string) {
  fs.writeFileSync(CACHE_FILE, JSON.stringify({ cookieString, csrfToken }, null, 2), 'utf8');
}

function clearCache() {
  if (fs.existsSync(CACHE_FILE)) {
    try {
      fs.unlinkSync(CACHE_FILE);
    } catch (_) {}
  }
}

export const scraperRoutes = new Elysia({ prefix: '/scraper' })
  .post('/search', async ({ body, set }) => {
    logger.info('Pencarian direct search dipanggil.');

    try {
      let cache = getCache();
      let cookieCache = cache ? cache.cookieString : null;
      let csrfCache = cache ? cache.csrfToken : null;

      if (!cookieCache || !csrfCache) {
        if (isScraping) {
          set.status = 503;
          return {
            success: false,
            error: 'Sistem sedang memperbarui sesi login dari peladen PPATK. Silakan ulangi pencarian dalam 10-15 detik.'
          };
        }

        isScraping = true;
        try {
          logger.info('Cache kosong. Menjalankan Playwright login...');
          const loginResult = await scrapeToken();
          cookieCache = loginResult.cookieString;

          logger.info('Mengekstrak CSRF Token...');
          csrfCache = await getCsrfToken(cookieCache);

          saveCache(cookieCache, csrfCache);
        } finally {
          isScraping = false;
        }
      }

      // 2. Perform direct search
      let searchHtml = await performDirectSearch(cookieCache!, csrfCache!, body);

      // 3. Verify session
      if (typeof searchHtml === 'string' && searchHtml.includes('login-form')) {
        logger.warn('Sesi expired. Mencoba re-login...');
        clearCache();

        if (isScraping) {
          set.status = 503;
          return {
            success: false,
            error: 'Sesi berakhir dan sistem sedang mencoba login kembali. Silakan ulangi dalam beberapa detik.'
          };
        }

        isScraping = true;
        try {
          const loginResult = await scrapeToken();
          cookieCache = loginResult.cookieString;
          csrfCache = await getCsrfToken(cookieCache);
          saveCache(cookieCache, csrfCache);
        } finally {
          isScraping = false;
        }

        searchHtml = await performDirectSearch(cookieCache!, csrfCache!, body);
      }

      const parsedData = parseSearchHtml(searchHtml);
      return {
        success: true,
        data: parsedData,
      };
    } catch (error: any) {
      clearCache();
      set.status = 500;
      return { success: false, error: error.message };
    }
  }, {
    body: t.Any()
  })
  .get('/token', async ({ set }) => {
    if (isScraping) {
      set.status = 503;
      return { success: false, error: 'Proses scraping sedang berjalan.' };
    }

    isScraping = true;
    try {
      const result = await scrapeToken();
      const csrf = await getCsrfToken(result.cookieString);
      saveCache(result.cookieString, csrf);
      return { success: true, message: 'Scraping token berhasil diperbarui.' };
    } catch (e: any) {
      set.status = 500;
      return { success: false, error: e.message };
    } finally {
      isScraping = false;
    }
  })
  .post('/update-cache', ({ body }) => {
    const { cookieString, csrfToken } = body;
    saveCache(cookieString, csrfToken);
    return { success: true, message: 'Cache berhasil diupdate manual.' };
  }, {
    body: t.Object({
      cookieString: t.String(),
      csrfToken: t.String(),
    })
  })
  .get('/settings', () => {
    return { success: true, data: getSettings() };
  })
  .put('/settings', ({ body }) => {
    const updated = updateSettings(body);
    return { success: true, data: updated };
  }, {
    body: t.Partial(
      t.Object({
        strategy: t.Union([
          t.Literal('stealth'),
          t.Literal('manual'),
          t.Literal('whisper-local'),
          t.Literal('capsolver'),
          t.Literal('2captcha'),
        ]),
        headless: t.Boolean(),
      })
    )
  });
