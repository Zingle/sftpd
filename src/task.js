import {EventEmitter} from "events";

export default function task(task, interval=60000) {
  let started = false;
  let running = false;
  let draining = false;
  let timeout = false;

  const controller = {
    start, stop,
    get started() { return started; },
    get running() { return running; },
    get draining() { return draining; }
  };

  Object.setPrototypeOf(controller, EventEmitter.prototype);
  EventEmitter.call(controller);

  return controller;

  function start() {
    if (started) {
      return false;
    } else {
      timeout = setTimeout(run, 0);
      started = true;
      return true;
    }
  };

  function stop() {
    if (started) {
      if (timeout) {
        clearTimeout(timeout);
        timeout = false;
      }

      if (running) {
        draining = true;
      }

      started = false;
      return true;
    } else {
      return false;
    }
  }

  async function run() {
    timeout = false;
    running = true;

    try {
      await task();
    } catch (err) {
      controller.emit("error", err);
    }

    running = false;
    draining = false;

    if (started) {
      timeout = setTimeout(run, interval);
    }
  }
}
