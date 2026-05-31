/* ═══════════════════════════════════════════════════════════
   QuizVault — Main Application Logic
   ═══════════════════════════════════════════════════════════ */

// ── State ─────────────────────────────────────────────────
let state = {
    materials: [],
    selectedMaterial: null,
    duration: 15, // minutes

    questions: [],
    currentIndex: 0,
    userAnswers: [],
    markedForReview: [],

    timer: null,
    timeLeft: 0,
    timeSpent: 0,
    isPaused: false,
};

// ── DOM References ────────────────────────────────────────
const $ = (id) => document.getElementById(id);

const dom = {
    // Screens
    landing: $('landing'),
    quizScreen: $('quizScreen'),
    reviewScreen: $('reviewScreen'),

    // Landing
    materialGrid: $('materialGrid'),
    durationOptions: $('durationOptions'),
    customDuration: $('customDuration'),
    startBtn: $('startBtn'),

    // Quiz
    navGrid: $('navGrid'),
    quizMaterialBadge: $('quizMaterialBadge'),
    currentQ: $('currentQ'),
    totalQ: $('totalQ'),
    timerDisplay: $('timerDisplay'),
    timerText: $('timerText'),
    pauseBtn: $('pauseBtn'),
    questionText: $('questionText'),
    optionsList: $('optionsList'),
    markReviewLabel: $('markReviewLabel'),
    markReview: $('markReview'),
    prevBtn: $('prevBtn'),
    nextBtn: $('nextBtn'),
    submitBtn: $('submitBtn'),

    // Review
    scoreCanvas: $('scoreCanvas'),
    scoreValue: $('scoreValue'),
    scoreTitle: $('scoreTitle'),
    scoreSubtitle: $('scoreSubtitle'),
    statCorrect: $('statCorrect'),
    statIncorrect: $('statIncorrect'),
    statUnanswered: $('statUnanswered'),
    statTime: $('statTime'),
    retakeBtn: $('retakeBtn'),
    homeBtn: $('homeBtn'),
    reviewList: $('reviewList'),

    // Modals
    submitModal: $('submitModal'),
    modalText: $('modalText'),
    modalCancel: $('modalCancel'),
    modalConfirm: $('modalConfirm'),
    pauseOverlay: $('pauseOverlay'),
    resumeBtn: $('resumeBtn'),
};

// ═══════════════════════════════════════════════════════════
// SCREEN MANAGEMENT
// ═══════════════════════════════════════════════════════════

function showScreen(screenName) {
    dom.landing.classList.add('hidden');
    dom.quizScreen.classList.add('hidden');
    dom.reviewScreen.classList.add('hidden');

    switch (screenName) {
        case 'landing': dom.landing.classList.remove('hidden'); break;
        case 'quiz': dom.quizScreen.classList.remove('hidden'); break;
        case 'review': dom.reviewScreen.classList.remove('hidden'); break;
    }

    window.scrollTo(0, 0);
}

// ═══════════════════════════════════════════════════════════
// SCREEN 1: LANDING / SETUP
// ═══════════════════════════════════════════════════════════

async function loadMaterials() {
    // Show loading skeletons
    dom.materialGrid.innerHTML = '';
    for (let i = 0; i < 3; i++) {
        const skel = document.createElement('div');
        skel.className = 'material-skeleton';
        skel.innerHTML = '<div class="skel-line"></div><div class="skel-line"></div>';
        dom.materialGrid.appendChild(skel);
    }

    try {
        const response = await fetch('/api/vault');
        state.materials = await response.json();
        renderMaterials();
    } catch (err) {
        dom.materialGrid.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1;">
                <span class="empty-icon">📭</span>
                <p>Could not load materials.<br>Make sure the server is running.</p>
            </div>
        `;
    }
}

function renderMaterials() {
    dom.materialGrid.innerHTML = '';

    if (state.materials.length === 0) {
        dom.materialGrid.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1;">
                <span class="empty-icon">📂</span>
                <p>No materials found.<br>Add a folder with <code>questions.json</code> to the <code>vault/</code> directory.</p>
            </div>
        `;
        return;
    }

    state.materials.forEach(mat => {
        const card = document.createElement('div');
        card.className = 'material-card';
        card.dataset.id = mat.id;
        card.innerHTML = `
            <div class="material-name">${mat.name}</div>
            <div class="material-count">${mat.questionCount} question${mat.questionCount !== 1 ? 's' : ''}</div>
            <div class="check-mark">✓</div>
        `;
        card.addEventListener('click', () => selectMaterial(mat));
        dom.materialGrid.appendChild(card);
    });
}

