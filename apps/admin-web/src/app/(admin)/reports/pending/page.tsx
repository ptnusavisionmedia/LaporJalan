import { ReportsTable } from '@/components/reports-table';

export default async function Page({ searchParams }: PageProps<'/reports/pending'>) {
  return <ReportsTable title="Menunggu Verifikasi" basePath="/reports/pending" params={await searchParams} fixedStatuses={["diajukan", "menunggu_verifikasi"]} />;
}
