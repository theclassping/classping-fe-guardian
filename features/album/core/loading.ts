// The page a new tab shows while the album PDF is generated. Rendering takes 5–30 s and a browser shows nothing
// until a navigation response arrives, so the route answers a navigation with this page first. The page fetches
// the PDF (same URL plus `direct=1`), which the route marks cacheable for this user, then navigates to that URL:
// the browser serves it from its cache, so the album renders once and keeps its real URL and file name.

const escapeHtml = (value: string) => value.replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[char] as string);

export function albumLoadingPage({ title, pdfUrl }: { title: string; pdfUrl: string }) {
  const safeTitle = escapeHtml(title);
  return `<!doctype html>
<html lang="id">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${safeTitle}</title>
<style>
  body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #FBF8F3; color: #3A2F27; font-family: "Plus Jakarta Sans", "DM Sans", system-ui, sans-serif; }
  main { width: min(420px, calc(100vw - 32px)); padding: 32px 28px; border: 1px solid #E5DED3; border-radius: 20px; background: #fff; text-align: center; }
  .spinner { width: 44px; height: 44px; margin: 0 auto 18px; border: 4px solid #E3F1EE; border-top-color: #1FA78A; border-radius: 50%; animation: spin 1s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
  h1 { margin: 0 0 8px; font-size: 20px; }
  p { margin: 0; color: #6E5F53; font-size: 14px; line-height: 1.6; }
  .elapsed { margin-top: 14px; font-size: 12px; color: #8A7A6D; }
  .error { display: none; margin-top: 10px; color: #A8322A; }
  button { display: none; margin-top: 18px; min-height: 44px; padding: 0 18px; border: 0; border-radius: 12px; background: #1FA78A; color: #fff; font: 700 14px inherit; cursor: pointer; }
  @media (prefers-reduced-motion: reduce) { .spinner { animation: none; } }
</style>
</head>
<body>
<main>
  <div class="spinner" id="spinner" aria-hidden="true"></div>
  <h1>Menyiapkan album…</h1>
  <p id="hint">Foto-foto sedang dikumpulkan dan disusun. Biasanya 10–30 detik; jangan tutup tab ini.</p>
  <p class="elapsed" id="elapsed" role="status"></p>
  <p class="error" id="error" role="alert"></p>
  <button type="button" id="retry">Coba lagi</button>
</main>
<script>
(function () {
  var url = ${JSON.stringify(pdfUrl)};
  var started = Date.now();
  var elapsed = document.getElementById("elapsed");
  var hint = document.getElementById("hint");
  var error = document.getElementById("error");
  var retry = document.getElementById("retry");
  var spinner = document.getElementById("spinner");
  var timer = setInterval(function () {
    var seconds = Math.round((Date.now() - started) / 1000);
    elapsed.textContent = seconds + " detik";
    if (seconds >= 40) hint.textContent = "Album besar butuh waktu lebih lama. Masih diproses, mohon tunggu.";
  }, 1000);
  function fail(message) {
    clearInterval(timer);
    spinner.style.display = "none";
    hint.style.display = "none";
    elapsed.style.display = "none";
    error.textContent = message;
    error.style.display = "block";
    retry.style.display = "inline-flex";
  }
  function start() {
    fetch(url, { credentials: "same-origin" }).then(function (response) {
      var type = response.headers.get("content-type") || "";
      if (response.ok && type.indexOf("application/pdf") === 0) {
        return response.blob().then(function () { window.location.replace(url); });
      }
      return response.text().then(function (body) {
        var text = body.replace(/<[^>]+>/g, " ").replace(/\\s+/g, " ").trim();
        fail(text || "Album tidak dapat dibuat (" + response.status + ").");
      });
    }).catch(function () {
      fail("Koneksi terputus saat menyiapkan album. Periksa jaringan lalu coba lagi.");
    });
  }
  retry.addEventListener("click", function () { window.location.reload(); });
  start();
})();
</script>
</body>
</html>`;
}
