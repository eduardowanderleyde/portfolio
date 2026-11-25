(() => {
  const { frames, whatsapp, email } = window.PORTFOLIO;
  const contactForm = document.querySelector('.contact-form');
  contactForm.action = 'https://formsubmit.co/' + encodeURIComponent(email);
  if (/^\d{12,13}$/.test(whatsapp.numero)) {
    const link = document.querySelector('.whatsapp');
    link.href = 'https://wa.me/' + whatsapp.numero + '?text=' + encodeURIComponent(whatsapp.mensagem);
    link.hidden = false;
  }

  const section = document.querySelector('.cine');
  const stage = section.querySelector('.cine-stage');
  const canvas = section.querySelector('canvas');
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) return;

  const moments = [...section.querySelectorAll('.moment')];
  const staticMode = matchMedia('(prefers-reduced-motion: reduce), (max-height: 610px)');
  const mobile = matchMedia('(max-width: 700px)');
  const cache = new Map();
  const pending = new Map();
  const failed = new Set();
  const total = frames.total;
  let directory;
  let target = 0;
  let current = -1;
  let currentMoment = -1;
  let scheduled = false;
  let direction = 1;

  function draw(index) {
    const image = cache.get(index);
    if (!image || current === index) return;
    const ratio = Math.max(canvas.width / image.width, canvas.height / image.height);
    const w = image.width * ratio;
    const h = image.height * ratio;
    ctx.drawImage(image, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h);
    current = index;
    canvas.dataset.frame = String(index + 1);
    canvas.classList.add('is-ready');
  }

  function requestFrame(index) {
    if (pending.size >= 6 || index < 0 || index >= total || cache.has(index) || pending.has(index) || failed.has(index)) return;
    const image = new Image();
    const folder = directory;
    const number = String(index + 1).padStart(4, '0');
    pending.set(index, image);
    image.decoding = 'async';
    image.fetchPriority = index === target ? 'high' : 'low';
    image.src = 'assets/frames/' + folder + '/f_' + number + '.' + frames.ext;
    image.decode().then(() => {
      if (folder !== directory || pending.get(index) !== image) return;
      pending.delete(index);
      cache.set(index, image);
      if (cache.size > 24) {
        const farthest = [...cache.keys()].reduce((a, b) =>
          Math.abs(a - target) > Math.abs(b - target) ? a : b);
        cache.delete(farthest);
      }
      schedule();
    }).catch(() => {
      if (pending.get(index) !== image) return;
      pending.delete(index);
      failed.add(index);
      schedule();
    });
  }

  function showMoment(index) {
    if (index === currentMoment) return;
    const active = document.activeElement;
    const focusWasInMoment = moments[currentMoment]?.contains(active);
    currentMoment = index;
    moments.forEach((moment, i) => {
      moment.classList.toggle('is-current', i === index);
      if (i === 0) moment.querySelector('a').inert = index !== 0;
      else moment.inert = i !== index;
    });
    if (focusWasInMoment) {
      const destination = moments[index].querySelector('a') || document.querySelector('.wordmark');
      destination.focus({ preventScroll: true });
    }
  }

  function update() {
    scheduled = false;
    if (staticMode.matches) return;
    const bounds = section.getBoundingClientRect();
    if (bounds.bottom <= 0 || bounds.top >= innerHeight) return;
    const stickyTop = document.querySelector('.topbar').offsetHeight;
    const distance = Math.max(1, section.offsetHeight - stage.offsetHeight);
    const progress = Math.min(1, Math.max(0, (stickyTop - bounds.top) / distance));
    const next = Math.round(progress * (total - 1));
    if (next !== target) direction = Math.sign(next - target);
    target = next;
    section.style.setProperty('--progress', progress);
    showMoment(progress < .34 ? 0 : progress < .70 ? 1 : 2);
    let closest = -1;
    for (const index of cache.keys()) {
      if (closest < 0 || Math.abs(index - target) < Math.abs(closest - target)) closest = index;
    }
    if (closest >= 0 && Math.abs(closest - target) <= 7) draw(closest);
    requestFrame(target);
    const saveData = navigator.connection?.saveData;
    if (!saveData && pending.size < 5) {
      for (const offset of [direction, direction * 2, -direction]) requestFrame(target + offset);
    }
  }

  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(update);
  }

  function resize() {
    section.classList.toggle('is-enhanced', !staticMode.matches);
    if (staticMode.matches) {
      canvas.classList.remove('is-ready');
      current = -1;
      showMoment(0);
      return;
    }
    const folder = mobile.matches ? 'mobile' : 'desktop';
    if (folder !== directory) {
      cache.clear();
      pending.clear();
      failed.clear();
      directory = folder;
      canvas.classList.remove('is-ready');
    }
    const scale = Math.min(devicePixelRatio || 1, 1.5, 1700 / stage.clientWidth);
    canvas.width = Math.round(stage.clientWidth * scale);
    canvas.height = Math.round(stage.clientHeight * scale);
    current = -1;
    schedule();
  }

  addEventListener('scroll', schedule, { passive: true });
  addEventListener('resize', resize, { passive: true });
  staticMode.addEventListener('change', resize);
  resize();
})();
