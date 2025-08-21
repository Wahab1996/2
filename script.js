// script.js — Theme toggle + Dose/Fluids calculators + Med list
// ================================================
// 1) Theme (Light/Dark) with localStorage
(function () {
  const root = document.documentElement;
  const btn = document.getElementById('themeToggle');
  const THEME_KEY = 'pet-theme';

  const saved = localStorage.getItem(THEME_KEY);
  if (saved === 'light' || saved === 'dark') {
    root.setAttribute('data-theme', saved);
    if (btn) btn.setAttribute('aria-pressed', saved === 'dark' ? 'true' : 'false');
  } else if (btn) {
    // Sync aria-pressed with current computed preference
    try {
      const isDark = matchMedia('(prefers-color-scheme: dark)').matches;
      btn.setAttribute('aria-pressed', isDark ? 'true' : 'false');
    } catch { /* no-op */ }
  }

  if (btn) {
    btn.addEventListener('click', () => {
      const current = root.getAttribute('data-theme'); // null | light | dark
      const next = current === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      localStorage.setItem(THEME_KEY, next);
      btn.setAttribute('aria-pressed', next === 'dark' ? 'true' : 'false');
      btn.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.08)' }, { transform: 'scale(1)' }], { duration: 180, easing: 'ease-out' });
    });
  }

  // Keyboard UX for cards (Enter/Space activates links)
  document.querySelectorAll('.card-link').forEach(link => {
    link.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        link.click();
      }
    });
  });
})();

// ================================================
// 2) Helpers
const $ = (sel, scope = document) => scope.querySelector(sel);
const $$ = (sel, scope = document) => Array.from(scope.querySelectorAll(sel));
const parseNum = (v) => {
  const n = Number(String(v).replace(/[^\d.\-]/g, ''));
  return Number.isFinite(n) ? n : NaN;
};
const fmt = (n, d = 2) => Number.isFinite(n) ? n.toFixed(d) : '—';
const setHTMLSafe = (el, html) => { el.innerHTML = html; }; // we will only inject our own templates
const setText = (el, txt) => { el.textContent = txt; };

