/**
 * Restaurant Events - Simple event system for widget coordination
 * 
 * Enables loose coupling between restaurant widgets while maintaining
 * consistent state updates across the page.
 */

type EventCallback<T = any> = (data: T) => void;

interface RestaurantEvents {
  'rating:updated': { restaurantId: number | string; rating: number; userId: number };
  'list:changed': { restaurantId: number | string; listId: number; action: 'added' | 'removed' };
  'restaurant:saved': { restaurantId: number | string; saved: boolean };
  'circle:score:updated': { restaurantId: number | string; newScore: number; ratingsCount: number };
}

class EventEmitter {
  private listeners: Map<string, EventCallback[]> = new Map();

  on<K extends keyof RestaurantEvents>(event: K, callback: EventCallback<RestaurantEvents[K]>) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);

    // Return unsubscribe function
    return () => {
      const callbacks = this.listeners.get(event);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
      }
    };
  }

  emit<K extends keyof RestaurantEvents>(event: K, data: RestaurantEvents[K]) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Event callback error for ${event}:`, error);
        }
      });
    }
  }

  off(event: keyof RestaurantEvents, callback?: EventCallback) {
    if (!callback) {
      // Remove all listeners for event
      this.listeners.delete(event);
      return;
    }

    const callbacks = this.listeners.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  removeAllListeners() {
    this.listeners.clear();
  }
}

// Global event emitter instance
export const restaurantEvents = new EventEmitter();

/**
 * React hook for subscribing to restaurant events
 */
export function useRestaurantEvents<K extends keyof RestaurantEvents>(
  event: K,
  callback: EventCallback<RestaurantEvents[K]>,
  deps: React.DependencyList = []
) {
  React.useEffect(() => {
    const unsubscribe = restaurantEvents.on(event, callback);
    return unsubscribe;
  }, deps);
}

/**
 * Helper functions for common event patterns
 */
export const RestaurantEventHelpers = {
  /**
   * Emit rating update and trigger coordinated cache invalidation
   */
  notifyRatingUpdate: (restaurantId: number | string, rating: number, userId: number) => {
    restaurantEvents.emit('rating:updated', { restaurantId, rating, userId });
    
    // Also emit circle score update if we can calculate it
    // This would need to be enhanced with actual score calculation
    restaurantEvents.emit('circle:score:updated', { 
      restaurantId, 
      newScore: rating * 10, // Convert to 10-point for consistency
      ratingsCount: 1 // This would need actual count from API
    });
  },

  /**
   * Emit list change and coordinate related updates
   */
  notifyListChange: (restaurantId: number | string, listId: number, action: 'added' | 'removed') => {
    restaurantEvents.emit('list:changed', { restaurantId, listId, action });
  },

  /**
   * Emit restaurant save status change
   */
  notifyRestaurantSaved: (restaurantId: number | string, saved: boolean) => {
    restaurantEvents.emit('restaurant:saved', { restaurantId, saved });
  }
};