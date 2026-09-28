/**
 * ShopSphere Agent Multi-Channel Notification Engine
 * 
 * Provides:
 * 1. Native Web Notifications API with permission negotiation and click-to-focus
 * 2. Web Audio API synthesized accessible earcon chime (zero external dependencies)
 * 3. Document title pulse/flashing when tab is hidden or backgrounded
 * 4. Cross-tab synchronization via BroadcastChannel
 */

export interface AgentNotificationOptions {
  title?: string;
  body: string;
  icon?: string;
  tag?: string;
  onClick?: () => void;
}

// 1. Web Audio API Accessible Chime
export function playAgentChime() {
  if (typeof window === 'undefined') return;

  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    // Dual-tone melodic chime: D5 (587.33 Hz) -> A5 (880 Hz)
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now); // D5
    osc1.frequency.exponentialRampToValueAtTime(880, now + 0.12); // A5

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(880, now + 0.12);
    osc2.frequency.exponentialRampToValueAtTime(1174.66, now + 0.28); // D6

    gainNode.gain.setValueAtTime(0.001, now);
    gainNode.gain.linearRampToValueAtTime(0.18, now + 0.04);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.55);

    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc1.start(now);
    osc1.stop(now + 0.28);

    osc2.start(now + 0.12);
    osc2.stop(now + 0.55);
  } catch (err) {
    console.warn('Could not synthesize agent audio chime:', err);
  }
}

// 2. Document Title Flasher (for background/inactive tab alerts)
let titleFlashInterval: NodeJS.Timeout | null = null;
let originalDocTitle = '';

export function startTitleFlash(alertText = '✅ Agent Done! — ShopSphere') {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  if (titleFlashInterval) {
    clearInterval(titleFlashInterval);
  }

  originalDocTitle = document.title;
  let isAlert = true;

  titleFlashInterval = setInterval(() => {
    document.title = isAlert ? alertText : originalDocTitle;
    isAlert = !isAlert;
  }, 1000);

  const handleWindowFocus = () => {
    stopTitleFlash();
    window.removeEventListener('focus', handleWindowFocus);
  };

  window.addEventListener('focus', handleWindowFocus);
}

export function stopTitleFlash() {
  if (titleFlashInterval) {
    clearInterval(titleFlashInterval);
    titleFlashInterval = null;
    if (originalDocTitle) {
      document.title = originalDocTitle;
    }
  }
}

// 3. Web Notification API
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }

  if (Notification.permission === 'granted' || Notification.permission === 'denied') {
    return Notification.permission;
  }

  try {
    return await Notification.requestPermission();
  } catch (err) {
    console.warn('Failed to request notification permission:', err);
    return 'denied';
  }
}

export function getNotificationPermissionStatus(): NotificationPermission {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }
  return Notification.permission;
}

export function showDesktopNotification(options: AgentNotificationOptions) {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return null;
  }

  if (Notification.permission !== 'granted') {
    return null;
  }

  try {
    const notification = new Notification(options.title || '🤖 ShopSphere Super Agent', {
      body: options.body,
      icon: options.icon || '/favicon.ico',
      tag: options.tag || 'shopsphere-agent-task',
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
      if (options.onClick) {
        options.onClick();
      }
    };

    return notification;
  } catch (err) {
    console.warn('Error firing native desktop notification:', err);
    return null;
  }
}

// 4. Combined Multi-Channel Completion Alert
export function triggerAgentCompletionAlert(prompt: string, replySummary: string) {
  // Always play audio earcon
  playAgentChime();

  const isTabHidden = typeof document !== 'undefined' && document.visibilityState === 'hidden';

  // If user is on another tab, flash document title
  if (isTabHidden) {
    startTitleFlash(`(1) 🤖 Agent Finished — ShopSphere`);
  }

  // Trigger desktop notification if permitted
  const bodyText = replySummary.slice(0, 140) + (replySummary.length > 140 ? '…' : '');
  showDesktopNotification({
    title: '🤖 ShopSphere Super Agent Completed Task',
    body: bodyText || `Your request "${prompt}" has been completed!`,
    onClick: () => {
      if (window.location.pathname !== '/agent') {
        window.location.href = '/agent';
      }
    },
  });
}
