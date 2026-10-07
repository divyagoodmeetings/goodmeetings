// Universal Navigation & Mobile Menu Controller for Goodmeetings
(function() {
    function setupNav() {
        const mobileBtn = document.getElementById('mobile-menu-btn');
        const navLinks = document.getElementById('nav-links');
        const themeBtn = document.getElementById('theme-toggle-btn');

        // Theme Toggle Handler
        if (themeBtn) {
            try {
                const storedTheme = localStorage.getItem('gm-theme');
                if (storedTheme === 'light') {
                    document.body.classList.add('light-mode');
                    document.documentElement.classList.add('light-mode');
                }
            } catch(e) {}

            themeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const isLight = document.body.classList.toggle('light-mode');
                document.documentElement.classList.toggle('light-mode', isLight);
                try {
                    localStorage.setItem('gm-theme', isLight ? 'light' : 'dark');
                } catch(e) {}
            });
        }

        if (!mobileBtn || !navLinks) return;

        // Ensure mobile auth items exist in mobile drawer
        if (!navLinks.querySelector('.mobile-auth-item')) {
            const authLi = document.createElement('li');
            authLi.className = 'nav-item mobile-auth-item';
            authLi.innerHTML = `
                <div class="mobile-drawer-auth-buttons">
                    <a href="https://app.goodmeetings.ai/login" target="_blank" rel="noopener noreferrer" class="mobile-drawer-login-btn">Log in</a>
                    <a href="https://app.goodmeetings.ai/login?tab=2" target="_blank" rel="noopener noreferrer" class="btn-primary mobile-drawer-signup-btn">Sign Up <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg></a>
                </div>
            `;
            navLinks.appendChild(authLi);
        }

        function toggleMenu(forceState) {
            const shouldOpen = forceState !== undefined ? forceState : !navLinks.classList.contains('mobile-active');
            if (shouldOpen) {
                navLinks.classList.add('mobile-active');
                mobileBtn.setAttribute('aria-expanded', 'true');
                mobileBtn.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
                document.body.style.overflow = 'hidden';
            } else {
                navLinks.classList.remove('mobile-active');
                mobileBtn.setAttribute('aria-expanded', 'false');
                mobileBtn.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>';
                document.body.style.overflow = '';
            }
        }

        mobileBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleMenu();
        });

        // Dropdowns Accordion logic (Services, Case Studies)
        const dropdownItems = navLinks.querySelectorAll('.nav-item.has-dropdown');
        dropdownItems.forEach(item => {
            const trigger = item.querySelector(':scope > a');
            if (!trigger) return;

            trigger.addEventListener('click', (e) => {
                if (window.innerWidth <= 992) {
                    e.preventDefault();
                    e.stopPropagation();
                    const wasActive = item.classList.contains('mobile-dropdown-active');

                    // Close sibling accordions
                    dropdownItems.forEach(other => {
                        if (other !== item) other.classList.remove('mobile-dropdown-active');
                    });

                    item.classList.toggle('mobile-dropdown-active', !wasActive);
                }
            });

            // Close menu when clicking sub-link
            const subLinks = item.querySelectorAll('.dropdown a');
            subLinks.forEach(sub => {
                sub.addEventListener('click', () => {
                    if (window.innerWidth <= 992) {
                        toggleMenu(false);
                    }
                });
            });
        });

        // Close menu when clicking direct link
        const directLinks = navLinks.querySelectorAll('.nav-item:not(.has-dropdown) > a');
        directLinks.forEach(link => {
            link.addEventListener('click', () => {
                if (window.innerWidth <= 992) {
                    toggleMenu(false);
                }
            });
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setupNav);
    } else {
        setupNav();
    }
})();
