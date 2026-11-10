function closeHttpServer(server) {
  if (!server.listening) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });
}

export function createGracefulShutdown({
  server,
  getScheduledTasks,
  getWorker,
  closeWorker,
  closeQueue,
  closeRateLimitRedis,
  closePool,
}) {
  let shutdownPromise;

  return (signal) => {
    if (shutdownPromise) {
      return shutdownPromise;
    }

    shutdownPromise = (async () => {
      const errors = [];
      const attemptCleanup = async (cleanup) => {
        try {
          await cleanup();
        } catch (error) {
          errors.push(error);
        }
      };

      await attemptCleanup(() => closeHttpServer(server));

      for (const task of getScheduledTasks()) {
        if (task) {
          await attemptCleanup(() => task.destroy());
        }
      }

      const worker = getWorker();
      if (worker) {
        await attemptCleanup(() => closeWorker(worker));
      }

      await attemptCleanup(closeQueue);
      await attemptCleanup(closeRateLimitRedis);
      await attemptCleanup(closePool);

      if (errors.length > 0) {
        throw new AggregateError(errors, `Shutdown failed after ${signal}.`);
      }
    })();

    return shutdownPromise;
  };
}

export function registerShutdownSignals(shutdown, signalSource = process) {
  const handleShutdownSignal = (signal) => {
    console.log(`[Server] Received ${signal}. Shutting down gracefully...`);
    shutdown(signal)
      .then(() => {
        console.log("[Server] Shutdown complete.");
      })
      .catch((error) => {
        console.error("[Server] Error during shutdown:", error);
        process.exitCode = 1;
      });
  };
  const handleSigterm = () => handleShutdownSignal("SIGTERM");
  const handleSigint = () => handleShutdownSignal("SIGINT");

  signalSource.on("SIGTERM", handleSigterm);
  signalSource.on("SIGINT", handleSigint);
}
