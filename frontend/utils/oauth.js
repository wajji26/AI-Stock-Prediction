import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { API_URL } from "../config/config";

// Required so the in-app browser dismisses correctly after the auth redirect.
WebBrowser.maybeCompleteAuthSession();

/**
 * Runs the backend-driven OAuth flow for the given provider ("google" | "discord").
 *
 * Opens the backend's /api/auth/:provider endpoint in a secure auth session.
 * The backend handles the provider consent + token exchange and redirects back
 * to this app with `token` and `user` query params, which we parse here.
 *
 * @returns {Promise<{ type: "success", token: string, user: object }
 *                   | { type: "cancel" | "dismiss" }>}
 */
export async function signInWithProvider(provider) {
  const redirectUrl = Linking.createURL("auth");
  const authUrl = `${API_URL}/api/auth/${provider}?redirect=${encodeURIComponent(
    redirectUrl
  )}`;

  const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUrl);

  if (result.type !== "success" || !result.url) {
    return { type: result.type }; // "cancel" / "dismiss"
  }

  const { queryParams } = Linking.parse(result.url);

  if (queryParams?.error) {
    throw new Error(String(queryParams.error));
  }

  const token = queryParams?.token;
  const userParam = queryParams?.user;
  if (!token || !userParam) {
    throw new Error("Auth response was missing token or user data");
  }

  return {
    type: "success",
    token: String(token),
    user: JSON.parse(String(userParam)),
  };
}
