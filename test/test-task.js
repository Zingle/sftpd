import expect from "expect.js";
import sinon from "sinon";
import {task as Task} from "@zingle/sftpd";

describe("task", () => {
  let task, runs;

  beforeEach(() => {
    runs = 0;
    task = Task(async function() {
      await new Promise(go => setTimeout(go, 0));
      runs++;
    }, 10);
  });

  describe("(task, [interval])", () => {
    it("should initialize status flags", () => {
      expect(task.started).to.be(false);
      expect(task.running).to.be(false);
      expect(task.draining).to.be(false);
    });
  });

  describe(".start()", () => {
    it("should run task in loop", async () => {
      return new Promise((resolve, reject) => {
        task = Task(resolveOnThirdRun, 10);
        task.start();

        async function resolveOnThirdRun() {
          if (runs++ >= 2) {
            task.stop();
            resolve();
          }
        }
      });
    });
  });

  describe(".stop()", () => {
    it("should stop task from running", async () => {
      const runsA = runs;

      // start, then wait for task to run
      task.start();
      await new Promise(go => setTimeout(go, 10));

      // now stop, then wait for task to drain
      task.stop();
      await new Promise(go => setTimeout(go, 10));

      const runsB = runs;
      expect(runsB).to.be.greaterThan(runsA);

      // inject artificial wait, then check value again
      await new Promise(go => setTimeout(go, 10));
      const runsC = runs;
      expect(runsC).to.be(runsB);
    });
  });

  describe(".started", () => {
    it("should be true if task has been started", () => {
      expect(task.started).to.be(false);
      task.start();
      expect(task.started).to.be(true);
      task.stop();
      expect(task.started).to.be(false);
    });
  });

  describe(".running", () => {
    it("should be true if task is currently running", () => {
      let done;

      task = Task(run, 15);
      task.start();
      expect(task.running).to.be(false);

      return new Promise(resolve => {
        done = function() {
          expect(task.running).to.be(false);
          resolve();
        };
      });

      async function run() {
        expect(task.running).to.be(true);
        task.stop();
        setTimeout(done, 0);
      }
    });
  });

  describe(".draining", () => {
    it("should be true if stopped but still running", () => {
      let done;

      task = Task(run, 15);
      task.start();
      expect(task.draining).to.be(false);

      return new Promise(resolve => {
        done = function() {
          expect(task.draining).to.be(false);
          resolve();
        };
      });

      async function run() {
        expect(task.draining).to.be(false);
        task.stop();
        expect(task.draining).to.be(true);
        setTimeout(done, 25);
      }
    });
  });
});
