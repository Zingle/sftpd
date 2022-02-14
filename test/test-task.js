import expect from "expect.js";
import {Task} from "@zingle/sftpd";

describe("Task", () => {
  const delay = 100;
  let task;

  beforeEach(() => {
    task = new Task(noop, delay);
  });

  afterEach(() => {
    task.stop();
  });

  describe("constructor(task, [delay])", () => {
    it("should initialize task", () => {
      expect(task.task).to.be(noop);
      expect(task.delay).to.be(delay);
      expect(task.started).to.be(false);
      expect(task.running).to.be(false);
      expect(task.draining).to.be(false);
    });
  });

  describe(".start()", () => {
    it("should return true if task just started", () => {
      expect(task.start()).to.be(true);
    });

    it("should return false if task already started", () => {
      task.start();
      expect(task.start()).to.be(false);
    });

    it("should run task repeatedly", async () => {
      let runs = 0;

      task = new Task(task, 5);
      task.start();

      await new Promise(go => setTimeout(go, 25));
      task.stop();
      expect(runs).to.be.greaterThan(2);

      async function task() {
        await new Promise(go => setTimeout(go, 0));
        runs++;
      }
    });
  });

  describe(".stop()", () => {
    it("should return false if task already stopped", () => {
      expect(task.stop()).to.be(false);
    });

    it("should return true if task just stopped", () => {
      task.start();
      expect(task.stop()).to.be(true);
    });

    it("should stop running task", async () => {
      let runs = 0;

      task = new Task(task, 5);
      task.start();

      await new Promise(go => setTimeout(go, 10));
      task.stop();
      const ran = runs;

      await new Promise(go => setTimeout(go, 10));
      expect(runs).to.be(ran);

      async function task() {
        runs++;
      }
    });
  });

  describe(".started", () => {
    it("should be true when task has been started", () => {
      expect(task.started).to.be(false);

      task.start();
      expect(task.started).to.be(true);

      task.stop();
      expect(task.started).to.be(false);
    });
  });

  describe(".running", () => {
    it("should be true when task is running", async () => {
      const enter = synch();
      const exit = synch();

      // running is false immediately after starting task
      task = new Task(task, delay);
      task.start();
      expect(task.running).to.be(false);

      // once task is entered, running is true
      await enter.wait();
      expect(task.running).to.be(true);

      // after task exits, running is false
      await exit.wait();
      expect(task.running).to.be(false);

      task.stop();

      async function task() {
        enter.release();
        await new Promise(go => setTimeout(go, 0));
        exit.release();
      }
    });
  });

  describe(".draining", () => {
    it("should be true when task is stopped, but still running", async () => {
      const enter = synch();
      const exit = synch();

      // draining is false after starting a task
      task = new Task(task, delay);
      task.start();
      expect(task.draining).to.be(false);

      // draining is false after task begins running
      await enter.wait();
      expect(task.draining).to.be(false);

      // draining is true after stopping running task
      task.stop();
      expect(task.draining).to.be(true);

      // draining is false after task runs
      exit.release();
      expect(task.draining).to.be(true);

      async function task() {
        enter.release();
        await exit.wait();
      }
    });
  });

  async function noop() {
    await new Promise(go => setTimeout(go, 0));
  }

  function release(sync) {
    return async function release() {
      sync.release();
      await new Promise(go => setTimeout(go, 0));
    }
  }

  function wait(sync) {
    return async function wait() {
      await sync.wait();
    }
  }
});

function synch() {
  let release;

  const promise = new Promise((resolve, reject) => {
    release = resolve;
  });

  return {
    async wait() { return promise; },
    release() { release(); }
  }
}
