// --- START OF FILE script.js ---

// --- KMLフライトデータ（降下フェーズの完全な実データ） ---
const FLIGHT_DATA =[
    { progress: 0.00, alt: 25346, lat: 33.399596, lon: 135.489921 }, 
    { progress: 0.15, alt: 23187, lat: 33.402246, lon: 135.488483 }, 
    { progress: 0.45, alt: 12937, lat: 33.394521, lon: 135.663106 }, 
    { progress: 0.65, alt: 9236,  lat: 33.420206, lon: 135.835711 }, 
    { progress: 0.80, alt: 6348,  lat: 33.460986, lon: 135.972568 }, 
    { progress: 0.90, alt: 3899,  lat: 33.454710, lon: 136.034388 }, 
    { progress: 0.96, alt: 1606,  lat: 33.453411, lon: 136.049366 }, 
    { progress: 1.00, alt: 0,     lat: 33.449765, lon: 136.054945 }  
];

function lerp(start, end, amt) {
    return (1 - amt) * start + amt * end;
}

// GSAPプラグインの登録
gsap.registerPlugin(ScrollTrigger);

document.addEventListener('DOMContentLoaded', () => {
    initLanguageSettings();
    initSmoothScroll();
    initBootSequence();
    initHUDInteractions();
    initCompareSlider();
    initUI();
    initFAQ();
    initStarfield();
    initTelemetryStream();
    initWaveformGraph();
});

// === 1. Lenis & GSAP ScrollTrigger Setup ===
function initSmoothScroll() {
    const lenis = new Lenis({
        duration: 1.5,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smooth: true,
    });

    lenis.on('scroll', ScrollTrigger.update);
    
    gsap.ticker.add((time) => { 
        lenis.raf(time * 1000); 
        if (window.lenis) updateHUD(window.lenis.scroll);
    });
    gsap.ticker.lagSmoothing(0);

    window.lenis = lenis;
    updateHUD(window.scrollY || 0);
}

// === 2. Boot Loader ===
function initBootSequence() {
    const screen = document.getElementById('boot-screen');
    const log = document.getElementById('boot-log');
    const fill = document.querySelector('.boot-progress-fill');
    const percent = document.querySelector('.boot-percent');
    
    if (!screen) { initSiteAnimations(); return; }

    const logs =[
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
                gsap.to(screen, { 
                    opacity: 0, duration: 0.8, ease: "power2.inOut", 
                    onComplete: () => {
                        screen.style.display = 'none'; 
                        initSiteAnimations();
                    }
                });
            }, 500);
        }
    }, 50);
}

// === 3. GSAP Site Animations (ハイブリッド＆ストレスフリー仕様) ===
function initSiteAnimations() {
    initTextScramble();

    const tl = gsap.timeline();
    tl.from(".hero-content .data-tag", { y: 20, opacity: 0, duration: 0.8, ease: "power3.out" })
      .from(".hero-content h1 span", { y: 100, opacity: 0, duration: 1, stagger: 0.1, ease: "power4.out" }, "-=0.6")
      .from(".hero-content .hero-desc", { y: 20, opacity: 0, duration: 0.8, ease: "power3.out" }, "-=0.6")
      .from(".scroll-down", { y: -20, opacity: 0, duration: 0.8 }, "-=0.4");

    // ★ 1. タイムラインの横スクロール化（操作感をダイレクトに）
    const timelineWrapper = document.getElementById("h-timeline-wrapper");
    const timelineContainer = document.getElementById("h-timeline-container");
    
    if (timelineWrapper && timelineContainer) {
        gsap.to(timelineContainer, {
            x: () => -(timelineContainer.scrollWidth - window.innerWidth),
            ease: "none",
            scrollTrigger: {
                trigger: timelineWrapper,
                start: "center center", 
                end: () => "+=" + (timelineContainer.scrollWidth - window.innerWidth),
                pin: true,
                // 数値を外し「true」にすることで遅延をなくし、イライラを解消
                scrub: true 
            }
        });
    }

    // ★ 2. 各要素の出現（スクラブをやめ、時間ベースの素早いアニメーションに変更）
    const revealElements = document.querySelectorAll(".section-title, .lead-text, .exp-card, .gallery-item, .blog-card");
    revealElements.forEach((elem) => {
        gsap.fromTo(elem, 
            { opacity: 0, y: 40 }, // 移動距離を50から40に減らして機敏に
            { 
                opacity: 1, 
                y: 0, 
                duration: 0.6, // ★アニメーション時間を短縮して「見逃し」を防ぐ
                ease: "power2.out",
                scrollTrigger: {
                    trigger: elem,
                    start: "top 95%", // ★画面に少しでも入ったら即座に発動させる
                    once: true // 一度出たらそのまま
                }
            }
        );
    });
}

