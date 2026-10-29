// DRAFT TEXT. Not legal advice and not reviewed by counsel. Items in [ISI: ...] are placeholders
// the operator must complete. This file is the single source of the in-app legal text.

export type LegalDoc = { title: string; sections: { heading: string; body: string }[] };

export const DRAFT_NOTICE =
  'DRAFT - belum ditinjau oleh penasihat hukum. Penyelenggara wajib melengkapi bagian bertanda [ISI] sebelum rilis.';

export const PRIVACY: LegalDoc = {
  title: 'Kebijakan Privasi',
  sections: [
    {
      heading: 'Pengendali data',
      body: '[ISI: nama badan/instansi penyelenggara, alamat, dan kontak pejabat pelindungan data pribadi].',
    },
    {
      heading: 'Data yang kami proses',
      body:
        'Akun: nama, email, nomor telepon (opsional). Laporan: judul, deskripsi, foto kerusakan, koordinat LOKASI KERUSAKAN, wilayah, dan waktu. ' +
        'Lokasi perangkat Anda hanya dibaca saat Anda menekan tombol terkait atau menyalakan peringatan area berbahaya, ' +
        'dan tidak disimpan di server. Metadata foto (EXIF) dihapus sebelum diunggah. Token notifikasi perangkat jika Anda mengaktifkannya.',
    },
    {
      heading: 'Tujuan',
      body:
        'Menerima, memverifikasi, dan menindaklanjuti laporan kerusakan infrastruktur; mengirim pembaruan status; ' +
        'menampilkan laporan yang telah diverifikasi di peta; statistik wilayah; mencegah penyalahgunaan.',
    },
    {
      heading: 'Apa yang terlihat oleh pihak lain',
      body:
        'Laporan yang telah diverifikasi (judul, deskripsi, foto, lokasi kerusakan) dapat dilihat pengguna lain TANPA nama Anda. ' +
        'Petugas dan admin instansi yang berwenang atas wilayah laporan dapat melihat nama pelapor.',
    },
    {
      heading: 'Pemroses dan pihak ketiga',
      body:
        'Supabase (basis data, autentikasi, penyimpanan), layanan notifikasi Expo/Google FCM, penyedia ubin peta OpenStreetMap, ' +
        'dan layanan analisis gambar [ISI: penyedia/lokasi server]. [ISI: lokasi penyimpanan data dan dasar transfer lintas negara bila ada].',
    },
    {
      heading: 'Retensi',
      body:
        '[ISI: jangka waktu penyimpanan laporan, foto, log audit, dan akun tidak aktif]. ' +
        'Setelah penghapusan akun, laporan dipertahankan tanpa identitas pelapor sebagai data infrastruktur.',
    },
    {
      heading: 'Hak Anda',
      body:
        'Anda berhak mengakses, memperbaiki, membatasi, menarik persetujuan, dan meminta penghapusan data pribadi Anda. ' +
        'Dalam aplikasi: ubah profil, ekspor data (fungsi akses), dan "Ajukan penghapusan akun" di Profil. ' +
        'Penghapusan diproses setelah masa tunggu [ISI: 7 hari bawaan]. Kontak: [ISI].',
    },
    {
      heading: 'Keamanan dan insiden',
      body:
        'Kami memakai enkripsi saat transit, kontrol akses berbasis peran, dan log audit. ' +
        'Prosedur penanganan insiden dan pemberitahuan: [ISI: sesuai docs/INCIDENT_RESPONSE.md setelah ditinjau hukum].',
    },
  ],
};

export const TERMS: LegalDoc = {
  title: 'Syarat Layanan',
  sections: [
    {
      heading: 'Penggunaan',
      body:
        'LaporJalan digunakan untuk melaporkan kerusakan infrastruktur secara jujur dan akurat. ' +
        'Dilarang mengirim laporan palsu, berulang secara berlebihan, atau foto yang melanggar hak/privasi orang lain (mis. wajah atau pelat nomor yang jelas).',
    },
    {
      heading: 'Konten Anda',
      body:
        'Anda tetap memiliki konten Anda dan memberi penyelenggara izin untuk memprosesnya guna tujuan layanan, termasuk menampilkannya tanpa identitas kepada publik setelah verifikasi.',
    },
    {
      heading: 'Tidak ada jaminan penanganan',
      body:
        'Pengiriman laporan tidak menjamin perbaikan atau waktu penanganan tertentu. Status resmi hanya ditetapkan oleh petugas yang berwenang; ' +
        'konfirmasi komunitas bersifat informatif. Perkiraan AI dan skor prioritas adalah alat bantu, bukan keputusan akhir.',
    },
    {
      heading: 'Keselamatan',
      body: 'Jangan membahayakan diri saat memotret. Hubungi layanan darurat untuk bahaya mendesak; aplikasi ini bukan layanan darurat.',
    },
    {
      heading: 'Penangguhan',
      body: 'Akun dapat dibatasi bila melanggar ketentuan ini. [ISI: prosedur keberatan, hukum yang berlaku, dan penyelesaian sengketa].',
    },
  ],
};
