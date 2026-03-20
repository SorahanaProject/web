// --- START OF FILE script.js ---

/**
 * 実際のフライトログ（KML）から抽出したデータポイント
 * progress: 0.0 〜 1.0 (フェーズ内の進行度)
 */
const ASCENT_DATA = [
    { progress: 0.000, alt: 86,    lat: 33.2870, lon: 134.1579 }, 
    { progress: 0.028, alt: 88,    lat: 33.2870, lon: 134.1579 }, 
    { progress: 0.585, alt: 305,   lat: 33.2868, lon: 134.1557 }, 
    { progress: 0.612, alt: 1756,  lat: 33.2951, lon: 134.1596 }, 
    { progress: 0.640, alt: 3230,  lat: 33.2900, lon: 134.1708 }, 
    { progress: 0.668, alt: 4573,  lat: 33.2704, lon: 134.1832 }, 
    { progress: 0.695, alt: 5892,  lat: 33.2668, lon: 134.2450 }, 
    { progress: 0.723, alt: 7364,  lat: 33.3069, lon: 134.3705 }, 
    { progress: 0.750, alt: 8755,  lat: 33.3532, lon: 134.5146 }, 
    { progress: 0.778, alt: 10135, lat: 33.3821, lon: 134.6656 }, 
    { progress: 0.806, alt: 11551, lat: 33.4052, lon: 134.8371 }, 
    { progress: 0.833, alt: 13058, lat: 33.4331, lon: 135.0205 }, 
    { progress: 0.861, alt: 14653, lat: 33.4321, lon: 135.1968 }, 
    { progress: 0.888, alt: 16437, lat: 33.4251, lon: 135.3622 }, 
    { progress: 0.916, alt: 18492, lat: 33.4202, lon: 135.4623 }, 
    { progress: 0.943, alt: 20749, lat: 33.4246, lon: 135.4868 }, 
    { progress: 0.971, alt: 23084, lat: 33.4123, lon: 135.5055 }, 
    { progress: 1.000, alt: 25346, lat: 33.3996, lon: 135.4899 } 
];

const DESCENT_DATA = [
    { progress: 0.000, alt: 25346, lat: 33.3996, lon: 135.4899 }, 
    { progress: 0.130, alt: 23187, lat: 33.4022, lon: 135.4885 }, 
    { progress: 0.351, alt: 12937, lat: 33.3945, lon: 135.6633 }, 
    { progress: 0.481, alt: 9237,  lat: 33.4202, lon: 135.8357 }, 
    { progress: 0.610, alt: 6348,  lat: 33.4610, lon: 135.9726 }, 
    { progress: 0.740, alt: 3900,  lat: 33.4547, lon: 136.0344 }, 
    { progress: 0.870, alt: 1606,  lat: 33.4534, lon: 136.0494 }, 
    { progress: 1.000, alt: 0,     lat: 33.4498, lon: 136.0549 }  
];

// 数値補間関数
function lerp(start, end, amt) {
    return (1 - amt) * start + amt * end;
}

gsap.registerPlugin(ScrollTrigger);

// --- Class: TextScramble (テキスト演出) ---
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
                output += `<span class="dud" style="color:#555">${char}</span>`;
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

// --- Main Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    initLanguageSettings();
    initSmoothScroll();
    initBootSequence();
    initHUDInteractions();
    initUI();
    initFAQ();
    initStarfield();
    initTelemetryStream();
    initWaveformGraph();
    initTimelineDrag(); 
    init3DFlightMap();
});

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
}

function initBootSequence() {
    const screen = document.getElementById('boot-screen');
    const log = document.getElementById('boot-log');
    const fill = document.querySelector('.boot-progress-fill');
    const percent = document.querySelector('.boot-percent');
    if (!screen) return;

    const logs = ["SYSTEM_CHECK_INIT...", "LOADING_KERNEL_MODULES...", "CONNECTING_TO_SATELLITE...", "ESTABLISHING_SECURE_LINK...", "CALIBRATING_SENSORS...", "ATMOSPHERIC_PRESSURE: NORMAL", "TARGET_COORDINATES: LOCKED", "SYSTEM_READY."];
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
            log.prepend(p); 
            logIndex++;
        }

        if (progress >= 100) {
            clearInterval(interval);
            setTimeout(() => {
                gsap.to(screen, { opacity: 0, duration: 0.8, onComplete: () => {
                    screen.style.display = 'none'; 
                    initSiteAnimations();
                }});
            }, 500);
        }
    }, 50);
}

