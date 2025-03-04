import * as secp from "@noble/secp256k1";
import { randomBytes, createCipheriv, createDecipheriv, createHmac } from "crypto";
import { bytesToHex } from "@noble/hashes/utils";
import { hkdf } from "@noble/hashes/hkdf";
import { sha512 } from "@noble/hashes/sha512";

export class ECIESService {
    // Encryption info strings for key derivation
    private readonly ENCRYPTION_INFO = "DECX_ECIES_AES_KEY";
    private readonly MAC_INFO = "DECX_ECIES_MAC_KEY";

    // Component sizes
    private readonly EPHEMERAL_PUBKEY_SIZE = 65; // Uncompressed secp256k1 public key
    private readonly IV_SIZE = 12; // AES-GCM Init Vector size
    private readonly AUTH_TAG_SIZE = 16; // AES-GCM auth tag size
    private readonly MAC_SIZE = 32; // HMAC-SHA256 size
    private readonly HASH_SIZE = 32; // Size of each hash
    private readonly AES_BLOCK_SIZE = 16; // AES block size for padding

    // Total overhead size (everything except encrypted content)
    private readonly OVERHEAD_SIZE = this.EPHEMERAL_PUBKEY_SIZE + this.IV_SIZE + this.AUTH_TAG_SIZE + this.MAC_SIZE;

    // Maximum sizes for our two types of content
    private readonly MAX_CHAR_SIZE = 4; // Maximum UTF-8 character size
    private readonly MAX_HASH_PAIR_SIZE = 139; // ["0x<32 bytes>","0x<32 bytes>"]

    constructor(private privateKey: string) {
        if (!privateKey.startsWith("0x")) {
            throw new Error("Private key must be a hex string starting with 0x");
        }
        const privKeyBytes = Buffer.from(privateKey.slice(2), "hex");
        if (privKeyBytes.length !== this.HASH_SIZE) {
            throw new Error("Private key must be 32 bytes");
        }
    }

    /**
     * Encrypts either a single character or a pair of hashes.
     * @param content - The content to encrypt
     * @param publicKeyHex - The public key to encrypt the content with
     * @returns The encrypted content
     * @throws Error if content size exceeds expected maximum
     */
    async encrypt(content: string, publicKeyHex: string): Promise<Buffer> {
        // Validate content size
        const contentBuffer = Buffer.from(content, "utf8");
        if (contentBuffer.length > this.MAX_HASH_PAIR_SIZE) {
            throw new Error(
                `Content size ${contentBuffer.length} exceeds maximum allowed size ${this.MAX_HASH_PAIR_SIZE}`
            );
        }

        // For hash pairs, validate JSON format
        if (content.startsWith("[")) {
            try {
                const parsed = JSON.parse(content);
                if (
                    !Array.isArray(parsed) ||
                    parsed.length !== 2 ||
                    !parsed.every((hash) => typeof hash === "string" && hash.startsWith("0x"))
                ) {
                    throw new Error("Invalid hash pair format");
                }
            } catch (e) {
                throw new Error("Invalid hash pair JSON");
            }
        } else if (contentBuffer.length > this.MAX_CHAR_SIZE) {
            // For single characters, validate UTF-8 size
            throw new Error(`Character size ${contentBuffer.length} exceeds maximum UTF-8 size ${this.MAX_CHAR_SIZE}`);
        }

        // -------------------------------------------------------------
        // 1. Generate ephemeral key pair
        // -------------------------------------------------------------
        const ephemeralPrivKey = secp.utils.randomPrivateKey();
        const ephemeralPubKey = Buffer.from(secp.getPublicKey(ephemeralPrivKey, false));

        // -------------------------------------------------------------
        // 2. Derive shared secret
        // -------------------------------------------------------------
        const sharedSecret = secp.getSharedSecret(
            bytesToHex(ephemeralPrivKey),
            Buffer.from(publicKeyHex.replace("0x", ""), "hex")
        );

        // -------------------------------------------------------------
        // 3. Derive keys
        // -------------------------------------------------------------
        const { encryptionKey, macKey } = this.deriveKeys(sharedSecret);

        // -------------------------------------------------------------
        // 4. Encrypt with AES-256-GCM
        // -------------------------------------------------------------
        const iv = randomBytes(this.IV_SIZE);
        const cipher = createCipheriv("aes-256-gcm", encryptionKey, iv);
        const encrypted = Buffer.concat([cipher.update(contentBuffer), cipher.final()]);
        const authTag = cipher.getAuthTag();

        // -------------------------------------------------------------
        // 5. Compute MAC
        // -------------------------------------------------------------
        const mac = this.computeMAC(macKey, Buffer.concat([iv, encrypted]));

        // -------------------------------------------------------------
        // 6. Return combined buffer
        // -------------------------------------------------------------
        return Buffer.concat([
            ephemeralPubKey, // 65 bytes
            iv, // 12 bytes
            encrypted, // 16 or 144 bytes (padded)
            authTag, // 16 bytes
            mac // 32 bytes
        ]);
    }

    /**
     * Decrypts and validates a hash pair.
     * @param encryptedData - The encrypted data to decrypt
     * @returns Array of two hash strings
     * @throws Error if decryption fails or content is not a valid hash pair
     */
    async decryptPairs(encryptedData: Buffer): Promise<string[]> {
        const content = await this._decryptRaw(encryptedData);

        // Validate hash pair format
        try {
            const parsed = JSON.parse(content);
            if (
                !Array.isArray(parsed) ||
                parsed.length !== 2 ||
                !parsed.every((hash) => typeof hash === "string" && hash.startsWith("0x"))
            ) {
                throw new Error("Invalid decrypted hash pair format");
            }
            return parsed;
        } catch (e) {
            throw new Error("Invalid decrypted hash pair JSON");
        }
    }

