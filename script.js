document.addEventListener("DOMContentLoaded", () => {
  // Scroll-based section reveal
  const sections = document.querySelectorAll("section");

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
      }
    });
  }, {
    threshold: 0.15,
  });

  sections.forEach(section => observer.observe(section));

  // Remove intro splash after fade
  setTimeout(() => {
    const intro = document.getElementById("intro");
    if (intro) intro.style.display = "none";
  }, 4500);
});
