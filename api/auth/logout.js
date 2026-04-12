import { logout } from "../../server/auth.server.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ success: false, error: "Method not allowed" });
    return;
  }

  const { id } = req.body || {};
  if (id) {
     await logout(id);
  }

  res.status(200).json({ success: true });
}
