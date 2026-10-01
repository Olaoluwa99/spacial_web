import {
  accountsUnavailable,
  callbackUrl,
  clearAccountState,
  getSupabaseClient,
  refreshAccount,
  watchAccount,
  type AccountState,
} from "../lib/supabase";
import {
  authErrorMessage,
  safeNextPath,
  validDisplayName,
  metadataDisplayName,
} from "../lib/account-utils";
import "./library";

const page = document.querySelector<HTMLElement>("[data-account-page]");
const routeKinds: Record<string, string> = {
  "/account/": "dashboard",
  "/account/sign-in/": "signin",
  "/account/sign-up/": "signup",
  "/account/forgot-password/": "forgot",
  "/account/reset-password/": "reset",
  "/account/callback/": "callback",
};
const kind = page?.dataset.accountPage || routeKinds[window.location.pathname];
const connection = getSupabaseClient();
const statuses = [
  ...document.querySelectorAll<HTMLElement>("[data-auth-status]"),
];
const loading = document.querySelector<HTMLElement>("[data-account-loading]");
const gate = document.querySelector<HTMLElement>("[data-account-guest]");
const forms = [
  ...document.querySelectorAll<HTMLFormElement>("[data-auth-form]"),
];
const next = safeNextPath(
  new URL(window.location.href).searchParams.get("next"),
);
let active: AccountState = { user: null, loading: false, error: false };
let profileTicket = 0;

function message(text: string, error = false) {
  statuses.forEach((status) => {
    status.textContent = text;
    status.dataset.tone = error ? "error" : "neutral";
  });
}
function lockForm(form: HTMLFormElement, locked: boolean) {
  form
    .querySelectorAll<HTMLInputElement | HTMLButtonElement>("input, button")
    .forEach((element) => {
      element.disabled = locked;
    });
  form.setAttribute("aria-busy", String(locked));
}
function clearPrivateFields() {
  document
    .querySelectorAll<HTMLElement>("[data-account-email], [data-account-name]")
    .forEach((node) => {
      node.textContent = "";
    });
  const name = document.querySelector<HTMLInputElement>(
    '[name="display_name"]',
  );
  if (name) name.value = "";
}
async function displayAccount(state: AccountState) {
  active = state;
  const ticket = ++profileTicket;
  clearPrivateFields();
  document
    .querySelectorAll<HTMLElement>("[data-account-dashboard]")
    .forEach((node) => {
      node.hidden = !state.user;
    });
  if (gate) gate.hidden = Boolean(state.user) || state.loading;
  if (loading) loading.hidden = !state.loading;
  if (!state.user) {
    if (kind === "dashboard" || kind === "reset")
      message(
        state.loading
          ? "Checking your account…"
          : state.error
            ? "We could not verify your account. Check your connection and reload."
            : kind === "reset"
              ? "Open a fresh password reset link in the browser where you requested it."
              : "Sign in to see your profile and saved styles.",
        state.error,
      );
    return;
  }
  document
    .querySelectorAll<HTMLElement>("[data-account-email]")
    .forEach((node) => {
      node.textContent = state.user!.email || "";
    });
  if (kind === "reset") {
    message("Choose your new password.");
    return;
  }
  if (kind !== "dashboard" || !connection) return;
  message("Your account is ready.");
  try {
    let { data, error } = await connection
      .from("profiles")
      .select("display_name")
      .eq("user_id", state.user.id)
      .maybeSingle();
    if (ticket !== profileTicket) return;
    if (error) {
      message("Your profile could not be loaded. Try again later.", true);
      return;
    }
    if (!data) {
      const initialName = metadataDisplayName(
        state.user.user_metadata?.display_name,
      );
      if (initialName) {
        // Metadata is user-editable presentation. Ownership comes only from getUser.
        // Ignore duplicate INSERTs so a newer, existing profile is never overwritten.
        const { error: createError } = await connection
          .from("profiles")
          .upsert(
            { user_id: state.user.id, display_name: initialName },
            { onConflict: "user_id", ignoreDuplicates: true },
          );
        if (ticket !== profileTicket) return;
        if (createError) {
          message(
            "Your profile could not be prepared. Please try again later.",
            true,
          );
          return;
        }
        ({ data, error } = await connection
          .from("profiles")
          .select("display_name")
          .eq("user_id", state.user.id)
          .maybeSingle());
        if (ticket !== profileTicket) return;
        if (error) {
          message("Your profile could not be loaded. Try again later.", true);
          return;
        }
      }
    }
    const name =
      typeof data?.display_name === "string" ? data.display_name : "";
    document
      .querySelectorAll<HTMLElement>("[data-account-name]")
      .forEach((node) => {
        node.textContent = name || "Your account";
      });
    const input = document.querySelector<HTMLInputElement>(
      '[name="display_name"]',
    );
    if (input) input.value = name;
  } catch {
    if (ticket === profileTicket)
      message(
        "Your profile could not be loaded. Check your connection and reload.",
        true,
      );
  }
}

