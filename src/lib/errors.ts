// Friendly error messages — never expose technical details to users

export function friendlyError(err: any): string {
  const msg = (err?.message ?? String(err ?? "")).toLowerCase();

  // Network / connectivity
  if (msg.includes("fetch") || msg.includes("network") || msg.includes("failed to fetch") || msg.includes("networkerror"))
    return "Connection problem — check your signal and try again";
  if (msg.includes("timeout") || msg.includes("timed out"))
    return "That took too long — check your connection and try again";

  // Auth
  if (msg.includes("not authenticated") || msg.includes("jwt") || msg.includes("session"))
    return "Your session has expired — please log in again";
  if (msg.includes("row level security") || msg.includes("permission") || msg.includes("unauthorized") || msg.includes("403"))
    return "You don't have permission to do that";

  // Stripe / billing
  if (msg.includes("stripe") || msg.includes("price id") || msg.includes("customer") || msg.includes("checkout"))
    return "Something went wrong with billing — please try again or contact support";
  if (msg.includes("payment") || msg.includes("card"))
    return "Payment failed — please check your details and try again";

  // Storage
  if (msg.includes("storage") || msg.includes("bucket") || msg.includes("object"))
    return "File upload failed — check your connection and try again";
  if (msg.includes("too large") || msg.includes("payload too large"))
    return "File is too large — please try a smaller file";

  // Database
  if (msg.includes("duplicate") || msg.includes("unique constraint") || msg.includes("already exists"))
    return "That already exists — try a different name";
  if (msg.includes("foreign key") || msg.includes("violates"))
    return "Something went wrong — please refresh and try again";
  if (msg.includes("not found") || msg.includes("no rows"))
    return "That couldn't be found — it may have been deleted";

  // Generic
  return "Something went wrong — please try again";
}

export function friendlyAuthError(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes("invalid login") || m.includes("invalid credentials") || m.includes("wrong password"))
    return "Incorrect email or password";
  if (m.includes("email not confirmed") || m.includes("not verified"))
    return "Please check your email and click the confirmation link first";
  if (m.includes("user not found") || m.includes("no user"))
    return "No account found with that email address";
  if (m.includes("email already") || m.includes("already registered") || m.includes("already in use"))
    return "An account with that email already exists";
  if (m.includes("password") && m.includes("short"))
    return "Password must be at least 6 characters";
  if (m.includes("rate limit") || m.includes("too many"))
    return "Too many attempts — please wait a minute and try again";
  if (m.includes("network") || m.includes("fetch"))
    return "Connection problem — check your signal and try again";
  return "Something went wrong — please try again";
}
