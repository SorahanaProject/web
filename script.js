// --- START OF FILE script.js ---

// === 1. 初期設定 & Lenis (慣性スクロール) ===

// 言語設定（初期ロード時）
const savedLang = localStorage.getItem('lang') || 'ja';
if (savedLang === 'en') {
    document.body.classList.add('en');
}

// 設定値
const isEnglish = document.body.classList.contains('en');
const TARGET_ALTITUDE = isEnglish ? 83156 : 25346;
const UNIT_TEXT = isEnglish ? 'ft' : 'm';

// Lenisの初期化
if (typeof Lenis !== 'undefined') {
    const lenis = new Lenis({
        duration: 1.2,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smooth: true,
        smoothTouch: false
    });
    window.lenis = lenis;

    // Lenisのスクロールループ
    function raf(time) {
        lenis.raf(time);
        requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    // Lenisのスクロールイベントにパララックスなどの連動処理を登録
    lenis.on('scroll', (e) => {
        updateHUD(e.scroll);      // HUD（高度計）の更新
        updateParallax(e.scroll); // パララックス効果
    });
} else {
    // Lenisがない場合のフォールバック（標準スクロール）
    window.addEventListener('scroll', () => {
        updateHUD(window.scrollY);
        updateParallax(window.scrollY);
    });
}


// === 2. メイン実行処理 (DOM読み込み完了後) ===

document.addEventListener('DOMContentLoaded', () => {
    // 言語切り替えボタン
    initLanguageSwitcher();
    
    // システム起動ローダー開始
    initBootSequence();

    // HUD（カーソル・計器）初期化
    initHUDInteractions();
    
    // 比較スライダー（Before/After）
    initCompareSlider();

    // その他のUI（ハンバーガーメニュー、Topへ戻るなど）
    initUI();
});


// === 3. システム起動ローダー (Boot Sequence) ===

function initBootSequence() {
    const screen = document.getElementById('boot-screen');
    const log = document.getElementById('boot-log');
    const fill = document.querySelector('.boot-progress-fill');
    const percent = document.querySelector('.boot-percent');
    
    // 画面要素がない場合は処理を中断（エラー防止）
    if (!screen) {
        initAfterLoad(); 
        return;
    }

    // 表示するログ（ハッカー風演出）
    const logs = [
        "SYSTEM_CHECK_INIT...",
        "LOADING_KERNEL_MODULES...",
        "MOUNTING_FILESYSTEM...",
        "CHECKING_MEMORY_INTEGRITY...",
        "CONNECTING_TO_SATELLITE...",
        "ESTABLISHING_SECURE_LINK...",
        "LOADING_ASSETS_TEXTURES...",
        "CALIBRATING_SENSORS...",
        "ATMOSPHERIC_PRESSURE: NORMAL",
        "OXYGEN_LEVELS: 100%",
        "TARGET_COORDINATES: LOCKED",
        "SYSTEM_READY."
    ];

    let progress = 0;
    let logIndex = 0;

    const interval = setInterval(() => {
        // 進捗をランダムに進める（不規則なロード感を演出）
        progress += Math.random() * 4; 
        if (progress > 100) progress = 100;

        // バーと数値を更新
        if(fill) fill.style.width = `${progress}%`;
        if(percent) percent.textContent = `${Math.floor(progress)}%`;

        // ログを追加（進捗に合わせて）
        if (progress > (logIndex * (100 / logs.length)) && logIndex < logs.length) {
            const p = document.createElement('div');
            p.className = 'boot-line';
            p.textContent = `> ${logs[logIndex]}`;
            // 最後の行だけ白くする
            if (logIndex === logs.length - 1) {
                p.style.color = '#fff';
                p.classList.add('blink');
            }
            if(log) log.prepend(p); // 新しいログを上に追加
            logIndex++;
        }

        // 完了処理
        if (progress >= 100) {
            clearInterval(interval);
            setTimeout(() => {
                screen.classList.add('loaded'); // 画面フェードアウト
                initAfterLoad(); // ロード後の演出開始
            }, 600);
        }
    }, 60); // 更新頻度
}

// ロード完了後に開始するアニメーション群
function initAfterLoad() {
    initTextScramble();    // 文字化け演出
    initScrollAnimation(); // 要素のフェードイン
}


// === 4. HUD & インタラクション制御 ===

// スクロール連動：高度計更新
function updateHUD(scrollTop) {
    const altDisplay = document.getElementById('live-altitude');
    const indicator = document.getElementById('scroll-indicator');
    const header = document.getElementById('header');
    
    // ドキュメント全体の高さから現在の進行度(0.0〜1.0)を計算
    const docHeight = document.body.scrollHeight - window.innerHeight;
    const scrollPercent = Math.max(0, Math.min(1, scrollTop / docHeight)); // 0-1に制限

    // 現在の高度計算
    const currentAlt = Math.floor(scrollPercent * TARGET_ALTITUDE);
    
    // 5桁のゼロ埋め表示
    if(altDisplay) altDisplay.textContent = String(currentAlt).padStart(5, '0');

    // 右側のバーのインジケータ移動
    if(indicator) {
        indicator.style.top = `${scrollPercent * 100}%`;
    }

    // スクロールプログレスバー（上部）
    const progressBar = document.getElementById('scroll-progress');
    if(progressBar) progressBar.style.width = `${scrollPercent * 100}%`;

    // ヘッダーの背景色制御
    if(header) {
        if(scrollTop > 50) header.classList.add('scrolled');
        else header.classList.remove('scrolled');
    }

    // バック・トゥ・トップボタンの表示
    const btt = document.getElementById('back-to-top');
    if(btt) {
        if(scrollTop > 400) btt.classList.add('show');
        else btt.classList.remove('show');
    }

    // 遊び心：高度（スクロール量）に応じてHUDの色を変える
    // 例：成層圏（半分以上）に行くと警告色（白/赤）になるなど
    if (scrollPercent > 0.6) {
        document.documentElement.style.setProperty('--hud-color', '#fff'); 
    } else {
        document.documentElement.style.setProperty('--hud-color', 'rgba(212, 175, 55, 0.8)');
    }
}

// マウスカーソルとロックオン機能
function initHUDInteractions() {
    const cursor = document.getElementById('hud-cursor-target');
    
    // PC（幅1025px以上）のみ有効
    if (window.matchMedia("(min-width: 1025px)").matches && cursor) {
        
        // カーソル追従（少し遅延させて重みを出す）
        document.addEventListener('mousemove', (e) => {
            // HUDカーソル移動
            cursor.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
            
            // 遊び心：スターダスト（塵）を生成
            createStardust(e.clientX, e.clientY);
        });

        // ロックオン演出（リンクやボタンにホバー時）
        const targets = document.querySelectorAll('a, button, .gallery-item, .map-overlay-btn');
        targets.forEach(el => {
            el.addEventListener('mouseenter', () => {
                cursor.classList.add('locked');
            });
            el.addEventListener('mouseleave', () => {
                cursor.classList.remove('locked');
            });
        });
        
        // 磁石ボタン（ボタンがマウスに吸い付く）
        const magnets = document.querySelectorAll('.email-link, .btn-insta, .map-overlay-btn, .scroll-down');
        magnets.forEach((magnet) => {
            magnet.classList.add('magnet-btn');
            magnet.addEventListener('mousemove', (e) => {
                const rect = magnet.getBoundingClientRect();
                const x = (e.clientX - (rect.left + rect.width / 2)) / 5;
                const y = (e.clientY - (rect.top + rect.height / 2)) / 5;
                magnet.style.transform = `translate(${x}px, ${y}px) scale(1.1)`;
            });
            magnet.addEventListener('mouseleave', () => { 
                magnet.style.transform = 'translate(0, 0) scale(1)'; 
            });
        });
    }
}

// 遊び心：マウスストーカー（宇宙の塵）
let isThrottled = false;
function createStardust(x, y) {
    if (isThrottled) return; // 処理を間引く（負荷軽減）
    isThrottled = true;
    setTimeout(() => isThrottled = false, 50);

    const particle = document.createElement('div');
    particle.style.position = 'fixed';
    particle.style.left = x + 'px';
    particle.style.top = y + 'px';
    particle.style.width = Math.random() * 3 + 'px';
    particle.style.height = particle.style.width;
    particle.style.background = Math.random() > 0.8 ? '#D4AF37' : '#fff'; // たまに金色
    particle.style.borderRadius = '50%';
    particle.style.pointerEvents = 'none';
    particle.style.zIndex = '999999';
    particle.style.boxShadow = '0 0 6px rgba(255,255,255,0.8)';
    
    document.body.appendChild(particle);

    // 拡散アニメーション
    const destX = (Math.random() - 0.5) * 60;
    const destY = (Math.random() - 0.5) * 60;

    const animation = particle.animate([
        { transform: `translate(0, 0) scale(1)`, opacity: 0.8 },
        { transform: `translate(${destX}px, ${destY}px) scale(0)`, opacity: 0 }
    ], {
        duration: 1000 + Math.random() * 1000,
        easing: 'cubic-bezier(0, .9, .57, 1)'
    });

    animation.onfinish = () => particle.remove();
}


// === 5. ビジュアルエフェクト (パララックス & Text Scramble) ===

// パララックス（視差効果）
function updateParallax(scrollTop) {
    // ギャラリー画像などをスクロール速度に合わせてゆっくり動かす
    const parallaxImages = document.querySelectorAll('.gallery-item img, .timeline-img');
    
    parallaxImages.forEach((img) => {
        const speed = 0.08; // 移動係数
        const rect = img.parentElement.getBoundingClientRect();
        
        // 画面内にある時だけ計算
        if (rect.top < window.innerHeight && rect.bottom > 0) {
            // 親要素の中心からの距離に応じて動かす
            const offset = (window.innerHeight - rect.top) * speed;
            img.style.transform = `translateY(${offset}px) scale(1.1)`; // scaleは隙間防止
        }
    });
}

// テキストスクランブル演出 (Text Scramble)
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
    // 現在表示されている方を対象にする
    const target = (document.body.classList.contains('en')) ? elEn : el;

    if(target) {
        const fx = new TextScramble(target);
        // 表示するメッセージのリスト
        const phrases = [
            isEnglish ? 'ALT: 83,156ft / TEMP: -37.8℉' : 'ALT: 25,346m / TEMP: -38.8℃',
            'SYSTEM: NORMAL',
            'STATUS: LAUNCHED',
            'TRAJECTORY: STABLE'
        ];
        
        let counter = 0;
        const next = () => {
            fx.setText(phrases[counter]).then(() => { setTimeout(next, 3000); });
            counter = (counter + 1) % phrases.length;
        };
        next();
    }
}

