const sodium = require('libsodium-wrappers');

(async () => {
  await sodium.ready;
  const key = sodium.to_base64(sodium.randombytes_buf(sodium.crypto_secretbox_KEYBYTES));
  console.log("Generated Key (Save this in .env):", key);
})();