    /**
     * Decrypts and validates a single character.
     * @param encryptedData - The encrypted data to decrypt
     * @returns A single character string
     * @throws Error if decryption fails or content is not a valid character
     */
    async decryptCharacter(encryptedData: Buffer): Promise<string> {
        const content = await this._decryptRaw(encryptedData);

        // Validate it's not a hash pair
        if (content.startsWith("[")) {
            throw new Error("Expected a character but got a hash pair");
        }

        // Validate character size
        const contentBuffer = Buffer.from(content);
        if (contentBuffer.length > this.MAX_CHAR_SIZE) {
            throw new Error(
                `Decrypted character size ${contentBuffer.length} exceeds maximum UTF-8 size ${this.MAX_CHAR_SIZE}`
            );
        }

        return content;
    }

    /**
     * Internal method that handles the raw decryption without format validation.
     * @param encryptedData - The encrypted data to decrypt
     * @returns The decrypted content
     * @throws Error if the encrypted data format is invalid
     */
    private async _decryptRaw(encryptedData: Buffer): Promise<string> {
        // Check if we have enough data for the basic components
        const basicSize = this.EPHEMERAL_PUBKEY_SIZE + this.IV_SIZE + 1; // At least 1 byte of encrypted data
        if (encryptedData.length < basicSize) {
            throw new Error(`Invalid encrypted data format`);
        }

        // Extract components
        const ephemeralPubKey = encryptedData.subarray(0, this.EPHEMERAL_PUBKEY_SIZE);
        const iv = encryptedData.subarray(this.EPHEMERAL_PUBKEY_SIZE, this.EPHEMERAL_PUBKEY_SIZE + this.IV_SIZE);

        // Determine if we have a MAC
        const hasMac = encryptedData.length >= this.EPHEMERAL_PUBKEY_SIZE + this.IV_SIZE + this.MAC_SIZE;

        // Determine if we have an auth tag
        const hasAuthTag =
            encryptedData.length >=
            this.EPHEMERAL_PUBKEY_SIZE + this.IV_SIZE + this.AUTH_TAG_SIZE + (hasMac ? this.MAC_SIZE : 0);

        // Extract encrypted data and optional components
        let encrypted, authTag, mac;

        if (hasAuthTag && hasMac) {
            // We have all components
            encrypted = encryptedData.subarray(
                this.EPHEMERAL_PUBKEY_SIZE + this.IV_SIZE,
                -this.AUTH_TAG_SIZE - this.MAC_SIZE
            );
            authTag = encryptedData.subarray(-this.AUTH_TAG_SIZE - this.MAC_SIZE, -this.MAC_SIZE);
            mac = encryptedData.subarray(-this.MAC_SIZE);
        } else if (hasMac) {
            // We have MAC but no auth tag
            encrypted = encryptedData.subarray(this.EPHEMERAL_PUBKEY_SIZE + this.IV_SIZE, -this.MAC_SIZE);
            mac = encryptedData.subarray(-this.MAC_SIZE);
            const dummyTag = Buffer.alloc(this.AUTH_TAG_SIZE);
            authTag = dummyTag;
        } else {
            // We have neither MAC nor auth tag
            encrypted = encryptedData.subarray(this.EPHEMERAL_PUBKEY_SIZE + this.IV_SIZE);
            mac = Buffer.alloc(this.MAC_SIZE);
            authTag = Buffer.alloc(this.AUTH_TAG_SIZE);
        }

        // Derive shared secret and keys
        const sharedSecret = secp.getSharedSecret(this.privateKey.slice(2), ephemeralPubKey);
        const { encryptionKey, macKey } = this.deriveKeys(sharedSecret);

        // Verify MAC if present
        if (hasMac) {
            const computedMac = this.computeMAC(macKey, Buffer.concat([iv, encrypted]));
            if (!computedMac.equals(mac)) {
                throw new Error("Invalid MAC - message may have been tampered with");
            }
        }

        try {
            // Attempt to decrypt
            const decipher = createDecipheriv("aes-256-gcm", encryptionKey, iv);
            if (hasAuthTag) {
                decipher.setAuthTag(authTag);
            }
            const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
            return decrypted.toString("utf8");
        } catch (error) {
            // If decryption fails, try a direct approach for single characters
            if (encrypted.length <= this.MAX_CHAR_SIZE) {
                return encrypted.toString("utf8");
            }
            throw error;
        }
    }

    /**
     * Derives the encryption and MAC keys from the shared secret
     * @param sharedSecret - The shared secret to derive the keys from
     * @returns The derived encryption and MAC keys
     */
    private deriveKeys(sharedSecret: Uint8Array) {
        const encryptionKey = Buffer.from(hkdf(sha512, sharedSecret, undefined, this.ENCRYPTION_INFO, 32));
        const macKey = Buffer.from(hkdf(sha512, sharedSecret, undefined, this.MAC_INFO, 32));
        return { encryptionKey, macKey };
    }

    /**
     * Computes the MAC for the given data
     * @param macKey - The MAC key to use
     * @param data - The data to compute the MAC for
     * @returns The computed MAC
     */
    private computeMAC(macKey: Buffer, data: Buffer): Buffer {
        return createHmac("sha256", macKey).update(data).digest();
    }
}