// スクロール時のフェードイン (IntersectionObserver)
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


// === 6. UI & ユーティリティ ===

function initLanguageSwitcher() {
    const langBtn = document.getElementById('langBtn');
    if (langBtn) { 
        langBtn.textContent = document.body.classList.contains('en') ? 'JP' : 'EN';
        langBtn.addEventListener('click', () => {
            const isEn = document.body.classList.toggle('en');
            localStorage.setItem('lang', isEn ? 'en' : 'ja');
            langBtn.textContent = isEn ? 'JP' : 'EN';
            // ページリロードして反映（スクランブルテキスト等の再初期化のため）
            location.reload();
        });
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
    // ハンバーガーメニュー
    const ham = document.getElementById('hamburger'); 
    const nv = document.getElementById('nav-menu');
    if(ham && nv) {
        ham.addEventListener('click', () => { 
            ham.classList.toggle('active'); 
            nv.classList.toggle('active'); 
        });
        nv.querySelectorAll('a').forEach(l => l.addEventListener('click', () => { 
            ham.classList.remove('active'); 
            nv.classList.remove('active'); 
        }));
    }

    // バック・トゥ・トップ (ロケット発射)
    const btt = document.getElementById('back-to-top');
    if(btt) btt.addEventListener('click', (e) => {
        e.preventDefault(); 
        btt.classList.add('launch'); // ロケット発射アニメーション
        
        if(typeof window.lenis !== 'undefined' && window.lenis) {
            window.lenis.scrollTo(0, {duration: 3}); 
        } else {
            window.scrollTo({top:0, behavior:'smooth'});
        }
        
        // アニメーションが終わる頃にクラスを削除
        setTimeout(() => { btt.classList.remove('launch', 'show'); }, 3500);
    });

    // ギャラリーモーダル
    const modal = document.getElementById('gallery-modal');
    if (modal) {
        const modalImg = document.getElementById('modal-img');
        const modalTitle = document.getElementById('modal-title');
        const modalDesc = document.getElementById('modal-desc');
        const closeBtn = document.querySelector('.close-modal');

        document.querySelectorAll('.gallery-item').forEach(item => {
            item.addEventListener('click', () => {
                const isEn = document.body.classList.contains('en');
                const title = isEn ? item.dataset.titleEn : item.dataset.titleJa;
                const desc = isEn ? item.dataset.descEn : item.dataset.descJa;
                
                modalImg.src = item.dataset.img;
                modalTitle.textContent = title;
                modalDesc.textContent = desc;
                modal.classList.add('show');
            });
        });

        closeBtn.addEventListener('click', () => modal.classList.remove('show'));
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.classList.remove('show');
        });
    }
}