function selectMaterial(mat) {
    state.selectedMaterial = mat;

    document.querySelectorAll('.material-card').forEach(c => c.classList.remove('selected'));
    const card = document.querySelector(`.material-card[data-id="${mat.id}"]`);
    if (card) card.classList.add('selected');

    updateStartButton();
}

function updateStartButton() {
    const canStart = state.selectedMaterial && state.duration > 0;
    dom.startBtn.disabled = !canStart;
    if (canStart) {
        dom.startBtn.textContent = `Start Quiz — ${state.selectedMaterial.name} (${state.duration} min)`;
    } else {
        dom.startBtn.textContent = 'Select a material to start';
    }
}

// Duration Picker
function setupDurationPicker() {
    const buttons = dom.durationOptions.querySelectorAll('.duration-btn');
    buttons.forEach(btn => {
        btn.addEventListener('click', () => {
            const minutes = parseInt(btn.dataset.minutes);
            state.duration = minutes;
            buttons.forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            dom.customDuration.value = '';
            updateStartButton();
        });
    });

    dom.customDuration.addEventListener('input', () => {
        const val = parseInt(dom.customDuration.value);
        if (val > 0) {
            state.duration = Math.min(val, 180);
            document.querySelectorAll('.duration-btn').forEach(b => b.classList.remove('selected'));
            updateStartButton();
        }
    });

    dom.customDuration.addEventListener('focus', () => {
        document.querySelectorAll('.duration-btn').forEach(b => b.classList.remove('selected'));
    });
}

// ═══════════════════════════════════════════════════════════
// SCREEN 2: QUIZ
// ═══════════════════════════════════════════════════════════

async function startQuiz() {
    try {
        const response = await fetch(`vault/${state.selectedMaterial.id}/questions.json`);
        const data = await response.json();
        state.questions = shuffleArray(data);
        state.currentIndex = 0;
        state.userAnswers = new Array(state.questions.length).fill(null);
        state.markedForReview = new Array(state.questions.length).fill(false);
        state.timeLeft = state.duration * 60;
        state.timeSpent = 0;
        state.isPaused = false;

        dom.quizMaterialBadge.textContent = state.selectedMaterial.name;
        dom.totalQ.textContent = state.questions.length;

        buildNavigation();
        loadQuestion();
        startTimer();
        showScreen('quiz');
    } catch (err) {
        alert('Failed to load questions. Please check the vault folder.');
    }
}

