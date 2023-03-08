# bun-hono-firebase-auth-middleware

The `firebase-admin` library doesn't work with Bun for that reason I created this middleware.<br>

Here an example how to use it (Buun + Hono)<br>

```
import { prettyJSON } from "hono/pretty-json";
import { cors } from "hono/cors";
import { Hono } from "hono";

import { firebaseAuthMiddleware } from "./firebaseAuth.js";

const app = new Hono();

app.get("/", (c) => c.text("Hello!"));
app.use("*", prettyJSON());
app.notFound((c) => c.json({ message: "Not Found", ok: false }, 404));

const api = new Hono();

api.use("/", cors());

api.get(
  "/auth",
  async (c, next) => {
    const auth = firebaseAuthMiddleware();
    return auth(c, next);
  },
  async (c) => {
    return c.json({ ok: "OK!" });
  }
);

app.route("/", api);

export default app;
```
