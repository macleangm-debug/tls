// Offline Sync Service - Handles syncing queued operations when back online

import {
  getPendingStampOperations,
  updateStampOperation,
  getDocument,
  base64ToFile,
  deleteStampOperation,
  cacheStamp
} from './offlineDB';

const API = process.env.REACT_APP_BACKEND_URL;

class OfflineSyncService {
  constructor() {
    this.isSyncing = false;
    this.syncListeners = new Set();
    this.onlineListeners = new Set();
    this.isOnline = navigator.onLine;
    
    // Listen for online/offline events
    window.addEventListener('online', this.handleOnline.bind(this));
    window.addEventListener('offline', this.handleOffline.bind(this));
  }

  // Add listener for sync events
  addSyncListener(callback) {
    this.syncListeners.add(callback);
    return () => this.syncListeners.delete(callback);
  }

  // Add listener for online status changes
  addOnlineListener(callback) {
    this.onlineListeners.add(callback);
    return () => this.onlineListeners.delete(callback);
  }

  // Notify listeners
  notifySyncListeners(event) {
    this.syncListeners.forEach(callback => callback(event));
  }

  notifyOnlineListeners(isOnline) {
    this.onlineListeners.forEach(callback => callback(isOnline));
  }

  handleOnline() {
    console.log('Network status: Online');
    this.isOnline = true;
    this.notifyOnlineListeners(true);
    
    // Auto-sync when back online
    this.syncAll();
  }

  handleOffline() {
    console.log('Network status: Offline');
    this.isOnline = false;
    this.notifyOnlineListeners(false);
  }

  // Check if online
  checkOnline() {
    return navigator.onLine;
  }

  // Get auth headers
  getAuthHeaders() {
    const token = localStorage.getItem('token');
    return {
      'Authorization': `Bearer ${token}`
    };
  }

  // Sync all pending operations
  async syncAll() {
    if (this.isSyncing || !this.checkOnline()) {
      return { synced: 0, failed: 0 };
    }

    this.isSyncing = true;
    this.notifySyncListeners({ type: 'sync_started' });

    const pending = await getPendingStampOperations();
    let synced = 0;
    let failed = 0;

    for (const operation of pending) {
      try {
        const result = await this.syncOperation(operation);
        if (result.success) {
          synced++;
        } else {
          failed++;
        }
      } catch (error) {
        console.error('Sync error for operation:', operation.id, error);
        failed++;
      }
    }

    this.isSyncing = false;
    this.notifySyncListeners({ 
      type: 'sync_completed', 
      synced, 
      failed,
      total: pending.length 
    });

    return { synced, failed };
  }

  // Sync a single operation
  async syncOperation(operation) {
    // Update status to syncing
    await updateStampOperation(operation.id, {
      status: 'syncing',
      attempts: operation.attempts + 1,
      last_attempt: new Date().toISOString()
    });

    this.notifySyncListeners({
      type: 'operation_syncing',
      operationId: operation.id,
      documentName: operation.document_name
    });

    try {
      // Get the document from IndexedDB
      const doc = await getDocument(operation.document_id);
      if (!doc) {
        throw new Error('Document not found in offline storage');
      }

      // Convert back to File object
      const file = base64ToFile(doc.data, doc.name);

      // Create FormData for API request
      const formData = new FormData();
      formData.append('file', file);
      formData.append('document_name', operation.document_name);
      formData.append('document_type', operation.document_type);
      formData.append('description', operation.description || '');
      formData.append('recipient_name', operation.recipient_name || '');
      formData.append('recipient_org', operation.recipient_org || '');
      formData.append('stamp_shape', operation.stamp_shape);
      formData.append('stamp_type', operation.stamp_type);
      formData.append('stamp_layout', operation.stamp_layout || 'horizontal');
      formData.append('brand_color', operation.brand_color || '#059669');
      formData.append('include_signature', operation.include_signature || 'false');
      formData.append('show_signature_placeholder', operation.show_signature_placeholder || 'false');
      formData.append('pages_to_stamp', operation.pages_to_stamp || 'all');
      formData.append('positions', JSON.stringify(operation.positions));
      
      if (operation.page_dimensions) {
        formData.append('page_dimensions', JSON.stringify(operation.page_dimensions));
      }
      
      if (operation.signature_data) {
        formData.append('signature_data', operation.signature_data);
      }

      // Send to API
      const response = await fetch(`${API}/api/stamp-pdf/`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: formData
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Stamp request failed');
      }

      const result = await response.json();

      // Cache the stamp for offline verification
      if (result.stamp_id) {
        await cacheStamp({
          stamp_id: result.stamp_id,
          document_name: operation.document_name,
          document_type: operation.document_type,
          created_at: new Date().toISOString(),
          valid: true
        });
      }

      // Mark operation as completed
      await updateStampOperation(operation.id, {
        status: 'completed',
        result: {
          stamp_id: result.stamp_id,
          download_url: result.download_url
        }
      });

      this.notifySyncListeners({
        type: 'operation_completed',
        operationId: operation.id,
        stampId: result.stamp_id,
        documentName: operation.document_name
      });

      return { success: true, stampId: result.stamp_id };

    } catch (error) {
      console.error('Sync operation failed:', error);

      // Mark as failed after max attempts
      const maxAttempts = 3;
      const newStatus = operation.attempts + 1 >= maxAttempts ? 'failed' : 'pending';

      await updateStampOperation(operation.id, {
        status: newStatus,
        error: error.message
      });

      this.notifySyncListeners({
        type: 'operation_failed',
        operationId: operation.id,
        documentName: operation.document_name,
        error: error.message,
        willRetry: newStatus === 'pending'
      });

      return { success: false, error: error.message };
    }
  }

  // Retry a failed operation
  async retryOperation(operationId) {
    await updateStampOperation(operationId, {
      status: 'pending',
      error: null
    });
    
    return this.syncAll();
  }

  // Cancel an operation
  async cancelOperation(operationId) {
    await deleteStampOperation(operationId);
    this.notifySyncListeners({
      type: 'operation_cancelled',
      operationId
    });
  }
}

// Singleton instance
const syncService = new OfflineSyncService();

export default syncService;

// Export convenience functions
export const syncAll = () => syncService.syncAll();
export const syncOperation = (op) => syncService.syncOperation(op);
export const retryOperation = (id) => syncService.retryOperation(id);
export const cancelOperation = (id) => syncService.cancelOperation(id);
export const addSyncListener = (cb) => syncService.addSyncListener(cb);
export const addOnlineListener = (cb) => syncService.addOnlineListener(cb);
export const isOnline = () => syncService.checkOnline();
