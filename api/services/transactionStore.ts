// Store for transaction hashes and errors
const transactionStore = new Map<string, { hash?: string; error?: string }>();

export const logTransactionStore = (operation: string, requestId: string, data?: any) => {
    console.log(`[STORE] [${new Date().toISOString()}] ${operation} for request ${requestId}:`, data);
    console.log(`[STORE] [${new Date().toISOString()}] Current store size: ${transactionStore.size}`);
    console.log(`[STORE] [${new Date().toISOString()}] Store keys:`, Array.from(transactionStore.keys()));
    console.log(`[STORE] [${new Date().toISOString()}] Store contents:`, Array.from(transactionStore.entries()));
};

export const storeTransaction = (requestId: string, data: { hash?: string; error?: string }) => {
    console.log(`[STORE] [${new Date().toISOString()}] Storing transaction data for ${requestId}:`, data);
    transactionStore.set(requestId, data);
    logTransactionStore("Store operation", requestId, data);
};

export const getTransaction = (requestId: string) => {
    return transactionStore.get(requestId);
};
