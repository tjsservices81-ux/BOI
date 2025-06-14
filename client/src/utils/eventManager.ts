/**
 * Centralized Event Manager
 * Handles component event listeners and ensures proper cleanup
 */

interface EventListenerConfig {
  element: EventTarget;
  event: string;
  handler: EventListener;
  options?: boolean | AddEventListenerOptions;
}

class EventManager {
  private listeners: Map<string, EventListenerConfig> = new Map();
  private componentListeners: Map<string, Set<string>> = new Map();

  // Add event listener with automatic cleanup tracking
  addEventListener(
    componentId: string,
    element: EventTarget,
    event: string,
    handler: EventListener,
    options?: boolean | AddEventListenerOptions
  ): string {
    const listenerId = `${componentId}_${event}_${Date.now()}`;
    
    const config: EventListenerConfig = {
      element,
      event,
      handler,
      options
    };

    // Store listener configuration
    this.listeners.set(listenerId, config);
    
    // Track by component
    if (!this.componentListeners.has(componentId)) {
      this.componentListeners.set(componentId, new Set());
    }
    this.componentListeners.get(componentId)!.add(listenerId);

    // Add the actual event listener
    element.addEventListener(event, handler, options);

    return listenerId;
  }

  // Remove specific event listener
  removeEventListener(listenerId: string): void {
    const config = this.listeners.get(listenerId);
    if (config) {
      config.element.removeEventListener(config.event, config.handler, config.options);
      this.listeners.delete(listenerId);
    }
  }

  // Remove all event listeners for a component
  removeComponentListeners(componentId: string): void {
    const componentListenerIds = this.componentListeners.get(componentId);
    if (componentListenerIds) {
      componentListenerIds.forEach(listenerId => {
        this.removeEventListener(listenerId);
      });
      this.componentListeners.delete(componentId);
    }
  }

  // Cleanup all listeners (useful for app shutdown)
  cleanup(): void {
    this.listeners.forEach((config, listenerId) => {
      this.removeEventListener(listenerId);
    });
    this.listeners.clear();
    this.componentListeners.clear();
  }

  // Get active listener count for debugging
  getListenerCount(): number {
    return this.listeners.size;
  }

  // Get listeners by component for debugging
  getComponentListenerCount(componentId: string): number {
    return this.componentListeners.get(componentId)?.size || 0;
  }
}

// Export singleton instance
export const eventManager = new EventManager();

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  eventManager.cleanup();
});