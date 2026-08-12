(function () {
  "use strict";

  const header = document.querySelector("[data-header]");
  const toggle = document.querySelector("[data-menu-toggle]");
  const menu = document.querySelector("[data-menu]");

  function setMenu(open) {
    if (!toggle || !menu) return;
    toggle.setAttribute("aria-expanded", String(open));
    menu.classList.toggle("is-open", open);
  }

  if (toggle && menu) {
    toggle.addEventListener("click", function () {
      setMenu(toggle.getAttribute("aria-expanded") !== "true");
    });

    menu.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () { setMenu(false); });
    });

    document.addEventListener("click", function (event) {
      if (!header || header.contains(event.target)) return;
      setMenu(false);
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        setMenu(false);
        toggle.focus();
      }
    });
  }

  function updateHeader() {
    if (header) header.classList.toggle("is-scrolled", window.scrollY > 24);
  }

  updateHeader();
  window.addEventListener("scroll", updateHeader, { passive: true });

  document.querySelectorAll("[data-year]").forEach(function (node) {
    node.textContent = String(new Date().getFullYear());
  });

  const revealTargets = document.querySelectorAll(
    ".section-heading, .path-card, .work-card, .journal-card, .about-copy, .about-detail, .contact-card"
  );

  if ("IntersectionObserver" in window && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    revealTargets.forEach(function (node) { node.setAttribute("data-reveal", ""); });
    const observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    }, { rootMargin: "0px 0px -8%", threshold: 0.08 });
    revealTargets.forEach(function (node) { observer.observe(node); });
  }

  const campaign = {};
  const search = new URLSearchParams(window.location.search);
  ["utm_source", "utm_medium", "utm_campaign", "utm_content"].forEach(function (key) {
    const value = search.get(key);
    if (value) campaign[key] = value.slice(0, 120);
  });

  if (Object.keys(campaign).length) {
    try { sessionStorage.setItem("hao0321_attribution", JSON.stringify(campaign)); } catch (_) {}
  } else {
    try { Object.assign(campaign, JSON.parse(sessionStorage.getItem("hao0321_attribution") || "{}")); } catch (_) {}
  }

  document.querySelectorAll("[data-cta]").forEach(function (link) {
    link.addEventListener("click", function () {
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push(Object.assign({
        event: "cta_click",
        cta_name: link.getAttribute("data-cta"),
        cta_url: link.href
      }, campaign));
    });
  });
})();
