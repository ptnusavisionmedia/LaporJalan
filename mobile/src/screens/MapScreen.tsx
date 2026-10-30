import type { ComponentType } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { WebView as RNWebView } from 'react-native-webview';
import * as Location from 'expo-location';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { fetchMapReports } from '../lib/api';
import type { Report } from '../lib/types';
import { categoryMeta, colors, priorityLevel, statusMeta } from '../lib/theme';

// Tipe kelas WebView belum cocok dengan tipe komponen React 19, jadi dibungkus sebagai komponen biasa.
const WebView = RNWebView as unknown as ComponentType<any>;

type Filter = 'aktif' | 'semua' | 'aksesibilitas' | 'prioritas';
const FILTERS: [Filter, string][] = [
  ['aktif', 'Belum selesai'],
  ['prioritas', 'Prioritas tinggi'],
  ['aksesibilitas', '♿ Aksesibilitas'],
  ['semua', 'Semua'],
];

// Peta memakai Leaflet + OpenStreetMap di dalam WebView, jadi tidak butuh API key Google Maps
// (react-native-maps tanpa key membuat APK langsung tertutup di Android).
const HTML = `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
<style>html,body,#m{height:100%;margin:0}.pop b{display:block;margin-bottom:2px}.pop small{color:#555;display:block}
.pop a{display:inline-block;margin-top:6px;color:#0B5D4B;font-weight:700}</style>
</head><body><div id="m"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
var map=L.map('m',{zoomControl:false}).setView([-2.5,118],4);
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap'}).addTo(map);
var layer=L.layerGroup().addTo(map),me=null;
function esc(s){return String(s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
function post(o){window.ReactNativeWebView.postMessage(JSON.stringify(o))}
window.openReport=function(id){post({type:'open',id:id})};
function handle(d){
  if(d.type==='markers'){
    layer.clearLayers();
    d.items.forEach(function(r){
      var m=L.circleMarker([r.lat,r.lng],{radius:9,color:'#fff',weight:2,fillColor:r.color,fillOpacity:1}).addTo(layer);
      m.bindPopup('<div class="pop"><b>'+esc(r.title)+'</b><small>'+esc(r.meta)+'</small><small>'+esc(r.prio)+'</small>'
        +'<a href="#" onclick="openReport(\\''+r.id+'\\');return false">Buka detail</a></div>');
    });
  } else if(d.type==='me'){
    if(me)map.removeLayer(me);
    me=L.circleMarker([d.lat,d.lng],{radius:8,color:'#fff',weight:3,fillColor:'#1F5FAE',fillOpacity:1}).addTo(map);
    map.setView([d.lat,d.lng],14);
  }
}
function onMsg(e){try{handle(JSON.parse(e.data))}catch(x){}}
document.addEventListener('message',onMsg);window.addEventListener('message',onMsg);
post({type:'ready'});
</script></body></html>`;

export function MapScreen() {
  const nav = useNavigation<any>();
  const web = useRef<{ injectJavaScript: (js: string) => void }>(null);
  const [ready, setReady] = useState(false);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('aktif');
  const [error, setError] = useState('');

  const send = useCallback((msg: object) => {
    web.current?.injectJavaScript(`handle(${JSON.stringify(msg)});true;`);
  }, []);

  const centerOnUser = useCallback(async () => {
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status !== 'granted') return;
      const pos = (await Location.getLastKnownPositionAsync()) ?? (await Location.getCurrentPositionAsync({}));
      send({ type: 'me', lat: pos.coords.latitude, lng: pos.coords.longitude });
    } catch {
      /* tetap di peta Indonesia */
    }
  }, [send]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      fetchMapReports()
        .then((r) => !cancelled && (setReports(r), setError('')))
        .catch((e) => !cancelled && setError(e instanceof Error ? e.message : 'Gagal memuat peta.'))
        .finally(() => !cancelled && setLoading(false));
      return () => {
        cancelled = true;
      };
    }, []),
  );

  const shown = useMemo(
    () =>
      reports.filter((r) => {
        if (r.latitude == null || r.longitude == null) return false;
        const active = r.status !== 'selesai' && r.status !== 'ditolak';
        if (filter === 'aktif') return active;
        if (filter === 'prioritas') return active && r.priority_score >= 80;
        if (filter === 'aksesibilitas') return !!categoryMeta[r.category]?.access;
        return true;
      }),
    [reports, filter],
  );

  useEffect(() => {
    if (!ready) return;
    send({
      type: 'markers',
      items: shown.map((r) => ({
        id: r.id,
        lat: r.latitude,
        lng: r.longitude,
        color: statusMeta[r.status].pin,
        title: r.title,
        meta: `${categoryMeta[r.category]?.label ?? ''} · ${statusMeta[r.status].label}`,
        prio: priorityLevel(r.priority_score).label,
      })),
    });
  }, [ready, shown, send]);

  return (
    <View style={{ flex: 1 }}>
      <WebView
        ref={web}
        style={StyleSheet.absoluteFill}
        originWhitelist={['*']}
        source={{ html: HTML, baseUrl: 'https://laporjalan.app' }}
        javaScriptEnabled
        onMessage={(e: { nativeEvent: { data: string } }) => {
          try {
            const m = JSON.parse(e.nativeEvent.data);
            if (m.type === 'ready') {
              setReady(true);
              centerOnUser();
            } else if (m.type === 'open') {
              nav.navigate('ReportDetail', { id: m.id });
            }
          } catch {
            /* abaikan pesan tak dikenal */
          }
        }}
      />

      <View style={styles.filters} pointerEvents="box-none">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 12 }}>
          {FILTERS.map(([key, label]) => (
            <Pressable key={key} onPress={() => setFilter(key)} style={[styles.chip, filter === key && styles.chipActive]}>
              <Text style={[styles.chipText, filter === key && { color: '#fff' }]}>{label}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <View style={styles.legend}>
        {(['menunggu', 'diverifikasi', 'diproses', 'selesai'] as const).map((s) => (
          <View key={s} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: statusMeta[s].pin }]} />
            <Text style={styles.legendText}>{statusMeta[s].label}</Text>
          </View>
        ))}
      </View>

      {loading && <ActivityIndicator style={styles.loading} size="large" color={colors.primary} />}
      {!!error && <Text style={styles.error}>{error}</Text>}
      {!loading && !error && <Text style={styles.count}>{shown.length} laporan di peta</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  filters: { position: 'absolute', top: 10, left: 0, right: 0 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.line,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontWeight: '700', color: colors.ink, fontSize: 13 },
  legend: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 10,
    gap: 4,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 12, height: 12, borderRadius: 6, borderWidth: 1, borderColor: colors.line },
  legendText: { fontSize: 11, color: colors.ink, fontWeight: '700' },
  loading: { position: 'absolute', top: '45%', alignSelf: 'center' },
  error: { position: 'absolute', top: 60, alignSelf: 'center', backgroundColor: '#FEE2E2', color: '#991B1B', padding: 8, borderRadius: 8 },
  count: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: 'rgba(15,23,42,0.85)',
    color: '#fff',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    fontSize: 12,
  },
});
