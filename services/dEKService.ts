// decx Encryption Key Service (dEKService)
import { Contract, ethers, EventLog, Log, Result } from "ethers";
import { ECIESService } from "./encryption/ECIESService";

interface EncryptionPathEvent {
    hash: string;
    components: string[];
    index: number; // Explicitly number type after conversion from BigInt
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

interface CharacterHashedEventArgs extends Result {
    character: string;
    hash: string;
}

type CharacterHashedEvent = EventLog & {
    args: CharacterHashedEventArgs;
};

export class DecxPressService {
    private contentMap: Map<string, number>;
    private hashToCharMap: Map<string, string>; // Map from hash to character
    private originalContent: string = ""; // Initialize with empty string

    constructor(
        private decxDAG: Contract,
        private eciesService: ECIESService,
        private recipientPublicKey: string
    ) {
        this.contentMap = new Map();
        this.hashToCharMap = new Map();
    }

    async press(content: string): Promise<string> {
        console.log("\n=== Starting Press Operation ===");
        console.log("Original content:", content);

        // Store original content for later use
        this.originalContent = content;

        // Clear previous maps
        this.contentMap.clear();
        this.hashToCharMap.clear();

        // 1. Call DecxDAG to process content and get hash
        console.log("\nCalling DecxDAG.press...");
        const tx = await this.decxDAG.press(content);
        const receipt = await tx.wait();

        // 2. Extract and sort encryption path events
        // console.log("\nProcessing EncryptionPathCreated events:");
        const pathEvents: EncryptionPathEvent[] = receipt.logs
            .filter((log: any) => log.fragment?.name === "EncryptionPathCreated")
            .map((log: any) => ({
                hash: log.args.hash,
                components: log.args.components,
                index: Number(log.args.index) // Convert BigInt to number
            }))
            .sort((a: EncryptionPathEvent, b: EncryptionPathEvent) => a.index - b.index);

        // console.log(`Found ${pathEvents.length} path events:`);
        // pathEvents.forEach((event, i) => {
        //     console.log(`\nEvent ${i + 1}:`);
        //     console.log(`  Hash: ${event.hash}`);
        //     console.log(`  Components: [${event.components[0]}, ${event.components[1]}]`);
        //     console.log(`  Index: ${event.index}`);
        // });

        // Find leaf nodes (character hashes) and map them to characters
        // The first N events (where N = content.length) are leaf nodes in order
        const characters = [...content];
        for (let i = 0; i < characters.length; i++) {
            const event = pathEvents[i];
            if (event && event.components[1] === ethers.ZeroHash) {
                const char = characters[i];
                this.hashToCharMap.set(event.hash, char);
                // console.log(`Mapped hash ${event.hash} to character '${char}'`);
            }
        }

        // 3. For each hash in the path, encrypt and emit
        // console.log("\nEncrypting and storing content for each hash:");
        for (const event of pathEvents) {
            const { hash, components } = event;
            // console.log(`\nProcessing hash: ${hash}`);

            let contentToEncrypt: string;
            const isLeafNode = components[1] === ethers.ZeroHash;

            if (isLeafNode) {
                // Leaf node - get character from our hash-to-char map
                const char = this.hashToCharMap.get(hash);
                if (!char) {
                    throw new Error(`Cannot find character for hash ${hash}`);
                }
                contentToEncrypt = char;
                // console.log(`  Found leaf node with character: '${contentToEncrypt}' for hash ${hash}`);
            } else {
                // Inner node - encrypt the component hashes as a pair
                contentToEncrypt = JSON.stringify(components);
                // console.log(`  Found inner node with components: [${components[0]}, ${components[1]}]`);
            }

            // Encrypt content for this hash
            // console.log(`  Encrypting content: ${contentToEncrypt}`);
            const encryptedContent = await this.eciesService.encrypt(contentToEncrypt, this.recipientPublicKey);

            // Emit encrypted content
            // console.log(`  Storing encrypted content for hash ${hash}`);
            await this.decxDAG.storeEncryptedData(hash, encryptedContent);
        }

        // Return final hash
        const finalHash = pathEvents[pathEvents.length - 1].hash;
        // console.log("\n=== Press Operation Complete ===");
        // console.log("Final hash:", finalHash);
        return finalHash;
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
                    encryptedContent: Buffer.from(ethers.getBytes(event.args.encryptedPayload))
                };
            })
        );
        // console.log("Encrypted contents:", encryptedContents);
        // 3. Decrypt and reconstruct content
        return this.reconstructContent(encryptedContents);
    }

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
                    // console.log(`Stored leaf node character for ${hash}: ${character}`);
                } else {
                    // This is a pair - decrypt as a pair of hashes
                    const pairComponents = await this.eciesService.decryptPairs(encryptedContent);
                    pairMap.set(hash, pairComponents);
                    // console.log(`Stored pair for ${hash}: [${pairComponents[0]}, ${pairComponents[1]}]`);
                }
            } catch (error) {
                console.error(`Error decrypting content for hash ${hash}:`, error);
                throw error;
            }
        }

        // console.log("\nFinal Maps:");
        // console.log("PairMap:", Object.fromEntries(pairMap));
        console.log("ContentMap:", Object.fromEntries(contentMap));

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

    private resolvePairs(pairMap: Map<string, string[]>, contentMap: Map<string, string>): string {
        const characters = new Map<number, string>();
        let maxIndex = 0;
        let depth = 0; // Track recursion depth
        const visited = new Set<string>(); // Track visited hashes to prevent cycles
        const positions = new Map<string, number>(); // Track positions of hashes in the tree

        // Helper function to resolve a hash recursively
        const resolveHash = (hash: string, position: number) => {
            depth++;
            const indent = "  ".repeat(depth);
            console.log(`${indent}Resolving hash ${hash} at position ${position} (depth: ${depth})`);

            // Store the position for this hash
            positions.set(hash, position);

            // Prevent cycles
            if (visited.has(hash)) {
                console.log(`${indent}Already visited hash ${hash}, skipping`);
                depth--;
                return;
            }
            visited.add(hash);

            // Base case 1: We've already found content for this hash
            if (contentMap.has(hash)) {
                const content = contentMap.get(hash)!;
                characters.set(position, content);
                maxIndex = Math.max(maxIndex, position);
                console.log(`${indent}Found content: ${content} at position ${position}`);
                depth--;
                return;
            }

            // Base case 2: This is a pair we need to resolve
            const pair = pairMap.get(hash);
            if (!pair) {
                console.log(`${indent}ERROR: Cannot find content or pair for hash ${hash}`);
                throw new Error(`Cannot find content or pair for hash ${hash}`);
            }

            console.log(`${indent}Found pair: [${pair[0]}, ${pair[1]}]`);

            // Check if this is a leaf node (second component is ZeroHash)
            if (pair[1] === ethers.ZeroHash) {
                console.log(
                    `${indent}This is a leaf node, resolving left component ${pair[0]} at position ${position}`
                );
                resolveHash(pair[0], position);
            } else {
                // This is an inner node, resolve both components
                // For inner nodes, we need to determine the positions of the children
                // The left child gets the current position, the right child gets the next available position
                console.log(`${indent}Resolving left component ${pair[0]} at position ${position}`);
                resolveHash(pair[0], position);

                // Find the next available position after all positions in the left subtree
                const nextPosition = maxIndex + 1;
                console.log(`${indent}Resolving right component ${pair[1]} at position ${nextPosition}`);
                resolveHash(pair[1], nextPosition);
            }

            depth--;
        };

        // Find the root hash (should be the last one in our path)
        const rootHash = Array.from(pairMap.keys())[pairMap.size - 1];
        if (!rootHash) {
            throw new Error("No root hash found in pair map");
        }

        console.log("\nStarting resolution from root hash:", rootHash);
        resolveHash(rootHash, 0);

        console.log("\nFinal character positions:", Object.fromEntries(characters));

        // Convert the position-mapped characters back to a string
        return Array.from({ length: maxIndex + 1 })
            .map((_, i) => characters.get(i))
            .filter(Boolean)
            .join("");
    }
}
