import { HTTPException } from "hono/http-exception";
import { Context, Next } from "hono";
import * as jose from 'jose'

const { FIREBASE_PROJECT_ID, GOOGLE_SECURE_TOKENS_URL } = process.env;

const ErrorMessage = {
  NO_TOKEN: "No token provided.",
  INVALID_TOKEN: "No token provided.",
  INVALID_REQUEST: "Invalid request!",
} as const;

type Error = {
  status: 400 | 401;
  statusText: string;
};

const veryftToken = async (idToken: string) => {
  try {
    if (GOOGLE_SECURE_TOKENS_URL && FIREBASE_PROJECT_ID) {
      const header = await jose.decodeProtectedHeader(idToken);
      const response = await fetch(GOOGLE_SECURE_TOKENS_URL);
      const result: Record<string, string> = await response.json();

      if (result && header?.kid && Object.keys(result).includes(header?.kid)) {
        const publicKey = await jose.importX509(result[header?.kid], 'RS256')

        return await jose.jwtVerify(idToken, publicKey, {
          issuer: `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`,
          audience: FIREBASE_PROJECT_ID,
        })
      }
      return null;
    }
  } catch (error) {
    return null;
  }
}
const firebaseAuthMiddleware = () => {
  let error: Error | null = null;
  return async (ctx: Context, next: Next) => {
    try {
      const headerToken = ctx.req.headers.get("authorization");

      if (!headerToken || headerToken.split(" ")[0] !== "Bearer") {
        error = { status: 401, statusText: ErrorMessage.INVALID_TOKEN };

      } else {
        const splittedToken = headerToken?.split(" ");

        if (splittedToken?.length > 1) {
          const userAuthInfo = await veryftToken(splittedToken[1]);

          if (userAuthInfo) {
            // FIXME: Make user data available for future requests.
            // ctx.req.user = userAuthInfo;
            return next();
          }
          error = { status: 401, statusText: ErrorMessage.INVALID_TOKEN };
        }
        error = { status: 401, statusText: ErrorMessage.INVALID_TOKEN };
      }
    } catch (error) {
      error = { status: 400, statusText: ErrorMessage.INVALID_REQUEST };
    } finally {
      if (error) {
        const res = new Response("Unauthorized", error);
        throw new HTTPException(error.status, { res });
      }
    }
  };
};

export { firebaseAuthMiddleware };
