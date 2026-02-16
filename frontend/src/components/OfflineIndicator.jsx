import { useState, useEffect } from 'react';
import { WifiOff, Wifi, Cloud, CloudOff, RefreshCw, CheckCircle2, AlertCircle, X } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import syncService, { addSyncListener, addOnlineListener, syncAll } from '../lib/offlineSync';
import { getQueueCount, getAllStampOperations } from '../lib/offlineDB';

const OfflineIndicator = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [queueCount, setQueueCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [operations, setOperations] = useState([]);
  const [lastSync, setLastSync] = useState(null);

  useEffect(() => {
    // Update queue count
    const updateQueueCount = async () => {
      const count = await getQueueCount();
      setQueueCount(count);
    };

    // Load operations
    const loadOperations = async () => {
      const ops = await getAllStampOperations();
      setOperations(ops);
    };

    updateQueueCount();
    loadOperations();

    // Listen for online status changes
    const unsubOnline = addOnlineListener((online) => {
      setIsOnline(online);
    });

    // Listen for sync events
    const unsubSync = addSyncListener((event) => {
      switch (event.type) {
        case 'sync_started':
          setIsSyncing(true);
          break;
        case 'sync_completed':
          setIsSyncing(false);
          setLastSync(new Date());
          updateQueueCount();
          loadOperations();
          break;
        case 'operation_completed':
        case 'operation_failed':
          updateQueueCount();
          loadOperations();
          break;
        default:
          break;
      }
    });

    // Periodic queue count update
    const interval = setInterval(updateQueueCount, 5000);

    return () => {
      unsubOnline();
      unsubSync();
      clearInterval(interval);
    };
  }, []);

  const handleSync = async () => {
    if (!isOnline || isSyncing) return;
    await syncAll();
  };

  // Don't show if online and no queued items
  if (isOnline && queueCount === 0) {
    return null;
  }

  return (
    <>
      {/* Floating indicator */}
      <div 
        className={`fixed bottom-20 left-4 z-40 animate-slideUp cursor-pointer ${showDetails ? 'hidden' : ''}`}
        onClick={() => setShowDetails(true)}
      >
        <div className={`flex items-center gap-2 px-4 py-2.5 rounded-full shadow-lg transition-all ${
          isOnline 
            ? 'bg-emerald-500/90 backdrop-blur-sm' 
            : 'bg-amber-500/90 backdrop-blur-sm'
        }`}>
          {isOnline ? (
            <>
              <Wifi className="w-4 h-4 text-white" />
              {queueCount > 0 && (
                <>
                  <span className="text-white text-sm font-medium">
                    {isSyncing ? 'Syncing...' : `${queueCount} pending`}
                  </span>
                  {isSyncing && <RefreshCw className="w-4 h-4 text-white animate-spin" />}
                </>
              )}
            </>
          ) : (
            <>
              <WifiOff className="w-4 h-4 text-white" />
              <span className="text-white text-sm font-medium">Offline Mode</span>
              {queueCount > 0 && (
                <Badge className="bg-white/20 text-white border-0 text-xs">
                  {queueCount}
                </Badge>
              )}
            </>
          )}
        </div>
      </div>

      {/* Details Panel */}
      {showDetails && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-gray-900 rounded-2xl border border-white/10 shadow-2xl overflow-hidden animate-slideUp">
            {/* Header */}
            <div className={`p-4 flex items-center justify-between ${
              isOnline ? 'bg-emerald-500/20' : 'bg-amber-500/20'
            }`}>
              <div className="flex items-center gap-3">
                {isOnline ? (
                  <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center">
                    <Wifi className="w-5 h-5 text-white" />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-full bg-amber-500 flex items-center justify-center">
                    <WifiOff className="w-5 h-5 text-white" />
                  </div>
                )}
                <div>
                  <h3 className="text-white font-semibold">
                    {isOnline ? 'Online' : 'Offline Mode'}
                  </h3>
                  <p className="text-white/60 text-sm">
                    {isOnline 
                      ? queueCount > 0 ? `${queueCount} items to sync` : 'All synced'
                      : 'Documents will sync when online'
                    }
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setShowDetails(false)}
                className="p-2 rounded-full hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5 text-white/60" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4 max-h-[400px] overflow-y-auto">
              {/* Sync Button */}
              {isOnline && queueCount > 0 && (
                <Button
                  onClick={handleSync}
                  disabled={isSyncing}
                  className="w-full bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl h-11"
                >
                  {isSyncing ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Syncing...
                    </>
                  ) : (
                    <>
                      <Cloud className="w-4 h-4 mr-2" />
                      Sync Now
                    </>
                  )}
                </Button>
              )}

              {/* Queued Operations */}
              {operations.length > 0 ? (
                <div className="space-y-2">
                  <h4 className="text-white/60 text-xs uppercase tracking-wider">Queued Documents</h4>
                  {operations.map((op) => (
                    <div 
                      key={op.id}
                      className="p-3 bg-white/5 rounded-xl border border-white/10"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-medium truncate">{op.document_name}</p>
                          <p className="text-white/40 text-xs mt-0.5">
                            {new Date(op.created_at).toLocaleString()}
                          </p>
                        </div>
                        <StatusBadge status={op.status} />
                      </div>
                      {op.error && (
                        <p className="text-red-400 text-xs mt-2 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          {op.error}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <CloudOff className="w-12 h-12 text-white/20 mx-auto mb-3" />
                  <p className="text-white/40">No queued documents</p>
                  <p className="text-white/30 text-sm mt-1">
                    Documents stamped offline will appear here
                  </p>
                </div>
              )}

              {/* Last Sync Time */}
              {lastSync && (
                <p className="text-center text-white/30 text-xs">
                  Last synced: {lastSync.toLocaleTimeString()}
                </p>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-white/10 bg-white/5">
              <div className="flex items-center justify-center gap-4 text-xs text-white/40">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>Online</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-amber-500" />
                  <span>Pending</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                  <span>Failed</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-slideUp {
          animation: slideUp 0.3s ease-out;
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
      `}</style>
    </>
  );
};

// Status Badge Component
const StatusBadge = ({ status }) => {
  const config = {
    pending: { color: 'bg-amber-500/20 text-amber-400 border-amber-500/30', icon: CloudOff },
    syncing: { color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: RefreshCw },
    completed: { color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', icon: CheckCircle2 },
    failed: { color: 'bg-red-500/20 text-red-400 border-red-500/30', icon: AlertCircle }
  };

  const { color, icon: Icon } = config[status] || config.pending;

  return (
    <Badge className={`${color} text-xs capitalize flex items-center gap-1`}>
      <Icon className={`w-3 h-3 ${status === 'syncing' ? 'animate-spin' : ''}`} />
      {status}
    </Badge>
  );
};

export default OfflineIndicator;
