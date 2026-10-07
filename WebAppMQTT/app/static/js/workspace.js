(() => {
    'use strict';
    const buttons = [...document.querySelectorAll('[data-panel]')];
    const mobile = window.matchMedia('(max-width: 1023px)');

    function choosePanel(name) {
        document.body.dataset.mobilePanel = name;
        buttons.forEach(button => button.setAttribute('aria-expanded', String(button.dataset.panel === name)));
    }
    buttons.forEach(button => button.addEventListener('click', () => {
        // Selecting the active panel again frees the map for exploration.
        choosePanel(document.body.dataset.mobilePanel === button.dataset.panel ? 'none' : button.dataset.panel);
    }));
    function adapt() {
        choosePanel('flight');
    }
    mobile.addEventListener('change', adapt);
    document.querySelector('.skip-link').addEventListener('click', () => {
        choosePanel('flight');
        document.getElementById('flight-controls').scrollTop = 0;
    });
    adapt();
})();
