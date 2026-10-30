export type Status = 'menunggu' | 'diverifikasi' | 'diproses' | 'selesai' | 'ditolak';

export type Category =
  | 'jalan_berlubang'
  | 'jalan_rusak'
  | 'trotoar_rusak'
  | 'area_berbahaya'
  | 'trotoar_terhalang'
  | 'jalur_pemandu_rusak'
  | 'akses_kursi_roda';

export type Traffic = 'rendah' | 'sedang' | 'tinggi';

export interface Report {
  id: string;
  user_id: string;
  title: string;
  description: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  image_url: string;
  status: Status;
  admin_note: string | null;
  category: Category;
  severity: 1 | 2 | 3;
  traffic: Traffic;
  province: string;
  city: string;
  district: string;
  village: string;
  ai_category: string | null;
  ai_severity: number | null;
  ai_confidence: number | null;
  ai_summary: string | null;
  priority_score: number;
  created_at: string;
  profiles: { username: string } | null;
  likes: { user_id: string }[];
  comments: { count: number }[];
  validations: { user_id: string; still_damaged: boolean }[];
}

export interface Comment {
  id: string;
  report_id: string;
  user_id: string;
  body: string;
  created_at: string;
  profiles: { username: string } | null;
}

export interface ReportUpdate {
  id: string;
  report_id: string;
  kind: 'status' | 'progress' | 'after';
  status: Status | null;
  note: string;
  photo_url: string | null;
  created_at: string;
  profiles: { username: string } | null;
}

export interface AiResult {
  category: Category | 'bukan_kerusakan';
  severity: 1 | 2 | 3;
  confidence: number;
  summary: string;
}
