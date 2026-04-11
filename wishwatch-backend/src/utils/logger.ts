const timestamp = () => new Date().toISOString();

export const logger = {
  info: (msg: string, meta?: unknown) =>
    console.log(`[${timestamp()}] INFO  ${msg}`, meta ? JSON.stringify(meta) : ""),
  warn: (msg: string, meta?: unknown) =>
    console.warn(`[${timestamp()}] WARN  ${msg}`, meta ? JSON.stringify(meta) : ""),
  error: (msg: string, err?: unknown) =>
    console.error(`[${timestamp()}] ERROR ${msg}`, err instanceof Error ? err.message : err),
  debug: (msg: string, meta?: unknown) => {
    if (process.env.NODE_ENV === "development") {
      console.debug(`[${timestamp()}] DEBUG ${msg}`, meta ? JSON.stringify(meta) : "");
    }
  },
};
