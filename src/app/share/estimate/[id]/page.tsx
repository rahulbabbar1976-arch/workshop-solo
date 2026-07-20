import PublicShareClient from '../../components/PublicShareClient';

export default function ShareEstimatePage({ params }: { params: { id: string } }) {
  return <PublicShareClient id={params.id} docType="estimate" />;
}
