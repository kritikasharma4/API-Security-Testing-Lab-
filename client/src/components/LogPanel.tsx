import { useEffect, useRef, useState } from 'react';
import { Terminal } from 'lucide-react';

interface LogEvent {
  type: 'INFO' | 'WARN' | 'ALERT';
  message: string;
  timestamp: string;
}

interface LogPanelProps {
  serverURL: string;
  active: boolean;
}

const COLOR: Record<LogEvent['type'], string> = {
  INFO: 'text-emerald-400',
  WARN: 'text-yellow-400',
  ALERT: 'text-red-400',
};

export function LogPanel({ serverURL, active }: LogPanelProps) {
  const [logs, setLogs] = useState<LogEvent[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (active && !esRef.current) {
      const es = new EventSource(`${serverURL}/logs/stream`);
      esRef.current = es;
      es.onmessage = (e) => {
        try {
          const event: LogEvent = JSON.parse(e.data);
          setLogs(prev => [...prev.slice(-99), event]);
        } catch {}
      };
    }
    if (!active && esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }
    return () => {
      if (esRef.current) {
        esRef.current.close();
        esRef.current = null;
      }
    };
  }, [active, serverURL]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  if (!active && logs.length === 0) return null;

  return (
    <section className="mx-auto max-w-4xl px-6 pb-8">
      <div className="rounded-lg border border-zinc-800 bg-black overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-2 border-b border-zinc-800 bg-zinc-950">
          <Terminal className="h-4 w-4 text-zinc-400" />
          <span className="text-xs font-mono text-zinc-400">Live Server Log Stream</span>
          {active && (
            <span className="ml-auto flex items-center gap-1.5 text-xs text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              LIVE
            </span>
          )}
        </div>
        <div className="p-4 font-mono text-xs space-y-1 max-h-64 overflow-y-auto">
          {logs.length === 0 && (
            <p className="text-zinc-600">Connecting to log stream...</p>
          )}
          {logs.map((log, i) => (
            <div key={i} className="flex gap-3">
              <span className="text-zinc-600 shrink-0">
                {new Date(log.timestamp).toLocaleTimeString()}
              </span>
              <span className={`shrink-0 font-bold ${COLOR[log.type]}`}>
                [{log.type}]
              </span>
              <span className="text-zinc-300">{log.message}</span>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      </div>
    </section>
  );
}