async function callback() {
  const params = new URL(window.location.href).searchParams;
  const code = params.get("code");
  const recovery = params.get("flow") === "recovery";
  const flowId = params.get("sb_flow_id");
  // Remove transient auth material from history immediately, including provider errors.
  window.history.replaceState(null, "", window.location.pathname);
  if (params.has("error") || params.has("error_code")) {
    message(
      "This account link is invalid or expired. Request a new link and open it in the same browser where you started.",
      true,
    );
    return;
  }
  if (!code) {
    message(
      "This link is missing its confirmation code. Request a new email link.",
      true,
    );
    return;
  }
  if (!connection) {
    message(accountsUnavailable);
    return;
  }
  message("Confirming your account…");
  try {
    // The client has detectSessionInUrl:false: this is the only exchange owner.
    const { error } = await connection.auth.exchangeCodeForSession(
      code,
      flowId ? { flowId } : undefined,
    );
    if (error) {
      message(authErrorMessage(error), true);
      return;
    }
    const { data, error: identityError } = await connection.auth.getUser();
    if (identityError || !data.user) {
      message("We could not verify this session. Please sign in again.", true);
      return;
    }
    window.location.replace(recovery ? "/account/reset-password/" : next);
  } catch {
    message(
      "We could not complete that account link. Check your connection and request a fresh link.",
      true,
    );
  }
}

