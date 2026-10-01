import { styles, releaseFor, type StyleId } from "../data/styles";
import {
  accountsUnavailable,
  getSupabaseClient,
  watchAccount,
  type AccountState,
} from "../lib/supabase";

const styleById = new Map(styles.map((style) => [style.id, style]));
const saveButtons = [
  ...document.querySelectorAll<HTMLButtonElement>("[data-save-style]"),
];
const list = document.querySelector<HTMLElement>("[data-library-list]");
const empty = document.querySelector<HTMLElement>("[data-library-empty]");
const libraryStatus = document.querySelector<HTMLElement>(
  "[data-library-status]",
);
let current: AccountState = { user: null, loading: false, error: false };
let generation = 0;
let saved = new Set<StyleId>();
const pending = new Set<StyleId>();
const connection = getSupabaseClient();

function setStatus(message: string) {
  if (libraryStatus) libraryStatus.textContent = message;
  document
    .querySelectorAll<HTMLElement>("[data-save-status]")
    .forEach((node) => {
      node.textContent = message;
    });
}
function updateButtons() {
  saveButtons.forEach((button) => {
    const id = button.dataset.saveStyle as StyleId;
    const isSaved = saved.has(id);
    button.disabled = !connection || current.loading || pending.has(id);
    button.setAttribute("aria-pressed", String(isSaved));
    button.textContent = !connection
      ? "Library opening soon"
      : pending.has(id)
        ? "Saving…"
        : isSaved
          ? "Saved to your library"
          : "Save to library";
  });
}
function renderLibrary() {
  if (!list) return;
  list.replaceChildren();
  saved.forEach((id) => {
    const style = styleById.get(id);
    if (!style) return;
    const card = document.createElement("article");
    card.className = "saved-style-card";
    const heading = document.createElement("h3");
    const link = document.createElement("a");
    link.href = `/styles/${id}/`;
    link.textContent = style.name;
    heading.append(link);
    const description = document.createElement("p");
    description.textContent = style.tagline;
    const label = document.createElement("span");
    label.className = "eyebrow";
    label.textContent = style.category;
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "button button-light";
    remove.textContent = "Remove";
    remove.setAttribute("aria-label", `Remove ${style.name} from your library`);
    remove.disabled = pending.has(id);
    remove.addEventListener("click", () => {
      void toggleStyle(id);
    });
    const image = document.createElement("img");
    image.src = releaseFor(id).reference;
    image.alt = "";
    image.loading = "lazy";
    card.append(image, label, heading, description, remove);
    list.append(card);
  });
  if (empty) empty.hidden = saved.size > 0 || !current.user;
}

async function loadLibrary(state: AccountState) {
  current = state;
  const ticket = ++generation;
  saved.clear();
  pending.clear();
  renderLibrary();
  updateButtons();
  if (!connection || !state.user) {
    setStatus(
      !connection
        ? accountsUnavailable
        : state.loading
          ? "Checking your account…"
          : state.error
            ? "We could not verify your account. Try reloading before saving styles."
            : "Sign in to keep your favourite styles together.",
    );
    return;
  }
  setStatus("Loading your library…");
  try {
    const { data, error } = await connection
      .from("saved_styles")
      .select("style_id")
      .eq("user_id", state.user.id)
      .order("created_at", { ascending: false });
    if (ticket !== generation) return;
    if (error) {
      setStatus("Your library is unavailable. Please try again later.");
      return;
    }
    saved = new Set(
      (data || [])
        .map((row) => row.style_id)
        .filter((id): id is StyleId => styleById.has(id)),
    );
    renderLibrary();
    updateButtons();
    setStatus(
      saved.size
        ? `${saved.size} ${saved.size === 1 ? "style" : "styles"} in your library.`
        : "Your library is ready for its first style.",
    );
  } catch {
    if (ticket === generation)
      setStatus(
        "Your library could not be loaded. Check your connection and reload.",
      );
  }
}

async function toggleStyle(id: StyleId) {
  if (!styleById.has(id) || pending.has(id)) return;
  if (!connection) {
    setStatus(accountsUnavailable);
    return;
  }
  if (current.loading) return;
  if (!current.user) {
    if (current.error) {
      setStatus("We could not verify your account. Reload and try again.");
      return;
    }
    const next = `/styles/${id}/`;
    window.location.assign(
      `/account/sign-in/?next=${encodeURIComponent(next)}`,
    );
    return;
  }
  const userId = current.user.id;
  const ticket = generation;
  const removing = saved.has(id);
  pending.add(id);
  updateButtons();
  renderLibrary();
  try {
    const { data: identity, error: identityError } =
      await connection.auth.getUser();
    if (ticket !== generation) return;
    if (identityError || identity.user?.id !== userId) {
      setStatus("Your session changed. Sign in again to update your library.");
      return;
    }
    const response = removing
      ? await connection
          .from("saved_styles")
          .delete()
          .eq("user_id", userId)
          .eq("style_id", id)
      : await connection
          .from("saved_styles")
          .upsert(
            { user_id: userId, style_id: id },
            { onConflict: "user_id,style_id", ignoreDuplicates: true },
          );
    if (ticket !== generation) return;
    if (response.error) {
      setStatus("That style could not be saved. Please try again.");
      return;
    }
    if (removing) saved.delete(id);
    else saved.add(id);
    setStatus(
      removing
        ? `${styleById.get(id)!.name} removed from your library.`
        : `${styleById.get(id)!.name} saved to your library.`,
    );
  } catch {
    if (ticket === generation)
      setStatus(
        "Your library could not be updated. Check your connection and try again.",
      );
  } finally {
    if (ticket === generation) {
      pending.delete(id);
      updateButtons();
      renderLibrary();
    }
  }
}

saveButtons.forEach((button) =>
  button.addEventListener("click", () => {
    void toggleStyle(button.dataset.saveStyle as StyleId);
  }),
);
if (saveButtons.length || list)
  watchAccount((state) => {
    void loadLibrary(state);
  });
