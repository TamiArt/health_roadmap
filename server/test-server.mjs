import { createAppServer } from "./app.mjs";

const server = createAppServer({
  databasePath: ":memory:",
  encryptionKey: Buffer.from("5f".repeat(32), "hex"),
  secureCookies: false,
});
server.listen(3000, "127.0.0.1");
