import axios from 'axios';
import * as cheerio from 'cheerio';
import { logger } from '../utils/logger';

const SEARCH_URL = 'https://pep.ppatk.go.id/admin/search';

const DEFAULT_HEADERS = {
  'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
  'accept-language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7,la;q=0.6',
  'cache-control': 'max-age=0',
  'connection': 'keep-alive',
  'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36'
};

export async function getCsrfToken(cookieString: string): Promise<string> {
  logger.info('Mengambil token _csrf_backend...');
  
  try {
    const response = await axios.get(SEARCH_URL, {
      headers: {
        ...DEFAULT_HEADERS,
        'cookie': cookieString,
      }
    });

    const $ = cheerio.load(response.data);
    const csrfToken = $('meta[name="csrf-token"]').attr('content');

    if (!csrfToken) {
      throw new Error('CSRF token tidak ditemukan di halaman PPATK.');
    }

    return csrfToken;
  } catch (error: any) {
    logger.error(`Gagal mengambil CSRF Token: ${error.message}`);
    throw new Error('Gagal mengakses halaman pencarian PPATK.');
  }
}

export async function performDirectSearch(cookieString: string, csrfToken: string, searchData: any): Promise<string> {
  logger.info('Melakukan request POST pencarian via Axios...');

  const payload = {
    ...searchData,
    '_csrf_backend': csrfToken
  };

  const formBody = Object.keys(payload)
    .map(key => encodeURIComponent(key) + '=' + encodeURIComponent(payload[key]))
    .join('&');

  try {
    const response = await axios.post(SEARCH_URL, formBody, {
      headers: {
        ...DEFAULT_HEADERS,
        'content-type': 'application/x-www-form-urlencoded',
        'cookie': cookieString,
        'origin': 'https://pep.ppatk.go.id',
        'referer': 'https://pep.ppatk.go.id/admin/search',
      },
      maxRedirects: 5,
      validateStatus: (status) => status >= 200 && status < 400
    });

    return response.data;
  } catch (error: any) {
    logger.error(`Gagal melakukan direct search POST: ${error.message}`);
    throw new Error(`Gagal melakukan pencarian: ${error.message}`);
  }
}

export function parseSearchHtml(html: string) {
  const $ = cheerio.load(html);
  const alertText = $('.alert, .text-danger, .callout-danger').text().trim();
  const results: any[] = [];

  $('.table-detail').each((_, table) => {
    const record: any = {};
    $(table).find('tbody tr').each((__, tr) => {
      const tds = $(tr).find('td');
      if (tds.length === 2) {
        const key = $(tds[0]).text().trim();
        const value = $(tds[1]).text().trim();
        if (key) {
          record[key] = value;
        }
      }
    });
    if (Object.keys(record).length > 0) {
      results.push(record);
    }
  });

  return {
    pesan_sistem: alertText || 'Pencarian diproses',
    total_data_ditemukan: results.length,
    data: results
  };
}
