// 言語設定の初期化
const savedLang = localStorage.getItem('lang') || 'ja';
if (savedLang === 'en') {
    document.body.classList.add('en');
}

// 設定値
const isEnglish = document.body.classList.contains('en');
const TARGET_ALTITUDE = isEnglish ? 83156 : 25346;
const UNIT_TEXT = isEnglish ? 'ft' : 'm';

// 即時実行：訪問済みチェック
(function(){
    const loader = document.getElementById('loader');
    if (sessionStorage.getItem('visited') && loader) {
        loader.classList.add('hidden');
    }
})();

window.addEventListener('load', () => {
    const loader = document.getElementById('loader');
    const container = document.getElementById('digit-container');
    const langBtn = document.getElementById('langBtn');

    if (langBtn) { langBtn.textContent = isEnglish ? 'JP' : 'EN'; }
    
    // 2回目以降の訪問
    if (sessionStorage.getItem('visited')) {
        if(loader) loader.style.display = 'none';
        initScrollAnimation();
    } else {
        // 初回訪問時アニメーション
        const duration = 2800; // カウントアップ時間
        const startTime = performance.now();

        function updateCounter(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const ease = 1 - Math.pow(1 - progress, 4);
            const currentAlt = Math.floor(ease * TARGET_ALTITUDE);
            
            const displayAlt = (progress >= 1) ? TARGET_ALTITUDE : currentAlt;
            const altString = String(displayAlt).padStart(5, '0');
            
            if (container) {
                let html = '';
                for (let char of altString) {
                    html += `<div class="digit-box">${char}</div>`;
                }
                html += `<div class="unit-box">${UNIT_TEXT}</div>`;
                container.innerHTML = html;
            }

            if (progress < 1) {
                requestAnimationFrame(updateCounter);
            } else {
                // カウント完了後、幕開け演出へ
                setTimeout(() => {
                    if(loader) {
                        loader.classList.add('loaded'); // CSSで幕が開く
                        
                        setTimeout(() => {
                            loader.style.display = 'none';
                        }, 1600); // アニメーション時間待機
                    }
                    initScrollAnimation();
                    sessionStorage.setItem('visited', 'true');
                }, 500);
            }
        }
        requestAnimationFrame(updateCounter);
    }
});

// Sparkle Effect (軽量化済み)
let lastSparkleTime = 0;
document.addEventListener('mousemove', function(e) {
    const now = Date.now();
    if (now - lastSparkleTime > 50) { 
        createSparkle(e.clientX, e.clientY);
        lastSparkleTime = now;
    }
});

function createSparkle(x, y) {
    const sparkle = document.createElement('div');
    sparkle.classList.add('sparkle');
    const offsetX = (Math.random() - 0.5) * 15;
    const offsetY = (Math.random() - 0.5) * 15;
    sparkle.style.left = (x + offsetX) + 'px';
    sparkle.style.top = (y + offsetY) + 'px';
    const size = Math.random() * 4 + 2;
    sparkle.style.width = size + 'px';
    sparkle.style.height = size + 'px';
    document.body.appendChild(sparkle);
    setTimeout(() => { sparkle.remove(); }, 800);
}

// Scroll Animation Observer
function initScrollAnimation() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) { 
                entry.target.classList.add('is-visible');
                observer.unobserve(entry.target); 
            }
        });
    }, { threshold: 0.15 });
    
    document.querySelectorAll('.js-scroll').forEach((el) => { observer.observe(el); });
}

// Scroll Events
window.addEventListener('scroll', () => {
    const scrollTop = window.scrollY;
    
    const header = document.getElementById('header');
    if (scrollTop > 50) { header.classList.add('scrolled'); } else { header.classList.remove('scrolled'); }

    const docHeight = document.body.scrollHeight - window.innerHeight;
    const scrollPercent = (scrollTop / docHeight) * 100;
    const progressBar = document.getElementById('scroll-progress');
    if(progressBar) { progressBar.style.width = scrollPercent + '%'; }

    const backToTop = document.getElementById('back-to-top');
    if (backToTop) {
        if (scrollTop > 400) { backToTop.classList.add('show'); } 
        else { backToTop.classList.remove('show'); }
    }
});

