import { NewCareer } from '@/game/NewCareer';

export const metadata = { title: 'New career' };

export default function NewCareerPage() {
  return (
    <main className="page">
      <div className="wrap stack">
        <div>
          <p className="eyebrow">New career</p>
          <h1>Choose your club</h1>
          <p className="lede">A seed builds the same world every time, so you can share one with a friend and race them. The board ranks every squad in each division; the lower yours is ranked, the harder the job.</p>
        </div>
        <NewCareer />
      </div>
    </main>
  );
}
