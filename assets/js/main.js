/* =========================================================
   Code5 Solutions — interações e movimento
   ========================================================= */
(() => {
  'use strict';
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Nav: estado ao rolar + menu mobile ---------- */
  const nav = document.getElementById('nav');
  const burger = document.getElementById('burger');
  const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 24);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  burger?.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    burger.setAttribute('aria-expanded', String(open));
  });
  nav.querySelectorAll('.nav__links a').forEach(a =>
    a.addEventListener('click', () => {
      nav.classList.remove('open');
      burger?.setAttribute('aria-expanded', 'false');
    })
  );

  /* ---------- Reveal on scroll ---------- */
  const revealables = document.querySelectorAll('.reveal');
  revealables.forEach(el => el.style.setProperty('--d', el.dataset.d || 0));

  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    });
  }, { rootMargin: '0px 0px -12% 0px', threshold: 0.12 });
  revealables.forEach(el => io.observe(el));

  /* ---------- Contadores das métricas ---------- */
  const counters = document.querySelectorAll('[data-count]');
  const cio = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      const el = e.target;
      const target = Number(el.dataset.count);
      const suffix = el.dataset.suffix || '';
      const dur = 1100;
      const t0 = performance.now();
      const tick = (t) => {
        const p = Math.min(1, (t - t0) / dur);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(target * eased) + suffix;
        if (p < 1) requestAnimationFrame(tick);
      };
      reduced ? (el.textContent = target + suffix) : requestAnimationFrame(tick);
      cio.unobserve(el);
    });
  }, { threshold: 0.5 });
  counters.forEach(el => cio.observe(el));

  /* ---------- Copiar e-mail do chip ---------- */
  const chip = document.getElementById('copyChip');
  chip?.addEventListener('click', async () => {
    const text = document.getElementById('copyText').textContent.trim();
    try { await navigator.clipboard.writeText(text); } catch (_) { /* sem clipboard */ }
    const label = document.getElementById('copyText');
    const original = label.textContent;
    label.textContent = 'copiado ✓';
    setTimeout(() => { label.textContent = original; }, 1400);
  });

  /* ---------- Formulário: monta o e-mail sem backend ----------
     Troque por um endpoint real (Formspree, API própria, CRM) quando houver. */
  const form = document.getElementById('form');
  form?.addEventListener('submit', (ev) => {
    ev.preventDefault();
    const d = new FormData(form);
    const linhas = [
      `Nome: ${d.get('nome') || ''}`,
      `Empresa: ${d.get('empresa') || ''}`,
      `E-mail: ${d.get('email') || ''}`,
      `WhatsApp: ${d.get('whatsapp') || ''}`,
      `Necessidade: ${d.get('tipo') || ''}`,
      '',
      String(d.get('mensagem') || '')
    ].join('\n');
    const assunto = `Novo pedido de orçamento — ${d.get('empresa') || d.get('nome') || 'site'}`;
    window.location.href =
      `mailto:contato@code5solutions.com.br?subject=${encodeURIComponent(assunto)}&body=${encodeURIComponent(linhas)}`;
  });

  /* ---------- Ano no rodapé ---------- */
  const year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();

  /* ---------- Tilt sutil nos cards do portfólio ---------- */
  if (!reduced && window.matchMedia('(pointer:fine)').matches) {
    document.querySelectorAll('.work').forEach(card => {
      card.addEventListener('pointermove', (ev) => {
        const r = card.getBoundingClientRect();
        const px = (ev.clientX - r.left) / r.width - .5;
        const py = (ev.clientY - r.top) / r.height - .5;
        card.style.transform = `translateY(-8px) rotateX(${(-py * 3).toFixed(2)}deg) rotateY(${(px * 4).toFixed(2)}deg)`;
        card.style.transformStyle = 'preserve-3d';
      });
      card.addEventListener('pointerleave', () => { card.style.transform = ''; });
    });
  }

  /* =======================================================
     Fundo do hero: estilhaços triangulares flutuantes
     (mesma ideia do fundo 3D da referência, em canvas 2D)
     ======================================================= */
  const canvas = document.getElementById('shards');
  if (!canvas || reduced) return;

  const ctx = canvas.getContext('2d');
  let W = 0, H = 0, dpr = 1, shards = [], raf = null, running = true;
  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };

  const rand = (a, b) => a + Math.random() * (b - a);

  function build() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = canvas.clientWidth; H = canvas.clientHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const count = W < 700 ? 16 : W < 1200 ? 26 : 36;
    shards = Array.from({ length: count }, () => {
      const size = rand(24, 112);
      return {
        x: rand(-.1, 1.1) * W,
        y: rand(-.1, 1.1) * H,
        z: rand(.35, 1),           // profundidade → parallax e opacidade
        size,
        rot: rand(0, Math.PI * 2),
        spin: rand(-.0032, .0032),
        vx: rand(-.16, .16),
        vy: rand(-.10, .10),
        hue: Math.random() < .78 ? 'mint' : 'ice',
      };
    });
  }

  function triangle(s, ox, oy) {
    const r = s.size * (.45 + s.z * .55);
    ctx.save();
    ctx.translate(s.x + ox * s.z, s.y + oy * s.z);
    ctx.rotate(s.rot);
    // achatamento vertical dá a sensação de plano inclinado em 3D
    ctx.scale(1, .62);

    ctx.beginPath();
    ctx.moveTo(0, -r);
    ctx.lineTo(r * .95, r * .72);
    ctx.lineTo(-r * .95, r * .72);
    ctx.closePath();

    const g = ctx.createLinearGradient(-r, -r, r, r);
    if (s.hue === 'mint') {
      g.addColorStop(0, `rgba(47,230,160,${.05 + s.z * .09})`);
      g.addColorStop(.55, `rgba(12,26,21,${.10 + s.z * .16})`);
      g.addColorStop(1, `rgba(124,249,200,${.03 + s.z * .05})`);
    } else {
      g.addColorStop(0, `rgba(180,210,255,${.04 + s.z * .05})`);
      g.addColorStop(1, `rgba(10,20,18,${.12 + s.z * .14})`);
    }
    ctx.fillStyle = g;
    ctx.fill();

    ctx.lineWidth = .9;
    ctx.strokeStyle = s.hue === 'mint'
      ? `rgba(47,230,160,${.10 + s.z * .30})`
      : `rgba(200,225,255,${.06 + s.z * .16})`;
    ctx.stroke();
    ctx.restore();
  }

  function frame() {
    ctx.clearRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'lighter';

    mouse.x += (mouse.tx - mouse.x) * .05;
    mouse.y += (mouse.ty - mouse.y) * .05;

    for (const s of shards) {
      s.x += s.vx * s.z;
      s.y += s.vy * s.z;
      s.rot += s.spin;

      const pad = s.size * 1.6;
      if (s.x < -pad) s.x = W + pad;
      if (s.x > W + pad) s.x = -pad;
      if (s.y < -pad) s.y = H + pad;
      if (s.y > H + pad) s.y = -pad;

      triangle(s, mouse.x * 26, mouse.y * 18);
    }

    ctx.globalCompositeOperation = 'source-over';
    raf = requestAnimationFrame(frame);
  }

  window.addEventListener('pointermove', (e) => {
    mouse.tx = (e.clientX / window.innerWidth) - .5;
    mouse.ty = (e.clientY / window.innerHeight) - .5;
  }, { passive: true });

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(build, 180);
  });

  // pausa a animação quando o hero sai da tela (economia de bateria)
  const heroIO = new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting && !running) { running = true; raf = requestAnimationFrame(frame); }
    else if (!entry.isIntersecting && running) { running = false; cancelAnimationFrame(raf); }
  }, { threshold: 0 });
  heroIO.observe(canvas);

  build();
  frame();
})();