function shuffleArray(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

// ── Timer ─────────────────────────────────────────────────

function startTimer() {
    clearInterval(state.timer);
    updateTimerDisplay();

    state.timer = setInterval(() => {
        if (!state.isPaused) {
            state.timeLeft--;
            state.timeSpent++;
            updateTimerDisplay();

            if (state.timeLeft <= 0) {
                clearInterval(state.timer);
                finishQuiz();
            }
        }
    }, 1000);
}

function updateTimerDisplay() {
    const minutes = Math.floor(state.timeLeft / 60);
    const seconds = state.timeLeft % 60;
    dom.timerText.textContent = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;

    // Warning colors
    dom.timerDisplay.classList.remove('warning', 'danger');
    if (state.timeLeft <= 60) {
        dom.timerDisplay.classList.add('danger');
    } else if (state.timeLeft <= 300) {
        dom.timerDisplay.classList.add('warning');
    }
}

function togglePause() {
    state.isPaused = !state.isPaused;
    if (state.isPaused) {
        dom.pauseOverlay.classList.remove('hidden');
        dom.pauseBtn.textContent = '▶ Resume';
    } else {
        dom.pauseOverlay.classList.add('hidden');
        dom.pauseBtn.textContent = '⏸ Pause';
    }
}

// ── Navigation ────────────────────────────────────────────

function buildNavigation() {
    dom.navGrid.innerHTML = '';
    state.questions.forEach((_, i) => {
        const btn = document.createElement('button');
        btn.className = 'nav-btn';
        btn.textContent = i + 1;
        btn.dataset.index = i;
        btn.addEventListener('click', () => {
            state.currentIndex = i;
            loadQuestion();
        });
        dom.navGrid.appendChild(btn);
    });
}

function updateNavigation() {
    const buttons = dom.navGrid.querySelectorAll('.nav-btn');
    buttons.forEach(btn => {
        const i = parseInt(btn.dataset.index);
        btn.classList.remove('current', 'answered', 'marked');

        if (i === state.currentIndex) {
            btn.classList.add('current');
        } else if (state.markedForReview[i]) {
            btn.classList.add('marked');
        } else if (state.userAnswers[i] !== null) {
            btn.classList.add('answered');
        }
    });
}

// ── Question Loading ──────────────────────────────────────

function loadQuestion() {
    const q = state.questions[state.currentIndex];
    dom.currentQ.textContent = state.currentIndex + 1;
    dom.questionText.textContent = q.question;

    // Render options
    const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
    dom.optionsList.innerHTML = '';
    q.options.forEach((option, i) => {
        const item = document.createElement('div');
        item.className = 'option-item' + (state.userAnswers[state.currentIndex] === i ? ' selected' : '');
        item.innerHTML = `
            <span class="option-letter">${letters[i] || (i + 1)}</span>
            <span class="option-text">${option}</span>
        `;
        item.addEventListener('click', () => {
            state.userAnswers[state.currentIndex] = i;
            // Update visual selection
            dom.optionsList.querySelectorAll('.option-item').forEach(el => el.classList.remove('selected'));
            item.classList.add('selected');
            updateNavigation();
        });
        dom.optionsList.appendChild(item);
    });

    // Mark for review
    dom.markReview.checked = state.markedForReview[state.currentIndex];
    dom.markReviewLabel.classList.toggle('active', state.markedForReview[state.currentIndex]);

    updateNavigation();
    updateQuizButtons();
}

// ── Quiz Controls ─────────────────────────────────────────

function prevQuestion() {
    if (state.currentIndex > 0) {
        state.currentIndex--;
        loadQuestion();
    }
}

function nextQuestion() {
    if (state.currentIndex < state.questions.length - 1) {
        state.currentIndex++;
        loadQuestion();
    }
}

function updateQuizButtons() {
    dom.prevBtn.disabled = state.currentIndex === 0;
    dom.nextBtn.disabled = state.currentIndex === state.questions.length - 1;
}

function showSubmitConfirmation() {
    const answered = state.userAnswers.filter(a => a !== null).length;
    dom.modalText.textContent =
        `You have answered ${answered} of ${state.questions.length} questions. Are you sure you want to submit?`;
    dom.submitModal.classList.remove('hidden');
}

function hideSubmitConfirmation() {
    dom.submitModal.classList.add('hidden');
}

function finishQuiz() {
    clearInterval(state.timer);
    dom.pauseOverlay.classList.add('hidden');
    buildReview();
    showScreen('review');
}

// ═══════════════════════════════════════════════════════════
// SCREEN 3: REVIEW
// ═══════════════════════════════════════════════════════════

function buildReview() {
    let correct = 0;
    let incorrect = 0;
    let unanswered = 0;

    const reviewData = state.questions.map((q, i) => {
        const userAns = state.userAnswers[i];
        const isCorrect = userAns === q.answer;
        const isUnanswered = userAns === null;

        if (isUnanswered) unanswered++;
        else if (isCorrect) correct++;
        else incorrect++;

        return {
            index: i,
            question: q.question,
            options: q.options,
            userAnswer: userAns,
            userAnswerText: userAns !== null ? q.options[userAns] : 'No answer',
            correctAnswer: q.answer,
            correctAnswerText: q.options[q.answer],
            explanation: q.explanation,
            isCorrect,
            isUnanswered,
            markedForReview: state.markedForReview[i],
        };
    });

    const total = state.questions.length;
    const percentage = total > 0 ? Math.round((correct / total) * 100) : 0;

    // Score ring
    drawScoreRing(percentage);
    dom.scoreValue.textContent = `${percentage}%`;

    // Score title
    if (percentage >= 90) dom.scoreTitle.textContent = '🏆 Outstanding!';
    else if (percentage >= 75) dom.scoreTitle.textContent = '🎉 Great Job!';
    else if (percentage >= 60) dom.scoreTitle.textContent = '👍 Good Effort!';
    else if (percentage >= 40) dom.scoreTitle.textContent = '📖 Keep Practicing!';
    else dom.scoreTitle.textContent = '💪 Don\'t Give Up!';

    dom.scoreSubtitle.textContent = `${correct} correct out of ${total} questions`;

    // Stats
    dom.statCorrect.textContent = correct;
    dom.statIncorrect.textContent = incorrect;
    dom.statUnanswered.textContent = unanswered;
    dom.statTime.textContent = formatTime(state.timeSpent);

    // Render review cards
    renderReviewCards(reviewData, 'all');

    // Filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderReviewCards(reviewData, btn.dataset.filter);
        });
    });
}

