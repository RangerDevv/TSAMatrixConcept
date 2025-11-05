// Offline capability utilities
export class OfflineManager {
  private static instance: OfflineManager;
  private isOnline: boolean = navigator.onLine;
  private onlineCallbacks: (() => void)[] = [];
  private offlineCallbacks: (() => void)[] = [];

  private constructor() {
    this.setupEventListeners();
  }

  static getInstance(): OfflineManager {
    if (!OfflineManager.instance) {
      OfflineManager.instance = new OfflineManager();
    }
    return OfflineManager.instance;
  }

  private setupEventListeners() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.onlineCallbacks.forEach(callback => callback());
      this.showConnectionStatus('online');
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.offlineCallbacks.forEach(callback => callback());
      this.showConnectionStatus('offline');
    });
  }

  private showConnectionStatus(status: 'online' | 'offline') {
    // Create or update connection status indicator
    let indicator = document.getElementById('connection-status');
    
    if (!indicator) {
      indicator = document.createElement('div');
      indicator.id = 'connection-status';
      indicator.style.cssText = `
        position: fixed;
        top: 10px;
        right: 10px;
        padding: 8px 16px;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 600;
        z-index: 9999;
        transition: all 0.3s ease;
        box-shadow: 0 2px 8px rgba(0,0,0,0.15);
      `;
      document.body.appendChild(indicator);
    }

    if (status === 'online') {
      indicator.textContent = '🟢 Back online';
      indicator.style.backgroundColor = '#10b981';
      indicator.style.color = 'white';
      
      // Hide after 3 seconds
      setTimeout(() => {
        indicator!.style.opacity = '0';
        setTimeout(() => indicator!.remove(), 300);
      }, 3000);
    } else {
      indicator.textContent = '🔴 Offline mode';
      indicator.style.backgroundColor = '#ef4444';
      indicator.style.color = 'white';
      indicator.style.opacity = '1';
    }
  }

  public getOnlineStatus(): boolean {
    return this.isOnline;
  }

  public onOnline(callback: () => void) {
    this.onlineCallbacks.push(callback);
  }

  public onOffline(callback: () => void) {
    this.offlineCallbacks.push(callback);
  }

  // Store data for offline access
  public async storeOfflineData(key: string, data: any): Promise<void> {
    try {
      const timestamp = Date.now();
      const offlineData = {
        data,
        timestamp,
        version: 1
      };
      localStorage.setItem(`offline_${key}`, JSON.stringify(offlineData));
    } catch (error) {
      console.warn('Failed to store offline data:', error);
    }
  }

  // Retrieve offline data
  public getOfflineData(key: string): any | null {
    try {
      const stored = localStorage.getItem(`offline_${key}`);
      if (!stored) return null;

      const offlineData = JSON.parse(stored);
      
      // Check if data is not too old (24 hours)
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
      if (Date.now() - offlineData.timestamp > maxAge) {
        localStorage.removeItem(`offline_${key}`);
        return null;
      }

      return offlineData.data;
    } catch (error) {
      console.warn('Failed to retrieve offline data:', error);
      return null;
    }
  }

  // Clear offline data
  public clearOfflineData(key?: string): void {
    if (key) {
      localStorage.removeItem(`offline_${key}`);
    } else {
      // Clear all offline data
      const keys = Object.keys(localStorage).filter(k => k.startsWith('offline_'));
      keys.forEach(k => localStorage.removeItem(k));
    }
  }

  // Enhanced fetch with offline fallback
  public async fetchWithOfflineFallback(url: string, options?: RequestInit, fallbackKey?: string): Promise<Response> {
    if (this.isOnline) {
      try {
        const response = await fetch(url, options);
        
        // Store successful responses for offline access
        if (response.ok && fallbackKey && options?.method !== 'POST') {
          const data = await response.clone().json().catch(() => null);
          if (data) {
            await this.storeOfflineData(fallbackKey, data);
          }
        }
        
        return response;
      } catch (error) {
        // Network error, try offline fallback
        if (fallbackKey) {
          const offlineData = this.getOfflineData(fallbackKey);
          if (offlineData) {
            return new Response(JSON.stringify(offlineData), {
              status: 200,
              headers: { 'Content-Type': 'application/json' }
            });
          }
        }
        throw error;
      }
    } else {
      // Offline mode
      if (fallbackKey) {
        const offlineData = this.getOfflineData(fallbackKey);
        if (offlineData) {
          return new Response(JSON.stringify(offlineData), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
        }
      }
      
      throw new Error('No offline data available');
    }
  }
}

// Service Worker registration utility
export async function registerServiceWorker(): Promise<void> {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('Service Worker registered:', registration);

      // Handle updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New content is available, prompt user to refresh
              showUpdateAvailable();
            }
          });
        }
      });

    } catch (error) {
      console.error('Service Worker registration failed:', error);
    }
  }
}

function showUpdateAvailable() {
  // Create update notification
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 20px;
    right: 20px;
    max-width: 400px;
    margin: 0 auto;
    background: #1f2937;
    color: white;
    padding: 16px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    z-index: 10000;
    display: flex;
    align-items: center;
    justify-content: space-between;
  `;
  
  notification.innerHTML = `
    <div>
      <div style="font-weight: 600; margin-bottom: 4px;">Update Available</div>
      <div style="font-size: 14px; opacity: 0.8;">A new version is available. Refresh to update.</div>
    </div>
    <button id="refresh-btn" style="
      background: #3b82f6;
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 6px;
      font-weight: 600;
      cursor: pointer;
      margin-left: 16px;
    ">Refresh</button>
  `;
  
  document.body.appendChild(notification);
  
  notification.querySelector('#refresh-btn')?.addEventListener('click', () => {
    window.location.reload();
  });
  
  // Auto-remove after 10 seconds
  setTimeout(() => {
    notification.remove();
  }, 10000);
}