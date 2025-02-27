import * as secp from "@noble/secp256k1";
import { randomBytes, createCipheriv, createDecipheriv, createHmac } from "crypto";
import { sha256 } from "@noble/hashes/sha256";
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
    private readonly MAX_HASH_PAIR_SIZE = 138; // ["0x<32 bytes>","0x<32 bytes>"]

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

        // 1. Generate ephemeral key pair
        const ephemeralPrivKey = secp.utils.randomPrivateKey();
        const ephemeralPubKey = Buffer.from(secp.getPublicKey(ephemeralPrivKey, false));

        // 2. Derive shared secret
        const sharedSecret = secp.getSharedSecret(
            bytesToHex(ephemeralPrivKey),
            Buffer.from(publicKeyHex.replace("0x", ""), "hex")
        );

        // 3. Derive keys
        const { encryptionKey, macKey } = this.deriveKeys(sharedSecret);

        // 4. Encrypt with AES-256-GCM
        const iv = randomBytes(this.IV_SIZE);
        const cipher = createCipheriv("aes-256-gcm", encryptionKey, iv);
        const encrypted = Buffer.concat([cipher.update(contentBuffer), cipher.final()]);
        const authTag = cipher.getAuthTag();

        // 5. Compute MAC
        const mac = this.computeMAC(macKey, Buffer.concat([iv, encrypted]));

        // 6. Return combined buffer
        return Buffer.concat([
            ephemeralPubKey, // 65 bytes
            iv, // 12 bytes
            encrypted, // 16 or 144 bytes (padded)
            authTag, // 16 bytes
            mac // 32 bytes
        ]);
    }

    /**
     * Decrypts the content and validates its format.
     * @throws Error if decryption fails or content format is invalid
     */
    async decrypt(encryptedData: Buffer): Promise<string> {
        // Validate minimum size
        const minSize = this.OVERHEAD_SIZE + this.AES_BLOCK_SIZE;
        if (encryptedData.length < minSize) {
            throw new Error(`Encrypted data size ${encryptedData.length} is less than minimum ${minSize}`);
        }

        // Extract components
        const ephemeralPubKey = encryptedData.subarray(0, this.EPHEMERAL_PUBKEY_SIZE);
        const iv = encryptedData.subarray(this.EPHEMERAL_PUBKEY_SIZE, this.EPHEMERAL_PUBKEY_SIZE + this.IV_SIZE);
        const encrypted = encryptedData.subarray(
            this.EPHEMERAL_PUBKEY_SIZE + this.IV_SIZE,
            -this.AUTH_TAG_SIZE - this.MAC_SIZE
        );
        const authTag = encryptedData.subarray(-this.AUTH_TAG_SIZE - this.MAC_SIZE, -this.MAC_SIZE);
        const mac = encryptedData.subarray(-this.MAC_SIZE);

        // Verify MAC
        const sharedSecret = secp.getSharedSecret(this.privateKey.slice(2), ephemeralPubKey);
        const { encryptionKey, macKey } = this.deriveKeys(sharedSecret);
        const computedMac = this.computeMAC(macKey, Buffer.concat([iv, encrypted]));
        if (!computedMac.equals(mac)) {
            throw new Error("Invalid MAC - message may have been tampered with");
        }

        // Decrypt
        const decipher = createDecipheriv("aes-256-gcm", encryptionKey, iv);
        decipher.setAuthTag(authTag);
        const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);

        // Validate decrypted content format
        const content = decrypted.toString("utf8");
        if (content.startsWith("[")) {
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
            } catch {
                throw new Error("Invalid decrypted hash pair JSON");
            }
        } else if (decrypted.length > this.MAX_CHAR_SIZE) {
            throw new Error(
                `Decrypted character size ${decrypted.length} exceeds maximum UTF-8 size ${this.MAX_CHAR_SIZE}`
            );
        }

        return content;
    }

    private deriveKeys(sharedSecret: Uint8Array) {
        const encryptionKey = Buffer.from(hkdf(sha512, sharedSecret, undefined, this.ENCRYPTION_INFO, 32));
        const macKey = Buffer.from(hkdf(sha512, sharedSecret, undefined, this.MAC_INFO, 32));
        return { encryptionKey, macKey };
    }

    private computeMAC(macKey: Buffer, data: Buffer): Buffer {
        return createHmac("sha256", macKey).update(data).digest();
    }
}
