import { apiBaseUrl } from "./apiBaseUrl";
import { getCsrfToken } from "./getCsrfToken";
import { parseUrl } from "./parseUrl";
import { BroadcastChannel } from "./BroadcastChannel";

const broadcast = BroadcastChannel()

export const __NEXTAUTH = {
    baseUrl: parseUrl(process.env.NEXTAUTH_URL || process.env.VERCEL_URL).origin,
    basePath: parseUrl(process.env.NEXTAUTH_URL).path,
    baseUrlServer: parseUrl(
      process.env.NEXTAUTH_URL_INTERNAL ||
        process.env.NEXTAUTH_URL ||
        process.env.VERCEL_URL
    ).origin,
    basePathServer: parseUrl(
      process.env.NEXTAUTH_URL_INTERNAL || process.env.NEXTAUTH_URL
    ).path,
    _lastSync: 0,
    _session: undefined,
    _getSession: () => {},
  };

  export async function signOutAuth(options) {
    const { callbackUrl = window.location.href } = options ?? {}
    const baseUrl = apiBaseUrl(__NEXTAUTH)
    const fetchOptions = {
      method: "post",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      // @ts-expect-error
      body: new URLSearchParams({
        csrfToken: await getCsrfToken(),
        callbackUrl,
        json: true,
      }),
    }
    const res = await fetch(`${baseUrl}/signout`, fetchOptions)
    const data = await res.json()

    broadcast.post({ event: "session", data: { trigger: "signout" } })

    if (options?.redirect ?? true) {
      const url = data.url ?? callbackUrl
      window.location.href = url
      // If url contains a hash, the browser does not reload the page. We reload manually
      if (url.includes("#")) window.location.reload()
      // @ts-expect-error
      return
    }
    await __NEXTAUTH._getSession({ event: "storage" })
    return data
  }