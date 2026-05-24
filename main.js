const root = document.documentElement;
const toggle = document.querySelector(".theme-toggle");
const themeMeta = document.querySelector('meta[name="theme-color"]');
const heroTitle = document.querySelector(".hero__title");
const storageKey = "portfolio-theme";

const themes = {
  dark: {
    label: "Switch to light theme",
    color: "#050505",
  },
  light: {
    label: "Switch to dark theme",
    color: "#f5f0e8",
  },
};

function getPreferredTheme() {
  const savedTheme = localStorage.getItem(storageKey);

  if (savedTheme === "dark" || savedTheme === "light") {
    return savedTheme;
  }

  return window.matchMedia("(prefers-color-scheme: light)").matches
    ? "light"
    : "dark";
}

function setTheme(theme) {
  root.dataset.theme = theme;
  toggle.setAttribute("aria-label", themes[theme].label);
  toggle.setAttribute("aria-pressed", theme === "light");
  themeMeta.setAttribute("content", themes[theme].color);
  localStorage.setItem(storageKey, theme);
}

setTheme(getPreferredTheme());

toggle.addEventListener("click", () => {
  const nextTheme = root.dataset.theme === "dark" ? "light" : "dark";
  setTheme(nextTheme);
});

function initMagneticTitle() {
  if (!heroTitle) {
    return;
  }

  const reduceMotionQuery = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  );
  const desktopQuery = window.matchMedia(
    "(hover: hover) and (pointer: fine) and (min-width: 1200px)",
  );
  const titleText = heroTitle.textContent.trim().replace(/\s+/g, " ");
  const pointer = {
    x: 0,
    y: 0,
    active: false,
    lastAngle: -Math.PI / 2,
  };
  const config = {
    radius: 120,
    avoidRadius: 28,
    maxPush: 14,
    spring: 0.16,
    friction: 0.78,
    settle: 0.03,
  };

  let letters = [];
  let frameId = 0;
  let enabled = false;
  let titleRect = null;

  function splitTitle() {
    heroTitle.setAttribute("aria-label", titleText);
    heroTitle.textContent = "";

    titleText.split(" ").forEach((word, wordIndex, words) => {
      const wordElement = document.createElement("span");
      wordElement.className = "hero__title-word";
      wordElement.setAttribute("aria-hidden", "true");

      [...word].forEach((character) => {
        const letterElement = document.createElement("span");
        letterElement.className = "hero__title-letter";
        letterElement.textContent = character;
        wordElement.append(letterElement);
      });

      heroTitle.append(wordElement);

      if (wordIndex < words.length - 1) {
        const spaceElement = document.createElement("span");
        spaceElement.className = "hero__title-space";
        spaceElement.setAttribute("aria-hidden", "true");
        heroTitle.append(spaceElement);
      }
    });

    letters = [...heroTitle.querySelectorAll(".hero__title-letter")].map(
      (element) => ({
        element,
        baseX: 0,
        baseY: 0,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        targetX: 0,
        targetY: 0,
      }),
    );
  }

  function resetLetters() {
    letters.forEach((letter) => {
      letter.x = 0;
      letter.y = 0;
      letter.vx = 0;
      letter.vy = 0;
      letter.targetX = 0;
      letter.targetY = 0;
      letter.element.style.transform = "translate3d(0, 0, 0)";
    });
  }

  function measureLetters() {
    titleRect = heroTitle.getBoundingClientRect();

    letters.forEach((letter) => {
      const previousTransform = letter.element.style.transform;
      letter.element.style.transform = "translate3d(0, 0, 0)";
      const rect = letter.element.getBoundingClientRect();

      letter.baseX = rect.left + rect.width / 2;
      letter.baseY = rect.top + rect.height / 2;
      letter.element.style.transform = previousTransform;
    });
  }

  function isNearTitle() {
    if (!titleRect) {
      return false;
    }

    return (
      pointer.x >= titleRect.left - config.radius &&
      pointer.x <= titleRect.right + config.radius &&
      pointer.y >= titleRect.top - config.radius &&
      pointer.y <= titleRect.bottom + config.radius
    );
  }

  function updateTargets() {
    const nearTitle = pointer.active && isNearTitle();

    letters.forEach((letter) => {
      if (!nearTitle) {
        letter.targetX = 0;
        letter.targetY = 0;
        return;
      }

      let dx = letter.baseX - pointer.x;
      let dy = letter.baseY - pointer.y;
      let distance = Math.hypot(dx, dy);

      if (distance < 0.001) {
        dx = Math.cos(pointer.lastAngle);
        dy = Math.sin(pointer.lastAngle);
        distance = 1;
      }

      const influence = Math.max(0, 1 - distance / config.radius);

      if (influence === 0) {
        letter.targetX = 0;
        letter.targetY = 0;
        return;
      }

      const directionX = dx / distance;
      const directionY = dy / distance;
      const easedInfluence = influence * influence * (3 - 2 * influence);
      const clearancePush = Math.max(0, config.avoidRadius - distance);
      const push = clearancePush + easedInfluence * config.maxPush;

      letter.targetX = directionX * push;
      letter.targetY = directionY * push;
    });
  }

  function render() {
    let moving = false;

    updateTargets();

    letters.forEach((letter) => {
      const ax = (letter.targetX - letter.x) * config.spring;
      const ay = (letter.targetY - letter.y) * config.spring;

      letter.vx = (letter.vx + ax) * config.friction;
      letter.vy = (letter.vy + ay) * config.friction;
      letter.x += letter.vx;
      letter.y += letter.vy;

      if (
        Math.abs(letter.x) > config.settle ||
        Math.abs(letter.y) > config.settle ||
        Math.abs(letter.vx) > config.settle ||
        Math.abs(letter.vy) > config.settle ||
        Math.abs(letter.targetX) > config.settle ||
        Math.abs(letter.targetY) > config.settle
      ) {
        moving = true;
      } else {
        letter.x = 0;
        letter.y = 0;
        letter.vx = 0;
        letter.vy = 0;
      }

      letter.element.style.transform = `translate3d(${letter.x.toFixed(3)}px, ${letter.y.toFixed(3)}px, 0)`;
    });

    if (moving && enabled) {
      frameId = requestAnimationFrame(render);
    } else {
      frameId = 0;
    }
  }

  function requestRender() {
    if (enabled && !frameId) {
      frameId = requestAnimationFrame(render);
    }
  }

  function handlePointerMove(event) {
    const movementDistance = Math.hypot(event.movementX, event.movementY);

    pointer.x = event.clientX;
    pointer.y = event.clientY;
    pointer.active = true;

    if (movementDistance > 0.1) {
      pointer.lastAngle = Math.atan2(event.movementY, event.movementX);
    }

    requestRender();
  }

  function handlePointerLeave() {
    pointer.active = false;
    requestRender();
  }

  function enable() {
    if (enabled) {
      return;
    }

    enabled = true;
    measureLetters();
    window.addEventListener("pointermove", handlePointerMove, {
      passive: true,
    });
    document.addEventListener("mouseleave", handlePointerLeave);
    requestRender();
  }

  function disable() {
    if (!enabled) {
      return;
    }

    enabled = false;
    pointer.active = false;
    window.removeEventListener("pointermove", handlePointerMove);
    document.removeEventListener("mouseleave", handlePointerLeave);

    if (frameId) {
      cancelAnimationFrame(frameId);
      frameId = 0;
    }

    resetLetters();
  }

  function syncState() {
    if (desktopQuery.matches && !reduceMotionQuery.matches) {
      enable();
    } else {
      disable();
    }
  }

  splitTitle();
  syncState();

  window.addEventListener(
    "resize",
    () => {
      if (!enabled) {
        syncState();
        return;
      }

      resetLetters();
      measureLetters();
      requestRender();
      syncState();
    },
    { passive: true },
  );

  desktopQuery.addEventListener("change", syncState);
  reduceMotionQuery.addEventListener("change", syncState);

  if (document.fonts) {
    document.fonts.ready.then(() => {
      if (enabled) {
        resetLetters();
        measureLetters();
      }
    });
  }
}

initMagneticTitle();
