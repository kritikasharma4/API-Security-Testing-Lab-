import { Header } from './components/Header';
import { AttackPanel } from './components/AttackPanel';
import { SecurityLayers } from './components/SecurityLayers';

export default function App() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <Header />
      <main>
        <AttackPanel />
        <SecurityLayers />
      </main>
    </div>
  );
}
