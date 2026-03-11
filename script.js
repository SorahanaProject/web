// --- START OF FILE script.js ---

// --- 追加：KMLから抽出した実際のフライト・キーフレームデータ（降下フェーズ） ---
// progress は 0.0(ページ最上部) から 1.0(ページ最下部) までのスクロール割合
const FLIGHT_DATA =[
    { progress: 0.00, alt: 25346, lat: 33.393288, lon: 135.778355, vel: 0 },    // ★最高到達点（ページトップ）
    { progress: 0.25, alt: 19013, lat: 33.392396, lon: 135.781251, vel: 58 },   // 降下開始 (07:22 AM)
    { progress: 0.45, alt: 14301, lat: 33.389456, lon: 135.830820, vel: 185 },  // 急降下中 (07:24 AM)
    { progress: 0.60, alt: 10642, lat: 33.395100, lon: 135.903431, vel: 196 },  // 急降下中 (07:26 AM - KML記録最後)
    { progress: 0.90, alt: 1500,  lat: 33.398000, lon: 136.050000, vel: 45 },   // パラシュート安定降下 (補間)
    { progress: 1.00, alt: 0,     lat: 33.400000, lon: 136.150000, vel: 0 }     // 海上着水・回収 (補間)
];

// 数値を滑らかに補間する計算関数
function lerp(start, end, amt) {
    return (1 - amt) * start + amt * end;
}

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

    // テレメトリ・データストリーム
    initTelemetryStream();

    // 環境センシング波形
    initWaveformGraph();
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
        gsap.set(elem, { opacity:: 0, y: 50 });
        ScrollTrigger.create({
            trigger: elem,
            start: "top 85%",
            once: true,
            onEnter: () => {
                gsap.to(elem, { duration: 1.2, y: 0, opacity:: 1, ease: "power3.out", overwrite: "auto" });
            }
        });
    });

    // C. 画像のパララックス (グリッチエフェクトは削除)
    const parallaxImages = document.querySelectorAll(".gallery-item img, .timeline-img, .exp-card img");
    
    parallaxImages.forEach((img) => {
        // ※原因だった yPercent: 15 (パララックス) を削除しました

        ScrollTrigger.create({
            trigger: img.parentElement,
            start: "top 85%",
            once: true,
            onEnter: () => {
                // 出現時にズームイン状態から通常サイズへ
                gsap.fromTo(img, 
                    { scale: 1.3 },
                    { 
                        scale: 1.0, 
                        duration: 1.5, 
                        ease: "power2.out",
                        // ★重要: アニメーション完了後にGSAPのスタイル指定を解除し、
                        // 以降はCSSの :hover (transform: scale) が正常に効くようにする
                        clearProps: "transform" 
                    }
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
// リアルタイム速度計算用の変数
let lastTimeForVel = performance.now();
let lastAltForVel = 25346;
let smoothedVerticalVelocity = 0;

function updateHUD(scrollTop) {
    const isEnglish = document.body.classList.contains('en');
    const docHeight = document.body.scrollHeight - window.innerHeight;
    const scrollPercent = (docHeight > 0) ? Math.max(0, Math.min(1, scrollTop / docHeight)) : 0;

    // --- KMLデータに基づく座標・高度のリアルタイム計算 ---
    let currentAlt = 0, currentLat = 0, currentLon = 0;

    for (let i = 0; i < FLIGHT_DATA.length - 1; i++) {
        let p1 = FLIGHT_DATA[i];
        let p2 = FLIGHT_DATA[i + 1];

        if (scrollPercent >= p1.progress && scrollPercent <= p2.progress) {
            let range = p2.progress - p1.progress;
            let localPercent = (scrollPercent - p1.progress) / range;

            currentAlt = lerp(p1.alt, p2.alt, localPercent);
            currentLat = lerp(p1.lat, p2.lat, localPercent);
            currentLon = lerp(p1.lon, p2.lon, localPercent);
            break;
        }
    }
    if (scrollPercent >= 1.0) {
        let lastObj = FLIGHT_DATA[FLIGHT_DATA.length - 1];
        currentAlt = lastObj.alt; currentLat = lastObj.lat; currentLon = lastObj.lon;
    }

    // --- 画面への描画（高度・座標） ---
    const altDisplay = document.getElementById('live-altitude');
    const altUnitDisplay = document.getElementById('hud-alt-unit');
    const latDisplay = document.getElementById('hud-lat');
    const lonDisplay = document.getElementById('hud-lon');
    
    // 英語モードならフィートに変換
    let displayAlt = currentAlt;
    if (isEnglish) {
        displayAlt = currentAlt * 3.28084;
        if (altUnitDisplay) altUnitDisplay.textContent = 'ft';
    } else {
        if (altUnitDisplay) altUnitDisplay.textContent = 'm';
    }

    if(altDisplay) altDisplay.textContent = Math.floor(displayAlt).toString().padStart(5, '0');
    if(latDisplay) latDisplay.textContent = currentLat.toFixed(4);
    if(lonDisplay) lonDisplay.textContent = currentLon.toFixed(4);

    // --- 気温のシミュレーション（標準大気モデル） ---
    const tempDisplay = document.getElementById('hud-temp-val');
    const tempUnitDisplay = document.getElementById('hud-temp-unit');
    if (tempDisplay) {
        let tempC = 15;
        if (currentAlt <= 11000) {
            tempC = 15 - (currentAlt / 1000) * 6.5; // 対流圏
        } else {
            let ratio = (currentAlt - 11000) / (25346 - 11000);
            tempC = -56.5 + ratio * (-38.8 - (-56.5)); // 成層圏
        }

        if (isEnglish) {
            tempDisplay.textContent = (tempC * 9/5 + 32).toFixed(1); // 華氏変換
            if (tempUnitDisplay) tempUnitDisplay.textContent = '°F';
        } else {
            tempDisplay.textContent = tempC.toFixed(1);
            if (tempUnitDisplay) tempUnitDisplay.textContent = '°C';
        }
    }

    // --- 気圧のシミュレーション（国際標準大気モデル） ---
    const presDisplay = document.getElementById('hud-pres-val');
    if (presDisplay) {
        let pressure = 1013.25;
        if (currentAlt <= 11000) {
            pressure = 1013.25 * Math.pow(1 - 0.0065 * currentAlt / 288.15, 5.25588);
        } else {
            pressure = 226.32 * Math.exp(-0.000157688 * (currentAlt - 11000));
        }
        // 画像に合わせて整数表示
        presDisplay.textContent = Math.round(pressure);
    }

    // --- 上昇・落下速度 (m/s) のリアルタイム計算 ---
    const now = performance.now();
    const dt = (now - lastTimeForVel) / 1000; 
    
    if (dt > 0.01) {
        let rawVerticalVel = (currentAlt - lastAltForVel) / dt; 
        smoothedVerticalVelocity = smoothedVerticalVelocity * 0.9 + rawVerticalVel * 0.1;
        lastTimeForVel = now;
        lastAltForVel = currentAlt;
    }

    if (scrollTop === lastScrollTop) {
        smoothedVerticalVelocity *= 0.9;
    }

    const velDisplay = document.getElementById('hud-vel');
    const velLabel = document.getElementById('hud-vel-label');
    
    if (velDisplay && velLabel) {
        let speedMS = Math.abs(smoothedVerticalVelocity); 
        
        if (smoothedVerticalVelocity < -0.1) {
            velLabel.textContent = "▼ DESCENT RATE"; 
            velLabel.style.color = "#ff3333"; 
        } else if (smoothedVerticalVelocity > 0.1) {
            velLabel.textContent = "▲ ASCENT RATE";  
            velLabel.style.color = "#33ccff"; 
        } else {
            velLabel.textContent = "■ HOVERING";    
            velLabel.style.color = "var(--hud-color)"; 
        }
        
        if (speedMS < 0.1) speedMS = 0;
        // 画像に合わせて小数点第2位まで表示
        velDisplay.textContent = speedMS.toFixed(2);
    }

    // --- その他UIの制御 ---
    const indicator = document.getElementById('scroll-indicator');
    const progressBar = document.getElementById('scroll-progress');
    const hudLayer = document.getElementById('hud-layer');
    const hero = document.getElementById('hero');
    const header = document.getElementById('header');

    if(indicator) indicator.style.top = `${scrollPercent * 100}%`;
    if(progressBar) progressBar.style.width = `${scrollPercent * 100}%`;

    if (hudLayer && hero) {
        if (scrollTop > hero.offsetHeight * 0.8) hudLayer.classList.add('visible');
        else hudLayer.classList.remove('visible');
    }

    if(header) {
        if(scrollTop > 50) header.classList.add('scrolled');
        else header.classList.remove('scrolled');

        if (scrollTop > lastScrollTop && scrollTop > 100) header.classList.add('header-hidden');
        else header.classList.remove('header-hidden');
        lastScrollTop = scrollTop;
    }

    const btt = document.getElementById('back-to-top');
    if(btt) {
        if(scrollTop > 400) btt.classList.add('show');
        else btt.classList.remove('show');
    }

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

// === テレメトリ・データストリーム生成 ===
function initTelemetryStream() {
    const stream = document.getElementById('telemetry-stream');
    if (!stream) return;

    // 観測データっぽい単語のリスト
    const msgs =["SYS_CHK", "DAT_RCV", "SYNC_OK", "UV_SENS", "PRS_NRM", "TMP_STB", "ALT_UPD", "GPS_LCK", "LNK_SEC"];
    
    // ランダムな16進数を生成
    function getRandomHex(len) {
        let str = '';
        for(let i=0; i<len; i++) {
            str += Math.floor(Math.random()*16).toString(16).toUpperCase();
        }
        return str;
    }

    // 1行分のデータ文字列を生成
    function generateLine() {
        const rand = Math.random();
        if (rand > 0.6) {
            // 例: 0x4F2A :: DAT_RCV :: B4
            return `0x${getRandomHex(4)} :: ${msgs[Math.floor(Math.random()*msgs.length)]} :: ${getRandomHex(2)}`;
        } else if (rand > 0.3) {
            // 例: P_A93F12 : DATA_STREAM_ACTIVE
            return `P_${getRandomHex(6)} : DATA_STREAM_ACTIVE`;
        } else {
            // 例: RAW: 1011001010100110
            let bin = '';
            for(let i=0; i<16; i++) bin += Math.random()>0.5 ? '1':'0';
            return `RAW: ${bin}`;
        }
    }

    // 100ミリ秒（0.1秒）ごとに実行
    setInterval(() => {
        // 常に均等に流れるのではなく、たまに止まることで「実際の通信ラグ」を演出
        if (Math.random() > 0.85) return;

        const line = document.createElement('div');
        line.className = 'telemetry-line';
        
        // 10%の確率でゴールドに光るハイライト行にする
        if (Math.random() > 0.9) line.classList.add('highlight');
        
        line.textContent = generateLine();
        stream.appendChild(line);

        // 表示行数が7行を超えたら一番古い上の行を削除
        if (stream.children.length > 7) {
            stream.removeChild(stream.firstChild);
        }
    }, 100); 
}

// === 環境センシング波形（リアルタイムグラフ） ===
function initWaveformGraph() {
    const canvas = document.getElementById('waveform-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    const width = canvas.width;
    const height = canvas.height;
    const centerY = height / 2;
    
    // グラフのデータポイント（X軸のピクセル数分用意する）
    const points = new Array(width).fill(centerY);
    let time = 0;
    
    function draw() {
        // キャンバスをクリア
        ctx.clearRect(0, 0, width, height);
        
        // --- 新しいデータポイントの生成 ---
        time += 0.05;
        // 1. ゆっくりうねる基本のサイン波
        let baseWave = Math.sin(time) * 8;
        // 2. 常に入る小さな微振動ノイズ
        let noise = (Math.random() - 0.5) * 4;
        
        // 3. 突発的な大きなスパイク（乱気流や強いセンサー反応の表現）
        if (Math.random() > 0.96) {
            noise += (Math.random() - 0.5) * 40;
        }
        
        let newY = centerY + baseWave + noise;
        
        // グラフがキャンバスの外にはみ出さないように制限
        newY = Math.max(5, Math.min(height - 5, newY));
        
        // 古いデータを押し出し、新しいデータを追加（右から左へ流れる）
        points.shift();
        points.push(newY);
        
        // --- 描画処理 ---
        ctx.beginPath();
        ctx.moveTo(0, points[0]);
        for (let i = 1; i < width; i++) {
            ctx.lineTo(i, points[i]);
        }
        
        // 線のスタイル（HUDと同じゴールド系）
        ctx.strokeStyle = 'rgba(212, 175, 55, 0.8)';
        ctx.lineWidth = 1.2;
        
        // 少し発光（グロー）させる
        ctx.shadowBlur = 4;
        ctx.shadowColor = 'rgba(212, 175, 55, 0.5)';
        
        ctx.stroke();
        
        // アニメーションループ
        requestAnimationFrame(draw);
    }
    
    draw();
}
