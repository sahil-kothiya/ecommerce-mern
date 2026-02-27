const isTestEnv =
  (typeof process !== "undefined" && process.env?.NODE_ENV === "test") ||
  (typeof import.meta !== "undefined" && import.meta.env?.MODE === "test");

const isProd =
  typeof import.meta !== "undefined" && import.meta.env?.PROD === true;

const noop = () => {};

const logger = {
  info: isProd || isTestEnv ? noop : (...args) => console.info(...args),
  warn: isProd || isTestEnv ? noop : (...args) => console.warn(...args),
  error: isTestEnv ? noop : (...args) => console.error(...args),
  debug: isProd || isTestEnv ? noop : (...args) => console.debug(...args),
};

export { logger };
export default logger;