function initSiteAnimations() {
    initTextScramble();
    const tl = gsap.timeline();
    tl.from(".hero-content .data-tag", { y: 20, opacity: 0, duration: 0.8, ease: "power3.out" })
      .from(".hero-content h1 span", { y: 100, opacity: 0, duration: 1, stagger: 0.1, ease: "power4.out" }, "-=0.6")
      .from(".hero-content .hero-desc", { y: 20, opacity: 0, duration: 0.8, ease: "power3.out" }, "-=0.6")
      .from(".scroll-down", { y: -20, opacity: 0, duration: 0.8 }, "-=0.4");

    document.querySelectorAll(".section-title, .lead-text, .exp-card, .gallery-item, .blog-card").forEach((elem) => {
        gsap.fromTo(elem, { opacity: 0, y: 40 }, { 
            opacity: 1, y: 0, duration: 0.6, ease: "power2.out",
            scrollTrigger: { trigger: elem, start: "top 95%", once: true } 
        });
    });
}

// --- HUD & Flight Simulation Logic ---
let lastScrollTop = 0;
let lastTimeForVel = performance.now();
let lastAltForVel = 25346;
let smoothedVerticalVelocity = 0;
let isReturningToTop = false; 
let hasBurstEventFired = false;
let isTurbulenceActive = false;
let hasTroposphereEventFired = false;

