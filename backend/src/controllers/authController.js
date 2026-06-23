const axios = require("axios");
const jwt = require("jsonwebtoken");
const { User } = require("../models/User.js");

// Public base URL of THIS backend, used to build the OAuth callback URL that
// must be registered with Google / Discord. Must be reachable by the browser
// (a public https domain, providers reject raw LAN IPs).
const SERVER_URL = process.env.SERVER_URL || `http://localhost:${process.env.PORT || 4000}`;

// Per-provider OAuth config. Each provider knows how to build its consent URL,
// exchange the code for a token, and normalize the resulting profile.
const PROVIDERS = {
  google: {
    clientId: () => process.env.GOOGLE_CLIENT_ID,
    clientSecret: () => process.env.GOOGLE_CLIENT_SECRET,
    scope: "openid email profile",
    authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    extraAuthParams: { access_type: "online", prompt: "select_account" },
    async fetchProfile(accessToken) {
      const { data } = await axios.get(
        "https://www.googleapis.com/oauth2/v3/userinfo",
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      return {
        providerId: data.sub,
        email: data.email,
        name: data.name || data.email,
        avatar: data.picture || null,
      };
    },
  },
  discord: {
    clientId: () => process.env.DISCORD_CLIENT_ID,
    clientSecret: () => process.env.DISCORD_CLIENT_SECRET,
    scope: "identify email",
    authUrl: "https://discord.com/api/oauth2/authorize",
    tokenUrl: "https://discord.com/api/oauth2/token",
    extraAuthParams: { prompt: "consent" },
    async fetchProfile(accessToken) {
      const { data } = await axios.get("https://discord.com/api/users/@me", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const avatar = data.avatar
        ? `https://cdn.discordapp.com/avatars/${data.id}/${data.avatar}.png`
        : null;
      return {
        providerId: data.id,
        email: data.email,
        name: data.global_name || data.username,
        avatar,
      };
    },
  },
};

const callbackUrl = (provider) => `${SERVER_URL}/api/auth/${provider}/callback`;

const signAppToken = (user) =>
  jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });

// Find an existing user by provider id or email, or create a new one.
const findOrCreateUser = async (provider, profile) => {
  const idField = `${provider}Id`;

  let user = await User.findOne({ [idField]: profile.providerId });
  if (user) return user;

  // Link to an existing account that signed up with the same email.
  if (profile.email) {
    user = await User.findOne({ email: profile.email });
    if (user) {
      user[idField] = profile.providerId;
      if (!user.avatar) user.avatar = profile.avatar;
      await user.save();
      return user;
    }
  }

  return User.create({
    name: profile.name,
    email: profile.email,
    provider,
    [idField]: profile.providerId,
    avatar: profile.avatar,
  });
};

// GET /api/auth/:provider?redirect=<app-return-url>
// Builds the provider consent URL and redirects the browser to it.
const startOAuth = (req, res) => {
  const { provider } = req.params;
  const cfg = PROVIDERS[provider];
  if (!cfg) return res.status(404).json({ message: "Unknown provider" });
  if (!cfg.clientId()) {
    return res.status(500).json({ message: `${provider} OAuth is not configured` });
  }

  const appRedirect = req.query.redirect;
  if (!appRedirect) {
    return res.status(400).json({ message: "Missing redirect parameter" });
  }

  // Signed, short-lived state carries the app return URL and guards against CSRF.
  const state = jwt.sign({ provider, appRedirect }, process.env.JWT_SECRET, {
    expiresIn: "10m",
  });

  const params = new URLSearchParams({
    client_id: cfg.clientId(),
    redirect_uri: callbackUrl(provider),
    response_type: "code",
    scope: cfg.scope,
    state,
    ...cfg.extraAuthParams,
  });

  return res.redirect(`${cfg.authUrl}?${params.toString()}`);
};

// GET /api/auth/:provider/callback?code=...&state=...
// Exchanges the code for a token, resolves the user, then bounces back into
// the app with the app JWT and user payload as query params.
const oauthCallback = async (req, res) => {
  const { provider } = req.params;
  const cfg = PROVIDERS[provider];
  if (!cfg) return res.status(404).send("Unknown provider");

  const { code, state, error: providerError } = req.query;

  let appRedirect;
  try {
    const decoded = jwt.verify(state, process.env.JWT_SECRET);
    if (decoded.provider !== provider) throw new Error("provider mismatch");
    appRedirect = decoded.appRedirect;
  } catch (e) {
    return res.status(400).send("Invalid or expired OAuth state");
  }

  const bounce = (params) => {
    const sep = appRedirect.includes("?") ? "&" : "?";
    return res.redirect(`${appRedirect}${sep}${new URLSearchParams(params)}`);
  };

  if (providerError || !code) {
    return bounce({ error: providerError || "authorization_failed" });
  }

  try {
    const { data: token } = await axios.post(
      cfg.tokenUrl,
      new URLSearchParams({
        client_id: cfg.clientId(),
        client_secret: cfg.clientSecret(),
        grant_type: "authorization_code",
        code,
        redirect_uri: callbackUrl(provider),
      }).toString(),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );

    const profile = await cfg.fetchProfile(token.access_token);
    if (!profile.email) {
      return bounce({ error: "no_email_from_provider" });
    }

    const user = await findOrCreateUser(provider, profile);
    const appToken = signAppToken(user);

    const userPayload = {
      id: user._id,
      name: user.name,
      email: user.email,
      avatar: user.avatar || null,
    };

    // URLSearchParams percent-encodes the JSON (UTF-8 safe for unicode names).
    return bounce({
      token: appToken,
      user: JSON.stringify(userPayload),
    });
  } catch (err) {
    console.error(`${provider} OAuth callback error:`, err.response?.data || err.message);
    return bounce({ error: "oauth_failed" });
  }
};

module.exports = { startOAuth, oauthCallback };
