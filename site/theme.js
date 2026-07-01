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

    // mobile sidebar drawer (only on pages that have one)
    var burger = document.getElementById('nav-burger');
    var sidebar = document.querySelector('.sidebar');
    var scrim = document.getElementById('nav-scrim');
    if (burger && sidebar) {
        function setNav(open) {
            sidebar.classList.toggle('open', open);
            if (scrim) scrim.classList.toggle('open', open);
        }
        burger.addEventListener('click', function () { setNav(!sidebar.classList.contains('open')); });
        if (scrim) scrim.addEventListener('click', function () { setNav(false); });
        sidebar.querySelectorAll('.side-link').forEach(function (a) {
            a.addEventListener('click', function () { setNav(false); });
        });
    }
})();
