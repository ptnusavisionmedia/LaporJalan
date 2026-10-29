import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clusterPoints, distanceMeters } from './cluster.ts';

test('titik berdekatan digabung, titik jauh terpisah', () => {
  const pts = [
    { id: 'a', lat: -6.2000, lng: 106.8000 },
    { id: 'b', lat: -6.2001, lng: 106.8001 },
    { id: 'c', lat: -7.5, lng: 110.0 },
  ];
  const out = clusterPoints(pts, 0.7);
  assert.equal(out.length, 2);
  assert.equal(out.find((c) => c.items.length === 2)?.items.map((i) => i.id).sort().join(), 'a,b');
});

test('zoom dekat memisahkan titik yang tadinya digabung', () => {
  const pts = [
    { id: 'a', lat: -6.2000, lng: 106.8000 },
    { id: 'b', lat: -6.2100, lng: 106.8100 },
  ];
  assert.equal(clusterPoints(pts, 5).length, 1);
  assert.equal(clusterPoints(pts, 0.01).length, 2);
});

test('klaster kosong untuk masukan kosong', () => {
  assert.deepEqual(clusterPoints([], 1), []);
});

test('jarak Jakarta-Bandung sekitar 115 km', () => {
  const d = distanceMeters({ lat: -6.2088, lng: 106.8456 }, { lat: -6.9175, lng: 107.6191 });
  assert.ok(d > 105_000 && d < 125_000, `got ${d}`);
});

test('jarak titik yang sama adalah 0', () => {
  assert.equal(distanceMeters({ lat: 1, lng: 1 }, { lat: 1, lng: 1 }), 0);
});
