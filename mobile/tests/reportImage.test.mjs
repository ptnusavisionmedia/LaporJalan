import assert from 'node:assert/strict';
import test from 'node:test';
import { prepareReportImage } from '../src/lib/reportImage.ts';

test('rejects the actual corrupted upload (File not found) and empty/non-image data', () => {
  for (const value of ['', Buffer.from('File not found').toString('base64'), Buffer.from('<html>error</html>').toString('base64'), '***']) {
    assert.throws(() => prepareReportImage(value), /foto|File/);
  }
});

test('preserves image bytes and detects PNG content independent of the picker URI', () => {
  const png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX1cAAAAASUVORK5CYII=';
  const image = prepareReportImage(`data:image/png;base64,${png}`);
  assert.equal(image.contentType, 'image/png');
  assert.equal(image.ext, 'png');
  assert.deepEqual(Buffer.from(image.body), Buffer.from(png, 'base64'));
});

test('recognizes JPEG bytes even when local picker filename has another extension', () => {
  const bytes = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 0x46, 0xff, 0xd9]);
  const image = prepareReportImage(bytes.toString('base64'));
  assert.equal(image.ext, 'jpg');
  assert.equal(image.contentType, 'image/jpeg');
  assert.deepEqual(Buffer.from(image.body), bytes);
});
