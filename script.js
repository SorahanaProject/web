// --- START OF FILE script.js ---

const TARGET_ALTITUDE_M = 25346;
const TARGET_ALTITUDE_FT = 83156;

let lastScrollTop = 0;

document.addEventListener('DOMContentLoaded', () => {
    initLanguageSettings();
    initLenis();
    initBootSequence();
    initHUDInteractions();
    initCompareSlider();
    initUI();
    initFAQ();
});

function initLanguageSettings() {
    const savedLang = localStorage.getItem('lang') || 'ja';
    if (savedLang === 'en') {
        document.body.classList.add('en');
    }
    const langBtn = document.getElementById('langBtn');
    if (langBtn) { 
        langBtn.textContent = document.body.classList.contains('en') ? 'JP' : 'EN';
        langBtn.addEventListener('click', () => {
            const isEn = document.body.classList.toggle('en');
            localStorage.setItem('lang', isEn ? 'en' : 'ja');
            langBtn.textContent = isEn ? 'JP' : 'EN';
            location.reload();
        });
    }
}

function initLenis() {
    if (typeof Lenis !== 'undefined') {
        const lenis = new Lenis({
            duration: 1.2,
            easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
            smooth: true,
            smoothTouch: false
        });
        window.lenis = lenis;
        function raf(time) {
            lenis.raf(time);
            requestAnimationFrame(raf);
        }
        requestAnimationFrame(raf);
        lenis.on('scroll', (e) => {
            updateHUD(e.scroll);
        });
    } else {
        window.addEventListener('scroll', () => {
            updateHUD(window.scrollY);
        });
    }
}

function initBootSequence() {
    const screen = document.getElementById('boot-screen');
    const log = document.getElementById('boot-log');
    const fill = document.querySelector('.boot-progress-fill');
    const percent = document.querySelector('.boot-percent');
    
    if (!screen || !fill || !percent) {
        if(screen) screen.style.display = 'none';
        initAfterLoad(); 
        return;
    }

    const logs = [
        "SYSTEM_CHECK_INIT...", "LOADING_KERNEL_MODULES...", "MOUNTING_FILESYSTEM...",
        "CHECKING_MEMORY_INTEGRITY...", "CONNECTING_TO_SATELLITE...", "ESTABLISHING_SECURE_LINK...",
        "LOADING_ASSETS_TEXTURES...", "CALIBRATING_SENSORS...", "ATMOSPHERIC_PRESSURE: NORMAL",
        "OXYGEN_LEVELS: 100%", "TARGET_COORDINATES: LOCKED", "SYSTEM_READY."
    ];

    let progress = 0;
    let logIndex = 0;

    const interval = setInterval(() => {
        progress += Math.random() * 4; 
        if (progress > 100) progress = 100;

        fill.style.width = `${progress}%`;
        percent.textContent = `${Math.floor(progress)}%`;

        if (log && progress > (logIndex * (100 / logs.length)) && logIndex < logs.length) {
            const p = document.createElement('div');
            p.className = 'boot-line';
            p.textContent = `> ${logs[logIndex]}`;
            if (logIndex === logs.length - 1) {
                p.style.color = '#fff';
                p.classList.add('blink');
            }
            log.prepend(p);
            logIndex++;
        }

        if (progress >= 100) {
            clearInterval(interval);
            setTimeout(() => {
                screen.classList.add('loaded');
                initAfterLoad();
            }, 600);
        }
    }, 60);
}

function initAfterLoad() {
    initTextScramble();
    initScrollAnimation();
}

// === script.js の updateHUD 関数をこれに置き換え ===