function updateHUD(scrollTop) {
    if (typeof scrollTop !== 'number' || isNaN(scrollTop)) scrollTop = window.scrollY || 0;
    const isEnglish = document.body.classList.contains('en');
    const docHeight = document.body.scrollHeight - window.innerHeight;
    const scrollPercent = (docHeight > 0) ? Math.max(0, Math.min(1, scrollTop / docHeight)) : 0;
    
    let dataArray = isReturningToTop ? ASCENT_DATA : DESCENT_DATA;
    let simPercent = isReturningToTop ? (1.0 - scrollPercent) : scrollPercent;
    let currentAlt = 0, currentLat = 0, currentLon = 0;

    for (let i = 0; i < dataArray.length - 1; i++) {
        let p1 = dataArray[i]; 
        let p2 = dataArray[i+1];
        if (simPercent >= p1.progress && simPercent <= p2.progress) {
            let localPct = (simPercent - p1.progress) / (p2.progress - p1.progress);
            currentAlt = lerp(p1.alt, p2.alt, localPct); 
            currentLat = lerp(p1.lat, p2.lat, localPct); 
            currentLon = lerp(p1.lon, p2.lon, localPct);
            break;
        }
    }

    // 数値の表示更新
    const altDisplay = document.getElementById('live-altitude');
    if(altDisplay) altDisplay.textContent = Math.floor(isEnglish ? currentAlt * 3.28084 : currentAlt).toString().padStart(5, '0');
    if(document.getElementById('hud-alt-unit')) document.getElementById('hud-alt-unit').textContent = isEnglish ? 'ft' : 'm';
    if(document.getElementById('hud-lat')) document.getElementById('hud-lat').textContent = currentLat.toFixed(4);
    if(document.getElementById('hud-lon')) document.getElementById('hud-lon').textContent = currentLon.toFixed(4);

    // 気温・気圧の物理計算
    if (document.getElementById('hud-temp-val')) {
        let tempC = (currentAlt <= 11000) ? 15 - (currentAlt/1000)*6.5 : -56.5 + ((currentAlt-11000)/(25346-11000))*17.7;
        document.getElementById('hud-temp-val').textContent = isEnglish ? (tempC * 9/5 + 32).toFixed(1) : tempC.toFixed(1);
        if(document.getElementById('hud-temp-unit')) document.getElementById('hud-temp-unit').textContent = isEnglish ? '°F' : '°C';
    }
    if(document.getElementById('hud-pres-val')) {
        let pressure = (currentAlt <= 11000) ? 1013.25 * Math.pow(1-0.0065*currentAlt/288.15, 5.25588) : 226.32 * Math.exp(-0.000157688*(currentAlt-11000));
        document.getElementById('hud-pres-val').textContent = Math.round(pressure);
    }

    // イベントトリガー
    if (currentAlt < 25300 && currentAlt > 24000 && !hasBurstEventFired && !isReturningToTop) { hasBurstEventFired = true; triggerBalloonBurst(); }
    if (currentAlt >= 25340) hasBurstEventFired = false;
    if (currentAlt < 11000 && currentAlt > 10000 && !hasTroposphereEventFired && !isReturningToTop) { hasTroposphereEventFired = true; triggerTroposphereEntry(); }
    if (currentAlt >= 11500) hasTroposphereEventFired = false;

    // 速度計算
    const now = performance.now(); const dt = (now - lastTimeForVel) / 1000;
    if (dt > 0.01) {
        if (scrollTop !== lastScrollTop) smoothedVerticalVelocity = smoothedVerticalVelocity * 0.9 + ((currentAlt - lastAltForVel) / dt) * 0.1;
        else smoothedVerticalVelocity *= 0.2;
        if (Math.abs(smoothedVerticalVelocity) < 0.05) smoothedVerticalVelocity = 0;
        lastTimeForVel = now; lastAltForVel = currentAlt;
    }

    const velDisplay = document.getElementById('hud-vel'); 
    const velLabel = document.getElementById('hud-vel-label');
    if (velDisplay && velLabel) {
        if (isReturningToTop) {
            velLabel.textContent = "▲ ASCENT RATE"; velLabel.style.color = "#33ccff"; 
            velDisplay.textContent = (5.57 + Math.random()*0.05).toFixed(2);
        } else {
            let speedMS = Math.abs(smoothedVerticalVelocity);
            velLabel.textContent = speedMS < 0.1 ? "■ HOVERING" : (smoothedVerticalVelocity < 0 ? "▼ DESCENT RATE" : "▲ ASCENT RATE");
            velLabel.style.color = speedMS < 0.1 ? "var(--hud-color)" : (smoothedVerticalVelocity < 0 ? "#ff3333" : "#33ccff");
            velDisplay.textContent = speedMS.toFixed(2);
        }
    }

    // 表示制御（トップ10%では非表示）
    const hudLayer = document.getElementById('hud-layer');
    const telemetry = document.querySelector('.bg-telemetry');
    const waveform = document.querySelector('.bg-waveform');
    const isVisible = scrollTop > window.innerHeight * 0.1;
    if(hudLayer) hudLayer.classList.toggle('visible', isVisible);
    if(telemetry) telemetry.classList.toggle('visible', isVisible);
    if(waveform) waveform.classList.toggle('visible', isVisible);

    // 各種バーの更新
    const indicator = document.getElementById('scroll-indicator');
    const progressBar = document.getElementById('scroll-progress');
    if(indicator) indicator.style.top = `${scrollPercent * 100}%`;
    if(progressBar) progressBar.style.width = `${scrollPercent * 100}%`;
    
    if(document.getElementById('header')) {
        const header = document.getElementById('header');
        header.classList.toggle('scrolled', scrollTop > 50);
        header.classList.toggle('header-hidden', scrollTop > lastScrollTop && scrollTop > 100);
    }
    
    const btt = document.getElementById('back-to-top');
    if(btt) {
        btt.classList.toggle('show', isVisible);
        btt.style.top = `${30 + scrollPercent * Math.max(0, window.innerHeight - 150)}px`;
    }
    lastScrollTop = scrollTop;
}

// --- Functions: Events & Utilities ---
function initLanguageSettings() {
    let savedLang = localStorage.getItem('lang') || 'ja';
    document.body.classList.toggle('en', savedLang === 'en');
    const lb = document.getElementById('langBtn');
    if(lb) {
        lb.textContent = savedLang === 'en' ? 'JP' : 'EN';
        lb.onclick = () => {
            const isEn = document.body.classList.toggle('en');
            localStorage.setItem('lang', isEn ? 'en' : 'ja');
            location.reload();
        };
    }
}

