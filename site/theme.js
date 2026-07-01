// shared theme toggle (pre-paint set is inline in each <head>)
(function () {
    function save(v) {
        try { localStorage.setItem('theme', v); } catch (e) { /* file:// / privacy mode */ }
        document.cookie = 'theme=' + v + ';path=/;max-age=31536000;samesite=lax';
    }
    var btn = document.getElementById('theme-toggle');
    if (btn) {
        btn.addEventListener('click', function () {
            var next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', next);
            save(next);
        });
    }
    // sync when theme changes in another tab/iframe (same origin)
    window.addEventListener('storage', function (e) {
        if (e.key === 'theme' && e.newValue) document.documentElement.setAttribute('data-theme', e.newValue);
    });
})();
