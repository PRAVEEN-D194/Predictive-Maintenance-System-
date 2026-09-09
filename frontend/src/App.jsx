import React, { useState, useEffect, useRef, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import LiveMonitoring from './pages/LiveMonitoring';
import MachineDetails from './pages/MachineDetails';
import Comparison from './pages/Comparison';
import Analytics from './pages/Analytics';
import Toast from './components/Toast';

function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [selectedMachineId, setSelectedMachineId] = useState('M-001');
  const [fleetData, setFleetData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toasts, setToasts] = useState([]);
  const previousStatusMap = useRef({});

  const addToast = useCallback((toast) => {
    const id = Date.now() + Math.random();
    const newToast = {
      id,
      time: new Date().toLocaleTimeString(),
      ...toast
    };
    setToasts((prev) => [...prev.slice(-3), newToast]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  const handleDismissToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Central fast polling loop for the entire application
  const fetchFleet = useCallback(async () => {
    try {
      const res = await fetch('http://127.0.0.1:5000/fleet');
      if (!res.ok) throw new Error('API server returned error');
      const data = await res.json();
      setFleetData(data);
      setError(null);
      setIsLoading(false);

      // Check status transitions
      if (data.machines) {
        data.machines.forEach((m) => {
          const prev = previousStatusMap.current[m.id];
          if (prev && prev !== m.status) {
            if (m.status === 'Critical') {
              addToast({
                title: `🚨 Critical Alert: ${m.id}`,
                message: `${m.name} entered Critical risk state (${m.failure_probability}% failure risk).`,
                type: 'critical'
              });
            } else if (m.status === 'Failed') {
              addToast({
                title: `⚫ Protective Shutdown: ${m.id}`,
                message: `${m.name} stopped due to ${m.failure_type || 'failure'}.`,
                type: 'critical'
              });
            } else if (m.status === 'Working' && (prev === 'Critical' || prev === 'Failed')) {
              addToast({
                title: `🟢 Service Restored: ${m.id}`,
                message: `${m.name} is now online and operating nominally.`,
                type: 'success'
              });
            }
          }
          previousStatusMap.current[m.id] = m.status;
        });
      }
    } catch (err) {
      if (!fleetData) {
        setError(err.message || 'Unable to connect to backend server');
        setIsLoading(false);
      }
    }
  }, [addToast, fleetData]);

  useEffect(() => {
    fetchFleet();
    const interval = setInterval(fetchFleet, 1500);
    return () => clearInterval(interval);
  }, [fetchFleet]);

  const handleSelectMachine = (machineId) => {
    setSelectedMachineId(machineId);
    setCurrentPage('machine-details');
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return (
          <Dashboard
            fleetData={fleetData}
            isLoading={isLoading}
            error={error}
            onRefresh={fetchFleet}
            onSelectMachine={handleSelectMachine}
          />
        );
      case 'live-monitoring':
        return (
          <LiveMonitoring
            fleetData={fleetData}
            isLoading={isLoading}
            error={error}
            onRefresh={fetchFleet}
            onSelectMachine={handleSelectMachine}
          />
        );
      case 'machine-details':
        return (
          <MachineDetails
            machineId={selectedMachineId}
            fleetData={fleetData}
            onRefresh={fetchFleet}
            onBack={() => setCurrentPage('dashboard')}
            onNavigateMachine={(mId) => setSelectedMachineId(mId)}
            addToast={addToast}
          />
        );
      case 'comparison':
        return <Comparison />;
      case 'analytics':
        return <Analytics />;
      default:
        return (
          <Dashboard
            fleetData={fleetData}
            isLoading={isLoading}
            error={error}
            onRefresh={fetchFleet}
            onSelectMachine={handleSelectMachine}
          />
        );
    }
  };

  return (
    <div className="flex h-screen w-screen bg-slate-50 overflow-hidden text-slate-900 font-sans select-none">
      {/* Sidebar */}
      <Sidebar
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        fleetSummary={fleetData?.summary}
        selectedMachineId={selectedMachineId}
      />

      {/* Main Viewport */}
      <main className="flex-1 flex flex-col overflow-hidden bg-slate-50 relative">
        {renderPage()}
      </main>

      {/* Real-time Alerts */}
      <Toast toasts={toasts} onDismiss={handleDismissToast} />
    </div>
  );
}

export default App;
