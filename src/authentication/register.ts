import supabase from '../utils/supabase'

const envValues = (import.meta as any)?.env ?? {}
const configuredRedirectUrl: string | undefined = envValues.VITE_EMAIL_REDIRECT_TO
const isProdBuild: boolean = !!envValues.PROD
const defaultProdRedirect = 'https://development-platforms-ca-simon.netlify.app/'
const emailRedirectUrl = configuredRedirectUrl || (isProdBuild ? defaultProdRedirect : window.location.origin)

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
        options: { emailRedirectTo: emailRedirectUrl },
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