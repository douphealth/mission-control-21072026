let lastCapturedError: unknown;

export function consumeLastCapturedError() {
  const error = lastCapturedError;
  lastCapturedError = undefined;
  return error;
}

const originalConsoleError = console.error.bind(console);

console.error = (...args: unknown[]) => {
  lastCapturedError = args[0];
  originalConsoleError(...args);
};