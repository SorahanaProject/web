// 言語設定の初期化
const savedLang = localStorage.getItem('lang') || 'ja';
if (savedLang === 'en') {
    document.body.classList.add('en');
}

// 設定値
const isEnglish = document.body.classList.contains('en');
const TARGET_ALTITUDE = isEnglish ? 83156 : 25346;
const UNIT_TEXT = isEnglish ? 'ft' : 'm';

// 即時実行：訪問済みチェック（ローディング隠し）
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
    
    // 2回目以降 or 言語切替後のリロード時はローディングアニメーションを省略
    if (sessionStorage.getItem('visited')) {
        if(loader) loader.style.display = 'none';
        initScrollAnimation();
    } else {
        // 初回訪問時アニメーション
        const duration = 2800; // ミリ秒
        const startTime = performance.now();

        function updateCounter(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            // easeOutQuart
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
                setTimeout(() => {
                    if(loader) {
                        loader.style.opacity = '0';
                        loader.style.visibility = 'hidden';
                    }
                    initScrollAnimation();
                    sessionStorage.setItem('visited', 'true');
                }, 800);
            }
        }
        requestAnimationFrame(updateCounter);
    }
});

// Sparkle Effect (パフォーマンスのためにThrottle処理を追加)
let lastSparkleTime = 0;
document.addEventListener('mousemove', function(e) {
    const now = Date.now();
    if (now - lastSparkleTime > 50) { // 50msに1回制限
        createSparkle(e.clientX, e.clientY);
        lastSparkleTime = now;
    }
});

function createSparkle(x, y) {
    const sparkle = document.createElement('div');
    sparkle.classList.add('sparkle');
    
    // ランダム性を少し抑えて上品に
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
                observer.unobserve(entry.target); // 一度表示したら監視終了（負荷軽減）
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

    // プログレスバー
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

// Back to Top Rocket
const backToTop = document.getElementById('back-to-top');
if (backToTop) {
    backToTop.addEventListener('click', (e) => {
        e.preventDefault();
        backToTop.classList.add('launch');
        // Lenisがある場合はLenisでスクロール
        if(window.lenis) {
            window.lenis.scrollTo(0);
        } else {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
        
        setTimeout(() => {
            backToTop.classList.remove('launch');
            backToTop.classList.remove('show');
        }, 1000);
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

// Slider Logic (Touch Supported)
const slider = document.getElementById('compare-slider');
const overlay = document.getElementById('compare-overlay');
const sliderBtn = document.getElementById('slider-button');

function updateSlider(val) {
    if(overlay) overlay.style.width = val + "%";
    if(sliderBtn) sliderBtn.style.left = val + "%";
}

if (slider) {
    slider.addEventListener('input', function(e) {
        updateSlider(e.target.value);
    });
    // スマホのタッチ操作を改善
    slider.addEventListener('touchmove', function(e) {
        // e.preventDefault(); // 必要に応じてスクロールブロック
    }, { passive: true });
}

// Language Switch
const langBtn = document.getElementById('langBtn');
if(langBtn){
    langBtn.addEventListener('click', () => {
        const isCurrentlyEn = document.body.classList.contains('en');
        localStorage.setItem('lang', isCurrentlyEn ? 'ja' : 'en');
        // 言語切替時はローディング演出を見せたいので visited を削除
        sessionStorage.removeItem('visited');
        location.reload();
    });
}

// FAQ Accordion
document.querySelectorAll('.faq-question').forEach(button => {
    button.addEventListener('click', () => {
        const isOpen = button.classList.contains('active');
        
        // 他を閉じる
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
        
        // モーダル表示中はLenisのスクロールを停止
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
