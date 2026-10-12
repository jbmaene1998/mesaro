(function () {
  function initWidget(script) {
    var slug = script.getAttribute("data-slug");
    if (!slug) {
      return;
    }

    var explicitBaseUrl = script.getAttribute("data-base-url");
    var defaultBaseUrl = script.src ? new URL(script.src, document.baseURI).origin : "";
    var baseUrl = explicitBaseUrl || defaultBaseUrl;
    var height = script.getAttribute("data-height") || "760";
    var borderRadius = script.getAttribute("data-border-radius") || "12";

    var iframe = document.createElement("iframe");
    iframe.src = baseUrl.replace(/\/$/, "") + "/embed/" + encodeURIComponent(slug);
    iframe.title = "Mesaro Booking Widget";
    iframe.width = "100%";
    iframe.height = height;
    iframe.style.border = "0";
    iframe.style.borderRadius = borderRadius + "px";
    iframe.loading = "lazy";
    iframe.referrerPolicy = "no-referrer";
    iframe.allow = "clipboard-write";

    script.parentNode.insertBefore(iframe, script.nextSibling);
  }

  var scripts = document.querySelectorAll("script[data-mesaro-widget]");
  for (var i = 0; i < scripts.length; i += 1) {
    initWidget(scripts[i]);
  }
})();
