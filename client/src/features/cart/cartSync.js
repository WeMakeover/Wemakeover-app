let syncInFlight = 0;

export const beginCartSync = () => {
  syncInFlight += 1;
};

export const endCartSync = () => {
  syncInFlight = Math.max(0, syncInFlight - 1);
};

export const isCartSyncInProgress = () => syncInFlight > 0;
