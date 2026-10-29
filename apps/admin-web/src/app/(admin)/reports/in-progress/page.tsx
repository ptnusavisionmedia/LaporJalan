import { ReportsTable } from '@/components/reports-table';

export default async function Page({ searchParams }: PageProps<'/reports/in-progress'>) {
  return <ReportsTable title="Dalam Penanganan" basePath="/reports/in-progress" params={await searchParams} fixedStatuses={["dalam_penanganan"]} />;
}