// ================================================
// 3) Dose Calculator
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('dose-form');
  if (form) {
    const result = document.getElementById('result');
    const weightEl = document.getElementById('weight');
    const drugEl = document.getElementById('drug');
    const concEl = document.getElementById('concentration'); // اختياري: mg/mL (رقم فقط)

    // يمكنك تعديل الحدود هنا أو جعلها تأتي من JSON
    const DOSES = {
      paracetamol: { mg_per_kg: 15, max_mg_per_dose: 1000, max_mg_per_day_per_kg: 75, label: 'باراسيتامول' },
      ibuprofen:   { mg_per_kg: 10, max_mg_per_dose: 400,  max_mg_per_day_per_kg: 40, label: 'إيبوبروفين' },
      ceftriaxone: { mg_per_kg: 50, max_mg_per_dose: 2000, max_mg_per_day_per_kg: 100, label: 'سيفترياكسون' },
      diazepam:    { mg_per_kg: 0.3, max_mg_per_dose: 10,  label: 'ديازيبام' },
      adrenaline:  { mg_per_kg: 0.01, max_mg_per_dose: 0.5, label: 'أدرينالين (إبينفرين)' }
    };

    form.addEventListener('submit', (e) => {
      e.preventDefault();

      const weight = parseNum(weightEl?.value);
      const drugKey = drugEl?.value;

      if (!Number.isFinite(weight) || weight <= 0) {
        setHTMLSafe(result, `<p>يرجى إدخال وزن صحيح.</p>`);
        return;
      }
      if (!drugKey || !DOSES[drugKey]) {
        setHTMLSafe(result, `<p>يرجى اختيار الدواء.</p>`);
        return;
      }

      const cfg = DOSES[drugKey];
      const dosePerKg = cfg.mg_per_kg;
      let totalDoseMg = dosePerKg * weight;

      let capped = false;
      if (cfg.max_mg_per_dose && totalDoseMg > cfg.max_mg_per_dose) {
        totalDoseMg = cfg.max_mg_per_dose;
        capped = true;
      }

      // حساب المليلترات إن وُجد تركيز mg/mL
      const conc = concEl ? parseNum(concEl.value) : NaN;
      const volumeMl = Number.isFinite(conc) && conc > 0 ? totalDoseMg / conc : NaN;

      const dailyMaxInfo = cfg.max_mg_per_day_per_kg
        ? `<li>الحد الأقصى اليومي التقريبي: <strong>${fmt(cfg.max_mg_per_day_per_kg * weight, 0)} mg/يوم</strong></li>`
        : '';

      const capInfo = capped ? `<li>تم تحديد الجرعة بحد أقصى لكل جرعة: <strong>${fmt(cfg.max_mg_per_dose, 0)} mg</strong></li>` : '';

      const volInfo = Number.isFinite(volumeMl)
        ? `<li>ما يعادل الحجم: <strong>${fmt(volumeMl, 2)} mL</strong> عند تركيز <strong>${fmt(conc, 2)} mg/mL</strong></li>`
        : '';

      setHTMLSafe(result, `
        <p><strong>${cfg.label}</strong></p>
        <ul>
          <li>الجرعة المحسوبة: <strong>${fmt(totalDoseMg, 2)} mg</strong> (${fmt(dosePerKg, 2)} mg/kg)</li>
          ${volInfo}
          ${capInfo}
          ${dailyMaxInfo}
        </ul>
        <p style="color:#b45309">⚠️ تحقّق من طريق الإعطاء، التركيز التجاري، والفواصل الزمنية حسب بروتوكولك.</p>
      `);
    });
  }

  // ================================================
  // 4) Med List: load data.json safely
  const medList = document.getElementById('med-list');
  if (medList) {
    // حالة تحميل
    const loader = document.createElement('p');
    loader.textContent = 'جارٍ التحميل...';
    medList.appendChild(loader);

    fetch('data.json', { cache: 'no-store' })
      .then(r => {
        if (!r.ok) throw new Error('Network response was not ok');
        return r.json();
      })
      .then(data => {
        medList.innerHTML = ''; // إزالة حالة التحميل
        if (!data || !Array.isArray(data.drugs) || data.drugs.length === 0) {
          const empty = document.createElement('p');
          empty.textContent = 'لا توجد بيانات أدوية.';
          medList.appendChild(empty);
          return;
        }

        data.drugs.forEach(drug => {
          // إنشاء عناصر آمنة
          const card = document.createElement('article');
          card.className = 'card';
          card.style.padding = '16px';

          const h3 = document.createElement('h3');
          setText(h3, drug.name ?? 'Drug');

          const conc = document.createElement('p');
          setText(conc, `Concentration: ${drug.concentration ?? '—'}`);

          const dose = document.createElement('p');
          const dpk = Number.isFinite(drug.dosePerKg) ? `${drug.dosePerKg} mg/kg` : '—';
          setText(dose, `Usual Dose: ${dpk}`);

          const warn = document.createElement('p');
          const warnStrong = document.createElement('strong');
          setText(warnStrong, '⚠️ Warning: ');
          warn.appendChild(warnStrong);
          warn.appendChild(document.createTextNode(drug.warning ?? '—'));

          card.append(h3, conc, dose, warn);
          medList.appendChild(card);
        });
      })
      .catch(err => {
        medList.innerHTML = '';
        const p = document.createElement('p');
        p.style.color = '#b91c1c';
        setText(p, 'تعذّر تحميل قائمة الأدوية. تأكّد من وجود data.json وصيغة المحتوى.');
        medList.appendChild(p);
        console.error('Med list error:', err);
      });
  }

  // ================================================
  // 5) Fluids Calculator (Holliday–Segar) + bolus options
  const fluidForm = document.getElementById('fluid-form');
  const fluidResult = document.getElementById('fluid-result');
  if (fluidForm && fluidResult) {
    fluidForm.addEventListener('submit', (e) => {
      e.preventDefault();

      const weight = parseNum(document.getElementById('fluid-weight')?.value);
      // اختيار نسبة البولس من radio: name="bolus-rate" قيم 10 | 20 | 30
      const bolusRateEl = $('input[name="bolus-rate"]:checked');
      const bolusRate = bolusRateEl ? parseNum(bolusRateEl.value) : 20; // افتراضي 20 mL/kg

      if (!Number.isFinite(weight) || weight <= 0) {
        setHTMLSafe(fluidResult, `<p>Please enter a valid weight.</p>`);
        return;
      }

      // Holliday–Segar maintenance mL/day
      let maintenancePerDay = 0;
      if (weight <= 10) {
        maintenancePerDay = weight * 100;
      } else if (weight <= 20) {
        maintenancePerDay = 1000 + (weight - 10) * 50;
      } else {
        maintenancePerDay = 1500 + (weight - 20) * 20;
      }
      const maintenancePerHour = maintenancePerDay / 24;

      // Bolus & deficits
      const bolus = weight * bolusRate;
      const deficit5 = weight * 50;
      const deficit7 = weight * 70;
      const deficit10 = weight * 100;

      setHTMLSafe(fluidResult, `
        <ul>
          <li><strong>Maintenance:</strong> ${fmt(maintenancePerDay, 0)} mL/day (<strong>${fmt(maintenancePerHour, 1)} mL/hr</strong>)</li>
          <li><strong>Bolus (${fmt(bolusRate,0)} mL/kg):</strong> ${fmt(bolus, 0)} mL</li>
          <li><strong>Deficit 5%:</strong> ${fmt(deficit5, 0)} mL</li>
          <li><strong>Deficit 7%:</strong> ${fmt(deficit7, 0)} mL</li>
          <li><strong>Deficit 10%:</strong> ${fmt(deficit10, 0)} mL</li>
        </ul>
        <p style="color:#6b7280">💡 عدّل نوع السائل ومعدّل التعويض وفق الحالة السريرية وبروتوكول المنشأة.</p>
      `);
    });
  }
});