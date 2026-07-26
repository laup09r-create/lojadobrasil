// Captura toda a query string da URL (utms, ttclid, fbclid, sck, src, etc.)
// e guarda em sessionStorage pra usar no momento do checkout,
// mesmo que o usuário navegue entre seções da página.
(function () {
  var raw = window.location.search.replace(/^\?/, "");
  if (raw) {
    sessionStorage.setItem("checkout_utm", raw);
  }
})();

function getStoredUtm() {
  return sessionStorage.getItem("checkout_utm") || "";
}
