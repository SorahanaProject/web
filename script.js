// 言語設定の初期化（localStorageから読み出し）
const savedLang = localStorage.getItem('lang') || 'ja';
if (savedLang === 'en') {
    document.body.classList.add('en');
}

// 設定値の決定（言語によって数値と単位を変える）
const isEnglish = document.body.classList.contains('en');
const TARGET_ALTITUDE = isEnglish ? 83156 : 25346; // ft : m
const UNIT_TEXT = isEnglish ? 'ft' : 'm';
const LOADING_TIME = 4000;

// 即時実行：訪問済みならローディング画面をCSSで隠す
(function(){
    const loader = document.getElementById('loader');
    // セッションストレージ(visited)があり、かつ言語切り替え直後でない場合は隠す
    if (sessionStorage.getItem('visited') && loader) {
        loader.classList.add('hidden');
    }
})();

window.addEventListener('load', () => {
    const loader = document.getElementById('loader');
    const container = document.getElementById('digit-container');
    const langBtn = document.getElementById('langBtn');

    // ボタンのテキスト初期化
    if (langBtn) {
        langBtn.textContent = isEnglish ? 'JP' : 'EN';
    }
    
    // 2回目以降の訪問ならローディングをスキップ
    if (sessionStorage.getItem('visited')) {
        if(loader) loader.style.display = 'none';
        initScrollAnimation();
    } else {
        // 初回訪問時: カウントアップ
        const duration = 2500;
        const startTime = performance.now();

        function updateCounter(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const ease = 1 - Math.pow(1 - progress, 4);
            const currentAlt = Math.floor(ease * TARGET_ALTITUDE);
            
            const displayAlt = (progress >= 1) ? TARGET_ALTITUDE : currentAlt;
            const altString = String(displayAlt).padStart(5, '0');
            
            let html = '';
            for (let char of altString) {
                html += `<div class="digit-box">${char}</div>`;
            }
            // 単位を表示（m または ft）
            html += `<div class="unit-box">${UNIT_TEXT}</div>`;
            
            if (container) container.innerHTML = html;

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
                }, 1000);
            }
        }
        requestAnimationFrame(updateCounter);
    }
});

// Sparkle (Mouse Effect)
document.addEventListener('mousemove', function(e) {
    for (let i = 0; i < 3; i++) {
        createSparkle(e.clientX, e.clientY);
    }
});

function createSparkle(x, y) {
    const sparkle = document.createElement('div');
    sparkle.classList.add('sparkle');
    const offsetX = (Math.random() - 0.5) * 20;
    const offsetY = (Math.random() - 0.5) * 20;
    sparkle.style.left = (x + offsetX) + 'px';
    sparkle.style.top = (y + offsetY) + 'px';
    const size = Math.random() * 5 + 3;
    sparkle.style.width = size + 'px';
    sparkle.style.height = size + 'px';
    
    document.body.appendChild(sparkle);
    setTimeout(() => { sparkle.remove(); }, 800);
}

// Scroll Animation
function initScrollAnimation() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) { entry.target.classList.add('is-visible'); }
        });
    }, { threshold: 0.1 });
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

    document.body.style.backgroundPositionY = -(scrollTop * 0.2) + 'px';

    const backToTop = document.getElementById('back-to-top');
    if (backToTop) {
        if (scrollTop > 300) { backToTop.classList.add('show'); } 
        else { backToTop.classList.remove('show'); }
    }
});

// Back to Top
const backToTop = document.getElementById('back-to-top');
if (backToTop) {
    backToTop.addEventListener('click', (e) => {
        e.preventDefault();
        backToTop.classList.add('launch');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        setTimeout(() => {
            backToTop.classList.remove('launch');
        }, 1000);
    });
}

// Mobile Menu
const hamburger = document.getElementById('hamburger');
const nav = document.getElementById('nav-menu');
if (hamburger) {
    hamburger.addEventListener('click', () => { hamburger.classList.toggle('active'); nav.classList.toggle('active'); });
    nav.querySelectorAll('a').forEach(link => { link.addEventListener('click', () => { hamburger.classList.remove('active'); nav.classList.remove('active'); }); });
}

// Video Error Fallback
const video = document.getElementById('hero-video');
const fallbackImg = document.querySelector('.hero-bg');
if (video) {
    video.addEventListener('error', function() {
        video.style.display = 'none';
        if(fallbackImg) fallbackImg.style.display = 'block';
    });
    video.addEventListener('loadeddata', function() {
        if(fallbackImg) fallbackImg.style.display = 'none';
    });
}

// Slider Logic
const slider = document.getElementById('compare-slider');
const overlay = document.getElementById('compare-overlay');
const sliderBtn = document.getElementById('slider-button');
if (slider && overlay && sliderBtn) {
    slider.addEventListener('input', function() {
        const val = slider.value;
        overlay.style.width = val + "%";
        sliderBtn.style.left = val + "%";
    });
}

// Language Switch (Reload Page Logic)
const langBtn = document.getElementById('langBtn');
if(langBtn){
    langBtn.addEventListener('click', () => {
        // 現在の言語状態を反転
        const isCurrentlyEn = document.body.classList.contains('en');
        
        if (isCurrentlyEn) {
            // 英語 -> 日本語へ
            localStorage.setItem('lang', 'ja');
        } else {
            // 日本語 -> 英語へ
            localStorage.setItem('lang', 'en');
        }

        // ローディングアニメーションをもう一度見せるために履歴を削除
        sessionStorage.removeItem('visited');

        // ページを再読み込み（これで新しい言語設定とカウンターが反映される）
        location.reload();
    });
}

// FAQ Accordion
document.querySelectorAll('.faq-question').forEach(button => {
    button.addEventListener('click', () => {
        button.classList.toggle('active');
        const answer = button.nextElementSibling;
        if (button.classList.contains('active')) {
            answer.style.maxHeight = answer.scrollHeight + "px";
        } else {
            answer.style.maxHeight = 0;
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
        const isEnglish = document.body.classList.contains('en');
        modalImg.src = imgSrc;
        modalTitle.textContent = isEnglish ? titleEn : titleJa;
        modalDesc.textContent = isEnglish ? descEn : descJa;
        modal.classList.add('show');
    });
});
if (closeModal) { closeModal.addEventListener('click', () => { modal.classList.remove('show'); }); }
window.addEventListener('click', (e) => { if (e.target === modal) { modal.classList.remove('show'); } });
