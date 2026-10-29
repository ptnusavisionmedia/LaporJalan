import { ReportsTable } from '@/components/reports-table';

export default async function Page({ searchParams }: PageProps<'/reports'>) {
  return <ReportsTable title="Semua Laporan" basePath="/reports" params={await searchParams} />;
}
