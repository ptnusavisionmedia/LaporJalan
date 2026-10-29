import { ReportsTable } from '@/components/reports-table';

export default async function Page({ searchParams }: PageProps<'/reports/completed'>) {
  return <ReportsTable title="Selesai" basePath="/reports/completed" params={await searchParams} fixedStatuses={["selesai"]} />;
}