// === 4. HUD Simulator Logic ===
let lastScrollTop = 0;
let lastTimeForVel = performance.now();
let lastAltForVel = 25346;
let smoothedVerticalVelocity = 0;
let isReturningToTop = false; 
let hasBurstEventFired = false; 
let isTurbulenceActive = false; 
let hasTroposphereEventFired = false;

function updateHUD(scrollTop) {
    if (typeof scrollTop !== 'number' || isNaN(scrollTop)) {
        scrollTop = window.scrollY || 0;
    }

    const isEnglish = document.body.classList.contains('en');
    const docHeight = document.body.scrollHeight - window.innerHeight;
    const scrollPercent = (docHeight > 0) ? Math.max(0, Math.min(1, scrollTop / docHeight)) : 0;

    let currentAlt = 0, currentLat = 0, currentLon = 0;

    for (let i = 0; i < FLIGHT_DATA.length - 1; i++) {
        let p1 = FLIGHT_DATA[i]; 
        let p2 = FLIGHT_DATA[i + 1];
        if (scrollPercent >= p1.progress && scrollPercent <= p2.progress) {
            let localPercent = (scrollPercent - p1.progress) / (p2.progress - p1.progress);
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

    const altDisplay = document.getElementById('live-altitude');
    const altUnitDisplay = document.getElementById('hud-alt-unit');
    const latDisplay = document.getElementById('hud-lat');
    const lonDisplay = document.getElementById('hud-lon');
    
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
    
    // イベント: バルーンバースト
    if (currentAlt < 25300 && currentAlt > 24000 && !hasBurstEventFired && !isReturningToTop) {
        hasBurstEventFired = true;
        triggerBalloonBurst();
    }
    if (currentAlt >= 25340) {
        hasBurstEventFired = false;
    }
    
    // イベント: 対流圏界面突破
    if (currentAlt < 11000 && currentAlt > 10000 && !hasTroposphereEventFired && !isReturningToTop) {
        hasTroposphereEventFired = true;
        triggerTroposphereEntry();
    }
    if (currentAlt >= 11500) {
        hasTroposphereEventFired = false;
    }
    
    const tempDisplay = document.getElementById('hud-temp-val');
    const tempUnitDisplay = document.getElementById('hud-temp-unit');
    if (tempDisplay) {
        let tempC = 15;
        if (currentAlt <= 11000) {
            tempC = 15 - (currentAlt / 1000) * 6.5; 
        } else {
            tempC = -56.5 + ((currentAlt - 11000) / (25346 - 11000)) * (-38.8 - (-56.5)); 
        }
        
        if (isEnglish) { 
            tempDisplay.textContent = (tempC * 9/5 + 32).toFixed(1); 
            if (tempUnitDisplay) tempUnitDisplay.textContent = '°F'; 
        } else { 
            tempDisplay.textContent = tempC.toFixed(1); 
            if (tempUnitDisplay) tempUnitDisplay.textContent = '°C'; 
        }
    }

    const presDisplay = document.getElementById('hud-pres-val');
    if (presDisplay) {
        let pressure = 1013.25;
        if (currentAlt <= 11000) {
            pressure = 1013.25 * Math.pow(1 - 0.0065 * currentAlt / 288.15, 5.25588);
        } else {
            pressure = 226.32 * Math.exp(-0.000157688 * (currentAlt - 11000));
        }
        presDisplay.textContent = Math.round(pressure);
    }

    const now = performance.now();
    const dt = (now - lastTimeForVel) / 1000; 
    if (dt > 0.01) {
        if (scrollTop !== lastScrollTop) {
            let rawVerticalVel = (currentAlt - lastAltForVel) / dt; 
            smoothedVerticalVelocity = smoothedVerticalVelocity * 0.9 + rawVerticalVel * 0.1;
        } else {
            smoothedVerticalVelocity *= 0.5; 
            if (Math.abs(smoothedVerticalVelocity) < 0.1) smoothedVerticalVelocity = 0;
        }
        lastTimeForVel = now; 
        lastAltForVel = currentAlt;
    }

    const velDisplay = document.getElementById('hud-vel');
    const velLabel = document.getElementById('hud-vel-label');
    if (velDisplay && velLabel) {
        if (isReturningToTop) {
            velLabel.textContent = "▲ ASCENT RATE"; 
            velLabel.style.color = "#33ccff"; 
            let simSpeed = 5.57 + (Math.random() * 0.06 - 0.03);
            velDisplay.textContent = simSpeed.toFixed(2);
        } else {
            let speedMS = Math.abs(smoothedVerticalVelocity); 
            if (speedMS < 0.1) { speedMS = 0; smoothedVerticalVelocity = 0; }
            
            if (speedMS === 0) { 
                velLabel.textContent = "■ HOVERING"; 
                velLabel.style.color = "var(--hud-color)"; 
            } else if (smoothedVerticalVelocity < 0) { 
                velLabel.textContent = "▼ DESCENT RATE"; 
                velLabel.style.color = "#ff3333"; 
            } else { 
                velLabel.textContent = "▲ ASCENT RATE"; 
                velLabel.style.color = "#33ccff"; 
            }
            velDisplay.textContent = speedMS.toFixed(2);
        }
    }

    const indicator = document.getElementById('scroll-indicator');
    const progressBar = document.getElementById('scroll-progress');
    const hudLayer = document.getElementById('hud-layer');
    const header = document.getElementById('header');
    const hero = document.getElementById('hero');
    const telemetry = document.querySelector('.bg-telemetry');
    const waveform = document.querySelector('.bg-waveform');

    if(indicator) indicator.style.top = `${scrollPercent * 100}%`;
    if(progressBar) progressBar.style.width = `${scrollPercent * 100}%`;
    
    if (hero) {
        if (scrollTop > hero.offsetHeight * 0.5) {
            if (hudLayer) hudLayer.classList.add('visible');
            if (telemetry) telemetry.style.opacity = '1';
            if (waveform) waveform.style.opacity = '1';
        } else {
            if (hudLayer) hudLayer.classList.remove('visible');
            if (telemetry) telemetry.style.opacity = '0';
            if (waveform) waveform.style.opacity = '0';
        }
    }

    if(header) {
        if(scrollTop > 50) header.classList.add('scrolled'); else header.classList.remove('scrolled');
        if (scrollTop > lastScrollTop && scrollTop > 100) header.classList.add('header-hidden'); else header.classList.remove('header-hidden');
        lastScrollTop = scrollTop;
    }
    
    const btt = document.getElementById('back-to-top');
    if(btt) {
        // トップページにいる時はロケットを非表示にする
        if (scrollTop > hero.offsetHeight * 0.5) {
            btt.classList.add('show');
        } else {
            btt.classList.remove('show');
        }
        
        const maxTop = Math.max(0, window.innerHeight - 150); 
        const currentTop = 30 + scrollPercent * maxTop;
        btt.style.top = `${currentTop}px`;
    }

    if (scrollPercent > 0.8) document.documentElement.style.setProperty('--hud-color', '#fff'); 
    else document.documentElement.style.setProperty('--hud-color', 'rgba(212, 175, 55, 0.8)');
}

// === 5. Utility Functions ===
function initLanguageSettings() {
    const savedLang = localStorage.getItem('lang') || 'ja';
    if (savedLang === 'en') document.body.classList.add('en');
    const langBtn = document.getElementById('langBtn');
    if (langBtn) { 
        langBtn.textContent = document.body.classList.contains('en') ? 'JP' : 'EN';
        langBtn.addEventListener('click', () => {
            const isEn = document.body.classList.toggle('en');
            localStorage.setItem('lang', isEn ? 'en' : 'ja');
            location.reload();
        });
    }
}

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
        this.queue =[];
        for (let i = 0; i < length; i++) {
            const from = oldText[i] || ''; const to = newText[i] || '';
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
        const phrases =[
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
    const statusDisplay = document.getElementById('hud-status');
    const starfieldCanvas = document.getElementById('starfield');

    if(btt) btt.addEventListener('click', (e) => {
        e.preventDefault(); 
        if (window.scrollY === 0) return; 

        isReturningToTop = true; 
        
        if (statusDisplay) {
            statusDisplay.textContent = "HIGH LOAD";
            statusDisplay.classList.remove("ok");
            statusDisplay.classList.add("high-load");
        }
        if (starfieldCanvas) starfieldCanvas.classList.add("warp-speed");

        if(typeof window.lenis !== 'undefined' && window.lenis) {
            window.lenis.scrollTo(0, { duration: 5, easing: (t) => t }); 
        } else {
            window.scrollTo({top:0, behavior:'smooth'});
        }
        
        setTimeout(() => { 
            isReturningToTop = false; 
            
            if (statusDisplay) {
                statusDisplay.textContent = "NORMAL";
                statusDisplay.classList.remove("high-load");
                statusDisplay.classList.add("ok");
            }
            if (starfieldCanvas) starfieldCanvas.classList.remove("warp-speed");

            document.body.classList.add("arrival-shake-active");
            setTimeout(() => {
                document.body.classList.remove("arrival-shake-active");
            }, 500);

            btt.classList.remove('launch', 'show'); 
        }, 5000);
    });

    const modal = document.getElementById('gallery-modal');
    if (modal) {
        document.querySelectorAll('.gallery-item').forEach(item => {
            item.addEventListener('click', () => {
                const isEn = document.body.classList.contains('en');
                document.getElementById('modal-img').src = item.dataset.img;
                document.getElementById('modal-title').textContent = isEn ? item.dataset.titleEn : item.dataset.titleJa;
                document.getElementById('modal-desc').textContent = isEn ? item.dataset.descEn : item.dataset.descJa;
                modal.classList.add('show');
            });
        });
        document.querySelector('.close-modal').addEventListener('click', () => modal.classList.remove('show'));
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

function initHUDInteractions() {
    const cursor = document.getElementById('hud-cursor');
    if (!cursor) return;

    document.addEventListener('mousemove', (e) => {
        if (window.matchMedia("(min-width: 1025px)").matches) {
            cursor.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;
            createStardust(e.clientX, e.clientY);
        }
    });

    document.querySelectorAll('a, button, .gallery-item, .map-overlay-btn, .slider-button').forEach(el => {
        el.addEventListener('mouseenter', () => cursor.classList.add('locked'));
        el.addEventListener('mouseleave', () => cursor.classList.remove('locked'));
    });

    document.querySelectorAll('.email-link, .btn-insta, .map-overlay-btn, .scroll-down').forEach((magnet) => {
        magnet.classList.add('magnet-btn');
        const isCentered = magnet.classList.contains('map-overlay-btn') || magnet.classList.contains('scroll-down');

        magnet.addEventListener('mousemove', (e) => {
            if (!window.matchMedia("(min-width: 1025px)").matches) return;
            const rect = magnet.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            gsap.to(magnet, { 
                x: (e.clientX - centerX) / 5, 
                y: (e.clientY - centerY) / 5, 
                xPercent: isCentered ? -50 : 0, 
                yPercent: isCentered ? -50 : 0, 
                scale: 1.1, duration: 0.3, ease: "power2.out", overwrite: "auto" 
            });
        });

        magnet.addEventListener('mouseleave', () => {
            gsap.to(magnet, { 
                x: 0, y: 0, 
                xPercent: isCentered ? -50 : 0, 
                yPercent: isCentered ? -50 : 0, 
                scale: 1, duration: 0.5, ease: "elastic.out(1, 0.5)", overwrite: "auto" 
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
    
    gsap.to(particle, {
        x: (Math.random() - 0.5) * 60, y: (Math.random() - 0.5) * 60,
        scale: 0, opacity: 0, duration: 1 + Math.random(), ease: "power2.out",
        onComplete: () => particle.remove()
    });
}

// === 6. Background Effects & Events ===
function initStarfield() {
    const canvas = document.getElementById('starfield');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let width, height, stars =[];
    
    function resize() {
        width = window.innerWidth; height = window.innerHeight;
        canvas.width = width; canvas.height = height; 
        stars =[];
        for (let i = 0; i < 400; i++) {
            stars.push({ x: Math.random() * width, y: Math.random() * height, z: Math.random() * 2 + 0.5, alpha: Math.random() * 0.8 + 0.2 });
        }
    }
    window.addEventListener('resize', resize); 
    resize();

    function animate() {
        ctx.clearRect(0, 0, width, height);
        const isWarping = canvas.classList.contains('warp-speed');
        const scrollVel = window.lenis ? window.lenis.velocity : 0;
        ctx.fillStyle = '#fff';
        
        stars.forEach(star => {
            let speed = isWarping ? 30 : (0.2 + scrollVel * 0.05);
            star.y -= speed * star.z;
            
            if (star.y < 0) { star.y = height; star.x = Math.random() * width; }
            if (star.y > height) { star.y = 0; star.x = Math.random() * width; }
            
            ctx.globalAlpha = star.alpha; 
            ctx.beginPath(); 
            if (isWarping) { 
                ctx.ellipse(star.x, star.y, star.z * 0.8, star.z * 15, 0, 0, Math.PI * 2); 
            } else { 
                ctx.arc(star.x, star.y, star.z * 0.8, 0, Math.PI * 2); 
            }
            ctx.fill();
        });
        requestAnimationFrame(animate);
    }
    // ここでループ関数を呼び出してアニメーションをスタートさせる（重要！）
    animate();
}

function initTelemetryStream() {
    const stream = document.getElementById('telemetry-stream');
    if (!stream) return;
    const msgs =["SYS_CHK", "DAT_RCV", "SYNC_OK", "UV_SENS", "PRS_NRM", "TMP_STB", "ALT_UPD", "GPS_LCK"];
    
    setInterval(() => {
        if (Math.random() > 0.85) return;
        const line = document.createElement('div');
        line.className = 'telemetry-line';
        if (Math.random() > 0.9) line.classList.add('highlight');
        line.textContent = `0x${Math.floor(Math.random()*65535).toString(16).padStart(4, '0').toUpperCase()} :: ${msgs[Math.floor(Math.random()*msgs.length)]} :: OK`;
        stream.appendChild(line);
        if (stream.children.length > 7) stream.removeChild(stream.firstChild);
    }, 100); 
}

function initWaveformGraph() {
    const canvas = document.getElementById('waveform-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width; 
    const height = canvas.height; 
    const centerY = height / 2;
    const points = new Array(width).fill(centerY);
    let time = 0;
    
    function draw() {
        ctx.clearRect(0, 0, width, height);
        time += 0.05;
        
        let baseWave = Math.sin(time) * 8;
        let noise = (Math.random() - 0.5) * 4;
        
        let spikeChance = isTurbulenceActive ? 0.3 : 0.96; 
        let spikeMult = isTurbulenceActive ? 80 : 40;      
        
        if (Math.random() > spikeChance) {
            noise += (Math.random() - 0.5) * spikeMult;
        }
        
        let newY = centerY + baseWave + noise;
        points.shift(); 
        points.push(Math.max(5, Math.min(height - 5, newY)));
        
        ctx.beginPath(); 
        ctx.moveTo(0, points[0]);
        for (let i = 1; i < width; i++) ctx.lineTo(i, points[i]);
        
        ctx.strokeStyle = isTurbulenceActive ? 'rgba(255, 51, 51, 0.9)' : 'rgba(212, 175, 55, 0.8)'; 
        ctx.lineWidth = 1.2; 
        ctx.shadowBlur = 4;
        ctx.shadowColor = isTurbulenceActive ? 'rgba(255, 51, 51, 0.8)' : 'rgba(212, 175, 55, 0.5)';
        ctx.stroke();
        
        requestAnimationFrame(draw);
    }
    draw();
}

function triggerBalloonBurst() {
    const alertBox = document.getElementById('hud-alert-burst');
    if(alertBox) alertBox.classList.remove('hidden');
    
    document.body.classList.add('shake-active');
    isTurbulenceActive = true;

    setTimeout(() => {
        if(alertBox) alertBox.classList.add('hidden');
        document.body.classList.remove('shake-active');
        isTurbulenceActive = false;
    }, 2000); 
}

function triggerTroposphereEntry() {
    const frost = document.getElementById('frost-overlay');
    const altDisplay = document.getElementById('live-altitude');
    const tempDisplay = document.getElementById('hud-temp-val');

    if (frost) frost.classList.add('active');
    document.body.classList.add('sys-glitch');

    let glitchInterval = setInterval(() => {
        if(altDisplay) altDisplay.innerText = Math.random().toString(36).substring(2, 7).toUpperCase();
        if(tempDisplay) tempDisplay.innerText = "!#*@?";
    }, 50);

    setTimeout(() => {
        clearInterval(glitchInterval);
        document.body.classList.remove('sys-glitch');
    }, 500);

    setTimeout(() => {
        if (frost) frost.classList.remove('active');
    }, 1500);
}
