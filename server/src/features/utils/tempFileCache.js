const { v4: uuidv4 } = require('uuid');

// A simple in-memory cache for temporary file buffers.
// KEY: a unique ID (uuid)
// VALUE: { buffer: Buffer, fileName: string, mimeType: string }
const cache = new Map();

/**
 * Stores a file buffer in the cache and returns a unique ID.
 * @param {Buffer} buffer - The file buffer to store.
 * @param {string} fileName - The desired file name for download.
 * @param {string} mimeType - The MIME type of the file.
 * @returns {string} The unique ID for retrieving the file.
 */
const set = (buffer, fileName, mimeType) => {
    const id = uuidv4();
    cache.set(id, { buffer, fileName, mimeType });

    // Automatically clear the cache entry after 5 minutes to save memory
    setTimeout(() => {
        cache.delete(id);
    }, 5 * 60 * 1000); // 5 minutes

    return id;
};

/**
 * Retrieves a file from the cache by its ID.
 * @param {string} id - The unique ID of the file.
 * @returns {object|undefined} The cached file object or undefined if not found.
 */
const get = (id) => {
    return cache.get(id);
};

module.exports = {
    set,
    get,
};