forms.forEach((form) =>
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    void submit(form);
  }),
);
async function submit(form: HTMLFormElement) {
  if (form.getAttribute("aria-busy") === "true" || !form.reportValidity())
    return;
  if (!connection) {
    message(accountsUnavailable);
    return;
  }
  const action = form.dataset.authForm;
  const fields = new FormData(form);
  const email = String(fields.get("email") || "").trim();
  const password = String(fields.get("password") || "");
  const confirm = fields.get("password_confirm");
  if (
    (action === "signup" || action === "reset") &&
    (password.length < 12 || (confirm !== null && password !== String(confirm)))
  ) {
    message(
      password.length < 12
        ? "Choose a password with at least 12 characters."
        : "The passwords do not match.",
      true,
    );
    return;
  }
  const name = validDisplayName(String(fields.get("display_name") || ""));
  if ((action === "profile" || action === "signup") && name === null) {
    message("Enter a display name with 1 to 80 characters.", true);
    return;
  }
  lockForm(form, true);
  message("Working on it…");
  try {
    if (action === "signin") {
      const { error } = await connection.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        message(authErrorMessage(error), true);
        return;
      }
      const { data, error: identityError } = await connection.auth.getUser();
      if (identityError || !data.user) {
        message("We could not verify your sign-in. Please try again.", true);
        return;
      }
      window.location.assign(next);
    } else if (action === "signup") {
      const { data, error } = await connection.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: callbackUrl(next),
          data: { display_name: name },
        },
      });
      if (error) {
        message(authErrorMessage(error), true);
        return;
      }
      form.reset();
      if (data.session) {
        const { data: identity, error: identityError } =
          await connection.auth.getUser();
        if (identityError || !identity.user) {
          message(
            "Your account was created, but its session could not be verified. Please sign in.",
            true,
          );
          return;
        }
        window.location.assign(next);
      } else
        message(
          "Check your email for the confirmation link. Open it in this browser, then return to your account.",
        );
    } else if (action === "forgot") {
      const { error } = await connection.auth.resetPasswordForEmail(email, {
        redirectTo: callbackUrl("/account/", true),
      });
      if (error) {
        message(authErrorMessage(error), true);
        return;
      }
      form.reset();
      message(
        "If an account exists for that email, a reset link is on its way. Open it in this browser.",
      );
    } else if (action === "reset" || action === "profile") {
      const expectedId = active.user?.id;
      if (!expectedId) {
        message("Sign in again before changing your account.", true);
        return;
      }
      const ticket = profileTicket;
      const { data, error } = await connection.auth.getUser();
      if (ticket !== profileTicket) return;
      if (error || data.user?.id !== expectedId) {
        message("Your session changed. Sign in again before continuing.", true);
        return;
      }
      if (action === "reset") {
        const { error: updateError } = await connection.auth.updateUser({
          password,
        });
        if (updateError) {
          message(authErrorMessage(updateError), true);
          return;
        }
        form.reset();
        message("Your password has been updated. Opening your account…");
        window.location.replace("/account/");
      } else {
        const { error: updateError } = await connection
          .from("profiles")
          .upsert(
            { user_id: expectedId, display_name: name },
            { onConflict: "user_id" },
          );
        if (ticket !== profileTicket) return;
        if (updateError) {
          message("Your profile could not be saved. Please try again.", true);
          return;
        }
        message("Your profile has been saved.");
        document
          .querySelectorAll<HTMLElement>("[data-account-name]")
          .forEach((node) => {
            node.textContent = name || "Your account";
          });
      }
    }
  } catch {
    message(
      "We could not complete that request. Check your connection and try again.",
      true,
    );
  } finally {
    lockForm(form, false);
    form
      .querySelectorAll<HTMLInputElement>('input[type="password"]')
      .forEach((input) => {
        input.value = "";
      });
  }
}

document
  .querySelectorAll<HTMLButtonElement>("[data-signout]")
  .forEach((button) =>
    button.addEventListener("click", () => {
      void (async () => {
        if (!connection) {
          message(accountsUnavailable);
          return;
        }
        button.disabled = true;
        clearAccountState();
        try {
          const { error } = await connection.auth.signOut({ scope: "local" });
          if (error) {
            message("Sign-out could not be completed. Please try again.", true);
            return;
          }
          window.location.replace("/account/sign-in/");
        } catch {
          message(
            "Sign-out could not be completed. Check your connection and try again.",
            true,
          );
        } finally {
          button.disabled = false;
        }
      })();
    }),
  );

if (kind === "callback") void callback();
else if (!connection) {
  clearPrivateFields();
  document
    .querySelectorAll<HTMLElement>("[data-account-dashboard]")
    .forEach((node) => {
      node.hidden = true;
    });
  if (gate) gate.hidden = false;
  if (loading) loading.hidden = true;
  forms.forEach((form) => lockForm(form, true));
  message(accountsUnavailable);
} else if (kind === "dashboard" || kind === "reset") {
  watchAccount((state) => {
    void displayAccount(state);
  });
  // INITIAL_SESSION starts verification through the deferred auth event handler.
} else {
  // Forms retain their own result text; auth events must not overwrite confirmations.
  void refreshAccount();
}

document
  .querySelectorAll<HTMLAnchorElement>("[data-account-next-link]")
  .forEach((link) => {
    const url = new URL(link.href, window.location.origin);
    url.searchParams.set("next", next);
    link.href = url.pathname + url.search;
  });