function initTextScramble() {
    const isEn = document.body.classList.contains('en');
    const target = document.querySelector(isEn ? '.data-tag span[lang="en"]' : '.data-tag span[lang="ja"]');
    if(target) {
        const fx = new TextScramble(target);
        const phrases = isEn ? ['ALT: 83,156ft / TEMP: -37.8℉', 'SYSTEM: NORMAL', 'STATUS: LAUNCHED'] : ['ALT: 25,346m / TEMP: -38.8℃', 'SYSTEM: NORMAL', 'STATUS: LAUNCHED'];
        let c = 0; const next = () => { fx.setText(phrases[c]).then(() => setTimeout(next, 3000)); c = (c + 1) % phrases.length; };
        next();
    }
}

function initUI() {
    const ham = document.getElementById('hamburger'); const nv = document.getElementById('nav-menu');
    if(ham && nv) ham.onclick = () => { ham.classList.toggle('active'); nv.classList.toggle('active'); };
    
    const btt = document.getElementById('back-to-top');
    if(btt) btt.onclick = (e) => {
        e.preventDefault(); if (window.scrollY === 0) return; isReturningToTop = true;
        const sd = document.getElementById('hud-status'); if(sd) { sd.textContent = "HIGH LOAD"; sd.classList.add("high-load"); }
        if(window.lenis) window.lenis.scrollTo(0, { duration: 5, easing: (t) => t });
        setTimeout(() => { 
            isReturningToTop = false; if(sd) { sd.textContent = "NORMAL"; sd.classList.remove("high-load"); } 
            document.body.classList.add("arrival-shake-active"); setTimeout(() => document.body.classList.remove("arrival-shake-active"), 500);
            btt.classList.remove('show'); 
        }, 5000);
    };

    document.querySelectorAll('.gallery-item').forEach(item => {
        item.onclick = () => {
            const isEn = document.body.classList.contains('en');
            document.getElementById('modal-img').src = item.dataset.img;
            document.getElementById('modal-title').textContent = isEn ? item.dataset.titleEn : item.dataset.titleJa;
            document.getElementById('modal-desc').textContent = isEn ? item.dataset.descEn : item.dataset.descJa;
            document.getElementById('gallery-modal').classList.add('show');
        };
    });
    document.querySelector('.close-modal').onclick = () => document.getElementById('gallery-modal').classList.remove('show');
}

function initFAQ() {
    document.querySelectorAll('.faq-question').forEach(q => {
        q.onclick = () => {
            const item = q.parentElement; const answer = item.querySelector('.faq-answer');
            item.classList.toggle('active'); answer.style.maxHeight = item.classList.contains('active') ? answer.scrollHeight + 'px' : null;
        };
    });
}

function initHUDInteractions() {
    const cursor = document.getElementById('hud-cursor'); if (!cursor) return;
    document.onmousemove = (e) => {
        if (window.matchMedia("(min-width: 1025px)").matches) cursor.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;
    };
}

function initStarfield() {
    const canvas = document.getElementById('starfield'); if (!canvas) return; const ctx = canvas.getContext('2d'); let w, h, stars = [];
    function res() { w = window.innerWidth; h = window.innerHeight; canvas.width = w; canvas.height = h; stars = []; for (let i = 0; i < 400; i++) stars.push({ x: Math.random()*w, y: Math.random()*h, z: Math.random()*2+0.5, a: Math.random()*0.8+0.2 }); }
    window.onresize = res; res();
    function anim() { ctx.clearRect(0,0,w,h); const v = window.lenis ? window.lenis.velocity : 0; stars.forEach(s => { s.y -= (0.2 + v*0.05)*s.z; if(s.y<0) s.y=h; if(s.y>h) s.y=0; ctx.globalAlpha=s.a; ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(s.x, s.y, s.z*0.8, 0, Math.PI * 2); ctx.fill(); }); requestAnimationFrame(anim); }
    anim();
}

function initTelemetryStream() {
    const s = document.getElementById('telemetry-stream'); if(!s) return;
    const ms = ["SYS_CHK", "DAT_RCV", "SYNC_OK", "UV_SENS", "PRS_NRM", "TMP_STB", "ALT_UPD", "GPS_LCK"];
    setInterval(() => { if(Math.random()>0.8) { const l = document.createElement('div'); l.className='telemetry-line'; l.textContent=`0x${Math.floor(Math.random()*65535).toString(16).toUpperCase()} :: ${ms[Math.floor(Math.random()*ms.length)]} :: OK`; s.appendChild(l); if(s.children.length>7) s.removeChild(s.firstChild); } }, 200);
}

