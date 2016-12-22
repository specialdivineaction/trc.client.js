/**
 * A simplified single-purpose custom event emitter concept borrowed from Angular 2.
 * Unlike the EventEmitter class from Angular 2, this event emitter is solely synchronous.
 *
 * @see https://angular.io/docs/ts/latest/api/core/index/EventEmitter-class.html
 */
export class EventEmitter<T> {
  listeners: ((value?: T) => void)[] = [];

  /**
   * Notify listeners of an event
   *
   * @param {T} value Event notification value
   */
  emit(value?: T) {
    this.listeners.forEach(listener => listener(value));
  }

  /**
   * Adds a listener for this event.
   *
   * @param {T} fn event callback
   * @return {Function} unregistration function
   */
  subscribe(fn: (value?: T) => void): () => void {
    this.listeners.push(fn);

    return () => {
      const ix = this.listeners.indexOf(fn);
      if (ix >= 0) {
        this.listeners.splice(ix, 1);
      }
    };
  }
}
