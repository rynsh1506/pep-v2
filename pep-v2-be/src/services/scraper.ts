import { chromium } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';
import { logger } from '../utils/logger';

const SESSION_FILE = path.join(__dirname, '../../../session.json');
const SETTINGS_FILE = path.join(__dirname, '../../../settings.json');

export interface ScraperSettings {
  strategy: 'stealth' | 'manual' | 'whisper-local' | 'capsolver' | '2captcha';
  headless: boolean;
}

// Default settings
let settings: ScraperSettings = {
  strategy: 'stealth',
  headless: true,
};

// Load settings from disk if available
if (fs.existsSync(SETTINGS_FILE)) {
  try {
    settings = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
  } catch (_) {}
}

export function getSettings(): ScraperSettings {
  return settings;
}

export function updateSettings(newSettings: Partial<ScraperSettings>): ScraperSettings {
  settings = { ...settings, ...newSettings };
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf8');
  return settings;
}

export async function scrapeToken(): Promise<{ cookieString: string; csrfToken?: string }> {
  const targetUrl = process.env.PPATK_LOGIN_URL || 'https://pep.ppatk.go.id/admin/user/login';
  const username = process.env.PPATK_USERNAME || '';
  const password = process.env.PPATK_PASSWORD || '';

  if (!username || !password) {
    throw new Error('PPATK_USERNAME atau PPATK_PASSWORD belum dikonfigurasi di environment.');
  }

  logger.info(`Memulai browser Playwright (${settings.headless ? 'headless' : 'headful'}). Strategy: ${settings.strategy}`);
  
  const browser = await chromium.launch({
    headless: settings.headless,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  });

  const page = await context.newPage();

  try {
    logger.info(`Membuka halaman login PPATK: ${targetUrl}`);
    await page.goto(targetUrl, { waitUntil: 'networkidle', timeout: 30000 });

    logger.info('Mengisi form login...');
    await page.fill('input[name="username"]', username);
    await page.fill('input[name="password"]', password);

    // Click login button
    logger.info('Menekan tombol login...');
    await Promise.all([
      page.waitForNavigation({ timeout: 30000 }),
      page.click('button#btn-login'),
    ]);

    // Check if redirect succeeded (i.e. we are no longer on login page)
    if (page.url().includes('/login')) {
      throw new Error('Gagal login ke portal PPATK. Periksa kredensial Anda.');
    }

    logger.info('Login berhasil! Mengekstrak cookies...');
    const cookies = await context.cookies();
    const cookieString = cookies.map(c => `${c.name}=${c.value}`).join('; ');

    // Save session
    fs.writeFileSync(SESSION_FILE, JSON.stringify(cookies, null, 2), 'utf8');

    return { cookieString };
  } catch (error: any) {
    logger.error(`Error saat proses scraping: ${error.message}`);
    throw error;
  } finally {
    await browser.close();
  }
}
