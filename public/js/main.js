let state = 0;
let speedReading = 500;
let readingInterval = null;
let words = [];
let currentWordIndex = 0;
let isPaused = false;
let texts = {};

const wrap = document.getElementById("wrap");
const place = document.getElementById("place");
const area = document.getElementById("area");
const add = document.getElementById("add");
const speed = document.getElementById("speed");
const speedView = document.getElementById("speedView");
const nightMode = document.getElementById("nightMode");
const pauseBtn = document.getElementById("pauseBtn");
const stopBtn = document.getElementById("stopBtn");
const backBtn = document.getElementById("backBtn");
const controls = document.getElementById("controls");
const textSelector = document.getElementById("textSelector");
const deleteTextBtn = document.getElementById("deleteText");
const statusMessage = document.getElementById("statusMessage");

// Завантажуємо налаштування
let stateLocal = localStorage.getItem("state") || 0;
nightTrigger(stateLocal);
state = parseInt(stateLocal);

// Завантажуємо тексти
loadTextsFromServer();

// Оновлюємо швидкість
speedView.innerText = speedReading + " мс";
speed.value = speedReading;

function nightTrigger(state) {
    if (state === 1) {
        wrap.classList.remove("dark");
        wrap.classList.add("light");
        nightMode.textContent = "☀️";
    } else {
        wrap.classList.remove("light");
        wrap.classList.add("dark");
        nightMode.textContent = "🌙";
    }
}

nightMode.addEventListener("click", function() {
    state = (state === 0) ? 1 : 0;
    nightTrigger(state);
    localStorage.setItem("state", state);
});

speed.addEventListener("input", function() {
    speedView.innerHTML = this.value + " мс";
    speedReading = parseInt(this.value);
    
    if (readingInterval && !isPaused) {
        clearInterval(readingInterval);
        startReading();
    }
});

function showStatus(message, isSuccess = true) {
    statusMessage.textContent = message;
    statusMessage.className = isSuccess ? 'status-message status-success' : 'status-message status-error';
    statusMessage.style.display = 'block';
    
    setTimeout(() => {
        statusMessage.style.display = 'none';
    }, 3000);
}

async function loadTextsFromServer() {
    try {
        const response = await fetch('/api/texts');
        if (response.ok) {
            texts = await response.json();
            updateTextSelector();
        } else {
            showStatus('Помилка завантаження текстів', false);
        }
    } catch (error) {
        console.error('Помилка:', error);
        showStatus('Помилка з\'єднання з сервером', false);
    }
}

deleteTextBtn.addEventListener("click", async function() {
    const selectedText = textSelector.value;
    if (selectedText && confirm(`Видалити текст "${selectedText}"?`)) {
        try {
            const response = await fetch(`/api/texts?name=${encodeURIComponent(selectedText)}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                await loadTextsFromServer();
                area.value = "";
                showStatus("Текст успішно видалено!");
            } else {
                const error = await response.json();
                showStatus(error.error, false);
            }
        } catch (error) {
            console.error('Помилка:', error);
            showStatus('Помилка з\'єднання з сервером', false);
        }
    }
});

textSelector.addEventListener("change", function() {
    const selectedText = this.value;
    if (selectedText && texts[selectedText]) {
        area.value = texts[selectedText];
    }
});

add.addEventListener("click", async function() {
    let areaValue = area.value.trim();
    if (areaValue !== "") {
        try {
            const response = await fetch('/api/texts', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ content: areaValue })
            });
            
            if (response.ok) {
                const result = await response.json();
                await loadTextsFromServer();
                showStatus(`Текст збережено як "${result.name}"!`);
                startReadingProcess(areaValue);
            } else {
                const error = await response.json();
                showStatus(error.error, false);
            }
        } catch (error) {
            console.error('Помилка:', error);
            showStatus('Помилка з\'єднання з сервером', false);
        }
    } else {
        area.style.animation = "drag 0.5s ease-in-out";
        setTimeout(() => {
            area.style.animation = "none";
        }, 500);
        showStatus("Будь ласка, введіть текст для читання", false);
    }
});

function startReadingProcess(text) {
    area.style.display = 'none';
    textSelector.style.display = 'none';
    deleteTextBtn.style.display = 'none';
    place.style.display = 'flex';
    controls.style.display = 'flex';
    add.style.display = 'none';
    statusMessage.style.display = 'none';
    
    words = text.split(/\s+/).filter(word => word.length > 0);
    currentWordIndex = 0;
    
    startReading();
}

pauseBtn.addEventListener("click", function() {
    if (readingInterval) {
        if (isPaused) {
            startReading();
            pauseBtn.innerHTML = "⏸️ Пауza";
        } else {
            clearInterval(readingInterval);
            readingInterval = null;
            pauseBtn.innerHTML = "▶️ Продовжити";
        }
        isPaused = !isPaused;
    }
});

stopBtn.addEventListener("click", function() {
    stopReading();
    resetUI();
});

backBtn.addEventListener("click", function() {
    if (currentWordIndex > 0) {
        currentWordIndex = Math.max(0, currentWordIndex - 2);
        if (readingInterval) {
            clearInterval(readingInterval);
        }
        place.textContent = words[currentWordIndex];
        currentWordIndex++;
        if (!isPaused) {
            startReading();
        }
    }
});

function startReading() {
    if (readingInterval) {
        clearInterval(readingInterval);
    }
    
    readingInterval = setInterval(() => {
        if (currentWordIndex < words.length) {
            place.textContent = words[currentWordIndex];
            place.style.animation = "pulse 0.3s ease-in-out";
            setTimeout(() => {
                place.style.animation = "none";
            }, 300);
            currentWordIndex++;
        } else {
            stopReading();
            setTimeout(() => {
                resetUI();
                showStatus("Читання завершено!");
            }, 500);
        }
    }, speedReading);
    
    isPaused = false;
    pauseBtn.innerHTML = "⏸️ Пауza";
}

function stopReading() {
    if (readingInterval) {
        clearInterval(readingInterval);
        readingInterval = null;
    }
    isPaused = false;
    pauseBtn.innerHTML = "⏸️ Пауza";
}

function resetUI() {
    area.style.display = 'block';
    textSelector.style.display = 'block';
    deleteTextBtn.style.display = 'block';
    place.style.display = 'none';
    controls.style.display = 'none';
    add.style.display = 'block';
    place.textContent = "";
    currentWordIndex = 0;
}

function updateTextSelector() {
    const currentSelection = textSelector.value;
    
    textSelector.innerHTML = '<option value="">Виберіть текст або додайте новий</option>';
    
    for (const name in texts) {
        const option = document.createElement('option');
        option.value = name;
        option.textContent = name;
        textSelector.appendChild(option);
    }
    
    if (texts[currentSelection]) {
        textSelector.value = currentSelection;
        area.value = texts[currentSelection];
    }
}

area.addEventListener('focus', function() {
    this.style.transform = 'scale(1.01)';
});

area.addEventListener('blur', function() {
    this.style.transform = 'scale(1)';
});

document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && readingInterval) {
        stopReading();
        resetUI();
    }
    
    if (e.key === ' ' && readingInterval) {
        e.preventDefault();
        pauseBtn.click();
    }
});