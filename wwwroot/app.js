// wwwroot/app.js
// Called from Blazor OnAfterRenderAsync via JS interop.

/* ====== App Init (navbar, scroll, reveal, gallery, contact form) ====== */
window.HBApp = (function () {
  var globalInit = false;

  function initGlobal() {
    if (globalInit) return;
    globalInit = true;

    // Navbar: shadow on scroll
    var scrollHandler = function () {
      var navbar = document.querySelector('.hb-navbar');
      if (navbar) {
        navbar.classList.toggle('is-scrolled', window.scrollY > 8);
      }
    };
    scrollHandler();
    window.addEventListener('scroll', scrollHandler, { passive: true });

    // Click handler for smooth-scroll anchors + placeholder link blocking.
    // NOTE: real route links (/about, /services, etc.) are NOT blocked —
    // only `#` anchors and `.js-no-nav` placeholders.
    document.addEventListener('click', function (e) {
      var a = e.target.closest('a');
      if (!a) return;
      var href = (a.getAttribute('href') || '').trim();

      // Smooth scroll to in-page anchor targets
      if (href.startsWith('#') && href.length > 1) {
        var target = document.querySelector(href);
        if (target) {
          e.preventDefault();
          e.stopPropagation();
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
          return;
        }
      }

      // Block placeholder links only (NOT real routes)
      if (href === '#' || a.classList.contains('js-no-nav')) {
        e.preventDefault();
        e.stopPropagation();
      }
    });
  }

  // Track the active reveal observer so we can disconnect on re-init
  var activeRevealObserver = null;

  function init() {
    initGlobal();

    // Bootstrap tooltips (safe to re-run)
    if (window.bootstrap) {
      document.querySelectorAll('[data-bs-toggle="tooltip"]')
        .forEach(function (el) { new bootstrap.Tooltip(el); });
    }

    // ── Reveal-on-scroll ──
    // Disconnect any previous observer (Blazor navigations re-run init)
    if (activeRevealObserver) {
      activeRevealObserver.disconnect();
      activeRevealObserver = null;
    }

    var revealEls = document.querySelectorAll('.reveal');

    // Pass 1: anything already in (or near) the viewport gets shown immediately.
    // This avoids the "blank page" flash on load when above-the-fold sections
    // never trigger the observer's intersection callback.
    var vh = window.innerHeight || document.documentElement.clientHeight;
    revealEls.forEach(function (el) {
      var rect = el.getBoundingClientRect();
      if (rect.top < vh * 0.95) {
        el.classList.add('in');
      }
    });

    // Pass 2: observe the rest for scroll reveal
    activeRevealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          activeRevealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });

    revealEls.forEach(function (el) {
      if (!el.classList.contains('in')) {
        activeRevealObserver.observe(el);
      }
    });

    // Safety fallback: if for any reason a reveal element is still hidden
    // 2 seconds after init (rare browser quirks, scroll containers, etc.),
    // force-show everything so content is never permanently invisible.
    setTimeout(function () {
      document.querySelectorAll('.reveal:not(.in)').forEach(function (el) {
        el.classList.add('in');
      });
    }, 2000);

    // Page-specific initializers
    initGallery();
    initContactForm();
  }

  /* ====== GALLERY: filter pills + lightbox ====== */
  function initGallery() {
    var grid      = document.getElementById('galleryGrid');
    var filterBar = document.getElementById('galleryFilters');
    var lightbox  = document.getElementById('lightbox');
    if (!grid || !filterBar || !lightbox) return;

    // Snapshot all items with their category, then detach from grid
    var allItems = Array.from(grid.querySelectorAll('.gallery-item')).map(function(el) {
      return { el: el, cat: (el.dataset.cat || '').split(' ') };
    });

    // Clone filterBar to clear any stale listeners from previous renders
    var newBar = filterBar.cloneNode(true);
    filterBar.parentNode.replaceChild(newBar, filterBar);
    var pills = newBar.querySelectorAll('.filter-pill');

    function applyFilter(f) {
      // Remove all from grid
      allItems.forEach(function(item) {
        if (item.el.parentNode) item.el.parentNode.removeChild(item.el);
      });
      // Re-append matching items
      allItems.forEach(function(item) {
        if (f === 'all' || item.cat.indexOf(f) !== -1) {
          grid.appendChild(item.el);
        }
      });
      // Re-attach click listeners to newly visible items
      attachItemClicks();
    }

    newBar.addEventListener('click', function(e) {
      var pill = e.target.closest('.filter-pill');
      if (!pill) return;
      pills.forEach(function(p) { p.classList.remove('is-active'); });
      pill.classList.add('is-active');
      applyFilter(pill.dataset.filter);
    });

    // Lightbox
    var lbImg    = document.getElementById('lbImg');
    var lbCounter = document.getElementById('lbCounter');
    var idx = 0;

    function getVisible() {
      return Array.from(grid.querySelectorAll('.gallery-item'));
    }
    function show(i) {
      var vis = getVisible();
      if (!vis.length) return;
      idx = (i + vis.length) % vis.length;
      var img = vis[idx].querySelector('img');
      lbImg.src = img.src;
      lbImg.alt = img.alt || '';
      lbCounter.textContent = (idx + 1) + ' / ' + vis.length;
    }
    function openLb(i) {
      show(i);
      lightbox.style.cssText = 'display:flex;position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.92);align-items:center;justify-content:center;flex-direction:column;';
      document.body.style.overflow = 'hidden';
    }
    function closeLb() {
      lightbox.style.cssText = 'display:none;';
      document.body.style.overflow = '';
      lbImg.src = '';
    }

    function attachItemClicks() {
      var vis = getVisible();
      vis.forEach(function(item) {
        item.onclick = function() {
          var current = getVisible();
          openLb(current.indexOf(item));
        };
      });
    }
    attachItemClicks();

    lightbox.querySelector('.lb-close').onclick = closeLb;
    lightbox.querySelector('.lb-prev').onclick  = function() { show(idx - 1); };
    lightbox.querySelector('.lb-next').onclick  = function() { show(idx + 1); };
    lightbox.onclick = function(e) { if (e.target === lightbox) closeLb(); };

    document.addEventListener('keydown', function(e) {
      if (lightbox.style.display !== 'flex') return;
      if (e.key === 'Escape')      closeLb();
      if (e.key === 'ArrowLeft')   show(idx - 1);
      if (e.key === 'ArrowRight')  show(idx + 1);
    });
  }

  function initContactForm() {
    var form = document.getElementById('contactForm');
    if (!form) return;
    var success = document.getElementById('formSuccess');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      // TODO: hook up real submission endpoint (FormSpree, /api/contact, etc.)
      if (success) {
        success.classList.add('is-visible');
        form.reset();
        setTimeout(function () { success.classList.remove('is-visible'); }, 6000);
      }
    });
  }

  return { init: init, initGallery: initGallery };
})();

