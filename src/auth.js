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
    name: u.user_metadata?.name || u.email.split("@")[0],
    email: u.email,
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

export async function logout() {
  await supabase.auth.signOut();
}
