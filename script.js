// --- START OF FILE script.js ---

const TARGET_ALTITUDE_M = 25346;
const TARGET_ALTITUDE_FT = 83156;

// GSAPのプラグイン登録
gsap.registerPlugin(ScrollTrigger);

document.addEventListener('DOMContentLoaded', () => {
    initLanguageSettings();
    
    // LenisとGSAPの連携セットアップ
    initSmoothScroll();
    
    // システム起動ローダー（完了後にGSAPアニメーション開始）
    initBootSequence();

    // HUD・UI・インタラクション
    initHUDInteractions();
    initCompareSlider();
    initUI();
    initFAQ();

    // 星空の描画
    initStarfield();

    // カードホバー時の拡大エフェクト
    initCardHoverEffects();
    
});

// === 1. Lenis & GSAP ScrollTrigger Setup ===
function initSmoothScroll() {
    const lenis = new Lenis({
        duration: 1.5, // 少しゆったりさせて高級感を出す
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smooth: true,
    });

    // LenisのスクロールイベントでScrollTriggerを更新
    lenis.on('scroll', ScrollTrigger.update);

    // GSAPのTickerにLenisをフックさせる
    gsap.ticker.add((time) => {
        lenis.raf(time * 1000);
    });
    
    // GSAPのラグ修正
    gsap.ticker.lagSmoothing(0);

    // カスタムHUDの更新もここで行う
    lenis.on('scroll', (e) => {
        updateHUD(e.scroll);
    });

    window.lenis = lenis;
}

// === 2. Boot Loader & Hero Animation ===
function initBootSequence() {
    const screen = document.getElementById('boot-screen');
    const log = document.getElementById('boot-log');
    const fill = document.querySelector('.boot-progress-fill');
    const percent = document.querySelector('.boot-percent');
    
    if (!screen) { initSiteAnimations(); return; }

    const logs = [
        "SYSTEM_CHECK_INIT...", "LOADING_KERNEL_MODULES...", "CONNECTING_TO_SATELLITE...",
        "ESTABLISHING_SECURE_LINK...", "LOADING_ASSETS...", "CALIBRATING_SENSORS...",
        "ATMOSPHERIC_PRESSURE: NORMAL", "TARGET_COORDINATES: LOCKED", "SYSTEM_READY."
    ];

    let progress = 0;
    let logIndex = 0;

    const interval = setInterval(() => {
        progress += Math.random() * 5; 
        if (progress > 100) progress = 100;

        if(fill) fill.style.width = `${progress}%`;
        if(percent) percent.textContent = `${Math.floor(progress)}%`;

        if (log && progress > (logIndex * (100 / logs.length)) && logIndex < logs.length) {
            const p = document.createElement('div');
            p.className = 'boot-line';
            p.textContent = `> ${logs[logIndex]}`;
            if (logIndex === logs.length - 1) {
                p.style.color = '#fff'; p.classList.add('blink');
            }
            log.prepend(p);
            logIndex++;
        }

        if (progress >= 100) {
            clearInterval(interval);
            setTimeout(() => {
                // ローダーフェードアウト
                gsap.to(screen, {
                    opacity: 0,
                    duration: 0.8,
                    ease: "power2.inOut",
                    onComplete: () => {
                        screen.style.display = 'none';
                        // サイトのアニメーション開始
                        initSiteAnimations();
                    }
                });
            }, 500);
        }
    }, 50);
}

// === 3. GSAP Site Animations (グリッチ削除済み) ===
function initSiteAnimations() {
    initTextScramble();

    // A. ヒーローセクション
    const tl = gsap.timeline();
    tl.from(".hero-content .data-tag", { y: 20, opacity: 0, duration: 0.8, ease: "power3.out" })
      .from(".hero-content h1 span", { y: 100, opacity: 0, duration: 1, stagger: 0.1, ease: "power4.out" }, "-=0.6")
      .from(".hero-content .hero-desc", { y: 20, opacity: 0, duration: 0.8, ease: "power3.out" }, "-=0.6")
      .from(".scroll-down", { y: -20, opacity: 0, duration: 0.8 }, "-=0.4");

    // B. 各セクションの出現
    const revealElements = document.querySelectorAll(".section-title, .lead-text, .timeline-content, .gallery-item, .blog-card");
    revealElements.forEach((elem) => {
        gsap.set(elem, { autoAlpha: 0, y: 50 });
        ScrollTrigger.create({
            trigger: elem,
            start: "top 85%",
            once: true,
            onEnter: () => {
                gsap.to(elem, { duration: 1.2, y: 0, autoAlpha: 1, ease: "power3.out", overwrite: "auto" });
            }
        });
    });

    // C. 画像のパララックス (グリッチエフェクトは削除)
    const parallaxImages = document.querySelectorAll(".gallery-item img, .timeline-img, .exp-card img");
    
    parallaxImages.forEach((img) => {
        // パララックス（スクロールに合わせて少し動く）
        gsap.to(img, {
            yPercent: 15,
            ease: "none",
            scrollTrigger: {
                trigger: img.parentElement,
                start: "top bottom",
                end: "bottom top",
                scrub: true,
            }
        });
        
        // 出現時のズーム演出
        ScrollTrigger.create({
            trigger: img.parentElement,
            start: "top 85%",
            once: true,
            onEnter: () => {
                gsap.fromTo(img, 
                    { scale: 1.3 },
                    { scale: 1.0, duration: 1.5, ease: "power2.out" }
                );
            }
        });
    });

    // D. タイムラインの線
    gsap.utils.toArray(".timeline-item").forEach((item) => {
        const dot = item.querySelector(".timeline-dot");
        if(dot) {
            gsap.from(dot, {
                scale: 0, duration: 0.5, ease: "back.out(1.7)",
                scrollTrigger: { trigger: item, start: "top 80%" }
            });
        }
    });
}

