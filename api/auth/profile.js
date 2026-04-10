import { getUserProfileFromUsersTable } from "../../server/auth.server.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ success: false, error: "Method not allowed" });
    return;
  }

  try {
    const { id = "", email = "" } = req.body || {};
    if (!id && !email) {
      res.status(400).json({ success: false, error: "Missing user identifier" });
      return;
    }
    const result = await getUserProfileFromUsersTable({ id, email });
    if (!result.success) {
      res.status(404).json({ success: false, error: "User profile not found in database" });
      return;
    }
    res.status(200).json(result);
  } catch {
    res.status(500).json({ success: false, error: "Failed to load user profile" });
  }
}