function updateHUD(scrollTop) {
    const isEnglish = document.body.classList.contains('en');
    
    // 設定値の切り替え
    const targetAlt = isEnglish ? TARGET_ALTITUDE_FT : TARGET_ALTITUDE_M;
    const tempValText = isEnglish ? '-37.8' : '-38.8';
    const tempUnitText = isEnglish ? '°F' : '°C';
    const altUnitText = isEnglish ? 'ft' : 'm';

    // 要素の取得
    const altDisplay = document.getElementById('live-altitude');
    const altUnitDisplay = document.getElementById('hud-alt-unit'); // 追加
    const tempValDisplay = document.getElementById('hud-temp-val'); // 追加
    const tempUnitDisplay = document.getElementById('hud-temp-unit'); // 追加
    
    const indicator = document.getElementById('scroll-indicator');
    const header = document.getElementById('header');
    const hudLayer = document.getElementById('hud-layer');
    const hero = document.getElementById('hero');
    
    const docHeight = document.body.scrollHeight - window.innerHeight;
    const scrollPercent = (docHeight > 0) ? Math.max(0, Math.min(1, scrollTop / docHeight)) : 0;

    // 1. 単位と気温の表記更新（常時更新）
    if(altUnitDisplay) altUnitDisplay.textContent = altUnitText;
    if(tempValDisplay) tempValDisplay.textContent = tempValText;
    if(tempUnitDisplay) tempUnitDisplay.textContent = tempUnitText;

    // 2. HUD表示制御
    if (hudLayer && hero) {
        const heroHeight = hero.offsetHeight;
        if (scrollTop > heroHeight * 0.8) {
            hudLayer.classList.add('visible');
        } else {
            hudLayer.classList.remove('visible');
        }
    }

    // 3. 高度計 (逆転ロジック)
    if(altDisplay) {
        const currentAlt = Math.floor((1 - scrollPercent) * targetAlt);
        altDisplay.textContent = String(currentAlt).padStart(5, '0');
    }

    if(indicator) indicator.style.top = `${scrollPercent * 100}%`;

    const progressBar = document.getElementById('scroll-progress');
    if(progressBar) progressBar.style.width = `${scrollPercent * 100}%`;

    // 4. ヘッダー制御
    if(header) {
        if(scrollTop > 50) header.classList.add('scrolled');
        else header.classList.remove('scrolled');

        if (scrollTop > lastScrollTop && scrollTop > 100) {
            header.classList.add('header-hidden');
        } else {
            header.classList.remove('header-hidden');
        }
        lastScrollTop = scrollTop;
    }

    const btt = document.getElementById('back-to-top');
    if(btt) {
        if(scrollTop > 400) btt.classList.add('show');
        else btt.classList.remove('show');
    }

    // 色制御
    if (scrollPercent > 0.8) {
        document.documentElement.style.setProperty('--hud-color', '#fff'); 
    } else {
        document.documentElement.style.setProperty('--hud-color', 'rgba(212, 175, 55, 0.8)');
    }
}

function initFAQ() {
    const questions = document.querySelectorAll('.faq-question');
    questions.forEach(q => {
        q.addEventListener('click', () => {
            const item = q.parentElement;
            const answer = item.querySelector('.faq-answer');
            item.classList.toggle('active');
            if (item.classList.contains('active')) {
                answer.style.maxHeight = answer.scrollHeight + 'px';
            } else {
                answer.style.maxHeight = null;
            }
        });
    });
}

// === HUD INTERACTIONS (Original Cursor & Effects) ===
function initHUDInteractions() {
    const cursor = document.getElementById('hud-cursor');
    
    if (window.matchMedia("(min-width: 1025px)").matches && cursor) {
        document.addEventListener('mousemove', (e) => {
            cursor.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;
            createStardust(e.clientX, e.clientY);
        });

        const targets = document.querySelectorAll('a, button, .gallery-item, .map-overlay-btn');
        targets.forEach(el => {
            el.addEventListener('mouseenter', () => cursor.classList.add('locked'));
            el.addEventListener('mouseleave', () => cursor.classList.remove('locked'));
        });
        
        // --- 修正箇所：ボタンの動き ---
        const magnets = document.querySelectorAll('.email-link, .btn-insta, .map-overlay-btn, .scroll-down');
        magnets.forEach((magnet) => {
            magnet.classList.add('magnet-btn');
            
            // マップボタンなど、CSSで既に transform: translate(-50%, -50%) されている要素の対策
            // 要素が .map-overlay-btn または .scroll-down なら、元の位置補正を保持する
            const isCentered = magnet.classList.contains('map-overlay-btn') || magnet.classList.contains('scroll-down');
            const baseTransform = isCentered ? 'translate(-50%, -50%)' : '';

            magnet.addEventListener('mousemove', (e) => {
                const rect = magnet.getBoundingClientRect();
                const x = (e.clientX - (rect.left + rect.width / 2)) / 5;
                const y = (e.clientY - (rect.top + rect.height / 2)) / 5;
                
                // 元の配置(baseTransform) + マウス追従(x,y)
                magnet.style.transform = `${baseTransform} translate3d(${x}px, ${y}px, 0) scale(1.1)`;
            });

            magnet.addEventListener('mouseleave', () => {
                // 元の配置に戻す
                magnet.style.transform = `${baseTransform} translate3d(0, 0, 0) scale(1)`;
            });
        });
    }
}

let isThrottled = false;
function createStardust(x, y) {
    if (isThrottled) return;
    isThrottled = true;
    setTimeout(() => isThrottled = false, 50);

    const particle = document.createElement('div');
    Object.assign(particle.style, {
        position: 'fixed', left: x + 'px', top: y + 'px',
        width: (Math.random() * 3) + 'px', height: (Math.random() * 3) + 'px',
        background: Math.random() > 0.8 ? '#D4AF37' : '#fff',
        borderRadius: '50%', pointerEvents: 'none', zIndex: '999999',
        boxShadow: '0 0 6px rgba(255,255,255,0.8)'
    });
    document.body.appendChild(particle);

    const destX = (Math.random() - 0.5) * 60;
    const destY = (Math.random() - 0.5) * 60;

    const animation = particle.animate([
        { transform: `translate(0, 0) scale(1)`, opacity: 0.8 },
        { transform: `translate(${destX}px, ${destY}px) scale(0)`, opacity: 0 }
    ], { duration: 1000 + Math.random() * 1000, easing: 'cubic-bezier(0, .9, .57, 1)' });

    animation.onfinish = () => particle.remove();
}

