import {EventEmitter} from "events";

export class Task extends EventEmitter {
  #state = {};

  constructor(task, delay=60000) {
    super();

    this.task = task;
    this.delay = delay;

    this.#state.cancel = false;
    this.#state.started = false;
    this.#state.running = false;
    this.#state.draining = false;
  }

  start() {
    const state = this.#state;
    const {task, delay} = this;

    if (state.started) {
      return false;
    } else {
      state.started = true;
      state.draining = false;
      state.cancel = setTimeout(runtask, 0);
      return true;
    }

    async function runtask() {
      // task is now running and un-cancellable
      state.running = true;
      state.cancel = false;

      try {
        await task();
      } catch (err) {
        this.emit("error", err);
      } finally {
        state.running = false;
        state.draining = false;
      }

      // if task is still active, schedule the next run
      if (state.started) {
        state.cancel = setTimeout(runtask, delay);
      }
    }
  }

  stop() {
    const state = this.#state;

    if (state.started) {
      state.started = false;

      // cancel the next run if possible
      if (state.cancel) {
        clearTimeout(state.cancel);
        state.cancel = false;
      } else {
        state.draining = true;
      }

      return true;
    } else {
      return false;
    }
  }

  get draining() { return this.#state.draining; }
  get running() { return this.#state.running; }
  get started() { return this.#state.started; }
}
