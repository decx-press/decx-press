import { Contract, ethers, EventLog, Result } from "ethers";
import { ECIESService } from "./encryption/ECIESService";

/**
 * EncryptionPathEvent is the event for the EncryptionPathCreated event.
 */
interface EncryptionPathEvent {
    hash: string;
    components: string[];
    index: number;
}

/**
 * EncryptedContent is the content to be encrypted.
 */
interface EncryptedContent {
    hash: string;
    encryptedContent: Buffer;
}

/**
 * EncryptedDataStoredEventArgs is the event args for the EncryptedDataStored event.
 */
interface EncryptedDataStoredEventArgs extends Result {
    hash: string;
    encryptedPayload: Buffer;
}

/**
 * EncryptedDataStoredEvent is the event for the EncryptedDataStored event.
 */
type EncryptedDataStoredEvent = EventLog & {
    args: EncryptedDataStoredEventArgs;
};

/**
 * GasTracker interface for tracking gas usage
 */
interface GasTracker {
    totalGasUsed: bigint;
}

/**
 * PressResult interface for returning results from the press method
 */
interface PressResult {
    finalHash: string;
    encryptedContents: Map<string, Buffer>;
}

/**
 * decx Encryption Key Service (dEKService) is a service that allows you to press and release content using the decx.press protocol.
 */
export class DEKService {
    private contentMap: Map<string, number>;
    private hashToCharMap: Map<string, string>; // Map from hash to character
    private originalContent: string = ""; // Initialize with empty string
    private localEncryptedContent: Map<string, Buffer> = new Map(); // Local storage for encrypted content

    constructor(
        private decxDAG: Contract,
        private eciesService: ECIESService,
        private recipientPublicKey: string
    ) {
        // Validate recipient public key
        if (!recipientPublicKey) {
            throw new Error("Recipient public key is required");
        }

        if (!recipientPublicKey.startsWith("0x")) {
            throw new Error("Recipient public key must start with 0x");
        }

        this.contentMap = new Map();
        this.hashToCharMap = new Map();
    }

    /**
     * Press the content and get the final hash
     * @param content - The content to press
     * @param gasTracker - Optional tracker for gas usage
     * @param storeOnChain - Whether to store encrypted content on-chain (default: false)
     * @returns The final hash and map of encrypted contents
     */
    async press(content: string, gasTracker?: GasTracker, storeOnChain: boolean = false): Promise<PressResult> {
        // Store original content for later use
        this.originalContent = content;

        // Clear previous maps
        this.contentMap.clear();
        this.hashToCharMap.clear();
        this.localEncryptedContent.clear();

        // -------------------------------------------------------------
        // 1. Call DecxDAG to process content and get hash
        // -------------------------------------------------------------
        const tx = await this.decxDAG.press(content);
        const receipt = await tx.wait();

        // Track gas usage if a tracker is provided
        if (gasTracker && receipt.gasUsed) {
            gasTracker.totalGasUsed += receipt.gasUsed;
        }

        // -------------------------------------------------------------
        // 2. Extract and sort encryption path events
        // -------------------------------------------------------------
        const pathEvents: EncryptionPathEvent[] = receipt.logs
            .filter((log: any) => log.fragment?.name === "EncryptionPathCreated")
            .map((log: any) => ({
                hash: log.args.hash,
                components: log.args.components,
                index: Number(log.args.index) // Convert BigInt to number
            }))
            .sort((a: EncryptionPathEvent, b: EncryptionPathEvent) => a.index - b.index);

        // Find leaf nodes (character hashes) and map them to characters
        // The first N events (where N = content.length) are leaf nodes in order
        const characters = [...content];
        const leafNodes = pathEvents.filter((event) => event.components[1] === ethers.ZeroHash);

        // Ensure we have enough leaf nodes for all characters
        if (leafNodes.length < characters.length) {
            throw new Error(`Not enough leaf nodes (${leafNodes.length}) for content length (${characters.length})`);
        }

        // Map characters to leaf nodes in order
        for (let i = 0; i < characters.length; i++) {
            const leafNode = leafNodes[i];
            const char = characters[i];
            this.hashToCharMap.set(leafNode.hash, char);
        }

        // -------------------------------------------------------------
        // 3. For each hash in the path, encrypt and optionally emit
        // -------------------------------------------------------------
        for (const event of pathEvents) {
            const { hash, components } = event;

            let contentToEncrypt: string;
            const isLeafNode = components[1] === ethers.ZeroHash;

            if (isLeafNode) {
                // Leaf node - get character from our hash-to-char map
                const char = this.hashToCharMap.get(hash);
                if (!char) {
                    throw new Error(`Cannot find character for hash ${hash}`);
                }
                contentToEncrypt = char;
            } else {
                // Inner node - encrypt the component hashes as a pair
                contentToEncrypt = JSON.stringify(components);
            }

            // Encrypt content for this hash
            const encryptedContent = await this.eciesService.encrypt(contentToEncrypt, this.recipientPublicKey);

            // Store encrypted content locally
            this.localEncryptedContent.set(hash, encryptedContent);

            // Optionally store on-chain
            if (storeOnChain) {
                // Emit encrypted content and wait for transaction to be mined
                const tx = await this.decxDAG.storeEncryptedData(hash, encryptedContent);
                const receipt = await tx.wait(); // Wait for transaction to be mined

                // Track gas usage if a tracker is provided
                if (gasTracker && receipt.gasUsed) {
                    gasTracker.totalGasUsed += receipt.gasUsed;
                }
            }
        }

        // Return final hash and encrypted contents
        const finalHash = pathEvents[pathEvents.length - 1].hash;
        return {
            finalHash,
            encryptedContents: new Map(this.localEncryptedContent)
        };
    }

