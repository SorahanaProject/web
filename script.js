// --- START OF FILE script.js ---

// 設定値（定数は先に定義してもOK）
const TARGET_ALTITUDE_M = 25346;
const TARGET_ALTITUDE_FT = 83156;

// === メイン実行処理 (HTML読み込み完了後に実行) ===
document.addEventListener('DOMContentLoaded', () => {
    
    // 1. 言語設定の初期化（ここでbodyを操作する）
    initLanguageSettings();

    // 2. Lenis (慣性スクロール) の初期化
    initLenis();

    // 3. システム起動ローダー開始
    initBootSequence();

    // 4. UI・インタラクション初期化
    initHUDInteractions();
    initCompareSlider();
    initUI();
});


// === 機能別関数 ===

function initLanguageSettings() {
    // ローカルストレージから言語設定を取得
    const savedLang = localStorage.getItem('lang') || 'ja';
    if (savedLang === 'en') {
        document.body.classList.add('en');
    }
    
    // 言語切り替えボタンのイベント設定
    const langBtn = document.getElementById('langBtn');
    if (langBtn) { 
        langBtn.textContent = document.body.classList.contains('en') ? 'JP' : 'EN';
        langBtn.addEventListener('click', () => {
            const isEn = document.body.classList.toggle('en');
            localStorage.setItem('lang', isEn ? 'en' : 'ja');
            langBtn.textContent = isEn ? 'JP' : 'EN';
            location.reload(); // リロードして反映
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

        // スクロール連動イベント
        lenis.on('scroll', (e) => {
            updateHUD(e.scroll);
            updateParallax(e.scroll);
        });
    } else {
        // Lenisがない場合（標準スクロール）
        window.addEventListener('scroll', () => {
            updateHUD(window.scrollY);
            updateParallax(window.scrollY);
        });
    }
}

// === システム起動ローダー ===
function initBootSequence() {
    const screen = document.getElementById('boot-screen');
    const log = document.getElementById('boot-log');
    const fill = document.querySelector('.boot-progress-fill');
    const percent = document.querySelector('.boot-percent');
    
    // 要素が見つからない場合は、ローダーを飛ばしてサイトを表示
    if (!screen || !fill || !percent) {
        console.warn('Boot Loader elements not found. Skipping animation.');
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

    // アニメーションループ
    const interval = setInterval(() => {
        progress += Math.random() * 4; 
        if (progress > 100) progress = 100;

        // 表示更新
        fill.style.width = `${progress}%`;
        percent.textContent = `${Math.floor(progress)}%`;

        // ログ更新
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

        // 完了時
        if (progress >= 100) {
            clearInterval(interval);
            setTimeout(() => {
                screen.classList.add('loaded'); // CSSでフェードアウト
                initAfterLoad();
            }, 600);
        }
    }, 60);
}

function initAfterLoad() {
    initTextScramble();
    initScrollAnimation();
}

// === HUD & UI制御 ===
function updateHUD(scrollTop) {
    const isEnglish = document.body.classList.contains('en');
    const targetAlt = isEnglish ? TARGET_ALTITUDE_FT : TARGET_ALTITUDE_M;
    const altDisplay = document.getElementById('live-altitude');
    const indicator = document.getElementById('scroll-indicator');
    const header = document.getElementById('header');
    
    const docHeight = document.body.scrollHeight - window.innerHeight;
    const scrollPercent = (docHeight > 0) ? Math.max(0, Math.min(1, scrollTop / docHeight)) : 0;

    // 高度更新
    if(altDisplay) {
        const currentAlt = Math.floor(scrollPercent * targetAlt);
        altDisplay.textContent = String(currentAlt).padStart(5, '0');
    }

    if(indicator) indicator.style.top = `${scrollPercent * 100}%`;

    const progressBar = document.getElementById('scroll-progress');
    if(progressBar) progressBar.style.width = `${scrollPercent * 100}%`;

    if(header) {
        if(scrollTop > 50) header.classList.add('scrolled');
        else header.classList.remove('scrolled');
    }

    const btt = document.getElementById('back-to-top');
    if(btt) {
        if(scrollTop > 400) btt.classList.add('show');
        else btt.classList.remove('show');
    }

    // 高度に応じたHUDの色変化
    if (scrollPercent > 0.6) {
        document.documentElement.style.setProperty('--hud-color', '#fff'); 
    } else {
        document.documentElement.style.setProperty('--hud-color', 'rgba(212, 175, 55, 0.8)');
    }
}

function initHUDInteractions() {
    const cursor = document.getElementById('hud-cursor-target');
    
    if (window.matchMedia("(min-width: 1025px)").matches && cursor) {
        document.addEventListener('mousemove', (e) => {
            cursor.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
            createStardust(e.clientX, e.clientY);
        });

        const targets = document.querySelectorAll('a, button, .gallery-item, .map-overlay-btn');
        targets.forEach(el => {
            el.addEventListener('mouseenter', () => cursor.classList.add('locked'));
            el.addEventListener('mouseleave', () => cursor.classList.remove('locked'));
        });
        
        const magnets = document.querySelectorAll('.email-link, .btn-insta, .map-overlay-btn, .scroll-down');
        magnets.forEach((magnet) => {
            magnet.classList.add('magnet-btn');
            magnet.addEventListener('mousemove', (e) => {
                const rect = magnet.getBoundingClientRect();
                const x = (e.clientX - (rect.left + rect.width / 2)) / 5;
                const y = (e.clientY - (rect.top + rect.height / 2)) / 5;
                magnet.style.transform = `translate(${x}px, ${y}px) scale(1.1)`;
            });
            magnet.addEventListener('mouseleave', () => magnet.style.transform = 'translate(0, 0) scale(1)');
        });
    }
}

// === 演出エフェクト ===
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

function updateParallax(scrollTop) {
    const parallaxImages = document.querySelectorAll('.gallery-item img, .timeline-img');
    parallaxImages.forEach((img) => {
        const rect = img.parentElement.getBoundingClientRect();
        if (rect.top < window.innerHeight && rect.bottom > 0) {
            const offset = (window.innerHeight - rect.top) * 0.08;
            img.style.transform = `translateY(${offset}px) scale(1.1)`;
        }
    });
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
