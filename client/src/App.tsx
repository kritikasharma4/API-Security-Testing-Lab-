import { useState } from 'react';
import { Header } from './components/Header';
import { AttackPanel } from './components/AttackPanel';
import { LogPanel } from './components/LogPanel';
import { OWASPCard } from './components/OWASPCard';
import { SecurityLayers } from './components/SecurityLayers';
import type { ScenarioResult } from './scenarios/types';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'https://api-security-testing-lab.onrender.com';

export default function App() {
  const [logActive, setLogActive] = useState(false);
  const [results, setResults] = useState<ScenarioResult[]>([]);

  function handleStart() {
    setResults([]);
    setLogActive(true);
  }

  function handleComplete(r: ScenarioResult[]) {
    setResults(r);
    setLogActive(false);
  }

  function handleReset() {
    setResults([]);
    setLogActive(false);
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <Header />
      <main>
        <AttackPanel
          onStart={handleStart}
          onComplete={handleComplete}
          onReset={handleReset}
        />
        <LogPanel serverURL={SERVER_URL} active={logActive} />
        <OWASPCard results={results} />
        <SecurityLayers />
      </main>
    </div>
  );
}