/* ====== i18n Language Toggle ====== */
window.HBLang = (function () {
  var translations = {
    /* ── Navigation ── */
    'nav.home':       { en: 'Home',        es: 'Inicio' },
    'nav.about':      { en: 'About Us',    es: 'Sobre Nosotros' },
    'nav.services':   { en: 'Services',    es: 'Servicios' },
    'nav.amenities':  { en: 'Amenities',   es: 'Comodidades' },
    'nav.gallery':    { en: 'Gallery',     es: 'Galería' },
    'nav.contact':    { en: 'Contact Us',  es: 'Contáctenos' },

    /* ── Home: Hero ── */
    'hero.label':        { en: 'WELCOME TO HEALING BRIDGE HEALTH',               es: 'BIENVENIDOS A HEALING BRIDGE HEALTH' },
    'hero.title':        { en: 'Expert Coordination & Patient-Centered Care',     es: 'Coordinación Experta y Atención Centrada en el Paciente' },
    'hero.body':         { en: 'At Healing Bridge Health Inc., we bridge the healing gap through expert coordination and delivery of evidence-informed and patient-centered care that empowers every patient on their journey to recovery.',
                           es: 'En Healing Bridge Health Inc., cerramos la brecha de sanación a través de la coordinación experta y la prestación de atención basada en evidencia y centrada en el paciente, que empodera a cada paciente en su camino hacia la recuperación.' },
    'hero.btn_services': { en: 'Our Services',   es: 'Nuestros Servicios' },
    'hero.btn_contact':  { en: 'Contact Us',     es: 'Contáctenos' },

    /* ── Home: Mission/Values/Services ── */
    'mission.label':      { en: 'Who We Are',                                     es: 'Quiénes Somos' },
    'mission.heading':    { en: "Healing Bridge Health\u2019s Mission",            es: 'La Misión de Healing Bridge Health' },
    'mission.subheading': { en: 'To provide a better quality of life for every soul that enters our doors.',
                            es: 'Brindar una mejor calidad de vida a cada alma que entra por nuestras puertas.' },
    'mission.body':       { en: 'At Healing Bridge Health Inc., we bridge the healing gap through expert coordination and delivery of evidence-informed and patient-centered care that empowers every patient on their journey to recovery.',
                            es: 'En Healing Bridge Health Inc., cerramos la brecha de sanación a través de la coordinación experta y la prestación de atención basada en evidencia y centrada en el paciente, que empodera a cada paciente en su camino hacia la recuperación.' },
    'values.label':      { en: 'What Guides Us',                                     es: 'Lo Que Nos Guía' },
    'values.heading':    { en: 'Competent Care in a Loving Environment',              es: 'Atención Competente en un Ambiente Cálido' },
    'values.subheading': { en: 'Compassion, clinical excellence, and a pathway to recovery.',
                           es: 'Compasión, excelencia clínica y un camino hacia la recuperación.' },
    'values.body':       { en: 'Every person is unique. Our interdisciplinary team collaborates with you and your family to deliver care that is personal, proactive, and supportive\u2014so you can focus on healing.',
                           es: 'Cada persona es única. Nuestro equipo interdisciplinario colabora con usted y su familia para brindar atención personalizada, proactiva y de apoyo, para que pueda concentrarse en sanar.' },
    'values.v0': { en: 'Compassion',                        es: 'Compasión' },
    'values.v1': { en: 'Collaboration',                     es: 'Colaboración' },
    'values.v2': { en: 'Integrity',                         es: 'Integridad' },
    'values.v3': { en: 'Innovation',                        es: 'Innovación' },
    'values.v4': { en: 'Empowerment',                       es: 'Empoderamiento' },
    'values.v5': { en: 'Excellence',                        es: 'Excelencia' },
    'values.v6': { en: 'Cultural Diversity & Inclusivity',  es: 'Diversidad Cultural e Inclusión' },
    'svc.label':       { en: 'What We Offer',          es: 'Lo Que Ofrecemos' },
    'svc.heading':     { en: 'Our Core Services',      es: 'Nuestros Servicios Principales' },
    'svc.card1_title': { en: 'Care Coordination',      es: 'Coordinación de Atención' },
    'svc.card1_body':  { en: 'Seamless collaboration between physicians, nurses, therapists, and families\u2014ensuring every step of your care plan is aligned and effective.',
                         es: 'Colaboración fluida entre médicos, enfermeras, terapeutas y familias, asegurando que cada paso de su plan de atención esté alineado y sea efectivo.' },
    'svc.card2_title': { en: 'Patient-Centered Care',  es: 'Atención Centrada en el Paciente' },
    'svc.card2_body':  { en: 'Evidence-informed, compassionate care tailored to each individual\u2014respecting dignity, preferences, and unique recovery goals.',
                         es: 'Atención compasiva basada en evidencia, adaptada a cada individuo, respetando la dignidad, las preferencias y los objetivos únicos de recuperación.' },
    'svc.card3_title': { en: 'Community Support',      es: 'Apoyo Comunitario' },
    'svc.card3_body':  { en: 'Building connections beyond clinical walls\u2014family education, social services, and resources that strengthen the healing journey.',
                         es: 'Construyendo conexiones más allá de las paredes clínicas: educación familiar, servicios sociales y recursos que fortalecen el camino de sanación.' },
    'svc.learn_more':  { en: 'Learn more \u2192',      es: 'Más información \u2192' },

    /* ── CTA / Footer ── */
    'cta.heading': { en: 'Your Journey to Healing <strong>Begins Here\u2026</strong>',
                     es: 'Su Camino Hacia la Sanación <strong>Comienza Aquí\u2026</strong>' },
    'cta.btn':     { en: 'Contact Us',   es: 'Contáctenos' },
    'footer.links_heading': { en: 'Quick Links',     es: 'Enlaces Rápidos' },
    'footer.form_heading':  { en: 'Get in Touch',    es: 'Comuníquese' },
    'footer.ph_name':       { en: 'Your Name',       es: 'Su Nombre' },
    'footer.ph_email':      { en: 'Email Address',   es: 'Correo Electrónico' },
    'footer.ph_msg':        { en: 'Your Message',    es: 'Su Mensaje' },
    'footer.btn_send':      { en: 'Send Message',    es: 'Enviar Mensaje' },
    'footer.copy':          { en: '\u00A9 2026 Healing Bridge Health Inc. All rights reserved.',
                              es: '\u00A9 2026 Healing Bridge Health Inc. Todos los derechos reservados.' },

    /* =================================================================
       ABOUT PAGE
       ================================================================= */
    'about.label':           { en: 'WHO WE ARE',                              es: 'QUIÉNES SOMOS' },
    'about.title':           { en: 'About Healing Bridge Health',             es: 'Sobre Healing Bridge Health' },
    'about.sub':             { en: 'A licensed, 6-bed Congregate Living Health Facility in the North San Fernando Valley—dedicated to bridging the gap between hospital and home with compassionate, expert post-acute care.',
                               es: 'Un Centro Congregado de Vida y Salud licenciado de 6 camas en el norte del Valle de San Fernando, dedicado a cerrar la brecha entre el hospital y el hogar con atención post-aguda compasiva y experta.' },

    /* About — Our Story */
    'about.story_label':     { en: 'Our Story',                            es: 'Nuestra Historia' },
    'about.story_heading':   { en: 'Built Around the Bridge',              es: 'Construido en Torno al Puente' },
    'about.story_body1':     { en: 'Healing Bridge Health, Inc. opened its doors in <strong>November 2024</strong> with a clear purpose: to give patients leaving the hospital a place that feels nothing like a hospital. We saw families struggling to find the right setting after a critical illness or injury — somewhere skilled enough to handle complex medical needs, but warm enough to feel like home.',
                               es: 'Healing Bridge Health, Inc. abrió sus puertas en <strong>noviembre de 2024</strong> con un propósito claro: dar a los pacientes que salen del hospital un lugar que no se sienta como un hospital. Vimos familias luchando por encontrar el entorno adecuado después de una enfermedad o lesión crítica, un lugar lo suficientemente capacitado para manejar necesidades médicas complejas, pero lo suficientemente cálido para sentirse como en casa.' },
    'about.story_body2':     { en: 'Our 6-bed licensed facility in North Hollywood was designed from the ground up to be that bridge. Every detail — from the natural light in our bedrooms, to our 14-member care team, to the sophisticated medical equipment — was chosen to support faster, more dignified recovery.',
                               es: 'Nuestra instalación licenciada de 6 camas en North Hollywood fue diseñada desde cero para ser ese puente. Cada detalle, desde la luz natural en nuestras habitaciones hasta nuestro equipo de atención de 14 miembros y el equipo médico sofisticado, fue elegido para apoyar una recuperación más rápida y digna.' },
    'about.s_year':          { en: '2024',                                  es: '2024' },
    'about.s_year_l':        { en: 'Founded',                               es: 'Fundado' },
    'about.s_beds':          { en: '6',                                     es: '6' },
    'about.s_beds_l':        { en: 'Licensed Beds',                         es: 'Camas Licenciadas' },
    'about.s_lang':          { en: '3',                                     es: '3' },
    'about.s_lang_l':        { en: 'Languages Spoken',                      es: 'Idiomas Hablados' },
    'about.s_247':           { en: '24/7',                                  es: '24/7' },
    'about.s_247_l':         { en: 'Skilled Nursing',                       es: 'Enfermería Capacitada' },

    /* About — Mission / Vision */
    'about.mission_label':   { en: 'Our Mission',                             es: 'Nuestra Misión' },
    'about.mission_heading': { en: 'A Seamless Transition to Optimal Health', es: 'Una Transición Sin Interrupciones a la Salud Óptima' },
    'about.mission_body':    { en: 'At Healing Bridge Health, we believe in a seamless transition to the optimal health of our patients. Our mission is to provide compassionate, personalized support for patients moving from acute care to home or other healthcare institutions. We bridge the gap with expert care coordination, ensuring each individual\u2019s journey to recovery is smooth, supported, and empowered with evidence-informed and patient-centered care.',
                               es: 'En Healing Bridge Health, creemos en una transición sin interrupciones hacia la salud óptima de nuestros pacientes. Nuestra misión es brindar apoyo compasivo y personalizado a los pacientes que pasan del cuidado agudo al hogar u otras instituciones de salud. Cerramos la brecha con coordinación experta de atención, asegurando que el camino de cada persona hacia la recuperación sea fluido, apoyado y empoderado con atención basada en evidencia y centrada en el paciente.' },
    'about.vision_label':    { en: 'Our Vision',                              es: 'Nuestra Visión' },
    'about.vision_heading':  { en: 'Setting a New Standard in Patient-Centered Care',
                               es: 'Estableciendo un Nuevo Estándar en Atención Centrada en el Paciente' },
    'about.vision_body':     { en: 'Our vision is to transform the continuum of care in the County of Los Angeles, making every transition from hospital a path to renewed health and independence. We aspire to be the leading beacon in healthcare transitions, where every patient receives not only the medical care they need, but also the emotional and practical support they deserve. By innovating and collaborating with multiple healthcare disciplines, we aim to set a new standard in patient-centered care and foster a future where every transition is a step towards thriving.',
                               es: 'Nuestra visión es transformar el continuo de atención en el Condado de Los Ángeles, haciendo que cada transición desde el hospital sea un camino hacia la salud renovada y la independencia. Aspiramos a ser el faro principal en las transiciones de atención médica, donde cada paciente reciba no solo la atención médica que necesita, sino también el apoyo emocional y práctico que merece.' },

    /* About — What Makes Us Different */
    'about.diff_label':      { en: "Why We're Different",                   es: 'Por Qué Somos Diferentes' },
    'about.diff_heading':    { en: 'A Better Alternative to Institutional Care',
                               es: 'Una Mejor Alternativa a la Atención Institucional' },
    'about.d1_title':        { en: 'Hospital-to-Home Bridge',               es: 'Puente del Hospital al Hogar' },
    'about.d1_body':         { en: 'We exist for the in-between moment — when patients are too well for the ICU, but not yet ready for home.',
                               es: 'Existimos para el momento intermedio: cuando los pacientes están demasiado bien para la UCI, pero aún no están listos para volver a casa.' },
    'about.d2_title':        { en: 'Intimate, Non-Institutional Setting',   es: 'Entorno Íntimo y No Institucional' },
    'about.d2_body':         { en: 'Just 6 beds. Every patient gets attention that\u2019s impossible to deliver in a 100-bed nursing home.',
                               es: 'Solo 6 camas. Cada paciente recibe atención que es imposible de brindar en un asilo de 100 camas.' },
    'about.d3_title':        { en: 'Interdisciplinary Team',                es: 'Equipo Interdisciplinario' },
    'about.d3_body':         { en: '14 specialized roles \u2014 from Medical Director to Certified Cook \u2014 coordinating around every patient.',
                               es: '14 roles especializados, desde Director Médico hasta Cocinero Certificado, coordinándose en torno a cada paciente.' },
    'about.d4_title':        { en: 'Multilingual Care',                     es: 'Atención Multilingüe' },
    'about.d4_body':         { en: 'Our team speaks English, Spanish, and French \u2014 so patients and families always feel understood.',
                               es: 'Nuestro equipo habla inglés, español y francés, para que los pacientes y las familias siempre se sientan comprendidos.' },

    /* About — Approach */
    'about.app_label':       { en: 'Our Approach',                          es: 'Nuestro Enfoque' },
    'about.app_heading':     { en: 'Three Principles That Guide Every Decision',
                               es: 'Tres Principios Que Guían Cada Decisión' },
    'about.a1_title':        { en: 'Patient-Centered',                      es: 'Centrado en el Paciente' },
    'about.a1_body':         { en: 'Every care plan is built around the individual — their medical needs, recovery goals, preferences, and dignity. There are no one-size-fits-all programs here.',
                               es: 'Cada plan de atención se construye en torno a la persona: sus necesidades médicas, objetivos de recuperación, preferencias y dignidad. Aquí no hay programas únicos para todos.' },
    'about.a2_title':        { en: 'Family-Inclusive',                      es: 'Inclusivo con la Familia' },
    'about.a2_body':         { en: 'Families aren\u2019t visitors here — they\u2019re part of the team. We keep loved ones informed, involved in care decisions, and welcome every day during visiting hours.',
                               es: 'Las familias no son visitantes aquí, son parte del equipo. Mantenemos informados a los seres queridos, los involucramos en las decisiones de atención y los recibimos todos los días durante el horario de visita.' },
    'about.a3_title':        { en: 'Evidence-Informed',                     es: 'Basado en Evidencia' },
    'about.a3_body':         { en: 'Our protocols follow the latest clinical research and best practices. We use sophisticated equipment and therapies proven to support faster, safer recovery.',
                               es: 'Nuestros protocolos siguen la investigación clínica más reciente y las mejores prácticas. Utilizamos equipos sofisticados y terapias comprobadas para apoyar una recuperación más rápida y segura.' },

    /* About — Values */
    'about.values_label':    { en: 'What Guides Us',                          es: 'Lo Que Nos Guía' },
    'about.values_heading':  { en: 'Our Core Values',                         es: 'Nuestros Valores Fundamentales' },
    'about.v_compassion_t':  { en: 'Compassion',                              es: 'Compasión' },
    'about.v_compassion_b':  { en: 'Treating every patient with empathy, dignity, and warmth.',
                               es: 'Tratar a cada paciente con empatía, dignidad y calidez.' },
    'about.v_collab_t':      { en: 'Collaboration',                           es: 'Colaboración' },
    'about.v_collab_b':      { en: 'An interdisciplinary team that works together for every patient.',
                               es: 'Un equipo interdisciplinario que trabaja unido por cada paciente.' },
    'about.v_integrity_t':   { en: 'Integrity',                               es: 'Integridad' },
    'about.v_integrity_b':   { en: 'Honest, ethical care you can trust at every stage of recovery.',
                               es: 'Atención honesta y ética en la que puede confiar en cada etapa de la recuperación.' },
    'about.v_innovation_t':  { en: 'Innovation',                              es: 'Innovación' },
    'about.v_innovation_b':  { en: 'Embracing modern therapies and state-of-the-art technology.',
                               es: 'Adoptando terapias modernas y tecnología de vanguardia.' },
    'about.v_empower_t':     { en: 'Empowerment',                             es: 'Empoderamiento' },
    'about.v_empower_b':     { en: 'Giving patients and families the tools to take charge of healing.',
                               es: 'Brindar a los pacientes y familias las herramientas para tomar control de la sanación.' },
    'about.v_excellence_t':  { en: 'Excellence',                              es: 'Excelencia' },
    'about.v_excellence_b':  { en: 'Holding ourselves to the highest standard in clinical care.',
                               es: 'Manteniendo el más alto estándar en atención clínica.' },
    'about.v_diversity_t':   { en: 'Cultural Diversity & Inclusivity',        es: 'Diversidad Cultural e Inclusión' },
    'about.v_diversity_b':   { en: 'Welcoming every patient regardless of background, language, or belief.',
                               es: 'Damos la bienvenida a cada paciente sin importar su origen, idioma o creencia.' },

    /* About — Care Team */
    'about.team_label':      { en: 'Our Care Team',                         es: 'Nuestro Equipo de Atención' },
    'about.team_heading':    { en: '14 Specialists, One Coordinated Plan',  es: '14 Especialistas, Un Plan Coordinado' },
    'about.team_sub':        { en: 'Every patient is supported by a complete interdisciplinary team — clinical, therapeutic, social, and dietary — all working from the same care plan.',
                               es: 'Cada paciente cuenta con el apoyo de un equipo interdisciplinario completo: clínico, terapéutico, social y dietético, todos trabajando con el mismo plan de atención.' },
    'about.team_caption':    { en: 'Our team at Healing Bridge Health',     es: 'Nuestro equipo en Healing Bridge Health' },
    'about.r_leadership':    { en: 'Leadership',                            es: 'Liderazgo' },
    'about.r_nursing':       { en: 'Nursing',                               es: 'Enfermería' },
    'about.r_therapy':       { en: 'Therapy',                               es: 'Terapia' },
    'about.r_support':       { en: 'Support',                               es: 'Apoyo' },
    'about.r1':              { en: 'Medical Director',                      es: 'Director Médico' },
    'about.r1d':             { en: 'Oversees clinical care and treatment protocols across the facility.',
                               es: 'Supervisa la atención clínica y los protocolos de tratamiento en toda la instalación.' },
    'about.r2':              { en: 'Chief Administrative Officer',          es: 'Director Administrativo' },
    'about.r2d':             { en: 'Leads facility operations, compliance, and the patient experience.',
                               es: 'Dirige las operaciones de la instalación, el cumplimiento y la experiencia del paciente.' },
    'about.r3':              { en: 'Director of Patient Care Services',     es: 'Directora de Servicios de Atención al Paciente' },
    'about.r3d':             { en: 'Manages nursing care, staffing, and quality of every patient\u2019s stay.',
                               es: 'Gestiona la atención de enfermería, el personal y la calidad de la estadía de cada paciente.' },
    'about.r4':              { en: 'Registered Nurse (RN)',                 es: 'Enfermera Registrada (RN)' },
    'about.r4d':             { en: 'Skilled clinical care, medication management, and care plan execution 24/7.',
                               es: 'Atención clínica capacitada, manejo de medicamentos y ejecución del plan de atención 24/7.' },
    'about.r5':              { en: 'Wound Care Specialist',                 es: 'Especialista en Cuidado de Heridas' },
    'about.r5d':             { en: 'Certified expert in complex wound assessment, VAC therapy, and healing protocols.',
                               es: 'Experta certificada en evaluación de heridas complejas, terapia VAC y protocolos de curación.' },
    'about.r6':              { en: 'Licensed Vocational Nurse (LVN)',       es: 'Enfermera Vocacional Licenciada (LVN)' },
    'about.r6d':             { en: 'Direct patient care, monitoring, treatments, and family communication.',
                               es: 'Atención directa al paciente, monitoreo, tratamientos y comunicación familiar.' },
    'about.r7':              { en: 'Certified Nurse Assistant (CNA)',       es: 'Asistente de Enfermería Certificada (CNA)' },
    'about.r7d':             { en: 'Daily living support, comfort care, and bedside attention around the clock.',
                               es: 'Apoyo en la vida diaria, atención de comodidad y atención junto a la cama las 24 horas.' },
    'about.r8':              { en: 'Restorative Nurse Assistant',           es: 'Asistente de Enfermería Restaurativa' },
    'about.r8d':             { en: 'Hands-on rehabilitation support \u2014 exercises, mobility, and recovery routines.',
                               es: 'Apoyo práctico de rehabilitación: ejercicios, movilidad y rutinas de recuperación.' },
    'about.r9':              { en: 'Physical Therapist',                    es: 'Fisioterapeuta' },
    'about.r9d':             { en: 'Restoring strength, balance, and mobility through evidence-based programs.',
                               es: 'Restaurando la fuerza, el equilibrio y la movilidad a través de programas basados en evidencia.' },
    'about.r10':             { en: 'Occupational Therapist',                es: 'Terapeuta Ocupacional' },
    'about.r10d':            { en: 'Rebuilding independence with daily living skills and adaptive techniques.',
                               es: 'Reconstruyendo la independencia con habilidades de la vida diaria y técnicas adaptativas.' },
    'about.r11':             { en: 'Respiratory Therapist',                 es: 'Terapeuta Respiratorio' },
    'about.r11d':            { en: 'Ventilator management, weaning, tracheostomy, and pulmonary recovery.',
                               es: 'Manejo del ventilador, destete, traqueotomía y recuperación pulmonar.' },
    'about.r12':             { en: 'Speech-Language Therapist',             es: 'Terapeuta del Habla y Lenguaje' },
    'about.r12d':            { en: 'Communication and swallowing therapy after stroke, brain injury, or surgery.',
                               es: 'Terapia de comunicación y deglución después de un accidente cerebrovascular, lesión cerebral o cirugía.' },
    'about.r13':             { en: 'Licensed Social Worker',                es: 'Trabajadora Social Licenciada' },
    'about.r13d':            { en: 'Family support, discharge planning, community resources, and emotional care.',
                               es: 'Apoyo familiar, planificación del alta, recursos comunitarios y atención emocional.' },
    'about.r14':             { en: 'Registered Dietitian',                  es: 'Dietista Registrada' },
    'about.r14d':            { en: 'Nutritional plans tailored to medical conditions, allergies, and recovery needs.',
                               es: 'Planes nutricionales adaptados a condiciones médicas, alergias y necesidades de recuperación.' },
    'about.r15':             { en: 'Certified Cook',                        es: 'Cocinero Certificado' },
    'about.r15d':            { en: 'Fresh, home-style meals prepared on-site to dietitian specifications.',
                               es: 'Comidas frescas y caseras preparadas en el lugar según las especificaciones del dietista.' },

    /* About — Hospital Partners */
    'about.partners_label':  { en: 'Hospital Partners',                     es: 'Hospitales Asociados' },
    'about.partners_heading':{ en: 'Trusted by Local Hospitals',            es: 'Confianza de Hospitales Locales' },
    'about.partners_sub':    { en: 'We accept referrals from hospitals across the San Fernando Valley and greater Los Angeles area — including these partners we work closely with:',
                               es: 'Aceptamos referencias de hospitales en todo el Valle de San Fernando y el área metropolitana de Los Ángeles, incluidos estos socios con los que trabajamos estrechamente:' },
    'about.p1':              { en: 'UCLA Olive View Medical Center',        es: 'Centro Médico UCLA Olive View' },
    'about.p1d':             { en: 'Sylmar, CA',                            es: 'Sylmar, CA' },
    'about.p2':              { en: 'Northridge Hospital Medical Center',    es: 'Centro Médico Northridge Hospital' },
    'about.p2d':             { en: 'Northridge, CA',                        es: 'Northridge, CA' },
    'about.p3':              { en: 'Providence Holy Cross Medical Center',  es: 'Centro Médico Providence Holy Cross' },
    'about.p3d':             { en: 'Mission Hills, CA',                     es: 'Mission Hills, CA' },

    /* About — Why HBH */
    'about.why_label':       { en: 'Why Choose Us',                           es: 'Por Qué Elegirnos' },
    'about.why_heading':     { en: 'Why Healing Bridge Health, Inc.?',        es: '¿Por Qué Healing Bridge Health, Inc.?' },
    'about.why_body':        { en: 'Unlike most post-acute care alternatives, Healing Bridge Health, Inc. provides a non-institutional, home-like environment, creating surroundings conducive to quicker recovery. The facility features sophisticated equipment, an outdoor therapeutic area, and bedrooms designed to make our patients feel like they are at home.',
                               es: 'A diferencia de la mayoría de las alternativas de atención post-aguda, Healing Bridge Health, Inc. ofrece un ambiente no institucional y hogareño, creando un entorno propicio para una recuperación más rápida. Las instalaciones cuentan con equipos sofisticados, un área terapéutica al aire libre y habitaciones diseñadas para que nuestros pacientes se sientan como en casa.' },
    'about.why_body2':       { en: 'Our facility is located in the North San Fernando Valley—close to several medical centers, shopping centers, and freeways, making visits convenient for relatives and friends. Our staff has unparalleled expertise in providing high-quality, cost-effective medical, nursing, and restorative care to individuals with complex conditions, using an Interdisciplinary Treatment Team approach.',
                               es: 'Nuestra instalación está ubicada en el norte del Valle de San Fernando, cerca de varios centros médicos, centros comerciales y autopistas, haciendo que las visitas sean convenientes para familiares y amigos. Nuestro personal tiene experiencia inigualable brindando atención médica, de enfermería y restaurativa de alta calidad y costo-efectiva a personas con condiciones complejas.' },
    'about.hours_label':     { en: 'Visiting Hours:',                         es: 'Horario de Visita:' },
    'about.hours_value':     { en: '11:30 AM to 7:00 PM, daily',              es: '11:30 a.m. a 7:00 p.m., todos los días' },

    /* =================================================================
       SERVICES PAGE
       ================================================================= */
    'services.label':            { en: 'WHAT WE OFFER',                    es: 'LO QUE OFRECEMOS' },
    'services.title':            { en: 'Our Programs & Services',          es: 'Nuestros Programas y Servicios' },
    'services.sub':              { en: 'A continuum of high-quality, cost-effective post-acute care and rehabilitation for people of all ages with complex medical needs.',
                                   es: 'Un continuo de atención post-aguda y rehabilitación de alta calidad y costo-efectiva para personas de todas las edades con necesidades médicas complejas.' },
    'services.intro':            { en: 'Healing Bridge Health, Inc. provides a continuum of high-quality, cost-effective post-acute care and rehabilitation options to people of all ages with brain and spinal cord injury, ventilator dependence, and other life-altering injuries and medically complex illnesses. We offer a distinctive service delivery model—merging an experienced and skilled health care and rehabilitation team with state-of-the-art technology in community-based program settings designed to meet the unique needs of those we serve at every stage of their recovery.',
                                   es: 'Healing Bridge Health, Inc. ofrece un continuo de opciones de atención post-aguda y rehabilitación de alta calidad y costo-efectivas para personas de todas las edades con lesiones cerebrales y de la médula espinal, dependencia del ventilador y otras lesiones que cambian la vida y enfermedades médicamente complejas.' },

    /* Services — Care Continuum */
    'services.cont_label':       { en: 'Where We Fit',                     es: 'Dónde Encajamos' },
    'services.cont_heading':     { en: 'The Right Level of Care, Right When You Need It',
                                   es: 'El Nivel Adecuado de Atención, Justo Cuando lo Necesita' },
    'services.cont_sub':         { en: "A Congregate Living Health Facility delivers care that's more intensive than a skilled nursing facility, but less intensive than a hospital ICU — the perfect fit for patients who need skilled clinical attention without the cost or sterility of a hospital setting.",
                                   es: 'Un Centro Congregado de Vida y Salud brinda atención más intensiva que un centro de enfermería especializada, pero menos intensiva que una UCI hospitalaria, la opción perfecta para pacientes que necesitan atención clínica capacitada sin el costo ni la esterilidad de un entorno hospitalario.' },
    'services.cont1_t':          { en: 'Acute Hospital',                   es: 'Hospital de Cuidados Agudos' },
    'services.cont1_b':          { en: 'ICU and acute medical care during a critical illness or injury.',
                                   es: 'UCI y atención médica aguda durante una enfermedad o lesión crítica.' },
    'services.cont2_t':          { en: 'Healing Bridge Health (CLHF)',     es: 'Healing Bridge Health (CLHF)' },
    'services.cont2_b':          { en: '24/7 skilled nursing in a home-like setting, with sophisticated equipment for complex needs.',
                                   es: 'Enfermería capacitada 24/7 en un entorno hogareño, con equipos sofisticados para necesidades complejas.' },
    'services.cont3_t':          { en: 'Home or Long-Term Setting',        es: 'Hogar o Entorno a Largo Plazo' },
    'services.cont3_b':          { en: 'A safe, supported transition back to daily life.',
                                   es: 'Una transición segura y respaldada de regreso a la vida diaria.' },

    /* Services — Programs (cards) */
    'services.programs_label':   { en: 'Our Programs',                     es: 'Nuestros Programas' },
    'services.programs_heading': { en: 'Specialized Care Programs',        es: 'Programas de Atención Especializada' },
    'services.programs_sub':     { en: 'Click any card below to jump to a deeper look at who it serves, what\u2019s included, and the equipment we use.',
                                   es: 'Haga clic en cualquier tarjeta a continuación para ver con más detalle a quién atiende, qué incluye y qué equipo utilizamos.' },
    'services.learn_more':       { en: 'Learn more \u2192',                es: 'Más información \u2192' },
    'services.p1_title': { en: 'Spinal Cord Injuries',            es: 'Lesiones de la Médula Espinal' },
    'services.p1_body':  { en: 'All levels — comprehensive care and rehabilitation.',
                           es: 'Todos los niveles — atención y rehabilitación integral.' },
    'services.p2_title': { en: 'Complex Wound Care',              es: 'Cuidado de Heridas Complejas' },
    'services.p2_body':  { en: 'Including VAC therapy and advanced wound management.',
                           es: 'Incluyendo terapia VAC y manejo avanzado de heridas.' },
    'services.p3_title': { en: 'Pulmonary & Ventilator',          es: 'Pulmonar y Ventilador' },
    'services.p3_body':  { en: 'Vent care & weaning, trach care, suctioning, and de-cannulation.',
                           es: 'Cuidado y destete del ventilador, cuidado de traqueotomía, succión y descanulación.' },
    'services.p4_title': { en: 'Neuromuscular Disorders',         es: 'Trastornos Neuromusculares' },
    'services.p4_body':  { en: 'Including Guillain-Barré, Muscular Dystrophy, Myasthenia Gravis, and ALS.',
                           es: 'Incluyendo Guillain-Barré, Distrofia Muscular, Miastenia Gravis y ELA.' },
    'services.p5_title': { en: 'Medically Complex Cases',         es: 'Casos Médicamente Complejos' },
    'services.p5_body':  { en: 'Multiple trauma/fractures, multiple IV antibiotic therapy, and G/J-feedings.',
                           es: 'Trauma/fracturas múltiples, terapia múltiple con antibióticos IV y alimentación G/J.' },
    'services.p6_title': { en: 'Acquired Brain Injuries',         es: 'Lesiones Cerebrales Adquiridas' },
    'services.p6_body':  { en: 'Traumatic, anoxic, aneurysms/bleed, and cerebral vascular accidents.',
                           es: 'Traumática, anóxica, aneurismas/sangrado y accidentes cerebrovasculares.' },
    'services.p7_title': { en: 'Orthopedically Complex Cases',    es: 'Casos Ortopédicamente Complejos' },
    'services.p7_body':  { en: 'Including multiple trauma and fractures.',
                           es: 'Incluyendo trauma y fracturas múltiples.' },
    'services.p8_title': { en: 'Rehabilitation',                  es: 'Rehabilitación' },
    'services.p8_body':  { en: 'Licensed PT, OT, speech therapists, plus social services and community integration.',
                           es: 'PT, OT, terapeutas del habla con licencia, además de servicios sociales e integración comunitaria.' },
    'services.p9_title': { en: 'Care Coordination',               es: 'Coordinación de Atención' },
    'services.p9_body':  { en: 'Seamless interdisciplinary collaboration between physicians, nurses, therapists, and families.',
                           es: 'Colaboración interdisciplinaria fluida entre médicos, enfermeras, terapeutas y familias.' },

    /* Services — Detail section labels */
    'services.tag_program':      { en: 'Program',                          es: 'Programa' },
    'services.lbl_who':          { en: "Who It's For",                     es: 'Para Quién Es' },
    'services.lbl_includes':     { en: "What's Included",                  es: 'Qué Incluye' },
    'services.lbl_equipment':    { en: 'Equipment Used',                   es: 'Equipo Utilizado' },

    /* Services — Detail: Spinal Cord */
    'services.d1_heading':       { en: 'Spinal Cord Injury Care',          es: 'Atención por Lesión de la Médula Espinal' },
    'services.d1_lead':          { en: 'Comprehensive recovery and rehabilitation for spinal cord injuries at all levels — from cervical to lumbar, complete to incomplete.',
                                   es: 'Recuperación y rehabilitación integral para lesiones de la médula espinal en todos los niveles, desde cervical hasta lumbar, completas o incompletas.' },
    'services.d1_who':           { en: 'Patients recovering from traumatic or non-traumatic spinal cord injuries who need 24/7 skilled care, complex rehabilitation, and a safe transition back to home or long-term care.',
                                   es: 'Pacientes que se recuperan de lesiones traumáticas o no traumáticas de la médula espinal que necesitan atención capacitada 24/7, rehabilitación compleja y una transición segura de regreso a casa o a un cuidado a largo plazo.' },
    'services.d1_i1':            { en: '24/7 skilled nursing care & monitoring',           es: 'Atención y monitoreo de enfermería capacitada 24/7' },
    'services.d1_i2':            { en: 'Pressure injury prevention & turning protocols',   es: 'Prevención de lesiones por presión y protocolos de cambio de posición' },
    'services.d1_i3':            { en: 'Bowel & bladder management programs',              es: 'Programas de manejo intestinal y vesical' },
    'services.d1_i4':            { en: 'Physical, occupational, & respiratory therapy',    es: 'Terapia física, ocupacional y respiratoria' },
    'services.d1_i5':            { en: 'Mobility training & assistive technology',         es: 'Entrenamiento de movilidad y tecnología de asistencia' },
    'services.d1_i6':            { en: 'Family education & discharge planning',            es: 'Educación familiar y planificación del alta' },
    'services.d1_e1':            { en: 'Hill-Rom hospital beds with pressure-relief surfaces',
                                   es: 'Camas hospitalarias Hill-Rom con superficies de alivio de presión' },
    'services.d1_e2':            { en: 'Hoyer lifts for safe patient transfers',           es: 'Elevadores Hoyer para traslados seguros' },
    'services.d1_e3':            { en: 'Stryker rehabilitation equipment',                 es: 'Equipo de rehabilitación Stryker' },
    'services.d1_e4':            { en: 'Specialized wheelchairs & mobility aids',          es: 'Sillas de ruedas especializadas y ayudas de movilidad' },

    /* Services — Detail: Wound Care */
    'services.d2_heading':       { en: 'Complex Wound Care',               es: 'Cuidado de Heridas Complejas' },
    'services.d2_lead':          { en: 'Advanced wound management led by our certified Wound Care Specialist, including VAC therapy and proven healing protocols.',
                                   es: 'Manejo avanzado de heridas dirigido por nuestra Especialista certificada en Cuidado de Heridas, incluida la terapia VAC y protocolos de curación probados.' },
    'services.d2_who':           { en: 'Patients with stage III/IV pressure injuries, surgical wounds, diabetic ulcers, traumatic wounds, or any complex wound that requires specialized assessment and treatment.',
                                   es: 'Pacientes con lesiones por presión de etapa III/IV, heridas quirúrgicas, úlceras diabéticas, heridas traumáticas o cualquier herida compleja que requiera evaluación y tratamiento especializados.' },
    'services.d2_i1':            { en: 'Certified wound care nurse on staff',              es: 'Enfermera certificada en cuidado de heridas en el equipo' },
    'services.d2_i2':            { en: 'VAC (Vacuum-Assisted Closure) therapy',            es: 'Terapia VAC (Cierre Asistido por Vacío)' },
    'services.d2_i3':            { en: 'Advanced dressings & debridement',                 es: 'Apósitos avanzados y desbridamiento' },
    'services.d2_i4':            { en: 'Infection prevention protocols',                   es: 'Protocolos de prevención de infecciones' },
    'services.d2_i5':            { en: 'Nutrition support for wound healing',              es: 'Apoyo nutricional para la curación de heridas' },
    'services.d2_i6':            { en: 'Weekly wound assessment & documentation',          es: 'Evaluación y documentación semanal de heridas' },
    'services.d2_e1':            { en: 'VAC therapy systems',                              es: 'Sistemas de terapia VAC' },
    'services.d2_e2':            { en: 'Pressure-relief mattresses (Hill-Rom)',            es: 'Colchones de alivio de presión (Hill-Rom)' },
    'services.d2_e3':            { en: 'Sterile wound assessment & treatment supplies',    es: 'Suministros estériles de evaluación y tratamiento' },
    'services.d2_e4':            { en: 'Hoyer lifts to safely reposition patients',        es: 'Elevadores Hoyer para reposicionar pacientes con seguridad' },

    /* Services — Detail: Pulmonary */
    'services.d3_heading':       { en: 'Pulmonary & Ventilator Care',      es: 'Atención Pulmonar y de Ventilador' },
    'services.d3_lead':          { en: 'Specialized respiratory care for patients on ventilators, with tracheostomies, or recovering from pulmonary events — led by a dedicated Respiratory Therapist.',
                                   es: 'Atención respiratoria especializada para pacientes con ventiladores, traqueotomías o que se recuperan de eventos pulmonares, dirigida por un Terapeuta Respiratorio dedicado.' },
    'services.d3_who':           { en: 'Ventilator-dependent patients, those with tracheostomies, recovering from respiratory failure, COPD exacerbations, ARDS, pneumonia, or other complex pulmonary conditions.',
                                   es: 'Pacientes dependientes de ventilador, con traqueotomías, que se recuperan de insuficiencia respiratoria, exacerbaciones de EPOC, SDRA, neumonía u otras condiciones pulmonares complejas.' },
    'services.d3_i1':            { en: '24/7 ventilator monitoring & management',          es: 'Monitoreo y manejo del ventilador 24/7' },
    'services.d3_i2':            { en: 'Ventilator weaning protocols',                     es: 'Protocolos de destete del ventilador' },
    'services.d3_i3':            { en: 'Tracheostomy care & de-cannulation',               es: 'Cuidado de traqueotomía y descanulación' },
    'services.d3_i4':            { en: 'Suctioning & airway clearance',                    es: 'Succión y limpieza de las vías respiratorias' },
    'services.d3_i5':            { en: 'Oxygen therapy & pulse oximetry',                  es: 'Oxigenoterapia y pulsioximetría' },
    'services.d3_i6':            { en: 'Respiratory therapy & breathing exercises',        es: 'Terapia respiratoria y ejercicios de respiración' },
    'services.d3_e1':            { en: 'Modern ventilators with weaning capability',       es: 'Ventiladores modernos con capacidad de destete' },
    'services.d3_e2':            { en: 'Suction equipment at every bedside',               es: 'Equipo de succión en cada cama' },
    'services.d3_e3':            { en: 'Oxygen concentrators & supplemental O\u2082',      es: 'Concentradores de oxígeno y O\u2082 suplementario' },
    'services.d3_e4':            { en: 'Pulse oximeters & respiratory monitors',           es: 'Pulsioxímetros y monitores respiratorios' },

    /* Services — Detail: Brain Injury */
    'services.d4_heading':       { en: 'Acquired Brain Injury Care',       es: 'Atención de Lesiones Cerebrales Adquiridas' },
    'services.d4_lead':          { en: 'Patient and family-centered care for traumatic brain injury, stroke, anoxic injury, aneurysm, and other cerebrovascular events.',
                                   es: 'Atención centrada en el paciente y la familia para lesiones cerebrales traumáticas, accidente cerebrovascular, lesión anóxica, aneurisma y otros eventos cerebrovasculares.' },
    'services.d4_who':           { en: 'Patients recovering from traumatic brain injury (TBI), strokes (CVA), anoxic injury, brain aneurysm or bleed, who need both clinical management and rehabilitation in a calm, structured environment.',
                                   es: 'Pacientes que se recuperan de lesión cerebral traumática (TCE), accidente cerebrovascular (ACV), lesión anóxica, aneurisma o sangrado cerebral, que necesitan tanto manejo clínico como rehabilitación en un entorno tranquilo y estructurado.' },
    'services.d4_i1':            { en: 'Neurological monitoring & assessment',              es: 'Monitoreo y evaluación neurológica' },
    'services.d4_i2':            { en: 'Speech-language therapy (cognition & swallowing)',  es: 'Terapia del habla y lenguaje (cognición y deglución)' },
    'services.d4_i3':            { en: 'Physical & occupational therapy',                   es: 'Terapia física y ocupacional' },
    'services.d4_i4':            { en: 'Seizure precautions & medication management',       es: 'Precauciones contra convulsiones y manejo de medicamentos' },
    'services.d4_i5':            { en: 'Family education & emotional support',              es: 'Educación familiar y apoyo emocional' },
    'services.d4_i6':            { en: 'Quiet, low-stimulation recovery environment',       es: 'Entorno de recuperación tranquilo y de baja estimulación' },
    'services.d4_e1':            { en: 'Hill-Rom adjustable beds with side rails',          es: 'Camas ajustables Hill-Rom con barandillas laterales' },
    'services.d4_e2':            { en: 'Stryker therapy & mobility equipment',              es: 'Equipo de terapia y movilidad Stryker' },
    'services.d4_e3':            { en: 'Hoyer lifts for safe transfers',                    es: 'Elevadores Hoyer para traslados seguros' },
    'services.d4_e4':            { en: 'Communication & cognitive therapy tools',           es: 'Herramientas de comunicación y terapia cognitiva' },

    /* Services — Detail: Rehabilitation */
    'services.d5_heading':       { en: 'Rehabilitation Services',          es: 'Servicios de Rehabilitación' },
    'services.d5_lead':          { en: 'A complete in-house therapy program with licensed physical, occupational, speech-language, and respiratory therapists working together.',
                                   es: 'Un programa completo de terapia interna con fisioterapeutas, terapeutas ocupacionales, del habla-lenguaje y respiratorios licenciados trabajando juntos.' },
    'services.d5_who':           { en: 'Any patient whose recovery requires structured rehabilitation — from regaining mobility after surgery, to relearning daily living skills after injury, to recovering speech and swallowing function.',
                                   es: 'Cualquier paciente cuya recuperación requiera rehabilitación estructurada: desde recuperar la movilidad después de la cirugía, hasta volver a aprender habilidades de la vida diaria después de una lesión, hasta recuperar la función del habla y la deglución.' },
    'services.d5_i1':            { en: '<strong>Physical Therapy</strong> — strength, balance, mobility',
                                   es: '<strong>Fisioterapia</strong> — fuerza, equilibrio, movilidad' },
    'services.d5_i2':            { en: '<strong>Occupational Therapy</strong> — daily living skills',
                                   es: '<strong>Terapia Ocupacional</strong> — habilidades de la vida diaria' },
    'services.d5_i3':            { en: '<strong>Speech-Language Therapy</strong> — communication & swallowing',
                                   es: '<strong>Terapia del Habla y Lenguaje</strong> — comunicación y deglución' },
    'services.d5_i4':            { en: '<strong>Respiratory Therapy</strong> — breathing & weaning',
                                   es: '<strong>Terapia Respiratoria</strong> — respiración y destete' },
    'services.d5_i5':            { en: '<strong>Restorative Care</strong> — daily exercise & movement',
                                   es: '<strong>Atención Restaurativa</strong> — ejercicio y movimiento diario' },
    'services.d5_i6':            { en: '<strong>Social Services</strong> — emotional & community support',
                                   es: '<strong>Servicios Sociales</strong> — apoyo emocional y comunitario' },
    'services.d5_e1':            { en: 'Stryker rehabilitation equipment',                  es: 'Equipo de rehabilitación Stryker' },
    'services.d5_e2':            { en: 'Parallel bars & gait training tools',               es: 'Barras paralelas y herramientas de entrenamiento de marcha' },
    'services.d5_e3':            { en: 'Hoyer lifts for safe mobility training',            es: 'Elevadores Hoyer para entrenamiento de movilidad seguro' },
    'services.d5_e4':            { en: 'Adaptive utensils & daily-living aids',             es: 'Utensilios adaptativos y ayudas para la vida diaria' },

    /* Services — Equipment */
    'services.eq_label':         { en: 'Equipment & Technology',           es: 'Equipo y Tecnología' },
    'services.eq_heading':       { en: 'State-of-the-Art Tools, Hospital-Grade Care',
                                   es: 'Herramientas de Vanguardia, Atención de Grado Hospitalario' },
    'services.eq_sub':           { en: "Our facility is outfitted with the same equipment trusted in major hospitals — chosen for safety, comfort, and clinical excellence.",
                                   es: 'Nuestra instalación está equipada con el mismo equipo de confianza en los principales hospitales, elegido por su seguridad, comodidad y excelencia clínica.' },
    'services.eq_brand1':        { en: 'Hill-Rom',                         es: 'Hill-Rom' },
    'services.eq_brand2':        { en: 'Stryker',                          es: 'Stryker' },
    'services.eq_brand3':        { en: 'Hoyer',                            es: 'Hoyer' },
    'services.eq1_title':        { en: 'Hill-Rom Hospital Beds',           es: 'Camas Hospitalarias Hill-Rom' },
    'services.eq1_body':         { en: "Industry-leading hospital beds with pressure-relief surfaces, height adjustment, and integrated safety features. The same beds you'd find in major hospitals — chosen because they support faster wound healing, easier transfers, and more comfortable rest.",
                                   es: 'Camas hospitalarias líderes en la industria con superficies de alivio de presión, ajuste de altura y características de seguridad integradas. Las mismas camas que encontraría en los principales hospitales, elegidas porque apoyan una curación de heridas más rápida, traslados más fáciles y un descanso más cómodo.' },
    'services.eq2_title':        { en: 'Stryker Medical Equipment',        es: 'Equipo Médico Stryker' },
    'services.eq2_body':         { en: 'Trusted across hospitals and rehabilitation centers worldwide, Stryker equipment supports our therapy and mobility programs — from beds to therapy tools, every piece is engineered for clinical reliability.',
                                   es: 'De confianza en hospitales y centros de rehabilitación de todo el mundo, el equipo Stryker apoya nuestros programas de terapia y movilidad: desde camas hasta herramientas de terapia, cada pieza está diseñada para la fiabilidad clínica.' },
    'services.eq3_title':        { en: 'Hoyer Patient Lifts',              es: 'Elevadores de Pacientes Hoyer' },
    'services.eq3_body':         { en: 'Safe, dignified patient transfers with the gold-standard Hoyer lift system. Used by our team for everything from bed-to-chair moves to bathing, eliminating injury risk for both patients and staff.',
                                   es: 'Traslados de pacientes seguros y dignos con el sistema de elevación Hoyer estándar de oro. Utilizado por nuestro equipo para todo, desde traslados de cama a silla hasta el baño, eliminando el riesgo de lesiones tanto para los pacientes como para el personal.' },
    'services.eq4_title':        { en: 'Modern Ventilators',               es: 'Ventiladores Modernos' },
    'services.eq4_body':         { en: 'Full ventilator support with weaning capability, monitored 24/7 by our Respiratory Therapist.',
                                   es: 'Soporte completo del ventilador con capacidad de destete, monitoreado 24/7 por nuestro Terapeuta Respiratorio.' },
    'services.eq5_title':        { en: 'VAC Wound Therapy',                es: 'Terapia VAC para Heridas' },
    'services.eq5_body':         { en: 'Vacuum-Assisted Closure systems that proven accelerate wound healing in complex cases.',
                                   es: 'Sistemas de Cierre Asistido por Vacío que aceleran comprobadamente la curación de heridas en casos complejos.' },
    'services.eq6_title':        { en: 'Vital Sign Monitoring',            es: 'Monitoreo de Signos Vitales' },
    'services.eq6_body':         { en: 'Continuous monitoring of heart rate, oxygen saturation, blood pressure, and respiratory function.',
                                   es: 'Monitoreo continuo de frecuencia cardíaca, saturación de oxígeno, presión arterial y función respiratoria.' },
    'services.eq7_title':        { en: 'IV & Medication Pumps',            es: 'Bombas de Infusión y Medicamentos' },
    'services.eq7_body':         { en: 'Precision infusion pumps for IV therapy, antibiotics, nutrition, and pain management.',
                                   es: 'Bombas de infusión de precisión para terapia IV, antibióticos, nutrición y manejo del dolor.' },
    'services.eq8_title':        { en: 'Suction & Oxygen Systems',         es: 'Sistemas de Succión y Oxígeno' },
    'services.eq8_body':         { en: 'Bedside suction and supplemental oxygen at every patient station for immediate availability.',
                                   es: 'Succión junto a la cama y oxígeno suplementario en cada estación del paciente para disponibilidad inmediata.' },
    'services.eq9_title':        { en: 'Nurse Call Systems',               es: 'Sistemas de Llamada de Enfermería' },
    'services.eq9_body':         { en: 'Bedside call systems linked to our nurse station for instant response, day or night.',
                                   es: 'Sistemas de llamada junto a la cama vinculados a nuestra estación de enfermería para respuesta instantánea, de día o de noche.' },

    /* Services — Multilingual */
    'services.ml_heading':       { en: 'Care in Your Language',            es: 'Atención en Su Idioma' },
    'services.ml_body':          { en: 'Our team speaks <strong>English, Spanish, and French</strong> — so patients and families can always feel heard, understood, and confident in the care they receive.',
                                   es: 'Nuestro equipo habla <strong>inglés, español y francés</strong>, para que los pacientes y las familias siempre se sientan escuchados, comprendidos y seguros de la atención que reciben.' },
    'services.ml_en':            { en: 'English',                          es: 'Inglés' },
    'services.ml_es':            { en: 'Español',                          es: 'Español' },
    'services.ml_fr':            { en: 'Français',                         es: 'Francés' },

    /* Services — Funding */
    'services.funding_label':   { en: 'Funding Options',          es: 'Opciones de Financiamiento' },
    'services.funding_heading': { en: 'Quality Care, Accessible Funding', es: 'Atención de Calidad, Financiamiento Accesible' },
    'services.funding_body':    { en: 'We strive to provide a higher quality of care at a lower cost alternative, working closely with a variety of payors—including private insurance companies and workers\u2019 compensation specialists.',
                                  es: 'Nos esforzamos por brindar una atención de mayor calidad a un costo más bajo, trabajando estrechamente con una variedad de pagadores, incluidas compañías de seguros privados y especialistas en compensación laboral.' },
    'services.f1': { en: 'Workers\u2019 Compensation',                      es: 'Compensación Laboral' },
    'services.f2': { en: 'Private Insurance',                              es: 'Seguro Privado' },
    'services.f3': { en: 'Private Pay',                                    es: 'Pago Privado' },
    'services.f4': { en: 'Medicare',                                       es: 'Medicare' },
    'services.f5': { en: 'Medicaid (state & federally funded)',            es: 'Medicaid (estatal y federal)' },

    /* Services — Admissions */
    'services.adm_label':        { en: 'Admissions',                       es: 'Admisiones' },
    'services.adm_heading':      { en: 'A Simple 4-Step Referral Process', es: 'Un Proceso de Referencia Simple en 4 Pasos' },
    'services.adm_sub':          { en: "We accept referrals 24/7 from hospitals, case managers, physicians, and families. Here's what to expect.",
                                   es: 'Aceptamos referencias 24/7 de hospitales, administradores de casos, médicos y familias. Esto es lo que puede esperar.' },
    'services.adm1_t':           { en: 'Refer',                            es: 'Referir' },
    'services.adm1_b':           { en: 'Hospital discharge planners, physicians, case managers, or family members can initiate a referral by calling or faxing patient information.',
                                   es: 'Los planificadores de altas hospitalarias, médicos, administradores de casos o familiares pueden iniciar una referencia llamando o enviando por fax la información del paciente.' },
    'services.adm1_meta':        { en: 'Phone or fax — 24/7',              es: 'Teléfono o fax — 24/7' },
    'services.adm2_t':           { en: 'Assess',                           es: 'Evaluar' },
    'services.adm2_b':           { en: "Our clinical team reviews medical records, current condition, and care needs to confirm we're the right fit and determine the appropriate level of care.",
                                   es: 'Nuestro equipo clínico revisa los registros médicos, la condición actual y las necesidades de atención para confirmar que somos la opción adecuada y determinar el nivel de atención apropiado.' },
    'services.adm2_meta':        { en: 'Same-day response',                es: 'Respuesta el mismo día' },
    'services.adm3_t':           { en: 'Admit',                            es: 'Admitir' },
    'services.adm3_b':           { en: 'We coordinate transportation, room preparation, and admission paperwork — and meet the patient and family on arrival to ensure a calm transition.',
                                   es: 'Coordinamos el transporte, la preparación de la habitación y los trámites de admisión, y recibimos al paciente y la familia a su llegada para asegurar una transición tranquila.' },
    'services.adm3_meta':        { en: 'Coordinated handoff',              es: 'Transferencia coordinada' },
    'services.adm4_t':           { en: 'Care',                             es: 'Atender' },
    'services.adm4_b':           { en: 'Our 14-member interdisciplinary team begins delivering the personalized care plan, with family kept informed every step of the way.',
                                   es: 'Nuestro equipo interdisciplinario de 14 miembros comienza a brindar el plan de atención personalizado, manteniendo informada a la familia en cada paso del camino.' },
    'services.adm4_meta':        { en: 'Day one and beyond',               es: 'Desde el primer día y más allá' },
    'services.adm_phone_l':      { en: 'Referral Phone',                   es: 'Teléfono de Referencia' },
    'services.adm_fax_l':        { en: 'Referral Fax',                     es: 'Fax de Referencia' },
    'services.adm_email_l':      { en: 'Email',                            es: 'Correo Electrónico' },
    'services.cta_heading':      { en: 'Have a Question About a Program?', es: '¿Tiene una Pregunta Sobre un Programa?' },

    /* =================================================================
       AMENITIES PAGE (existing v1 — will be replaced when we redo it)
       ================================================================= */
    'amen.label':        { en: 'A HOME-LIKE ENVIRONMENT',     es: 'UN AMBIENTE HOGAREÑO' },
    'amen.title':        { en: 'Our Amenities',               es: 'Nuestras Comodidades' },
    'amen.sub':          { en: 'A non-institutional, home-like Congregate Living Health Facility designed for comfort, dignity, and quicker recovery.',
                           es: 'Un Centro Congregado de Vida y Salud no institucional y hogareño, diseñado para la comodidad, dignidad y recuperación más rápida.' },
    'amen.h_label':      { en: 'Why It Feels Different',      es: 'Por Qué Se Siente Diferente' },
    'amen.h_heading':    { en: 'Designed Around Comfort & Care',
                           es: 'Diseñado en Torno al Comfort y la Atención' },
    'amen.h1_title':     { en: 'Home-Like Environment',       es: 'Ambiente Hogareño' },
    'amen.h1_body':      { en: 'A non-institutional setting that creates surroundings conducive to quicker recovery.',
                           es: 'Un entorno no institucional que crea condiciones propicias para una recuperación más rápida.' },
    'amen.h2_title':     { en: 'Sophisticated Equipment',     es: 'Equipo Sofisticado' },
    'amen.h2_body':      { en: 'State-of-the-art medical and rehabilitation technology supporting every stage of care.',
                           es: 'Tecnología médica y de rehabilitación de vanguardia que respalda cada etapa de la atención.' },
    'amen.h3_title':     { en: 'Outdoor Therapeutic Area',    es: 'Área Terapéutica al Aire Libre' },
    'amen.h3_body':      { en: 'A peaceful outdoor space that supports recovery, fresh air, and gentle movement.',
                           es: 'Un espacio al aire libre tranquilo que apoya la recuperación, el aire fresco y el movimiento suave.' },
    'amen.h4_title':     { en: 'Comfortable Bedrooms',        es: 'Habitaciones Cómodas' },
    'amen.h4_body':      { en: 'Bedrooms designed to feel like home, helping patients rest and recover with dignity.',
                           es: 'Habitaciones diseñadas para sentirse como en casa, ayudando a los pacientes a descansar y recuperarse con dignidad.' },
    'amen.h5_title':     { en: '24/7 Skilled Staffing',       es: 'Personal Capacitado 24/7' },
    'amen.h5_body':      { en: 'An interdisciplinary team available around the clock to deliver complex, restorative care.',
                           es: 'Un equipo interdisciplinario disponible las 24 horas para brindar atención compleja y restaurativa.' },
    'amen.h6_title':     { en: 'Convenient Location',         es: 'Ubicación Conveniente' },
    'amen.h6_body':      { en: 'In the North San Fernando Valley—near medical centers, shopping, and freeways for easy visits.',
                           es: 'En el norte del Valle de San Fernando, cerca de centros médicos, compras y autopistas para visitas fáciles.' },
    'amen.r1_label':     { en: 'Reception & Lobby',           es: 'Recepción y Vestíbulo' },
    'amen.r1_heading':   { en: 'A Warm First Impression',     es: 'Una Cálida Primera Impresión' },
    'amen.r1_body':      { en: 'Our welcoming lobby and reception sets the tone for the warmth and professionalism patients and families experience throughout their stay. Bright, calming, and thoughtfully decorated.',
                           es: 'Nuestro acogedor vestíbulo y recepción establece el tono para la calidez y profesionalismo que los pacientes y familias experimentan durante toda su estadía.' },
    'amen.r2_label':     { en: 'Patient Bedrooms',            es: 'Habitaciones de Pacientes' },
    'amen.r2_heading':   { en: 'Restful Rooms That Feel Like Home',
                           es: 'Habitaciones Acogedoras Que Se Sienten Como en Casa' },
    'amen.r2_body':      { en: 'Each bedroom is equipped with a hospital-grade bed, call system, and personal touches—greenery, lamps, and warm wood furniture—to ease the transition from hospital to home.',
                           es: 'Cada habitación está equipada con una cama de grado hospitalario, sistema de llamada y toques personales para facilitar la transición del hospital al hogar.' },
    'amen.r3_label':     { en: 'Kitchen & Dining',            es: 'Cocina y Comedor' },
    'amen.r3_heading':   { en: 'Nutritious, Home-Cooked Meals',
                           es: 'Comidas Nutritivas y Caseras' },
    'amen.r3_body':      { en: 'Our fully-equipped modern kitchen supports nutritious, home-style meals tailored to every patient\u2019s dietary needs—because good food is part of good healing.',
                           es: 'Nuestra cocina moderna y completamente equipada apoya comidas nutritivas de estilo casero adaptadas a las necesidades dietéticas de cada paciente.' },
    'amen.r4_label':     { en: 'Therapy & Common Areas',      es: 'Terapia y Áreas Comunes' },
    'amen.r4_heading':   { en: 'Spaces Designed for Recovery',
                           es: 'Espacios Diseñados para la Recuperación' },
    'amen.r4_body':      { en: 'Bright, open spaces support physical, occupational, and speech therapy, as well as social interaction and community events. Every detail is designed to feel calm, safe, and motivating.',
                           es: 'Espacios brillantes y abiertos apoyan la terapia física, ocupacional y del habla, así como la interacción social y eventos comunitarios.' },
    'amen.r5_label':     { en: 'Nurse Station',               es: 'Estación de Enfermería' },
    'amen.r5_heading':   { en: 'Always Close By',             es: 'Siempre Cerca' },
    'amen.r5_body':      { en: 'Our centrally located nurse station means skilled staff is always within reach—monitoring, supporting, and responding 24/7 to keep patients safe and comfortable.',
                           es: 'Nuestra estación de enfermería ubicada centralmente significa que el personal capacitado siempre está al alcance, monitoreando, apoyando y respondiendo 24/7.' },
    'amen.visit_heading': { en: 'Visiting Hours',             es: 'Horario de Visita' },
    'amen.visit_time':    { en: '11:30 AM – 7:00 PM, daily',  es: '11:30 a.m. – 7:00 p.m., todos los días' },
    'amen.visit_body':    { en: 'We welcome family and friends throughout the day. Visits are an important part of healing.',
                            es: 'Damos la bienvenida a familiares y amigos durante todo el día. Las visitas son una parte importante de la sanación.' },
    'amen.visit_btn':     { en: 'Plan a Visit',               es: 'Planificar una Visita' },
    'amen.cta_heading':   { en: 'Want to Tour the Facility?', es: '¿Le Gustaría Recorrer las Instalaciones?' },

    /* =================================================================
       GALLERY PAGE
       ================================================================= */
    'gal.label':        { en: 'A LOOK INSIDE',         es: 'UN VISTAZO POR DENTRO' },
    'gal.title':        { en: 'Photo Gallery',         es: 'Galería de Fotos' },
    'gal.sub':          { en: 'Step inside Healing Bridge Health—our welcoming spaces, comfortable bedrooms, and care-centered design.',
                          es: 'Conozca por dentro Healing Bridge Health: nuestros espacios acogedores, habitaciones cómodas y diseño centrado en el cuidado.' },
    'gal.f_all':        { en: 'All',                   es: 'Todos' },
    'gal.f_lobby':      { en: 'Lobby & Reception',     es: 'Vestíbulo y Recepción' },
    'gal.f_rooms':      { en: 'Patient Rooms',         es: 'Habitaciones' },
    'gal.f_kitchen':    { en: 'Kitchen & Dining',      es: 'Cocina y Comedor' },
    'gal.f_common':     { en: 'Common Areas',          es: 'Áreas Comunes' },
    'gal.f_outdoor':    { en: 'Exterior',              es: 'Exterior', fr: 'Ext00e9rieur' },
    'gal.f_staff':      { en: 'Staff Areas',           es: 'Áreas del Personal' },
    'gal.cta_heading':  { en: 'Like What You See? Come See It in Person.',
                          es: '¿Le Gusta Lo Que Ve? Venga a Verlo en Persona.' },

    /* =================================================================
       CONTACT PAGE (existing v1 — will be replaced when we redo it)
       ================================================================= */
    'ct.label':         { en: 'GET IN TOUCH',          es: 'PÓNGASE EN CONTACTO' },
    'ct.title':         { en: 'Contact Healing Bridge Health',
                          es: 'Contacte a Healing Bridge Health' },
    'ct.sub':           { en: 'Have a question, want a tour, or ready for a referral? We\u2019re here to help.',
                          es: '¿Tiene una pregunta, quiere un recorrido o está listo para una referencia? Estamos aquí para ayudar.' },
    'ct.c1_label':      { en: 'Phone',                 es: 'Teléfono' },
    'ct.c1_cta':        { en: 'Call now \u2192',       es: 'Llamar ahora \u2192' },
    'ct.c2_label':      { en: 'Fax',                   es: 'Fax' },
    'ct.c2_cta':        { en: 'Fax referrals 24/7',    es: 'Referencias por fax 24/7' },
    'ct.c3_label':      { en: 'Email',                 es: 'Correo Electrónico' },
    'ct.c3_cta':        { en: 'Send us a note \u2192', es: 'Envíenos un mensaje \u2192' },
    'ct.c4_label':      { en: 'Visit Us',              es: 'Visítenos' },
    'ct.c4_cta':        { en: 'Get directions \u2192', es: 'Obtener indicaciones \u2192' },
    'ct.form_label':    { en: 'Send a Message',        es: 'Envíe un Mensaje' },
    'ct.form_heading':  { en: 'We\u2019d Love to Hear From You',
                          es: 'Nos Encantaría Saber de Usted' },
    'ct.form_body':     { en: 'Whether you\u2019re a patient, family member, case manager, or healthcare partner—our team will get back to you as quickly as possible.',
                          es: 'Ya sea paciente, familiar, administrador de casos o socio de atención médica, nuestro equipo le responderá lo más rápido posible.' },
    'ct.f_name':        { en: 'Full Name',             es: 'Nombre Completo' },
    'ct.f_phone':       { en: 'Phone',                 es: 'Teléfono' },
    'ct.f_email':       { en: 'Email Address',         es: 'Correo Electrónico' },
    'ct.f_subject':     { en: "I\u2019m contacting about\u2026", es: 'Me comunico sobre\u2026' },
    'ct.f_s1':          { en: 'A patient referral',                  es: 'Una referencia de paciente' },
    'ct.f_s2':          { en: 'Scheduling a tour',                   es: 'Programar un recorrido' },
    'ct.f_s3':          { en: 'Insurance & funding questions',       es: 'Preguntas sobre seguros y financiamiento' },
    'ct.f_s4':          { en: 'Career opportunities',                es: 'Oportunidades de carrera' },
    'ct.f_s5':          { en: 'Something else',                      es: 'Otra cosa' },
    'ct.f_message':     { en: 'Message',                             es: 'Mensaje' },
    'ct.f_send':        { en: 'Send Message',                        es: 'Enviar Mensaje' },
    'ct.f_success':     { en: 'Thanks—we\u2019ll be in touch shortly.',
                          es: 'Gracias, nos pondremos en contacto en breve.' },
    'ct.hours_heading': { en: 'Visiting Hours',                      es: 'Horario de Visita' },
    'ct.hours_time':    { en: '11:30 AM – 7:00 PM, daily',           es: '11:30 a.m. – 7:00 p.m., todos los días' },
    'ct.hours_note':    { en: 'Care services and referrals available 24/7.',
                          es: 'Servicios de atención y referencias disponibles 24/7.' },
    'ct.cta_heading':   { en: 'Need a Faster Reply? <strong>Call us directly.</strong>',
                          es: '¿Necesita una Respuesta Más Rápida? <strong>Llámenos directamente.</strong>' },
    'ct.cta_btn':       { en: '(747) 271-7001',                      es: '(747) 271-7001' }
  };

  function set(lang) {
    document.querySelectorAll('.lang-link').forEach(function (el) {
      el.classList.toggle('active', el.dataset.lang === lang);
    });
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      var t = translations[el.getAttribute('data-i18n')];
      if (t && t[lang]) el.innerHTML = t[lang];
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(function (el) {
      var t = translations[el.getAttribute('data-i18n-placeholder')];
      if (t && t[lang]) el.placeholder = t[lang];
    });
  }

  return { set: set };
})();