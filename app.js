(() => {
  'use strict';

  const doc = document.documentElement;
  const body = document.body;
  const main = document.querySelector('main');
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  const reduceQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const fineQuery = window.matchMedia('(hover: hover) and (pointer: fine)');
  const reduced = reduceQuery.matches;
  const fine = fineQuery.matches;
  const hasIO = 'IntersectionObserver' in window;

  /* ------------------------------------------------------------
     Intro curtain
     ------------------------------------------------------------ */
  const intro = $('#intro');
  let introFinished = false;

  const finishIntro = () => {
    if (introFinished) return;
    introFinished = true;

    doc.classList.remove('is-locked');
    body.classList.add('is-ready');

    if (intro) {
      intro.classList.add('is-done');
      window.setTimeout(() => intro.remove(), 1200);
    }
  };

  if (!intro || reduced || location.hash) {
    if (intro) intro.remove();
    introFinished = true;
    body.classList.add('is-ready');
    doc.classList.remove('is-locked');
  } else {
    doc.classList.add('is-locked');
    window.setTimeout(finishIntro, 1700);
    window.addEventListener('load', () => window.setTimeout(finishIntro, 450), { once: true });
  }

  /* ------------------------------------------------------------
     Split headlines into words
     ------------------------------------------------------------ */
  const splitWords = (root) => {
    if (!hasIO) return;

    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        return node.nodeValue.trim()
          ? NodeFilter.FILTER_ACCEPT
          : NodeFilter.FILTER_REJECT;
      }
    });

    const textNodes = [];
    while (walker.nextNode()) textNodes.push(walker.currentNode);

    textNodes.forEach((node) => {
      const fragment = document.createDocumentFragment();

      node.nodeValue.split(/(\s+)/).forEach((part) => {
        if (!part) return;

        if (/^\s+$/.test(part)) {
          fragment.appendChild(document.createTextNode(part));
          return;
        }

        const word = document.createElement('span');
        word.className = 'w';

        const inner = document.createElement('span');
        inner.className = 'w-i';
        inner.textContent = part;

        word.appendChild(inner);
        fragment.appendChild(word);
      });

      node.parentNode.replaceChild(fragment, node);
    });

    $$('.w-i', root).forEach((word, index) => {
      word.style.transitionDelay = `${Math.min(index * 0.017, 0.55).toFixed(3)}s`;
    });

    root.classList.add('split');
  };

  if (!reduced) {
    $$('[data-split]').forEach(splitWords);
  }

  /* ------------------------------------------------------------
     Scroll reveals
     ------------------------------------------------------------ */
  const revealEls = $$('.reveal, [data-split]');

  if (hasIO && !reduced) {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        observer.unobserve(entry.target);
      });
    }, {
      threshold: 0.08,
      rootMargin: '0px 0px -7% 0px'
    });

    revealEls.forEach((el) => revealObserver.observe(el));

    window.setTimeout(() => {
      revealEls.forEach((el) => {
        const rect = el.getBoundingClientRect();
        if (rect.top < window.innerHeight * 1.1) el.classList.add('is-in');
      });
    }, 2600);
  } else {
    revealEls.forEach((el) => el.classList.add('is-in'));
  }

  /* ------------------------------------------------------------
     Active process step
     ------------------------------------------------------------ */
  const steps = $$('.step');

  if (hasIO && !reduced && steps.length) {
    const stepObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        steps.forEach((step) => step.classList.toggle('is-active', step === entry.target));
      });
    }, { rootMargin: '-36% 0px -46% 0px' });

    steps.forEach((step) => stepObserver.observe(step));
  } else {
    steps.forEach((step) => step.classList.add('is-active'));
  }

  /* ------------------------------------------------------------
     Scroll progress, nav state, active link
     ------------------------------------------------------------ */
  const progressBar = $('.progress__bar');
  const nav = $('#nav');
  const sections = $$('main section[id]');
  const navLinks = $$('.nav__links a');
  let scrollTicking = false;

  const onScrollFrame = () => {
    scrollTicking = false;
    const y = window.scrollY;
    const vh = window.innerHeight;

    if (progressBar) {
      const max = doc.scrollHeight - vh;
      progressBar.style.transform = `scaleX(${max > 0 ? Math.min(y / max, 1) : 0})`;
    }

    if (nav) nav.classList.toggle('is-scrolled', y > 32);

    if (navLinks.length) {
      let activeId = '';
      sections.forEach((section) => {
        if (section.getBoundingClientRect().top <= vh * 0.45) activeId = section.id;
      });
      navLinks.forEach((link) => {
        link.classList.toggle('is-active', link.getAttribute('href') === `#${activeId}`);
      });
    }
  };

  const requestScrollFrame = () => {
    if (scrollTicking) return;
    scrollTicking = true;
    window.requestAnimationFrame(onScrollFrame);
  };

  window.addEventListener('scroll', requestScrollFrame, { passive: true });
  onScrollFrame();

  /* ------------------------------------------------------------
     Parallax (cached document positions)
     ------------------------------------------------------------ */
  const parallaxItems = reduced
    ? []
    : $$('[data-parallax]').map((el) => ({
        el,
        speed: Number.parseFloat(el.dataset.parallax) || 0.08,
        top: 0,
        height: 0
      }));

  const measureParallax = () => {
    parallaxItems.forEach((item) => {
      const previous = item.el.style.transform;
      item.el.style.transform = 'none';
      const rect = item.el.getBoundingClientRect();
      item.top = rect.top + window.scrollY;
      item.height = rect.height;
      item.el.style.transform = previous;
    });
  };

  let parallaxTicking = false;

  const updateParallax = () => {
    if (parallaxTicking || !parallaxItems.length) return;
    parallaxTicking = true;

    window.requestAnimationFrame(() => {
      parallaxTicking = false;
      const vh = window.innerHeight;
      const y = window.scrollY;

      parallaxItems.forEach((item) => {
        if (item.top + item.height < y - vh || item.top > y + vh * 2) return;
        const center = item.top + item.height / 2 - y - vh / 2;
        const offset = Math.max(-150, Math.min(150, center * item.speed));
        item.el.style.transform = `translate3d(0, ${offset.toFixed(2)}px, 0)`;
      });
    });
  };

  if (parallaxItems.length) {
    measureParallax();
    updateParallax();
    window.addEventListener('scroll', updateParallax, { passive: true });
    window.addEventListener('resize', () => {
      window.requestAnimationFrame(() => {
        measureParallax();
        updateParallax();
      });
    }, { passive: true });
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => {
        measureParallax();
        updateParallax();
      });
    }
  }

  /* ------------------------------------------------------------
     Hero pointer parallax
     ------------------------------------------------------------ */
  if (fine && !reduced) {
    const stage = $('.hero__stage');
    const word = $('.hero__word');
    const object = $('.hero__object-inner');

    if (stage && word) {
      let targetX = 0;
      let targetY = 0;
      let currentX = 0;
      let currentY = 0;
      let heroRaf = null;

      const heroLoop = () => {
        currentX += (targetX - currentX) * 0.07;
        currentY += (targetY - currentY) * 0.07;

        word.style.transform = `translate3d(${(-currentX * 16).toFixed(2)}px, ${(-currentY * 8).toFixed(2)}px, 0)`;
        if (object) {
          object.style.transform = `translate3d(${(currentX * 24).toFixed(2)}px, ${(currentY * 16).toFixed(2)}px, 0)`;
        }

        if (Math.abs(targetX - currentX) > 0.001 || Math.abs(targetY - currentY) > 0.001) {
          heroRaf = window.requestAnimationFrame(heroLoop);
        } else {
          heroRaf = null;
        }
      };

      stage.addEventListener('pointermove', (event) => {
        const rect = stage.getBoundingClientRect();
        targetX = (event.clientX - rect.left) / rect.width - 0.5;
        targetY = (event.clientY - rect.top) / rect.height - 0.5;
        if (!heroRaf) heroRaf = window.requestAnimationFrame(heroLoop);
      }, { passive: true });

      stage.addEventListener('pointerleave', () => {
        targetX = 0;
        targetY = 0;
        if (!heroRaf) heroRaf = window.requestAnimationFrame(heroLoop);
      });
    }
  }

  /* ------------------------------------------------------------
     Card tilt
     ------------------------------------------------------------ */
  if (fine && !reduced) {
    $$('[data-tilt]').forEach((card) => {
      const inner = $('.card__tilt', card);
      if (!inner) return;

      let targetX = 0;
      let targetY = 0;
      let currentX = 0;
      let currentY = 0;
      let raf = null;

      const loop = () => {
        currentX += (targetX - currentX) * 0.09;
        currentY += (targetY - currentY) * 0.09;
        inner.style.transform = `rotateX(${(-currentY * 4.5).toFixed(2)}deg) rotateY(${(currentX * 5.5).toFixed(2)}deg)`;

        if (Math.abs(targetX - currentX) > 0.002 || Math.abs(targetY - currentY) > 0.002) {
          raf = window.requestAnimationFrame(loop);
        } else {
          raf = null;
        }
      };

      card.addEventListener('pointermove', (event) => {
        const rect = card.getBoundingClientRect();
        targetX = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
        targetY = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
        if (!raf) raf = window.requestAnimationFrame(loop);
      }, { passive: true });

      card.addEventListener('pointerleave', () => {
        targetX = 0;
        targetY = 0;
        if (!raf) raf = window.requestAnimationFrame(loop);
      });
    });
  }

  /* ------------------------------------------------------------
     Magnetic elements
     ------------------------------------------------------------ */
  if (fine && !reduced) {
    $$('[data-magnetic]').forEach((el) => {
      let targetX = 0;
      let targetY = 0;
      let currentX = 0;
      let currentY = 0;
      let raf = null;

      const loop = () => {
        currentX += (targetX - currentX) * 0.2;
        currentY += (targetY - currentY) * 0.2;
        el.style.transform = `translate3d(${currentX.toFixed(2)}px, ${currentY.toFixed(2)}px, 0)`;

        if (Math.abs(targetX - currentX) > 0.01 || Math.abs(targetY - currentY) > 0.01) {
          raf = window.requestAnimationFrame(loop);
        } else {
          raf = null;
        }
      };

      el.addEventListener('pointermove', (event) => {
        const rect = el.getBoundingClientRect();
        targetX = Math.max(-10, Math.min(10, (event.clientX - (rect.left + rect.width / 2)) * 0.22));
        targetY = Math.max(-8, Math.min(8, (event.clientY - (rect.top + rect.height / 2)) * 0.22));
        if (!raf) raf = window.requestAnimationFrame(loop);
      }, { passive: true });

      el.addEventListener('pointerleave', () => {
        targetX = 0;
        targetY = 0;
        if (!raf) raf = window.requestAnimationFrame(loop);
      });
    });
  }

  /* ------------------------------------------------------------
     Custom cursor
     ------------------------------------------------------------ */
  const cursor = $('.cursor');

  if (cursor && fine && !reduced) {
    const dot = $('.cursor__dot', cursor);
    const ring = $('.cursor__ring', cursor);
    const label = $('.cursor__label', cursor);

    body.classList.add('has-cursor');

    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let ringX = mouseX;
    let ringY = mouseY;
    let raf = null;
    let visible = false;

    const setLabelPosition = () => {
      if (!label) return;
      label.style.transform = `translate3d(${ringX + 20}px, ${ringY + 22}px, 0)`;
    };

    const loop = () => {
      ringX += (mouseX - ringX) * 0.18;
      ringY += (mouseY - ringY) * 0.18;

      if (ring) ring.style.transform = `translate3d(${ringX}px, ${ringY}px, 0)`;
      setLabelPosition();

      if (Math.abs(mouseX - ringX) > 0.2 || Math.abs(mouseY - ringY) > 0.2) {
        raf = window.requestAnimationFrame(loop);
      } else {
        raf = null;
      }
    };

    const show = () => {
      if (visible) return;
      visible = true;
      cursor.classList.add('is-visible');
    };

    document.addEventListener('pointermove', (event) => {
      mouseX = event.clientX;
      mouseY = event.clientY;
      if (dot) dot.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0)`;
      show();
      if (!raf) raf = window.requestAnimationFrame(loop);
    }, { passive: true });

    document.addEventListener('pointerleave', () => {
      visible = false;
      cursor.classList.remove('is-visible');
    });

    document.addEventListener('pointerover', (event) => {
      const target = event.target.closest('a, button, [data-cursor]');
      if (!target) return;

      const text = target.dataset.cursor;
      if (ring) ring.classList.add('is-hover');
      if (label) {
        if (text) {
          label.textContent = text;
          label.classList.add('is-visible');
        } else {
          label.classList.remove('is-visible');
        }
      }
    });

    document.addEventListener('pointerout', (event) => {
      const target = event.target.closest('a, button, [data-cursor]');
      if (!target) return;
      if (event.relatedTarget && target.contains(event.relatedTarget)) return;

      if (ring) ring.classList.remove('is-hover');
      if (label) label.classList.remove('is-visible');
    });
  }

  /* ------------------------------------------------------------
     Mobile menu
     ------------------------------------------------------------ */
  const burger = $('.nav__burger');
  const menu = $('#menu');

  if (burger && menu) {
    const menuLinks = $$('a', menu);
    let isOpen = false;

    const closeMenu = (returnFocus = true) => {
      if (!isOpen) return;
      isOpen = false;

      body.classList.remove('menu-open');
      doc.classList.remove('is-locked');
      menu.classList.remove('is-open');
      menu.setAttribute('aria-hidden', 'true');
      menu.inert = true;
      burger.setAttribute('aria-expanded', 'false');
      burger.setAttribute('aria-label', 'Открыть меню');
      if (main) main.inert = false;

      if (returnFocus) burger.focus({ preventScroll: true });
    };

    const openMenu = () => {
      if (isOpen) return;
      isOpen = true;

      body.classList.add('menu-open');
      doc.classList.add('is-locked');
      menu.classList.add('is-open');
      menu.setAttribute('aria-hidden', 'false');
      menu.inert = false;
      burger.setAttribute('aria-expanded', 'true');
      burger.setAttribute('aria-label', 'Закрыть меню');
      if (main) main.inert = true;

      const firstLink = $('.menu__nav a', menu);
      if (firstLink) {
        window.setTimeout(() => {
          if (isOpen) firstLink.focus({ preventScroll: true });
        }, 650);
      }
    };

    burger.addEventListener('click', () => {
      if (isOpen) closeMenu();
      else openMenu();
    });

    menuLinks.forEach((link) => {
      link.addEventListener('click', () => closeMenu(false));
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && isOpen) closeMenu();
    });

    window.addEventListener('resize', () => {
      if (window.innerWidth > 900 && isOpen) closeMenu(false);
    }, { passive: true });
  }

  /* ------------------------------------------------------------
     Accordion
     ------------------------------------------------------------ */
  const accordion = $('.acc');

  if (accordion) {
    const items = $$('.acc__item', accordion);

    items.forEach((item) => {
      const head = $('.acc__head', item);
      if (!head) return;

      head.addEventListener('click', () => {
        const willOpen = !item.classList.contains('is-open');

        items.forEach((other) => {
          if (other === item) return;
          other.classList.remove('is-open');
          const otherHead = $('.acc__head', other);
          if (otherHead) otherHead.setAttribute('aria-expanded', 'false');
        });

        item.classList.toggle('is-open', willOpen);
        head.setAttribute('aria-expanded', String(willOpen));
      });
    });
  }

})();
