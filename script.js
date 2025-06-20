
document.addEventListener("DOMContentLoaded", () => {
  // حاسبة الجرعات
  const form = document.getElementById("dose-form");
  if (form) {
    const result = document.getElementById("result");
    form.addEventListener("submit", function(e) {
      e.preventDefault();
      const weight = parseFloat(document.getElementById("weight").value);
      const drug = document.getElementById("drug").value;

      const doses = {
        paracetamol: 15,
        ibuprofen: 10,
        ceftriaxone: 50,
        diazepam: 0.3,
        adrenaline: 0.01
      };

      if (isNaN(weight) || weight <= 0) {
        result.innerHTML = "<p>Please enter a valid weight.</p>";
        return;
      }

      const dosePerKg = doses[drug];
      const totalDose = (dosePerKg * weight).toFixed(2);
      result.innerHTML = `<p>Total Dose: <strong>${totalDose} mg</strong></p>`;
    });
  }

  // عرض قائمة الأدوية
  const medList = document.getElementById("med-list");
  if (medList) {
    fetch("data.json")
      .then(response => response.json())
      .then(data => {
        data.drugs.forEach(drug => {
          const div = document.createElement("div");
          div.className = "card";
          div.innerHTML = `
            <h3>${drug.name}</h3>
            <p><strong>Concentration:</strong> ${drug.concentration}</p>
            <p><strong>Usual Dose:</strong> ${drug.dosePerKg} mg/kg</p>
            <p><strong>⚠️ Warning:</strong> ${drug.warning}</p>
          `;
          medList.appendChild(div);
        });
      });
  }

// حاسبة السوائل
const fluidForm = document.getElementById("fluid-form");
const fluidResult = document.getElementById("fluid-result");
if (fluidForm) {
  fluidForm.addEventListener("submit", function(e) {
    e.preventDefault();
    const weight = parseFloat(document.getElementById("fluid-weight").value);
    if (isNaN(weight) || weight <= 0) {
      fluidResult.innerHTML = "<p>Please enter a valid weight.</p>";
      return;
    }

    // Maintenance fluids (Holliday-Segar method)
    let maintenancePerDay = 0;
    if (weight <= 10) {
      maintenancePerDay = weight * 100;
    } else if (weight <= 20) {
      maintenancePerDay = 1000 + (weight - 10) * 50;
    } else {
      maintenancePerDay = 1500 + (weight - 20) * 20;
    }
    const maintenancePerHour = maintenancePerDay / 24;

    const bolus = weight * 20;
    const deficit5 = weight * 50;
    const deficit7 = weight * 70;
    const deficit10 = weight * 100;

    fluidResult.innerHTML = `
      <p><strong>Maintenance:</strong> ${maintenancePerDay.toFixed(0)} ml/day (<strong>${maintenancePerHour.toFixed(1)} ml/hr</strong>)</p>
      <p><strong>Bolus:</strong> ${bolus.toFixed(0)} ml</p>
      <p><strong>Deficit 5%:</strong> ${deficit5.toFixed(0)} ml</p>
      <p><strong>Deficit 7%:</strong> ${deficit7.toFixed(0)} ml</p>
      <p><strong>Deficit 10%:</strong> ${deficit10.toFixed(0)} ml</p>
    `;
  });
}

});