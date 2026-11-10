export function createWorkerRunnerShutdown({
  worker,
  closeWorker,
  closeQueue,
  closePool,
  exit,
}) {
  let shutdownPromise;

  return (signal) => {
    if (shutdownPromise) {
      return shutdownPromise;
    }

    shutdownPromise = (async () => {
      console.log(
        `[Execution Worker] Received ${signal}. Shutting down gracefully...`,
      );
      const errors = [];
      const attemptCleanup = async (cleanup) => {
        try {
          await cleanup();
        } catch (error) {
          errors.push(error);
        }
      };

      await attemptCleanup(() => closeWorker(worker));
      await attemptCleanup(closeQueue);
      await attemptCleanup(closePool);

      if (errors.length > 0) {
        const error = new AggregateError(
          errors,
          `Worker shutdown failed after ${signal}.`,
        );
        console.error("[Execution Worker] Error during shutdown:", error);
        exit(1);
      } else {
        console.log("[Execution Worker] Shutdown complete.");
        exit(0);
      }
    })();

    return shutdownPromise;
  };
}
