import { supabase } from "./supabaseClient.js";

const ERROR_MESSAGES = {
  "Invalid login credentials": "Имэйл эсвэл нууц үг буруу байна.",
  "User already registered": "Энэ имэйл хаягаар аль хэдийн бүртгүүлсэн байна.",
  "Password should be at least 6 characters": "Нууц үг дор хаяж 6 тэмдэгт байх ёстой.",
  "Email not confirmed": "Имэйл хаягаа баталгаажуулна уу — имэйл рүүгээ орж илгээсэн линк дээр дарна уу.",
  "Unable to validate email address: invalid format": "Имэйл хаягийн формат буруу байна.",
};
function translate(msg) {
  return ERROR_MESSAGES[msg] || msg;
}

export function shapeAuthUser(u) {
  if (!u) return null;
  return {
    id: u.id,
    name: u.user_metadata?.name || u.email.split("@")[0],
    email: u.email,
    phone: u.user_metadata?.phone || "",
    address: u.user_metadata?.address || "",
    avatarUrl: u.user_metadata?.avatar_url || "",
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

export async function updateProfile({ name, phone, address, avatarUrl }) {
  const data = {};
  if (name !== undefined) data.name = name;
  if (phone !== undefined) data.phone = phone;
  if (address !== undefined) data.address = address;
  if (avatarUrl !== undefined) data.avatar_url = avatarUrl;
  const { data: res, error } = await supabase.auth.updateUser({ data });
  if (error) throw new Error(translate(error.message));
  return shapeAuthUser(res.user);
}

export async function uploadAvatar(file, userId) {
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const path = `${userId}/${Date.now()}.${ext}`;
  const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, { contentType: file.type, upsert: true });
  if (upErr) throw new Error(translate(upErr.message));
  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  return data.publicUrl;
}

export async function deleteAccount() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Нэвтрээгүй байна.");
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
