import { createAppServer } from "./app.mjs";

const port = Number(process.env.PORT ?? 3000);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("PORT должен быть целым числом от 1 до 65535.");
}

const server = createAppServer();
server.listen(port, "0.0.0.0", () => {
  process.stdout.write(`Life Maps server listening on ${port}\n`);
});

function shutdown() {
  server.close(() => process.exit(0));
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