function renderReviewCards(reviewData, filter) {
    dom.reviewList.innerHTML = '';

    let filtered = reviewData;
    if (filter === 'incorrect') filtered = reviewData.filter(d => !d.isCorrect && !d.isUnanswered);
    else if (filter === 'correct') filtered = reviewData.filter(d => d.isCorrect);
    else if (filter === 'marked') filtered = reviewData.filter(d => d.markedForReview);

    if (filtered.length === 0) {
        dom.reviewList.innerHTML = `
            <div class="empty-state">
                <span class="empty-icon">✨</span>
                <p>No questions match this filter.</p>
            </div>
        `;
        return;
    }

    filtered.forEach(item => {
        const card = document.createElement('div');
        card.className = 'review-card';

        let statusClass, statusIcon;
        if (item.isUnanswered) {
            statusClass = 'status-unanswered';
            statusIcon = '⬜';
        } else if (item.isCorrect) {
            statusClass = 'status-correct';
            statusIcon = '✅';
        } else {
            statusClass = 'status-incorrect';
            statusIcon = '❌';
        }

        card.innerHTML = `
            <div class="review-card-header">
                <div class="review-card-left">
                    <div class="review-card-status ${statusClass}">${statusIcon}</div>
                    <div>
                        <div class="review-card-num">Question ${item.index + 1}${item.markedForReview ? ' 🔖' : ''}</div>
                        <div class="review-card-question">${item.question}</div>
                    </div>
                </div>
                <span class="review-card-toggle">▼</span>
            </div>
            <div class="review-card-body">
                <div class="review-card-content">
                    <div class="review-answer-row">
                        <span class="review-answer-label">Your answer:</span>
                        <span class="review-answer-value ${item.isCorrect ? 'val-correct' : item.isUnanswered ? '' : 'val-incorrect'}">${item.userAnswerText}</span>
                    </div>
                    <div class="review-answer-row">
                        <span class="review-answer-label">Correct answer:</span>
                        <span class="review-answer-value val-correct">${item.correctAnswerText}</span>
                    </div>
                    <div class="review-explanation">
                        💡 ${item.explanation}
                    </div>
                </div>
            </div>
        `;

        // Toggle expand/collapse
        const header = card.querySelector('.review-card-header');
        header.addEventListener('click', () => {
            card.classList.toggle('expanded');
        });

        dom.reviewList.appendChild(card);
    });
}

