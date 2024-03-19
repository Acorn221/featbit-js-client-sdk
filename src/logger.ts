// ! Debug mode is set here, it should probably be moved
const debug = false;

export const logger = {
  logDebug(...args) {
    if (debug) {
      console.log(...args);
    }
  },

  log(...args) {
    console.log(...args);
  },
};
