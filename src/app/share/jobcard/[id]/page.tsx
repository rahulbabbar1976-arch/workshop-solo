import PublicShareClient from '../../components/PublicShareClient';

export default function ShareJobCardPage({ params }: { params: { id: string } }) {
  return <PublicShareClient id={params.id} docType="jobcard" />;
}