class TextScramble {
    constructor(el) { this.el = el; this.chars = '!<>-_\\/[]{}—=+*^?#________'; this.update = this.update.bind(this); }
    setText(newText) {
        const oldText = this.el.innerText;
        const length = Math.max(oldText.length, newText.length);
        const promise = new Promise((resolve) => this.resolve = resolve);
        this.queue = [];
        for (let i = 0; i < length; i++) {
            const from = oldText[i] || ''; const to = newText[i] || '';
            const start = Math.floor(Math.random() * 40);
            const end = start + Math.floor(Math.random() * 40);
            this.queue.push({ from, to, start, end });
        }
        cancelAnimationFrame(this.frameRequest); this.frame = 0; this.update(); return promise;
    }
    update() {
        let output = ''; let complete = 0;
        for (let i = 0, n = this.queue.length; i < n; i++) {
            let { from, to, start, end, char } = this.queue[i];
            if (this.frame >= end) { complete++; output += to; }
            else if (this.frame >= start) {
                if (!char || Math.random() < 0.28) { char = this.randomChar(); this.queue[i].char = char; }
                output += `<span class="dud" style="color:#555">${char}</span>`;
            } else { output += from; }
        }
        this.el.innerHTML = output;
        if (complete === this.queue.length) { this.resolve(); }
        else { this.frameRequest = requestAnimationFrame(this.update); this.frame++; }
    }
    randomChar() { return this.chars[Math.floor(Math.random() * this.chars.length)]; }
}

function initTextScramble() {
    const el = document.querySelector('.data-tag span[lang="ja"]');
    const elEn = document.querySelector('.data-tag span[lang="en"]');
    const target = (document.body.classList.contains('en')) ? elEn : el;
    const isEnglish = document.body.classList.contains('en');

    if(target) {
        const fx = new TextScramble(target);
        const phrases = [
            isEnglish ? 'ALT: 83,156ft / TEMP: -37.8℉' : 'ALT: 25,346m / TEMP: -38.8℃',
            'SYSTEM: NORMAL', 'STATUS: LAUNCHED', 'TRAJECTORY: STABLE'
        ];
        let counter = 0;
        const next = () => {
            fx.setText(phrases[counter]).then(() => { setTimeout(next, 3000); });
            counter = (counter + 1) % phrases.length;
        };
        next();
    }
}

function initScrollAnimation() {
    const obs = new IntersectionObserver((entries) => {
        entries.forEach(entry => { 
            if(entry.isIntersecting) { 
                entry.target.classList.add('is-visible'); 
                obs.unobserve(entry.target); 
            }
        });
    }, { threshold: 0.15 });
    document.querySelectorAll('.js-scroll').forEach(el => obs.observe(el));
}

function initCompareSlider() {
    const sld = document.getElementById('compare-slider');
    if(sld) sld.addEventListener('input', (e) => {
        const val = e.target.value;
        document.getElementById('compare-overlay').style.width = val + "%";
        document.getElementById('slider-button').style.left = val + "%";
    });
}

function initUI() {
    const ham = document.getElementById('hamburger'); 
    const nv = document.getElementById('nav-menu');
    if(ham && nv) {
        ham.addEventListener('click', () => { ham.classList.toggle('active'); nv.classList.toggle('active'); });
        nv.querySelectorAll('a').forEach(l => l.addEventListener('click', () => { ham.classList.remove('active'); nv.classList.remove('active'); }));
    }

    const btt = document.getElementById('back-to-top');
    if(btt) btt.addEventListener('click', (e) => {
        e.preventDefault(); 
        btt.classList.add('launch');
        if(typeof window.lenis !== 'undefined' && window.lenis) {
            window.lenis.scrollTo(0, {duration: 3}); 
        } else {
            window.scrollTo({top:0, behavior:'smooth'});
        }
        setTimeout(() => { btt.classList.remove('launch', 'show'); }, 3500);
    });

    const modal = document.getElementById('gallery-modal');
    if (modal) {
        const modalImg = document.getElementById('modal-img');
        const modalTitle = document.getElementById('modal-title');
        const modalDesc = document.getElementById('modal-desc');
        const closeBtn = document.querySelector('.close-modal');
        document.querySelectorAll('.gallery-item').forEach(item => {
            item.addEventListener('click', () => {
                const isEn = document.body.classList.contains('en');
                modalImg.src = item.dataset.img;
                modalTitle.textContent = isEn ? item.dataset.titleEn : item.dataset.titleJa;
                modalDesc.textContent = isEn ? item.dataset.descEn : item.dataset.descJa;
                modal.classList.add('show');
            });
        });
        closeBtn.addEventListener('click', () => modal.classList.remove('show'));
        modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.remove('show'); });
    }
}
