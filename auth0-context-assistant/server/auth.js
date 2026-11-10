import { createRemoteJWKSet, jwtVerify } from "jose";

const DEMO_USER = {
  sub: "auth0|demo-rahul",
  name: "Rahul Singh",
  email: "rahulsinghx2001@gmail.com",
  demo: true,
};

let jwks = null;

function getJwks(domain) {
  if (!jwks) {
    jwks = createRemoteJWKSet(new URL(`https://${domain}/.well-known/jwks.json`));
  }
  return jwks;
}

export function isDemoMode(env = process.env) {
  return env.AUTH_DEMO === "1" || env.AUTH_DEMO === "true";
}

export async function authenticate(req, env = process.env) {
  const header = req.headers.authorization || req.headers.Authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";

  if (isDemoMode(env)) {
    if (token && token !== "demo-token") {
      // In demo mode a real token is still accepted if it verifies; otherwise use demo user.
      try {
        return await verifyAuth0Token(token, env);
      } catch {
        // fall through to demo user only when the header is the demo token or missing
      }
      if (token !== "demo-token") {
        const err = new Error("Invalid token in demo mode");
        err.status = 401;
        throw err;
      }
    }
    return { ...DEMO_USER };
  }

  if (!token) {
    const err = new Error("Missing Bearer token");
    err.status = 401;
    throw err;
  }
  return verifyAuth0Token(token, env);
}

export async function verifyAuth0Token(token, env = process.env) {
  const domain = env.AUTH0_DOMAIN;
  const audience = env.AUTH0_AUDIENCE;
  if (!domain || !audience) {
    const err = new Error("AUTH0_DOMAIN and AUTH0_AUDIENCE must be set");
    err.status = 500;
    throw err;
  }
  const { payload } = await jwtVerify(token, getJwks(domain), {
    issuer: `https://${domain}/`,
    audience,
  });
  return {
    sub: payload.sub,
    name: payload.name,
    email: payload.email,
    demo: false,
  };
}

export function authMiddleware(env = process.env) {
  return async (req, res, next) => {
    try {
      req.user = await authenticate(req, env);
      next();
    } catch (err) {
      const status = err.status || 401;
      res.status(status).json({ error: err.message || "Unauthorized" });
    }
  };
}
