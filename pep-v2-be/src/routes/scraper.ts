import { Elysia, t } from 'elysia';
import axios from 'axios';
import { logger } from '../utils/logger';

export const scraperRoutes = new Elysia({ prefix: '/scraper' })
  .post('/search', async ({ body, set }) => {
    logger.info('Pencarian direct search dipanggil ke External API PPATK.');
    const { nik } = body as { nik: string };

    try {
      if (!nik) {
        set.status = 400;
        return { success: false, error: 'NIK harus diisi.' };
      }

      // Query external PPATK Search API
      const response = await axios.post(
        'http://10.27.19.243:3000/api/v1/search',
        `nik=${encodeURIComponent(nik)}`,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      if (response.data && response.data.success) {
        return {
          success: true,
          data: response.data.data.extracted_data
        };
      } else {
        return {
          success: false,
          error: response.data?.error || 'Format respon API tidak dikenal.'
        };
      }
    } catch (error: any) {
      logger.error(`Error querying external search API: ${error.message}`);
      set.status = 500;
      return { success: false, error: error.message };
    }
  }, {
    body: t.Object({
      nik: t.String()
    })
  })
  .get('/token', () => {
    return { success: true, message: 'Sesi PPATK dihubungkan ke server terpisah.' };
  })
  .get('/settings', () => {
    return { success: true, data: { strategy: 'external-api', headless: true } };
  })
  .put('/settings', () => {
    return { success: true, data: { strategy: 'external-api', headless: true } };
  });
