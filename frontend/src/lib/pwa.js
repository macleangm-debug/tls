// PWA Service Worker Registration and Push Notification utilities

const VAPID_PUBLIC_KEY = process.env.REACT_APP_VAPID_PUBLIC_KEY || '';

// Check if service workers are supported
export const isPWASupported = () => {
  return 'serviceWorker' in navigator;
};

// Check if push notifications are supported
export const isPushSupported = () => {
  return 'PushManager' in window;
};

// Register the service worker
export const registerServiceWorker = async () => {
  if (!isPWASupported()) {
    console.log('Service workers not supported');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/'
    });
    
    console.log('Service Worker registered:', registration.scope);
    
    // Check for updates
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      console.log('Service Worker update found');
      
      newWorker?.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          // New version available
          console.log('New version available');
          dispatchEvent(new CustomEvent('sw-update-available'));
        }
      });
    });

    return registration;
  } catch (error) {
    console.error('Service Worker registration failed:', error);
    return null;
  }
};

// Unregister service worker
export const unregisterServiceWorker = async () => {
  if (!isPWASupported()) return false;

  try {
    const registration = await navigator.serviceWorker.ready;
    const result = await registration.unregister();
    console.log('Service Worker unregistered:', result);
    return result;
  } catch (error) {
    console.error('Service Worker unregister failed:', error);
    return false;
  }
};

// Request notification permission
export const requestNotificationPermission = async () => {
  if (!('Notification' in window)) {
    console.log('Notifications not supported');
    return 'denied';
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission;
  }

  return Notification.permission;
};

// Get current notification permission
export const getNotificationPermission = () => {
  if (!('Notification' in window)) return 'denied';
  return Notification.permission;
};

// Subscribe to push notifications
export const subscribeToPush = async (registration) => {
  if (!isPushSupported()) {
    console.log('Push notifications not supported');
    return null;
  }

  try {
    // Check for existing subscription
    let subscription = await registration.pushManager.getSubscription();
    
    if (subscription) {
      console.log('Already subscribed to push');
      return subscription;
    }

    // Subscribe with VAPID key
    const options = {
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
    };

    subscription = await registration.pushManager.subscribe(options);
    console.log('Push subscription:', subscription);
    
    return subscription;
  } catch (error) {
    console.error('Push subscription failed:', error);
    return null;
  }
};

// Unsubscribe from push notifications
export const unsubscribeFromPush = async () => {
  if (!isPWASupported()) return false;

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    
    if (subscription) {
      await subscription.unsubscribe();
      console.log('Unsubscribed from push');
      return true;
    }
    return false;
  } catch (error) {
    console.error('Push unsubscribe failed:', error);
    return false;
  }
};

// Send subscription to server
export const sendSubscriptionToServer = async (subscription, userId) => {
  const API = process.env.REACT_APP_BACKEND_URL;
  
  try {
    const response = await fetch(`${API}/api/push/subscribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({
        subscription: subscription.toJSON(),
        user_id: userId
      })
    });
    
    if (!response.ok) throw new Error('Failed to save subscription');
    
    console.log('Subscription saved to server');
    return true;
  } catch (error) {
    console.error('Failed to send subscription to server:', error);
    return false;
  }
};

// Show local notification (for testing)
export const showLocalNotification = async (title, options = {}) => {
  const permission = await requestNotificationPermission();
  
  if (permission !== 'granted') {
    console.log('Notification permission not granted');
    return false;
  }

  if (!isPWASupported()) {
    // Fallback to basic notification
    new Notification(title, options);
    return true;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    await registration.showNotification(title, {
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-96x96.png',
      vibrate: [100, 50, 100],
      ...options
    });
    return true;
  } catch (error) {
    console.error('Failed to show notification:', error);
    return false;
  }
};

// Check if app is installed (standalone mode)
export const isAppInstalled = () => {
  // Check for standalone mode
  if (window.matchMedia('(display-mode: standalone)').matches) {
    return true;
  }
  // Check for iOS
  if (window.navigator.standalone === true) {
    return true;
  }
  return false;
};

// Listen for beforeinstallprompt event
let deferredPrompt = null;

export const initInstallPrompt = () => {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    dispatchEvent(new CustomEvent('pwa-install-available'));
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    console.log('PWA installed');
    dispatchEvent(new CustomEvent('pwa-installed'));
  });
};

// Trigger install prompt
export const promptInstall = async () => {
  if (!deferredPrompt) {
    console.log('Install prompt not available');
    return false;
  }

  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  console.log('Install prompt outcome:', outcome);
  
  deferredPrompt = null;
  return outcome === 'accepted';
};

// Check if install prompt is available
export const canInstall = () => {
  return deferredPrompt !== null;
};

// Utility: Convert base64 to Uint8Array (for VAPID key)
function urlBase64ToUint8Array(base64String) {
  if (!base64String) return new Uint8Array();
  
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Initialize PWA on app load
export const initPWA = async () => {
  // Register service worker
  const registration = await registerServiceWorker();
  
  // Initialize install prompt listener
  initInstallPrompt();
  
  // Return registration for further use
  return registration;
};

export default {
  isPWASupported,
  isPushSupported,
  registerServiceWorker,
  unregisterServiceWorker,
  requestNotificationPermission,
  getNotificationPermission,
  subscribeToPush,
  unsubscribeFromPush,
  sendSubscriptionToServer,
  showLocalNotification,
  isAppInstalled,
  initInstallPrompt,
  promptInstall,
  canInstall,
  initPWA
};
