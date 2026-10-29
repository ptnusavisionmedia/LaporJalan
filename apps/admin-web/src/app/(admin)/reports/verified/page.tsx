import { ReportsTable } from '@/components/reports-table';

export default async function Page({ searchParams }: PageProps<'/reports/verified'>) {
  return <ReportsTable title="Terverifikasi" basePath="/reports/verified" params={await searchParams} fixedStatuses={["terverifikasi"]} />;
}
