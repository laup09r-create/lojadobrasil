(function () {
  "use strict";

  var PRICE_CENTS = 9790; // R$ 97,90
  var PRODUCT_TITLE = "Patinete Elétrico Interbras Cross Pro 500W";

  // ---------- Pixel helper ----------
  function ttqTrack(event, data) {
    if (window.ttq) {
      window.ttq.track(event, data || {});
    }
  }

  // Utmify usa os dados via script global próprio; quando o ID/script
  // for adicionado no <head>, os eventos de pageview/purchase dela
  // são disparados automaticamente pelo script deles. Se precisar
  // disparar evento customizado, use window.utmify (confirmar no doc deles).

  ttqTrack("ViewContent", { content_name: PRODUCT_TITLE, value: PRICE_CENTS / 100, currency: "BRL" });

  // ---------- Galeria ----------
  var galleryMain = document.getElementById("galleryMain");
  document.querySelectorAll(".thumb").forEach(function (btn) {
    btn.addEventListener("click", function () {
      document.querySelectorAll(".thumb").forEach(function (t) { t.classList.remove("is-active"); });
      btn.classList.add("is-active");
      galleryMain.src = btn.dataset.img;
    });
  });

  // ---------- Seleção de cor ----------
  var colorCurrent = document.getElementById("colorCurrent");
  document.querySelectorAll(".color-dot").forEach(function (dot) {
    dot.addEventListener("click", function () {
      document.querySelectorAll(".color-dot").forEach(function (d) { d.classList.remove("is-active"); });
      dot.classList.add("is-active");
      colorCurrent.textContent = dot.dataset.color;
    });
  });

  // ---------- Modal ----------
  var overlay = document.getElementById("modalOverlay");
  var stepForm = document.getElementById("stepForm");
  var stepLoading = document.getElementById("stepLoading");
  var stepPix = document.getElementById("stepPix");
  var stepSuccess = document.getElementById("stepSuccess");

  function showStep(step) {
    [stepForm, stepLoading, stepPix, stepSuccess].forEach(function (s) { s.classList.add("is-hidden"); });
    step.classList.remove("is-hidden");
  }

  function openModal() {
    overlay.classList.add("is-open");
    showStep(stepForm);
    ttqTrack("InitiateCheckout", { content_name: PRODUCT_TITLE, value: PRICE_CENTS / 100, currency: "BRL" });
  }
  function closeModal() {
    overlay.classList.remove("is-open");
    stopPolling();
  }

  document.getElementById("openCheckout").addEventListener("click", openModal);
  document.getElementById("openCheckoutFinal").addEventListener("click", openModal);
  document.getElementById("modalClose").addEventListener("click", closeModal);
  overlay.addEventListener("click", function (e) { if (e.target === overlay) closeModal(); });

  // ---------- Form / PIX ----------
  var form = document.getElementById("checkoutForm");
  var formError = document.getElementById("formError");
  var pollTimer = null;
  var pollDeadline = null;

  function onlyDigits(str) { return (str || "").replace(/\D/g, ""); }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    formError.textContent = "";

    var name = document.getElementById("fName").value.trim();
    var email = document.getElementById("fEmail").value.trim();
    var doc = onlyDigits(document.getElementById("fDoc").value);
    var phone = onlyDigits(document.getElementById("fPhone").value);

    if (!name || name.length < 3) { formError.textContent = "Informe seu nome completo."; return; }
    if (!/^\S+@\S+\.\S+$/.test(email)) { formError.textContent = "E-mail inválido."; return; }
    if (doc.length !== 11 && doc.length !== 14) { formError.textContent = "CPF inválido."; return; }
    if (phone.length < 10 || phone.length > 11) { formError.textContent = "Celular inválido (com DDD)."; return; }

    showStep(stepLoading);

    fetch("/api/create-pix", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: PRICE_CENTS,
        customer: { name: name, document: doc, email: email, phone: phone },
        item: { title: PRODUCT_TITLE, price: PRICE_CENTS, quantity: 1 },
        utm: getStoredUtm()
      })
    })
      .then(function (res) {
        if (!res.ok) throw new Error("Falha ao gerar PIX");
        return res.json();
      })
      .then(function (data) {
        renderPix(data.pixCode);
        window._currentTransactionId = data.transactionId;
        startPolling(data.transactionId);
      })
      .catch(function () {
        showStep(stepForm);
        formError.textContent = "Não conseguimos gerar o PIX agora. Tente novamente em instantes.";
      });
  });

  function renderPix(pixCode) {
    showStep(stepPix);
    document.getElementById("pixCode").value = pixCode;
    var canvas = document.getElementById("qrCanvas");
    if (window.QRCode) {
      window.QRCode.toCanvas(canvas, pixCode, { width: 220, margin: 1 }, function (err) {
        if (err) console.error(err);
      });
    }
  }

  document.getElementById("copyPixBtn").addEventListener("click", function () {
    var input = document.getElementById("pixCode");
    input.select();
    navigator.clipboard.writeText(input.value).then(function () {
      var btn = document.getElementById("copyPixBtn");
      var original = btn.textContent;
      btn.textContent = "Copiado!";
      setTimeout(function () { btn.textContent = original; }, 1800);
    });
  });

  function startPolling(transactionId) {
    pollDeadline = Date.now() + 15 * 60 * 1000; // 15 min
    pollTimer = setInterval(function () {
      if (Date.now() > pollDeadline) { stopPolling(); return; }
      fetch("/api/pix-status?transactionId=" + encodeURIComponent(transactionId))
        .then(function (res) { return res.json(); })
        .then(function (data) {
          if (data.status === "COMPLETED") {
            stopPolling();
            showStep(stepSuccess);
            ttqTrack("CompletePayment", { content_name: PRODUCT_TITLE, value: PRICE_CENTS / 100, currency: "BRL" });
          }
        })
        .catch(function () { /* próximo ciclo tenta de novo */ });
    }, 5000);
  }

  function stopPolling() {
    if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
  }
})();
