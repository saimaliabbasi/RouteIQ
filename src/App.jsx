import { useEffect, useState } from 'react';
import './index.css';
import Topbar from './components/Topbar';
import Dashboard from './pages/Dashboard';
import { checkHealth } from './services/api';

export default function App() {
  const [apiOnline, setApiOnline] = useState(null);

  useEffect(() => {
    let mounted = true;

    const ping = async () => {
      try {
        await checkHealth();
        if (mounted) {
          setApiOnline(true);
        }
      } catch {
        if (mounted) {
          setApiOnline(false);
        }
      }
    };

    ping();
    const interval = setInterval(ping, 15000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <>
      <Topbar apiOnline={apiOnline} />
      <Dashboard />
    </>
  );
}
