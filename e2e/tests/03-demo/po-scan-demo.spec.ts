/**
 * YouTube demo recording — 発注書 scan flow.
 *
 * Walks the full flow:
 *   1. Open Lifegence Drive (/drive_app) in a fresh demo folder
 *   2. Upload the sample 発注書 image
 *   3. Preview the sample in Drive so viewers can read the source document
 *   4. Open Scanner Upload, select the same sample file, and start scanning
 *   4. Seed completion via `seed_demo_scan` (no Vision API key needed)
 *   5. Return to /drive_app and reveal the saved result JSON
 *
 * Run with the dedicated `demo-local` Playwright project so video is
 * recorded at 1280×720 with paced timing.
 */
import * as path from 'path';
import { test, expect, FrappeClient } from '@lifegence/e2e-common';

// `developer_mode = 1` lets Drive Folder names like "発注書スキャン デモ"
// survive autoname; we still namespace with a timestamp to avoid collisions
// across re-runs of the demo recorder.
const DEMO_FOLDER_NAME = `発注書スキャン デモ ${new Date().toISOString().slice(0, 16).replace('T', ' ')}`;
const PO_IMAGE_PATH = path.resolve(__dirname, '../../fixtures/sample_purchase_order.png');
const PO_TEMPLATE = 'STPL-1075'; // 発注書 — built by install_trade_templates.py

// Visual pacing: keep transitions long enough to read on a YouTube video.
const BEAT_SHORT = 800;
const BEAT_MED = 1500;
const BEAT_LONG = 2500;

test.describe('Demo recording — Purchase Order scan', () => {
  let api: FrappeClient;
  let folderId: string;

  test.beforeAll(async ({ baseURL }) => {
    api = await FrappeClient.login(
      baseURL!,
      process.env.ADMIN_USR || 'Administrator',
      process.env.ADMIN_PWD || 'admin',
    );

    // Fresh demo folder via Frappe REST — keeps the on-camera state clean.
    const folder = await api.call<{ name: string }>('frappe.client.insert', {
      doc: {
        doctype: 'Drive Folder',
        folder_name: DEMO_FOLDER_NAME,
        is_private: 1,
      },
    });
    folderId = folder.name;
  });

  test.afterAll(async () => {
    await api.dispose();
  });

  test('demo: preview PO in Drive → scan selected file → inspect result JSON', async ({ page }) => {
    // ── 0. Cold open: Lifegence Drive home ────────────────────────────
    await page.goto('/drive_app/');
    await expect(page.locator('header').first()).toBeVisible({ timeout: 15_000 });
    await page.waitForTimeout(BEAT_LONG);

    // ── 1. Open the demo folder ──────────────────────────────────────
    await page.goto(`/drive_app/folder/${folderId}`);
    await expect(page.getByText(DEMO_FOLDER_NAME, { exact: false }).first()).toBeVisible({
      timeout: 15_000,
    });
    await page.waitForTimeout(BEAT_MED);

    // ── 2. Upload the 発注書 image via the visible "アップロード" button ──
    // The button click triggers a hidden <input type="file"> — Playwright can
    // bypass the OS picker by setting files directly on that input.
    const uploadInput = page.locator('input[type="file"]').first();
    await uploadInput.setInputFiles(PO_IMAGE_PATH);

    // Wait for the upload to land — file tile should appear with its label.
    await expect(page.getByText('sample_purchase_order.png', { exact: false }).first()).toBeVisible({
      timeout: 30_000,
    });
    await page.waitForTimeout(BEAT_LONG);

    // ── 3. Open the PO preview in Drive so the source document is visible ─
    await page.getByText('sample_purchase_order.png', { exact: false }).first().click();
    await expect(page.locator('h2', { hasText: 'sample_purchase_order.png' })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.locator('img[alt="sample_purchase_order.png"]')).toBeVisible({
      timeout: 15_000,
    });
    await page.waitForTimeout(BEAT_LONG);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(BEAT_MED);

    // ── 4. Move to Scanner and select the same file for extraction ─────
    await page.goto('/app/scanner-upload');
    await expect(page.getByText('スキャナーアップロード', { exact: false })).toBeVisible({
      timeout: 15_000,
    });
    await page.waitForTimeout(BEAT_MED);

    // Select 発注書 template — option label format is "STPL-XXXX: 発注書 (Purchase Order)"
    const templateSelect = page.locator('select.template-select').first();
    await expect(templateSelect).toBeVisible({ timeout: 15_000 });
    const templateValue = await templateSelect.evaluate((select, templateName) => {
      const option = Array.from((select as HTMLSelectElement).options).find((item) =>
        item.value === templateName || item.text.includes('発注書'),
      );
      return option?.value || '';
    }, PO_TEMPLATE);
    await templateSelect.selectOption(templateValue);
    await page.waitForTimeout(BEAT_MED);

    const scannerInput = page.locator('#scanner-file-input');
    await scannerInput.setInputFiles(PO_IMAGE_PATH);
    await expect(page.getByText('1枚 選択中', { exact: false })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.locator('.thumbnail-grid img')).toBeVisible({ timeout: 15_000 });
    await page.waitForTimeout(BEAT_LONG);

    // Press "スキャン開始" and capture the created Scan Job. The local Vision
    // worker may fail without API keys, so seed_demo_scan deterministically
    // completes the same real job and writes the result JSON.
    const uploadResponse = await Promise.all([
      page.waitForResponse((response) =>
        response.url().includes('lifegence_scanner.image_scanner.api.upload.batch_upload_and_scan'),
      ),
      page.getByRole('button', { name: /スキャン開始/ }).click(),
    ]).then(([response]) => response);
    await page.waitForTimeout(BEAT_LONG);

    // ── 4. Land on the Scan Job form, then seed completion (no API key needed) ─
    const uploadPayload = await uploadResponse.json();
    const jobName = uploadPayload.message.job_name;
    const scanFolderId = uploadPayload.message.folder;
    await page.goto(`/app/scan-job/${jobName}`);
    await expect(page.getByText(/Queued|Processing|Draft|Completed/).first()).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText('sample_purchase_order.png', { exact: false }).first()).toBeVisible({
      timeout: 15_000,
    });
    await page.waitForTimeout(BEAT_MED);

    // Force the job to Completed with the template's sample_output as the
    // scan result — this writes a real result.json Drive File for the demo.
    await api.call('lifegence_scanner.image_scanner.api.scan.seed_demo_scan', {
      job_name: jobName,
    });

    // Refresh the form so the on-screen status flips to Completed visually.
    await page.reload();
    await expect(page.getByText('Completed').first()).toBeVisible({ timeout: 15_000 });
    await page.waitForTimeout(BEAT_LONG);

    // ── 5. Walk back to Drive and reveal the result JSON ──────────────
    await page.goto(`/drive_app/folder/${scanFolderId}`);
    await expect(
      page.getByText('sample_purchase_order_scan_result.json', { exact: false }).first(),
    ).toBeVisible({ timeout: 15_000 });
    await page.waitForTimeout(BEAT_LONG);

    // ── 6. Open the result file to show the parsed data on camera ─────
    await page.getByText('sample_purchase_order_scan_result.json', { exact: false }).first().click();
    await page.waitForTimeout(BEAT_LONG);

    // Close any preview drawer / dialog that opens.
    await page.keyboard.press('Escape');
    await page.waitForTimeout(BEAT_MED);
  });
});