function drawScoreRing(percentage) {
    const canvas = dom.scoreCanvas;
    const ctx = canvas.getContext('2d');
    const size = canvas.width;
    const center = size / 2;
    const radius = center - 20;
    const lineWidth = 14;

    ctx.clearRect(0, 0, size, size);

    // Background ring
    ctx.beginPath();
    ctx.arc(center, center, radius, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.stroke();

    // Score ring (animated)
    const targetAngle = (percentage / 100) * Math.PI * 2;
    const startAngle = -Math.PI / 2;

    if (percentage > 0) {
        const gradient = ctx.createConicGradient(startAngle, center, center);
        gradient.addColorStop(0, '#8b5cf6');
        gradient.addColorStop(0.5, '#06b6d4');
        gradient.addColorStop(1, '#10b981');

        ctx.beginPath();
        ctx.arc(center, center, radius, startAngle, startAngle + targetAngle);
        ctx.strokeStyle = gradient;
        ctx.lineWidth = lineWidth;
        ctx.lineCap = 'round';
        ctx.stroke();
    }
}

function formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    if (m === 0) return `${s}s`;
    return `${m}m ${s}s`;
}

// ═══════════════════════════════════════════════════════════
// KEYBOARD SHORTCUTS
// ═══════════════════════════════════════════════════════════

document.addEventListener('keydown', (e) => {
    // Only active on quiz screen
    if (dom.quizScreen.classList.contains('hidden') || state.isPaused) return;

    switch (e.key) {
        case 'ArrowLeft':
            prevQuestion();
            break;
        case 'ArrowRight':
            nextQuestion();
            break;
        case '1': case '2': case '3': case '4': case '5':
        case '6': case '7': case '8':
            const optIndex = parseInt(e.key) - 1;
            if (optIndex < state.questions[state.currentIndex].options.length) {
                state.userAnswers[state.currentIndex] = optIndex;
                loadQuestion();
            }
            break;
        case 'm':
        case 'M':
            state.markedForReview[state.currentIndex] = !state.markedForReview[state.currentIndex];
            dom.markReview.checked = state.markedForReview[state.currentIndex];
            dom.markReviewLabel.classList.toggle('active', state.markedForReview[state.currentIndex]);
            updateNavigation();
            break;
    }
});

// ═══════════════════════════════════════════════════════════
// EVENT LISTENERS
// ═══════════════════════════════════════════════════════════

// Landing
dom.startBtn.addEventListener('click', startQuiz);

// Quiz
dom.prevBtn.addEventListener('click', prevQuestion);
dom.nextBtn.addEventListener('click', nextQuestion);
dom.pauseBtn.addEventListener('click', togglePause);
dom.resumeBtn.addEventListener('click', togglePause);
dom.submitBtn.addEventListener('click', showSubmitConfirmation);

// Mark for review
dom.markReviewLabel.addEventListener('click', (e) => {
    e.preventDefault();
    state.markedForReview[state.currentIndex] = !state.markedForReview[state.currentIndex];
    dom.markReview.checked = state.markedForReview[state.currentIndex];
    dom.markReviewLabel.classList.toggle('active', state.markedForReview[state.currentIndex]);
    updateNavigation();
});

// Submit modal
dom.modalCancel.addEventListener('click', hideSubmitConfirmation);
dom.modalConfirm.addEventListener('click', () => {
    hideSubmitConfirmation();
    finishQuiz();
});

// Close modal on overlay click
dom.submitModal.addEventListener('click', (e) => {
    if (e.target === dom.submitModal) hideSubmitConfirmation();
});

// Review
dom.retakeBtn.addEventListener('click', () => {
    startQuiz();
});

dom.homeBtn.addEventListener('click', () => {
    state.selectedMaterial = null;
    document.querySelectorAll('.material-card').forEach(c => c.classList.remove('selected'));
    updateStartButton();
    loadMaterials();
    showScreen('landing');
});

// ═══════════════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════════════

setupDurationPicker();
loadMaterials();
