const isTestEnv =
    (typeof process !== "undefined" && process.env?.NODE_ENV === "test") ||
    (typeof import.meta !== "undefined" && import.meta.env?.MODE === "test");

const noop = () => {};

const logger = {
    info: (...args) => (isTestEnv ? noop(...args) : console.info(...args)),
    warn: (...args) => (isTestEnv ? noop(...args) : console.warn(...args)),
    error: (...args) => (isTestEnv ? noop(...args) : console.error(...args)),
    debug: (...args) => (isTestEnv ? noop(...args) : console.debug(...args)),
};

export { logger };
export default logger;