    /**
     * Release the original content from the final hash
     * @param finalHash - The final hash to release the content from
     * @param gasTracker - Optional tracker for gas usage
     * @param localEncryptedContents - Optional map of locally stored encrypted contents
     * @returns The original content
     */
    async release(
        finalHash: string,
        gasTracker?: GasTracker,
        localEncryptedContents?: Map<string, Buffer>
    ): Promise<string> {
        // -------------------------------------------------------------
        // 1. Get encryption path from DecxDAG
        // -------------------------------------------------------------
        const path = await this.getEncryptionPath(finalHash);

        // -------------------------------------------------------------
        // 2. Get encrypted content for each hash
        // -------------------------------------------------------------
        const encryptedContents = await Promise.all(
            path.map(async (hash) => {
                // First check if we have the content locally
                if (localEncryptedContents && localEncryptedContents.has(hash)) {
                    return {
                        hash,
                        encryptedContent: localEncryptedContents.get(hash)!
                    };
                }

                // Otherwise, get it from the blockchain
                const filter = this.decxDAG.filters.EncryptedDataStored(hash);
                const events = await this.decxDAG.queryFilter(filter);
                if (events.length === 0) {
                    throw new Error(`No encrypted data found for hash ${hash}`);
                }
                // Get the latest event
                const event = events[events.length - 1] as EncryptedDataStoredEvent;

                // Note: queryFilter doesn't consume gas, so we don't track it

                return {
                    hash,
                    encryptedContent: Buffer.from(ethers.getBytes(event.args.encryptedPayload))
                };
            })
        );

        // -------------------------------------------------------------
        // 3. Decrypt and reconstruct content
        // -------------------------------------------------------------
        return this.reconstructContent(encryptedContents);
    }

    /**
     * Get the encryption path for a given final hash
     * @param finalHash - The final hash to get the path for
     * @returns The encryption path for the given hash
     */
    private async getEncryptionPath(finalHash: string): Promise<string[]> {
        const path: string[] = [];
        const visited = new Set<string>();

        const addToPath = async (hash: string) => {
            if (hash === ethers.ZeroHash || visited.has(hash)) {
                return;
            }

            visited.add(hash);
            path.push(hash);

            const components = await this.decxDAG.getComponents(hash);
            // If the second component is ZeroHash, we've reached a leaf node
            if (components[1] === ethers.ZeroHash) {
                return;
            }

            // Add both components to the path
            await addToPath(components[0]);
            await addToPath(components[1]);
        };

        await addToPath(finalHash);
        return path;
    }

