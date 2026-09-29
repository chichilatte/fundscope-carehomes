import tippy from "tippy.js";
import "tippy.js/dist/tippy.css";

/** Wire the footer CREDITS link to a click-to-open popover (Tippy + Popper). */
export function initCredits(root: HTMLElement): void {
  const link = root.querySelector<HTMLAnchorElement>("#creditsLink");
  const content = root.querySelector<HTMLElement>("#creditsContent");
  if (!link || !content) return;

  link.addEventListener("click", (event) => event.preventDefault());

  tippy(link, {
    content: content.innerHTML,
    trigger: "click",
    interactive: true,
    placement: "top-end",
    allowHTML: true,
    arrow: true,
    animation: false,
    theme: "credits",
    appendTo: document.body,
  });
}
