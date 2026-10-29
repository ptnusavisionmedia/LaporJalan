import { ReportsTable } from '@/components/reports-table';

// Open reports ranked by priority score. Scores come from the provisional weighted model in
// app_settings('priority_config'); admins can override them on each report's detail page.
export default async function Page({ searchParams }: PageProps<'/priorities'>) {
  return (
    <ReportsTable
      title="Prioritas Penanganan"
      basePath="/priorities"
      params={await searchParams}
      fixedStatuses={['diajukan', 'menunggu_verifikasi', 'terverifikasi', 'dalam_penanganan']}
      defaultSort="priority"
    />
  );
}