    /**
     * Reconstruct the original content from the encrypted contents
     * @param encryptedContents - The encrypted contents to reconstruct the content from
     * @returns The original content
     */
    private async reconstructContent(encryptedContents: EncryptedContent[]): Promise<string> {
        const pairMap = new Map<string, string[]>();
        const contentMap = new Map<string, string>();

        // First pass: decrypt all contents and categorize them
        for (const { hash, encryptedContent } of encryptedContents) {
            try {
                // Get the components to determine if this is a leaf node
                const components = await this.decxDAG.getComponents(hash);
                const isLeafNode = components[1] === ethers.ZeroHash;

                if (isLeafNode) {
                    // This is a leaf node - decrypt as a character
                    const character = await this.eciesService.decryptCharacter(encryptedContent);
                    contentMap.set(hash, character);
                } else {
                    // This is a pair - decrypt as a pair of hashes
                    const pairComponents = await this.eciesService.decryptPairs(encryptedContent);
                    pairMap.set(hash, pairComponents);
                }
            } catch (error) {
                console.error(`Error decrypting content for hash ${hash}:`, error);
                throw error;
            }
        }

        // Second pass: resolve pairs if any exist
        if (pairMap.size > 0) {
            return this.resolvePairs(pairMap, contentMap);
        }

        // If no pairs, just return the single decrypted value
        const singleContent = contentMap.values().next().value;
        if (!singleContent) {
            throw new Error("No content found to reconstruct");
        }
        return singleContent;
    }

    /**
     * Resolve the pairs in the pair map
     * @param pairMap - The pair map to resolve
     * @param contentMap - The content map to resolve the pairs from
     * @returns The original content
     */
    private resolvePairs(pairMap: Map<string, string[]>, contentMap: Map<string, string>): string {
        // -------------------------------------------------------------
        // 1. Identify the correct root of the DAG/tree:
        // -------------------------------------------------------------
        // Build a set of all child hashes in the pairs
        const allChildren = new Set<string>();
        for (const [hash, pair] of pairMap) {
            if (pair[0] !== ethers.ZeroHash) {
                allChildren.add(pair[0]);
            }
            if (pair[1] !== ethers.ZeroHash) {
                allChildren.add(pair[1]);
            }
        }

        // The "true root" is the one hash that is never a child
        let rootHash: string | undefined;
        for (const hash of pairMap.keys()) {
            if (!allChildren.has(hash)) {
                rootHash = hash;
                break;
            }
        }

        if (!rootHash) {
            throw new Error("No valid root found in pairMap");
        }

        // -------------------------------------------------------------
        // 2. Depth-first resolution from the discovered root
        // -------------------------------------------------------------
        const characters = new Map<number, string>();
        let maxIndex = 0;
        let depth = 0; // Track recursion depth
        const visited = new Set<string>(); // Track visited hashes to prevent cycles

        const resolveHash = (hash: string, position: number) => {
            depth++;

            if (visited.has(hash)) {
                if (contentMap.has(hash)) {
                    characters.set(position, contentMap.get(hash)!);
                    maxIndex = Math.max(maxIndex, position);
                }
                depth--;
                return;
            }
            visited.add(hash);

            // If we have a leaf already in contentMap, store it at 'position'
            if (contentMap.has(hash)) {
                const content = contentMap.get(hash)!;
                characters.set(position, content);
                maxIndex = Math.max(maxIndex, position);
                depth--;
                return;
            }

            // Otherwise, this hash must be an inner pair
            const pair = pairMap.get(hash);
            if (!pair) {
                throw new Error(`Cannot find content or pair for hash ${hash}`);
            }

            // If pair[1] is ZeroHash, it's just a single child
            if (pair[1] === ethers.ZeroHash) {
                resolveHash(pair[0], position);
            } else {
                // Resolve left child at 'position'
                resolveHash(pair[0], position);
                // And the right child goes at the next available index
                const nextPos = maxIndex + 1;
                resolveHash(pair[1], nextPos);
            }
            depth--;
        };

        // Finally, recursively resolve from the "true root"
        resolveHash(rootHash, 0);

        // Convert position→character map to a string
        return Array.from({ length: maxIndex + 1 })
            .map((_, i) => characters.get(i))
            .filter(Boolean)
            .join("");
    }
}
