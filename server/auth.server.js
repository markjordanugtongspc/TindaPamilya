import sql from "./db.js";

function normalizeUser(row) {
  return {
    id: row.id,
    email: row.email,
    role: row.role ?? "Seller",
    full_name: row.full_name ?? "User",
    profile_image: row.profile_image ?? "",
  };
}

/**
 * Server-side login using direct PostgreSQL connection.
 * Validates credentials against auth.users + public.users.
 */
export async function loginWithPostgres(email, password) {
  const authRows = await sql`
    select
      au.id,
      au.email
    from auth.users as au
    where
      lower(au.email) = lower(${email})
      and au.encrypted_password = crypt(${password}, au.encrypted_password)
    limit 1
  `;

  if (!authRows.length) return { success: false, error: "Wrong email or password" };

  const authUser = authRows[0];
  let profile = {};
  try {
    const profileRows = await sql`
      select role, full_name, profile_image
      from public.users
      where id = ${authUser.id}
      limit 1
    `;
    profile = profileRows[0] || {};
  } catch {
    // Keep login working even if public.users table is absent.
    profile = {};
  }

  return {
    success: true,
    user: normalizeUser({
      id: authUser.id,
      email: authUser.email,
      role: profile.role,
      full_name: profile.full_name,
      profile_image: profile.profile_image,
    }),
  };
}

export async function getUserProfileFromUsersTable({ id = "", email = "" }) {
  let profileRows = [];
  if (id) {
    profileRows = await sql`
      select id, email, role, full_name, profile_image
      from public.users
      where id = ${id}
      limit 1
    `;
  } else if (email) {
    profileRows = await sql`
      select id, email, role, full_name, profile_image
      from public.users
      where lower(email) = lower(${email})
      limit 1
    `;
  }

  if (!profileRows.length) {
    return { success: false, error: "User profile not found" };
  }

  return { success: true, user: normalizeUser(profileRows[0]) };
}
