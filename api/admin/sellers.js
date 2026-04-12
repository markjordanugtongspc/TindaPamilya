import sql from "../../server/db.js";

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      const sellers = await sql`
        SELECT * FROM public.users 
        ORDER BY 
          CASE WHEN lower(role) = 'admin' THEN 0 ELSE 1 END ASC,
          full_name ASC
      `;
      return res.status(200).json({ 
        success: true, 
        data: sellers,
        config: {
          defaultPassword: process.env.SELLER_PASS || ""
        }
      });
    }

    if (req.method === "POST") {
      const { id, fullName, role, status, email, username } = req.body;

      if (!fullName) {
        return res.status(400).json({ success: false, error: "Full name is required" });
      }

      let result;
      if (id) {
        // UPDATE EXISTING: Sync both profile table and Supabase Auth
        // 1. Get the Auth UID first
        const userRows = await sql`SELECT user_id FROM public.users WHERE id = ${id}`;
        if (userRows.length === 0) throw new Error("Seller not found");
        const authUid = userRows[0].user_id;

        if (authUid) {
          // 2. Update Supabase Auth table (Internal)
          await sql`
            UPDATE auth.users
            SET 
              email = ${email},
              raw_user_meta_data = raw_user_meta_data || ${JSON.stringify({ full_name: fullName })},
              updated_at = NOW()
            WHERE id = ${authUid}
          `;
        }

        // 3. Update public profile table
        result = await sql`
          UPDATE public.users
          SET 
            full_name = ${fullName},
            role = ${role},
            status = ${status},
            email = ${email},
            username = ${username || null},
            updated_at = NOW()
          WHERE id = ${id}
          RETURNING *
        `;
      } else {
        // CREATE NEW: We must first create the Auth Identity
        // 1. Generate a new Auth account in Supabase internal table
        const authResult = await sql`
          INSERT INTO auth.users (
            instance_id, id, aud, role, email, 
            encrypted_password, email_confirmed_at, 
            raw_app_meta_data, raw_user_meta_data, 
            created_at, updated_at
          ) VALUES (
            '00000000-0000-0000-0000-000000000000',
            gen_random_uuid(),
            'authenticated',
            'authenticated',
            ${email || null},
            crypt(${process.env.SELLER_PASS || "seller#123"}, gen_salt('bf')),
            NOW(),
            '{"provider":"email","providers":["email"]}',
            ${JSON.stringify({ full_name: fullName })},
            NOW(),
            NOW()
          )
          RETURNING id
        `;

        const authUserId = authResult[0].id;

        // 2. Link the new Auth account to your public profile table
        result = await sql`
          INSERT INTO public.users (
            user_id, full_name, role, status, email, username
          ) VALUES (
            ${authUserId}, ${fullName}, ${role}, ${status}, ${email}, ${username || null}
          )
          RETURNING *
        `;
      }

      return res.status(200).json({ success: true, data: result[0] });
    }

    res.setHeader("Allow", ["GET", "POST"]);
    res.status(405).json({ success: false, error: "Method not allowed" });
  } catch (err) {
    console.error("Sellers API Error:", err);
    // Handle duplicate emails/users gracefully
    if (err.message.includes("unique constraint")) {
       return res.status(400).json({ success: false, error: "Email or Username already exists" });
    }
    res.status(500).json({ success: false, error: err.message });
  }
}
