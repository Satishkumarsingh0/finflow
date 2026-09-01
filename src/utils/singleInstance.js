/**
 * Single Instance / Standalone Tab Synchronizer
 * Uses BroadcastChannel (with localStorage fallback) to detect and manage
 * single active tab / window mode.
 */
class SingleInstanceManager {
  constructor() {
    this.tabId = 'tab_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now();
    this.channelName = 'finflow_app_single_instance';
    this.channel = null;
    this.listeners = new Set();
    this.isPrimary = true;
    this.init();
  }

  init() {
    if (typeof window === 'undefined') return;

    if ('BroadcastChannel' in window) {
      try {
        this.channel = new BroadcastChannel(this.channelName);
        this.channel.onmessage = (event) => this.handleMessage(event.data);
      } catch (e) {
        console.warn('BroadcastChannel error, falling back to storage listener', e);
      }
    }

    window.addEventListener('storage', (e) => {
      if (e.key === this.channelName && e.newValue) {
        try {
          const data = JSON.parse(e.newValue);
          this.handleMessage(data);
        } catch {}
      }
    });

    // Announce new instance arrival
    this.broadcast({ type: 'INSTANCE_OPENED', tabId: this.tabId, timestamp: Date.now() });

    // Clean up when window unloads
    window.addEventListener('beforeunload', () => {
      this.broadcast({ type: 'INSTANCE_CLOSED', tabId: this.tabId });
    });
  }

  broadcast(data) {
    if (this.channel) {
      this.channel.postMessage(data);
    }
    try {
      localStorage.setItem(this.channelName, JSON.stringify({ ...data, _ts: Date.now() }));
    } catch {}
  }

  handleMessage(data) {
    if (!data || data.tabId === this.tabId) return;

    if (data.type === 'INSTANCE_OPENED') {
      // Notify current instance that another tab was opened
      this.notifyListeners({ type: 'DUPLICATE_OPENED', remoteTabId: data.tabId });
    } else if (data.type === 'CLAIM_PRIMARY') {
      this.isPrimary = false;
      this.notifyListeners({ type: 'LOST_PRIMARY', primaryTabId: data.tabId });
    }
  }

  claimPrimary() {
    this.isPrimary = true;
    this.broadcast({ type: 'CLAIM_PRIMARY', tabId: this.tabId, timestamp: Date.now() });
  }

  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  notifyListeners(event) {
    this.listeners.forEach((cb) => cb(event));
  }
}

export const singleInstance = new SingleInstanceManager();
