'use client';

import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

type Point = { name: string; total: number };

export function MonthlyChart({ data }: { data: Point[] }) {
  if (data.length === 0) return <p className="text-sm text-slate-500">Belum ada data.</p>;
  return (
    <div role="img" aria-label="Grafik tren laporan per bulan" className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" strokeOpacity={0.3} />
          <XAxis dataKey="name" fontSize={12} />
          <YAxis allowDecimals={false} fontSize={12} />
          <Tooltip />
          <Line type="monotone" dataKey="total" name="Laporan" stroke="#2563EB" strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function CategoryChart({ data }: { data: Point[] }) {
  if (data.length === 0) return <p className="text-sm text-slate-500">Belum ada data.</p>;
  return (
    <div role="img" aria-label="Grafik sebaran kategori kerusakan" className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ left: 30 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" strokeOpacity={0.3} />
          <XAxis type="number" allowDecimals={false} fontSize={12} />
          <YAxis type="category" dataKey="name" width={150} fontSize={11} />
          <Tooltip />
          <Bar dataKey="total" name="Laporan" fill="#2563EB" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
