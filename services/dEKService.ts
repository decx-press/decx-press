// decx Encryption Key Service (dEKService)
import { Contract, ethers, EventLog, Log, Result } from "ethers";
import { ECIESService } from "./encryption/ECIESService";

interface EncryptionPathEvent {
    hash: string;
    components: string[];
    index: number;
}

interface EncryptedContent {
    hash: string;
    encryptedContent: Buffer;
}

interface EncryptedDataStoredEventArgs extends Result {
    hash: string;
    encryptedPayload: Buffer;
}

type EncryptedDataStoredEvent = EventLog & {
    args: EncryptedDataStoredEventArgs;
};

export class DecxPressService {
    private contentMap: Map<string, number>;

    constructor(
        private decxDAG: Contract,
        private eciesService: ECIESService,
        private recipientPublicKey: string
    ) {
        this.contentMap = new Map();
    }

    async press(content: string): Promise<string> {
        // Store original character positions for reconstruction
        [...content].forEach((char, index) => {
            this.contentMap.set(char, index);
        });

        // 1. Call DecxDAG to process content and get hash
        const tx = await this.decxDAG.press(content);
        const receipt = await tx.wait();

        // 2. Extract and sort encryption path events
        const pathEvents: EncryptionPathEvent[] = receipt.logs
            .filter((log) => log.fragment?.name === "EncryptionPathCreated")
            .map((log) => ({
                hash: log.args.hash,
                components: log.args.components,
                index: log.args.index
            }))
            .sort((a, b) => a.index - b.index);

        // 3. For each hash in the path, encrypt and emit
        for (const event of pathEvents) {
            const { hash, components } = event;

            let contentToEncrypt: string;
            if (components[0] === ethers.ZeroHash) {
                // Single character hash - find original character
                const charIndex = this.contentMap.get(hash);
                if (charIndex === undefined) {
                    throw new Error(`Cannot find character for hash ${hash}`);
                }
                contentToEncrypt = content[charIndex];
            } else {
                // Pair hash - encrypt the component hashes
                contentToEncrypt = JSON.stringify(components);
            }

            // Encrypt content for this hash
            const encryptedContent = await this.eciesService.encrypt(contentToEncrypt, this.recipientPublicKey);

            // Emit encrypted content
            await this.decxDAG.storeEncryptedData(hash, encryptedContent);
        }

        // Clear the content map
        this.contentMap.clear();

        // Return final hash
        return pathEvents[pathEvents.length - 1].hash;
    }

    async release(finalHash: string): Promise<string> {
        // 1. Get encryption path from DecxDAG
        const path = await this.getEncryptionPath(finalHash);

        // 2. Get encrypted content for each hash
        const encryptedContents = await Promise.all(
            path.map(async (hash) => {
                const filter = this.decxDAG.filters.EncryptedDataStored(hash);
                const events = await this.decxDAG.queryFilter(filter);
                if (events.length === 0) {
                    throw new Error(`No encrypted data found for hash ${hash}`);
                }
                const event = events[0] as EncryptedDataStoredEvent;
                return {
                    hash,
                    encryptedContent: event.args.encryptedPayload
                };
            })
        );

        // 3. Decrypt and reconstruct content
        return this.reconstructContent(encryptedContents);
    }

    private async getEncryptionPath(finalHash: string): Promise<string[]> {
        const path: string[] = [];
        let currentHash = finalHash;

        while (currentHash !== ethers.ZeroHash) {
            path.push(currentHash);
            const components = await this.decxDAG.getComponents(currentHash);
            // If both components are ZeroHash, we've reached a leaf node
            if (components[0] === ethers.ZeroHash && components[1] === ethers.ZeroHash) {
                break;
            }
            // Continue with the next hash in the path
            currentHash = components[0];
        }

        return path.reverse();
    }

    private async reconstructContent(encryptedContents: EncryptedContent[]): Promise<string> {
        let result = "";
        const pairMap = new Map<string, string[]>();

        // First pass: decrypt all contents
        for (const { hash, encryptedContent } of encryptedContents) {
            const decrypted = await this.eciesService.decrypt(encryptedContent);

            try {
                // Try to parse as JSON (pair hash)
                const components = JSON.parse(decrypted);
                if (Array.isArray(components) && components.length === 2) {
                    pairMap.set(hash, components);
                    continue;
                }
            } catch {
                // Not JSON, must be a single character
                result += decrypted;
            }
        }

        // Second pass: resolve pairs if any exist
        if (pairMap.size > 0) {
            result = this.resolvePairs(pairMap);
        }

        return result;
    }

    private resolvePairs(pairMap: Map<string, string[]>): string {
        const characters = new Map<number, string>();
        let maxIndex = 0;

        // Helper function to resolve a hash recursively
        const resolveHash = (hash: string, position: number) => {
            const pair = pairMap.get(hash);
            if (!pair) {
                // If not in pairMap, it must be a single character
                characters.set(position, hash);
                maxIndex = Math.max(maxIndex, position);
                return;
            }

            // Resolve left component (position stays same)
            resolveHash(pair[0], position);

            // Resolve right component (position + 1)
            if (pair[1] !== ethers.ZeroHash) {
                resolveHash(pair[1], position + 1);
            }
        };

        // Start resolution from the last hash in our pair map
        // (which should be the root of our DAG)
        const rootHash = Array.from(pairMap.keys())[pairMap.size - 1];
        resolveHash(rootHash, 0);

        // Convert the position-mapped characters back to a string
        return Array.from({ length: maxIndex + 1 })
            .map((_, i) => characters.get(i))
            .filter(Boolean)
            .join("");
    }
}
