import supabase from '../utils/supabase'

const registerForm = document.querySelector<HTMLFormElement>("form");

if (registerForm) {
  registerForm.addEventListener("submit", async function (e) {
    e.preventDefault();

    const form = e.currentTarget as HTMLFormElement;
    const formData = new FormData(form);
    const email = String(formData.get("email") || "").trim();
    const password = String(formData.get("password") || "");

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        // handler error
      }

      if (data.user) {
        // display a message to the user or redirect
      }
    } catch (error) {
      // handler error
    }
  });
}