// === 4. HUD Logic ===
let lastScrollTop = 0;

function updateHUD(scrollTop) {
    const isEnglish = document.body.classList.contains('en');
    
    const targetAlt = isEnglish ? TARGET_ALTITUDE_FT : TARGET_ALTITUDE_M;
    const tempValText = isEnglish ? '-37.8' : '-38.8';
    const tempUnitText = isEnglish ? '°F' : '°C';
    const altUnitText = isEnglish ? 'ft' : 'm';

    const altDisplay = document.getElementById('live-altitude');
    const altUnitDisplay = document.getElementById('hud-alt-unit');
    const tempValDisplay = document.getElementById('hud-temp-val');
    const tempUnitDisplay = document.getElementById('hud-temp-unit');
    
    const indicator = document.getElementById('scroll-indicator');
    const header = document.getElementById('header');
    const hudLayer = document.getElementById('hud-layer');
    const hero = document.getElementById('hero');
    
    const docHeight = document.body.scrollHeight - window.innerHeight;
    const scrollPercent = (docHeight > 0) ? Math.max(0, Math.min(1, scrollTop / docHeight)) : 0;

    // テキスト更新
    if(altUnitDisplay) altUnitDisplay.textContent = altUnitText;
    if(tempValDisplay) tempValDisplay.textContent = tempValText;
    if(tempUnitDisplay) tempUnitDisplay.textContent = tempUnitText;

    // HUD表示制御
    if (hudLayer && hero) {
        const heroHeight = hero.offsetHeight;
        if (scrollTop > heroHeight * 0.8) {
            hudLayer.classList.add('visible');
        } else {
            hudLayer.classList.remove('visible');
        }
    }

    // 高度計 (逆転ロジック：スクロールするほど数値が上がる/下がる演出、ここでは上昇に合わせて減る演出から、固定値への変化など適宜調整)
    // ※元のコードのロジックを維持：スクロールトップ(0)でターゲット高度、下にいくほど0に近づく（帰還のイメージ）
    if(altDisplay) {
        const currentAlt = Math.floor((1 - scrollPercent) * targetAlt);
        altDisplay.textContent = String(currentAlt).padStart(5, '0');
    }

    if(indicator) indicator.style.top = `${scrollPercent * 100}%`;

    const progressBar = document.getElementById('scroll-progress');
    if(progressBar) progressBar.style.width = `${scrollPercent * 100}%`;

    // ヘッダー制御
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

    // ロケットボタン
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

// === 5. Other Functions (Language, FAQ, UI) ===

function initLanguageSettings() {
    const savedLang = localStorage.getItem('lang') || 'ja';
    if (savedLang === 'en') { document.body.classList.add('en'); }
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

// === Interaction Logic (Cursor & Buttons) ===
function initHUDInteractions() {
    const cursor = document.getElementById('hud-cursor');
    // カーソル要素がなければ終了
    if (!cursor) return;

    // 1. マウス移動の追従（常に監視し、PCサイズの時だけ反映する）
    document.addEventListener('mousemove', (e) => {
        // 現在の画面幅が1025px以上かチェック
        if (window.matchMedia("(min-width: 1025px)").matches) {
            // CSSのtransformを直接書き換える（GSAPより高速に反応させるため）
            cursor.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;
            
            // パーティクル生成
            createStardust(e.clientX, e.clientY);
        }
    });

    // 2. リンクホバー時のカーソル変化（ロックオン演出）
    const targets = document.querySelectorAll('a, button, .gallery-item, .map-overlay-btn, .slider-button');
    targets.forEach(el => {
        el.addEventListener('mouseenter', () => cursor.classList.add('locked'));
        el.addEventListener('mouseleave', () => cursor.classList.remove('locked'));
    });

    // 3. マグネットボタン（吸着エフェクト）
    const magnets = document.querySelectorAll('.email-link, .btn-insta, .map-overlay-btn, .scroll-down');
    magnets.forEach((magnet) => {
        magnet.classList.add('magnet-btn');
        
        // CSSで translate(-50%, -50%) で中央配置されている要素か判定
        // ※ .scroll-down も中央配置されているので対象に追加
        const isCentered = magnet.classList.contains('map-overlay-btn') || magnet.classList.contains('scroll-down');

        magnet.addEventListener('mousemove', (e) => {
            // PCサイズのみ動作
            if (!window.matchMedia("(min-width: 1025px)").matches) return;

            const rect = magnet.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            
            // マウスとの距離（動きの大きさ）
            const x = (e.clientX - centerX) / 5;
            const y = (e.clientY - centerY) / 5;
            
            // GSAPで動かす
            // ★重要: 中央配置の要素は xPercent/yPercent: -50 を維持しないと位置がズレる
            gsap.to(magnet, {
                x: x, 
                y: y, 
                xPercent: isCentered ? -50 : 0, 
                yPercent: isCentered ? -50 : 0,
                scale: 1.1, 
                duration: 0.3, 
                ease: "power2.out",
                overwrite: "auto"
            });
        });

        magnet.addEventListener('mouseleave', () => {
            // 元に戻す
            // ★重要: 戻すときも xPercent/yPercent を指定する
            gsap.to(magnet, {
                x: 0, 
                y: 0, 
                xPercent: isCentered ? -50 : 0, 
                yPercent: isCentered ? -50 : 0,
                scale: 1, 
                duration: 0.5, 
                ease: "elastic.out(1, 0.5)",
                overwrite: "auto"
            });
        });
    });
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

    // GSAPでパーティクルアニメーション
    gsap.to(particle, {
        x: destX,
        y: destY,
        scale: 0,
        opacity: 0,
        duration: 1 + Math.random(),
        ease: "power2.out",
        onComplete: () => particle.remove()
    });
}

// === 追加機能：背景の星空 ===
function initStarfield() {
    const canvas = document.getElementById('starfield');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let width, height;
    let stars = [];
    const starCount = 400; // 星の数
    const baseSpeed = 0.2; // 基本の流れる速度

    // リサイズ対応
    function resize() {
        width = window.innerWidth;
        height = window.innerHeight;
        canvas.width = width;
        canvas.height = height;
        initStars();
    }
    window.addEventListener('resize', resize);

    // 星の生成
    function initStars() {
        stars = [];
        for (let i = 0; i < starCount; i++) {
            stars.push({
                x: Math.random() * width,
                y: Math.random() * height,
                z: Math.random() * 2 + 0.5, // 奥行き
                alpha: Math.random() * 0.8 + 0.2
            });
        }
    }
    
    // 初回実行
    resize();

    // アニメーションループ
    function animate() {
        ctx.clearRect(0, 0, width, height);
        
        // Lenisのスクロール速度を取得し、星の流れる速度に反映
        const scrollVel = window.lenis ? window.lenis.velocity : 0;
        const warpFactor = scrollVel * 0.5; 

        ctx.fillStyle = '#fff';
        
        stars.forEach(star => {
            // 基本速度 + スクロール速度による加算
            star.y -= (baseSpeed * star.z) + (warpFactor * 0.1 * star.z);

            // 画面外に出たらループさせる
            if (star.y < 0) {
                star.y = height;
                star.x = Math.random() * width;
            }
            if (star.y > height) {
                star.y = 0;
                star.x = Math.random() * width;
            }

            // 描画
            ctx.globalAlpha = star.alpha;
            ctx.beginPath();
            ctx.arc(star.x, star.y, star.z * 0.8, 0, Math.PI * 2);
            ctx.fill();
        });

        requestAnimationFrame(animate);
    }
    animate();
}

function initCardHoverEffects() {
    const cards = document.querySelectorAll('.exp-card');
    
    cards.forEach(card => {
        const img = card.querySelector('img');
        if (!img) return;

        // ホバー時：パララックスの位置(yPercent)を維持したまま拡大
        card.addEventListener('mouseenter', () => {
            gsap.to(img, {
                scale: 1.05,
                duration: 0.5,
                ease: "power2.out",
                overwrite: "auto" // 他のアニメーションと競合しないようにする
            });
        });

        // ホバー解除時：元に戻す
        card.addEventListener('mouseleave', () => {
            gsap.to(img, {
                scale: 1.0,
                duration: 0.5,
                ease: "power2.out",
                overwrite: "auto"
            });
        });
    });
}
