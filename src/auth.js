import { supabase } from "./supabaseClient.js";

const ERROR_MESSAGES = {
  "Invalid login credentials": "Имэйл эсвэл нууц үг буруу байна.",
  "User already registered": "Энэ имэйл хаягаар аль хэдийн бүртгүүлсэн байна.",
  "Password should be at least 6 characters": "Нууц үг дор хаяж 6 тэмдэгт байх ёстой.",
  "Email not confirmed": "Имэйл хаягаа баталгаажуулна уу — имэйл рүүгээ орж илгээсэн линк дээр дарна уу.",
  "Unable to validate email address: invalid format": "Имэйл хаягийн формат буруу байна.",
  "Auth session missing!": "Нэвтэрсэн байдал дууссан байна. Гарч, дахин нэвтэрнэ үү.",
  "Email rate limit exceeded": "Имэйл хэт олон удаа илгээгдсэн байна. Хэдэн минутын дараа дахин оролдоно уу.",
};
function translate(msg) {
  if (ERROR_MESSAGES[msg]) return ERROR_MESSAGES[msg];
  if (/for security purposes.*after \d+ seconds/i.test(msg || "")) {
    return "Хэсэг хугацааны дараа дахин оролдоно уу.";
  }
  return msg;
}

async function requireSession() {
  let { data: { session } } = await supabase.auth.getSession();
  const expiresAt = session?.expires_at ? session.expires_at * 1000 : 0;
  const soonExpired = !session || !expiresAt || expiresAt - Date.now() < 60_000;
  if (soonExpired) {
    const { data: refreshed } = await supabase.auth.refreshSession();
    if (refreshed?.session) session = refreshed.session;
  }
  if (!session) throw new Error(translate("Auth session missing!"));
  return session;
}

export function shapeAuthUser(u) {
  if (!u) return null;
  return {
    id: u.id,
    name: u.user_metadata?.name || u.email.split("@")[0],
    email: u.email,
    phone: u.user_metadata?.phone || "",
    address: u.user_metadata?.address || "",
    locationUrl: u.user_metadata?.location_url || "",
    provider: u.app_metadata?.provider || "email",
  };
}

export async function registerWithEmail(name, email, password) {
  const { data, error } = await supabase.auth.signUp({
    email, password,
    options: { data: { name: name || email.split("@")[0] } },
  });
  if (error) throw new Error(translate(error.message));
  return data; // data.session is null if email confirmation is required
}

export async function loginWithEmail(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(translate(error.message));
  return data;
}

export async function loginWithFacebook() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "facebook",
    options: { redirectTo: window.location.origin },
  });
  if (error) throw new Error(translate(error.message));
}

export async function sendPasswordReset(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin,
  });
  if (error) throw new Error(translate(error.message));
}

export async function updatePassword(password) {
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw new Error(translate(error.message));
}

export async function updateProfile({ name, phone, address, locationUrl }) {
  await requireSession();
  const data = {};
  if (name !== undefined) data.name = name;
  if (phone !== undefined) data.phone = phone;
  if (address !== undefined) data.address = address;
  if (locationUrl !== undefined) data.location_url = locationUrl;
  const { data: res, error } = await supabase.auth.updateUser({ data });
  if (error) throw new Error(translate(error.message));
  return shapeAuthUser(res.user);
}

export async function deleteAccount() {
  const session = await requireSession();
  const { data, error } = await supabase.functions.invoke("delete-account", {
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
  if (error) throw new Error(translate(error.message));
  if (data?.error) throw new Error(translate(data.error));
  await supabase.auth.signOut();
}

export async function logout() {
  await supabase.auth.signOut();
}
