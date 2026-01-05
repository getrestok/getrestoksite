import { adminAuth } from "@/lib/firebaseAdmin";

export async function requireInternalAdmin(idToken: string) {
  const decoded = await adminAuth.verifyIdToken(idToken);

  if (!decoded.internalAdmin) {
    throw new Error("Unauthorized");
  }

  return decoded;
}