function initWaveformGraph() {
    const c = document.getElementById('waveform-canvas'); if(!c) return; const ctx = c.getContext('2d'); const pts = new Array(200).fill(30); let t=0;
    function dr() { ctx.clearRect(0,0,200,60); t+=0.1; let n = (Math.random()-0.5)*(isTurbulenceActive?80:4); pts.shift(); pts.push(30+Math.sin(t)*10+n); ctx.beginPath(); ctx.moveTo(0,pts[0]); for(let i=1;i<200;i++) ctx.lineTo(i,pts[i]); ctx.strokeStyle=isTurbulenceActive?'#f33':'#d4af37'; ctx.lineWidth=1.2; ctx.stroke(); requestAnimationFrame(dr); }
    dr();
}

function triggerBalloonBurst() { const a = document.getElementById('hud-alert-burst'); if(a) a.classList.remove('hidden'); document.body.classList.add('shake-active'); isTurbulenceActive = true; setTimeout(() => { if(a) a.classList.add('hidden'); document.body.classList.remove('shake-active'); isTurbulenceActive = false; }, 2000); }
function triggerTroposphereEntry() { const f = document.getElementById('frost-overlay'); if (f) f.classList.add('active'); document.body.classList.add('sys-glitch'); setTimeout(() => { document.body.classList.remove('sys-glitch'); if (f) f.classList.remove('active'); }, 1500); }
function initTimelineDrag() { const s = document.getElementById('h-timeline-wrapper'); if (!s || window.innerWidth <= 768) return; let isD = false, sx, sl; s.onmousedown = (e) => { isD=true; sx=e.pageX-s.offsetLeft; sl=s.scrollLeft; s.style.cursor='grabbing'; }; s.onmouseleave = () => { isD=false; s.style.cursor='grab'; }; s.onmouseup = () => { isD=false; s.style.cursor='grab'; }; s.onmousemove = (e) => { if(!isD) return; e.preventDefault(); s.scrollLeft = sl - (e.pageX-s.offsetLeft-sx)*2; }; }

function init3DFlightMap() {
    const c = document.getElementById('flight-3d-map'); if(!c) return;
    const path = [[134.157893,33.287018,85.69],[134.157915,33.286996,87.73],[134.155705,33.286825,305.46],[134.159631,33.295065,1756.35],[134.170768,33.290033,3230.36],[134.183150,33.270356,4572.89],[134.244968,33.266795,5891.76],[134.370496,33.306920,7364.11],[134.514606,33.353151,8755.08],[134.665581,33.382055,10134.90],[134.837093,33.405196,11550.92],[135.020491,33.433081,13057.94],[135.196810,33.432083,14652.58],[135.362183,33.425141,16437.47],[135.462263,33.420216,18492.02],[135.486788,33.424595,20748.52],[135.505456,33.412331,23084.25],[135.489921,33.399596,25054.33],[135.488483,33.402246,23187.45],[135.663106,33.394521,12937.26],[135.835711,33.420206,9236.70],[135.972568,33.460986,6348.01],[136.034388,33.454710,3899.90],[136.049366,33.453411,1606.17],[136.054945,33.449765,0]];
    const vs = window.innerWidth<=768 ? {longitude:135.15,latitude:33.35,zoom:8.2,pitch:60,bearing:-20} : {longitude:135.10,latitude:33.20,zoom:8.2,pitch:70,bearing:-15};
    new deck.DeckGL({ container:c, mapStyle:'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json', initialViewState:vs, controller:true, layers:[ new deck.PathLayer({id:'p',data:[{path}],getPath:d=>d.path,getColor:[212,175,55,255],getWidth:4,getZ:d=>d[2]*2.5}), new deck.ColumnLayer({id:'c',data:[{p:[134.157893,33.287018],c:[255,255,255,150]},{p:[136.054945,33.449765],c:[255,51,51,150]}],getPosition:d=>d.p,getFillColor:d=>d.c,getElevation:1000,radius:1500,extruded:true}) ] });
}
