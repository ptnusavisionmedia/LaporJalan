export type GeoPoint = { id: string; lat: number; lng: number };
export type Cluster<T extends GeoPoint> = { lat: number; lng: number; items: T[] };

/**
 * Grid clustering for the map viewport: the visible latitude span is split into
 * `cells` rows and points that fall in the same cell are merged into one marker.
 * Deterministic and O(n); fine for the <= 500 points a viewport query returns.
 */
export function clusterPoints<T extends GeoPoint>(points: T[], latDelta: number, cells = 7): Cluster<T>[] {
  const size = Math.max(latDelta / cells, 1e-6);
  const buckets = new Map<string, T[]>();
  for (const p of points) {
    const key = `${Math.floor(p.lat / size)}:${Math.floor(p.lng / size)}`;
    const list = buckets.get(key);
    if (list) list.push(p);
    else buckets.set(key, [p]);
  }
  return [...buckets.values()].map((items) => ({
    lat: items.reduce((s, i) => s + i.lat, 0) / items.length,
    lng: items.reduce((s, i) => s + i.lng, 0) / items.length,
    items,
  }));
}

/** Great-circle distance in metres (haversine). */
export function distanceMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371000;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
