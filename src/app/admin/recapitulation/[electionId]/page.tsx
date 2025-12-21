import { RecapitulationClientPage } from './components/recapitulation-client-page';
import { getElection } from '@/app/actions/elections';
import { getCategories } from '@/app/actions/categories';
import { redirect } from 'next/navigation';

interface PageProps {
  params: Promise<{ electionId: string }>;
}

export default async function RecapitulationPage({ params }: PageProps) {
  const { electionId } = await params;

  const [electionRes, categoriesRes] = await Promise.all([
    getElection(electionId),
    getCategories()
  ]);

  if (!electionRes.success || !electionRes.data) {
    redirect('/admin/recapitulation');
  }

  return <RecapitulationClientPage election={electionRes.data} categories={categoriesRes.data || []} />;
}
