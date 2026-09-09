import { CareerList } from '@/game/CareerList';

export const metadata = { title: 'Your careers' };

export default function Play() {
  return (
    <main className="page">
      <div className="wrap stack">
        <div>
          <p className="eyebrow">Careers</p>
          <h1>Pick up where you left off</h1>
        </div>
        <CareerList />
      </div>
    </main>
  );
}
