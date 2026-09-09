import { CareerLoader } from '@/game/CareerLoader';

export const metadata = { title: 'Career' };

export default async function CareerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <main className="page">
      <div className="wrap">
        <CareerLoader id={id} />
      </div>
    </main>
  );
}
