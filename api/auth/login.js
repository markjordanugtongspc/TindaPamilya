import { loginWithPostgres } from "../../server/auth.server.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ success: false, error: "Method not allowed" });
    return;
  }

  try {
    const { email = "", password = "" } = req.body || {};
    if (!email || !password) {
      res.status(400).json({ success: false, error: "Wrong email or password" });
      return;
    }

    const result = await loginWithPostgres(email, password);
    if (!result.success) {
      res.status(401).json(result);
      return;
    }

    res.status(200).json(result);
  } catch {
    res.status(500).json({ success: false, error: "Wrong email or password" });
  }
}
