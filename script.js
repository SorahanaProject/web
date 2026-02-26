// 言語設定
const savedLang = localStorage.getItem('lang') || 'ja';
if (savedLang === 'en') { document.body.classList.add('en'); }
const isEnglish = document.body.classList.contains('en');
const TARGET_ALTITUDE = isEnglish ? 83156 : 25346;
const UNIT_TEXT = isEnglish ? 'ft' : 'm';

// ローディング
window.addEventListener('load', () => {
    const loader = document.getElementById('loader');
    const container = document.getElementById('digit-container');
    const langBtn = document.getElementById('langBtn');
    if (langBtn) { langBtn.textContent = isEnglish ? 'JP' : 'EN'; }
    
    // 星生成
    initHyperspaceStars();
    
    // カウントダウン開始（訪問済みチェックは削除し毎回実行）
    startLoadingAnimation(loader, container);
});

// ★★★ 修正点：ハイパースペースの星生成 ★★★
function initHyperspaceStars() {
    const hyperContainer = document.getElementById('hyperspace');
    if (!hyperContainer) return;

    for (let i = 0; i < 60; i++) { // 星の数
        const s = document.createElement('div');
        // 【重要】クラス名をCSSの定義(.hyper-star)と一致させる
        s.className = 'hyper-star';
        
        // ランダムな位置（極座標で配置して放射状にする）
        const angle = Math.random() * Math.PI * 2;
        const dist = 50 + Math.random() * 400; // 中心を避けて配置
        const tx = Math.cos(angle) * dist + 'px';
        const ty = Math.sin(angle) * dist + 'px';
        
        s.style.setProperty('--tx', tx);
        s.style.setProperty('--ty', ty);
        
        hyperContainer.appendChild(s);
    }
}

function startLoadingAnimation(loader, container) {
    const duration = 2800;
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
            for (let char of altString) { html += `<div class="digit-box">${char}</div>`; }
            html += `<div class="unit-box">${UNIT_TEXT}</div>`;
            container.innerHTML = html;
        }

        if (progress < 1) {
            requestAnimationFrame(updateCounter);
        } else {
            // カウント完了後にジャンプ
            setTimeout(() => {
                if(loader) {
                    loader.classList.add('loaded'); // アニメーション開始
                    
                    // 0.8秒(星の伸び) + α でフェードアウト完了
                    setTimeout(() => {
                        loader.style.display = 'none';
                        initTextScramble();
                        initScrollAnimation();
                    }, 1200);
                } else {
                    initScrollAnimation();
                    initTextScramble();
                }
            }, 500); 
        }
    }
    requestAnimationFrame(updateCounter);
}

// Text Scramble
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
    if(el) {
        const fx = new TextScramble(el);
        const phrases = ['ALT: 25,346m / TEMP: -38.8℃', 'SYSTEM: NORMAL', 'STATUS: LAUNCHED'];
        let counter = 0;
        const next = () => {
            fx.setText(phrases[counter]).then(() => { setTimeout(next, 3000); });
            counter = (counter + 1) % phrases.length;
        };
        next();
    }
}

// Background Warp Stars
const starContainer = document.getElementById('starfield');
const stars = [];
if (starContainer) {
    const starCount = 80; 
    for (let i = 0; i < starCount; i++) {
        const star = document.createElement('div');
        star.classList.add('star');
        const x = Math.random() * 100; const y = Math.random() * 100;
        const size = Math.random() * 2 + 1; 
        const duration = Math.random() * 3 + 2; const delay = Math.random() * 5;
        star.style.left = x + '%'; star.style.top = y + '%';
        star.style.width = size + 'px'; star.style.height = size + 'px';
        star.style.animationDuration = duration + 's'; star.style.animationDelay = delay + 's';
        star.style.transform = 'scaleY(1)'; 
        starContainer.appendChild(star); stars.push(star);
    }
}
function initWarpEffect() {
    if (window.lenis) {
        window.lenis.on('scroll', (e) => {
            const velocity = Math.abs(e.velocity);
            const stretch = 1 + (velocity * 3.0);
            const scaleY = Math.min(stretch, 40); 
            stars.forEach(star => {
                star.style.transform = `scaleY(${scaleY})`;
                if(velocity > 5) { star.style.animationPlayState = 'paused'; star.style.opacity = 0.5; }
                else { star.style.animationPlayState = 'running'; star.style.opacity = ''; }
            });
        });
    } else { requestAnimationFrame(initWarpEffect); }
}
initWarpEffect();

