const API_BASE = window.__API_BASE__ || "/api";

const form = document.getElementById("convert-form");
const resultEl = document.getElementById("result");
const errorEl = document.getElementById("error");

function hide(el) {
  el.hidden = true;
  el.textContent = "";
}

function showResult(data) {
  hide(errorEl);
  resultEl.hidden = false;
  resultEl.innerHTML = `
    <span class="amount">${data.amount} ${data.from} = ${data.converted} ${data.to}</span>
    <span class="meta">
      Taux : 1 ${data.from} = ${data.rate} ${data.to} ·
      Source : ${data.source}${data.stale ? " (donnée en cache, potentiellement ancienne)" : ""}
    </span>
  `;
}

function showError(message) {
  hide(resultEl);
  errorEl.hidden = false;
  errorEl.textContent = message;
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const amount = document.getElementById("amount").value;
  const from = document.getElementById("from").value;
  const to = document.getElementById("to").value;

  const submitBtn = form.querySelector("button");
  submitBtn.disabled = true;
  submitBtn.textContent = "Conversion...";

  try {
    const url = `${API_BASE}/convert?from=${from}&to=${to}&amount=${amount}`;
    const res = await fetch(url);
    const data = await res.json();

    if (!res.ok) {
      showError(data.error?.[0]?.message || data.error || "Erreur inconnue");
      return;
    }

    showResult(data);
  } catch (err) {
    showError("Impossible de contacter le service de conversion. Réessayez plus tard.");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Convertir";
  }
});