// Back to Top Rocket (Slow Speed)
const backToTop = document.getElementById('back-to-top');
if (backToTop) {
    backToTop.addEventListener('click', (e) => {
        e.preventDefault();
        backToTop.classList.add('launch');
        // Lenisでゆっくりスクロール (duration: 3秒)
        if(window.lenis) {
            window.lenis.scrollTo(0, { duration: 3 }); 
        } else {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
        setTimeout(() => {
            backToTop.classList.remove('launch');
            backToTop.classList.remove('show');
        }, 3500); // 戻る時間に合わせて非表示タイミング調整
    });
}

// Mobile Menu
const hamburger = document.getElementById('hamburger');
const nav = document.getElementById('nav-menu');
if (hamburger) {
    hamburger.addEventListener('click', () => { 
        hamburger.classList.toggle('active'); 
        nav.classList.toggle('active'); 
    });
    nav.querySelectorAll('a').forEach(link => { 
        link.addEventListener('click', () => { 
            hamburger.classList.remove('active'); 
            nav.classList.remove('active'); 
        }); 
    });
}

// Slider Logic
const slider = document.getElementById('compare-slider');
const overlay = document.getElementById('compare-overlay');
const sliderBtn = document.getElementById('slider-button');

function updateSlider(val) {
    if(overlay) overlay.style.width = val + "%";
    if(sliderBtn) sliderBtn.style.left = val + "%";
}

if (slider) {
    slider.addEventListener('input', function(e) { updateSlider(e.target.value); });
    slider.addEventListener('touchmove', function(e) {}, { passive: true });
}

// Language Switch
const langBtn = document.getElementById('langBtn');
if(langBtn){
    langBtn.addEventListener('click', () => {
        const isCurrentlyEn = document.body.classList.contains('en');
        localStorage.setItem('lang', isCurrentlyEn ? 'ja' : 'en');
        sessionStorage.removeItem('visited');
        location.reload();
    });
}

// FAQ Accordion
document.querySelectorAll('.faq-question').forEach(button => {
    button.addEventListener('click', () => {
        const isOpen = button.classList.contains('active');
        document.querySelectorAll('.faq-question').forEach(b => {
            b.classList.remove('active');
            b.nextElementSibling.style.maxHeight = 0;
        });
        if (!isOpen) {
            button.classList.add('active');
            const answer = button.nextElementSibling;
            answer.style.maxHeight = answer.scrollHeight + "px";
        }
    });
});

// Modal Logic
const modal = document.getElementById('gallery-modal');
const modalImg = document.getElementById('modal-img');
const modalTitle = document.getElementById('modal-title');
const modalDesc = document.getElementById('modal-desc');
const closeModal = document.querySelector('.close-modal');

document.querySelectorAll('.gallery-item').forEach(item => {
    item.addEventListener('click', () => {
        const titleJa = item.getAttribute('data-title-ja');
        const titleEn = item.getAttribute('data-title-en');
        const descJa = item.getAttribute('data-desc-ja');
        const descEn = item.getAttribute('data-desc-en');
        const imgSrc = item.getAttribute('data-img');
        const isEn = document.body.classList.contains('en');
        
        modalImg.src = imgSrc;
        modalTitle.textContent = isEn ? titleEn : titleJa;
        modalDesc.textContent = isEn ? descEn : descJa;
        modal.classList.add('show');
        
        if(window.lenis) window.lenis.stop();
        document.body.style.overflow = 'hidden';
    });
});

function hideModal() {
    if(modal) modal.classList.remove('show');
    if(window.lenis) window.lenis.start();
    document.body.style.overflow = '';
}

if (closeModal) { closeModal.addEventListener('click', hideModal); }
window.addEventListener('click', (e) => { if (e.target === modal) { hideModal(); } });
// --- Text Scramble Effect ---
class TextScramble {
    constructor(el) {
        this.el = el;
        this.chars = '!<>-_\\/[]{}—=+*^?#________';
        this.update = this.update.bind(this);
    }
    setText(newText) {
        const oldText = this.el.innerText;
        const length = Math.max(oldText.length, newText.length);
        const promise = new Promise((resolve) => this.resolve = resolve);
        this.queue = [];
        for (let i = 0; i < length; i++) {
            const from = oldText[i] || '';
            const to = newText[i] || '';
            const start = Math.floor(Math.random() * 40);
            const end = start + Math.floor(Math.random() * 40);
            this.queue.push({ from, to, start, end });
        }
        cancelAnimationFrame(this.frameRequest);
        this.frame = 0;
        this.update();
        return promise;
    }
    update() {
        let output = '';
        let complete = 0;
        for (let i = 0, n = this.queue.length; i < n; i++) {
            let { from, to, start, end, char } = this.queue[i];
            if (this.frame >= end) {
                complete++;
                output += to;
            } else if (this.frame >= start) {
                if (!char || Math.random() < 0.28) {
                    char = this.randomChar();
                    this.queue[i].char = char;
                }
                output += `<span class="dud">${char}</span>`;
            } else {
                output += from;
            }
        }
        this.el.innerHTML = output;
        if (complete === this.queue.length) {
            this.resolve();
        } else {
            this.frameRequest = requestAnimationFrame(this.update);
            this.frame++;
        }
    }
    randomChar() {
        return this.chars[Math.floor(Math.random() * this.chars.length)];
    }
}

// 適用: Heroセクションのデータタグに適用
const phrases = [
    'ALT: 25,346m / TEMP: -38.8℃',
    'SYSTEM: NORMAL',
    'STATUS: LAUNCHED'
];
const el = document.querySelector('.data-tag span[lang="ja"]');
if(el) {
    const fx = new TextScramble(el);
    let counter = 0;
    const next = () => {
        fx.setText(phrases[counter]).then(() => {
            setTimeout(next, 3000);
        });
        counter = (counter + 1) % phrases.length;
    };
    // ローディング後に開始
    setTimeout(next, 3000); 
}
// --- Click Burst Effect (花びらが舞う) ---
document.addEventListener('click', (e) => {
    // リンクをクリックした時は邪魔しないように数を減らすなどの調整も可
    const particleCount = 8; // 飛び散る数

    for (let i = 0; i < particleCount; i++) {
        const p = document.createElement('div');
        p.classList.add('burst-particle');
        
        // クリック位置に配置
        p.style.left = e.clientX + 'px';
        p.style.top = e.clientY + 'px';
        
        // ランダムな方向に飛ばす計算
        const angle = Math.random() * Math.PI * 2;
        const velocity = 50 + Math.random() * 100; // 飛ぶ距離
        const tx = Math.cos(angle) * velocity + 'px';
        const ty = Math.sin(angle) * velocity + 'px';
        
        // CSS変数に値を渡す
        p.style.setProperty('--tx', tx);
        p.style.setProperty('--ty', ty);
        
        // 色をランダムに少し変える（金色〜白）
        const randomColor = Math.random() > 0.5 ? '#D4AF37' : '#ffffff';
        p.style.background = randomColor;

        document.body.appendChild(p);

        // アニメーション終わったら消す
        setTimeout(() => {
            p.remove();
        }, 1000);
    }
});

/* =========================================
   SPACESHIP MODE: Warp Drive & HUD
   ========================================= */

// --- 1. Warp Starfield Init ---
const starContainer = document.getElementById('starfield');
const starCount = 40; // 星の数
const stars = [];

// 星を生成
for (let i = 0; i < starCount; i++) {
    const star = document.createElement('div');
    star.classList.add('warp-star');
    
    // ランダムな位置
    const x = Math.random() * 100;
    const y = Math.random() * 100;
    const size = Math.random() * 2 + 1;
    
    star.style.left = x + '%';
    star.style.top = y + '%';
    star.style.width = size + 'px';
    
    starContainer.appendChild(star);
    stars.push(star);
}

// Lenisのスクロールイベントでワープ演出
if (window.lenis) {
    window.lenis.on('scroll', (e) => {
        // e.velocity はスクロール速度（プラスなら下、マイナスなら上）
        const velocity = Math.abs(e.velocity);
        const stretch = 1 + (velocity * 0.5); // 速度に応じて伸ばす倍率
        
        // すべての星を変形させる
        stars.forEach(star => {
            // スケールYで縦に伸ばす = ワープ感
            star.style.transform = `scaleY(${stretch})`;
            // 速いときは少し透明にしてブレ感を出す
            star.style.opacity = Math.max(0.3, 1 - (velocity * 0.05));
        });
    });
}

// --- 2. HUD Cursor Logic ---
const cursor = document.getElementById('hud-cursor');
const cursorCircle = document.querySelector('.cursor-circle');
const cursorLabel = document.querySelector('.cursor-label');

// PCのみ動作
if (window.matchMedia("(min-width: 769px)").matches) {
    let mouseX = 0;
    let mouseY = 0;
    let cursorX = 0;
    let cursorY = 0;

    // マウス位置取得
    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
    });

    // スムーズな追従アニメーション
    function animateCursor() {
        // 遅延追従（Lerp）
        const speed = 0.15;
        cursorX += (mouseX - cursorX) * speed;
        cursorY += (mouseY - cursorY) * speed;

        cursor.style.transform = `translate(${cursorX}px, ${cursorY}px)`;
        
        requestAnimationFrame(animateCursor);
    }
    animateCursor();

    // リンクホバー時のロックオン演出
    const interactables = document.querySelectorAll('a, button, .gallery-item, .exp-card, .btn-insta');
    
    interactables.forEach(el => {
        el.addEventListener('mouseenter', () => {
            cursor.classList.add('locked');
            cursorLabel.textContent = 'TARGET LOCKED'; // 文言変更
            
            // 少しSEっぽい演出：ランダムな数値を出す
            const randomCode = Math.floor(Math.random() * 9000) + 1000;
            cursorLabel.innerHTML = `TARGET LOCKED <br> <span style="font-size:0.5em">DATA: ${randomCode}</span>`;
        });
        
        el.addEventListener('mouseleave', () => {
            cursor.classList.remove('locked');
            cursorLabel.textContent = 'SYSTEM READY';
        });
    });
}
