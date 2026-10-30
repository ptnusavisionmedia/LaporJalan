import { decode } from 'base64-arraybuffer';

// Detect the uploaded bytes, not the local URI extension: the picker can convert formats.
export function prepareReportImage(base64: string) {
  const encoded = base64.replace(/^data:image\/[^;]+;base64,/, '').replace(/\s/g, '');
  if (!encoded || !/^[A-Za-z0-9+/]*={0,2}$/.test(encoded) || encoded.length % 4 === 1) {
    throw new Error('Data foto tidak valid. Pilih ulang foto dari kamera atau galeri.');
  }
  const body = decode(encoded);
  const bytes = new Uint8Array(body);
  let ext: string;
  let contentType: string;
  if (bytes.length >= 4 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    ext = 'jpg'; contentType = 'image/jpeg';
  } else if (bytes.length >= 8 && [137, 80, 78, 71, 13, 10, 26, 10].every((n, i) => bytes[i] === n)) {
    ext = 'png'; contentType = 'image/png';
  } else if (bytes.length >= 12 && String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP') {
    ext = 'webp'; contentType = 'image/webp';
  } else if (bytes.length >= 6 && ['GIF87a', 'GIF89a'].includes(String.fromCharCode(...bytes.slice(0, 6)))) {
    ext = 'gif'; contentType = 'image/gif';
  } else {
    throw new Error('File bukan foto yang didukung atau sudah rusak. Pilih ulang foto dari kamera atau galeri.');
  }
  return { body, ext, contentType };
}
