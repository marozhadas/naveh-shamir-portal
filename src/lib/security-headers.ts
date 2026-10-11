/**
 * Conservative response headers for every route. Deliberately NO Content-Security-Policy here (a CSP needs its own
 * rollout and testing).
 *
 * Permissions-Policy only switches off browser features this site never uses (camera, microphone, geolocation and
 * device sensors). Uploads use plain <input type="file">, which is not governed by it, and the `payment` feature is left
 * untouched so PayMe's hosted fields keep working when billing goes live.
 */
export const SECURITY_HEADERS: { key: string; value: string }[] = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), accelerometer=(), gyroscope=(), magnetometer=(), usb=(), bluetooth=(), serial=()" },
];
