import sql from "./db.js";

function normalizeUser(row) {
  return {
    id: row.id,
    email: row.email,
    role: row.role ?? "Seller",
    full_name: row.full_name ?? "User",
    username: row.username ?? "",
    profile_image: row.profile_image ?? "",
    status: row.status ?? "Offline",
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
    // Update status to Online
    await sql`UPDATE public.users SET status = 'Online' WHERE user_id = ${authUser.id}`;
    const profileRows = await sql`
      select role, full_name, username, profile_image, status
      from public.users
      where user_id = ${authUser.id}
      limit 1
    `;
    profile = profileRows[0] || {};
  } catch (err) {
    console.warn("Could not update user status to Online:", err);
    profile = {};
  }

  return {
    success: true,
    user: normalizeUser({
      id: authUser.id,
      email: authUser.email,
      role: profile.role,
      full_name: profile.full_name,
      username: profile.username,
      profile_image: profile.profile_image,
      status: "Online"
    }),
  };
}

export async function logout(userId) {
  try {
    await sql`UPDATE public.users SET status = 'Offline' WHERE user_id = ${userId}`;
  } catch (err) {
    console.warn("Could not update user status to Offline:", err);
  }
  return { success: true };
}

export async function getUserProfileFromUsersTable({ id = "", email = "" }) {
  let profileRows = [];
  if (id) {
    profileRows = await sql`
      select user_id as id, email, role, full_name, username, profile_image, status
      from public.users
      where user_id = ${id}
      limit 1
    `;
  } else if (email) {
    profileRows = await sql`
      select user_id as id, email, role, full_name, username, profile_image, status
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