// Other UI Scripts (Cursor, Burst, Magnetic, Scroll)
let lastSparkleTime = 0;
document.addEventListener('mousemove', (e) => {
    const now = Date.now();
    if (now - lastSparkleTime > 50) { createSparkle(e.clientX, e.clientY); lastSparkleTime = now; }
});
function createSparkle(x, y) {
    const s = document.createElement('div'); s.classList.add('sparkle');
    s.style.left = (x + (Math.random()-0.5)*15) + 'px'; s.style.top = (y + (Math.random()-0.5)*15) + 'px';
    const size = Math.random()*4+2; s.style.width = size+'px'; s.style.height = size+'px';
    document.body.appendChild(s); setTimeout(() => s.remove(), 800);
}

function initScrollAnimation() {
    const obs = new IntersectionObserver((entries) => {
        entries.forEach(entry => { if(entry.isIntersecting) { entry.target.classList.add('is-visible'); obs.unobserve(entry.target); }});
    }, { threshold: 0.15 });
    document.querySelectorAll('.js-scroll').forEach(el => obs.observe(el));
}

window.addEventListener('scroll', () => {
    const top = window.scrollY;
    const header = document.getElementById('header');
    if(top > 50) header.classList.add('scrolled'); else header.classList.remove('scrolled');
    const docH = document.body.scrollHeight - window.innerHeight;
    const bar = document.getElementById('scroll-progress');
    if(bar) bar.style.width = (top/docH)*100 + '%';
    const btt = document.getElementById('back-to-top');
    if(btt) { if(top > 400) btt.classList.add('show'); else btt.classList.remove('show'); }
});

const btt = document.getElementById('back-to-top');
if(btt) btt.addEventListener('click', (e) => {
    e.preventDefault(); btt.classList.add('launch');
    if(window.lenis) window.lenis.scrollTo(0, {duration: 3}); else window.scrollTo({top:0, behavior:'smooth'});
    setTimeout(() => { btt.classList.remove('launch', 'show'); }, 3500);
});

const ham = document.getElementById('hamburger'); const nv = document.getElementById('nav-menu');
if(ham) {
    ham.addEventListener('click', () => { ham.classList.toggle('active'); nv.classList.toggle('active'); });
    nv.querySelectorAll('a').forEach(l => l.addEventListener('click', () => { ham.classList.remove('active'); nv.classList.remove('active'); }));
}

const sld = document.getElementById('compare-slider');
if(sld) sld.addEventListener('input', (e) => {
    const val = e.target.value;
    document.getElementById('compare-overlay').style.width = val + "%";
    document.getElementById('slider-button').style.left = val + "%";
});

const cursor = document.getElementById('hud-cursor');
if (cursor && window.matchMedia("(min-width: 1025px)").matches) {
    document.addEventListener('mousemove', (e) => { cursor.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`; }, {passive:true});
    document.querySelectorAll('a, button, .gallery-item, .exp-card, .btn-insta').forEach(el => {
        el.addEventListener('mouseenter', () => cursor.classList.add('locked'));
        el.addEventListener('mouseleave', () => cursor.classList.remove('locked'));
    });
}

document.addEventListener('click', (e) => {
    for(let i=0; i<8; i++){
        const p = document.createElement('div'); p.classList.add('burst-particle');
        p.style.left = e.clientX+'px'; p.style.top = e.clientY+'px';
        const a = Math.random()*Math.PI*2; const v = 50+Math.random()*100;
        p.style.setProperty('--tx', Math.cos(a)*v+'px'); p.style.setProperty('--ty', Math.sin(a)*v+'px');
        p.style.background = Math.random()>0.5 ? '#D4AF37' : '#fff';
        document.body.appendChild(p); setTimeout(()=>p.remove(), 1000);
    }
});
