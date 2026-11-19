// Стискає картинку і повертає base64-рядок
async function createThread() {
    const title = document.getElementById('threadTitle').value;
    const text = document.getElementById('threadText').value;
    const imageInput = document.getElementById('threadImage');

    const user = localStorage.getItem('user_nickname') || "Анонім";
    const userColor = localStorage.getItem('user_nickname_color') || "#0f0c5d";

    if (!title || !text) return alert("Заповни назву та текст!");

    let imageData = null;
    if (imageInput.files[0]) {
        imageData = await resizeImage(imageInput.files[0], 600);
    }

    const newThread = {
        id: Date.now(),
        title: title,
        author: user,
        authorColor: userColor,
        content: text,
        image: imageData,
        replies: []
    };

    threads.push(newThread);
    let myCreatedThreads = JSON.parse(localStorage.getItem('my_created_threads')) || [];
    myCreatedThreads.push({ boardId: boardId, threadId: newThread.id });
    localStorage.setItem('my_created_threads', JSON.stringify(myCreatedThreads));
    saveAndRender();

    document.getElementById('threadTitle').value = "";
    document.getElementById('threadText').value = "";
    imageInput.value = "";
}
function resizeImage(file, maxSize) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = reject;
        reader.onload = e => {
            const img = new Image();
            img.onerror = reject;
            img.onload = () => {
                const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
                const canvas = document.createElement('canvas');
                canvas.width = Math.round(img.width * scale);
                canvas.height = Math.round(img.height * scale);
                const ctx = canvas.getContext('2d');
                ctx.fillStyle = '#fff';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                resolve(canvas.toDataURL('image/jpeg', 0.8));
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
}
function insertKaomoji(kaomoji) {
    const textarea = document.getElementById('description-input');
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;

    textarea.value = text.substring(0, start) + kaomoji + text.substring(end);
    textarea.selectionStart = textarea.selectionEnd = start + kaomoji.length;
    textarea.focus();
}

async function saveProfile() {
    const nick = document.getElementById('username-input').value.trim();
    const nickColor = document.getElementById('nick-color-input').value;
    const desc = document.getElementById('description-input').value;
    const hideProfile = document.getElementById('hide-profile-checkbox').checked;
    const avatarFile = document.getElementById('avatar-input').files[0];

    try {
        if (nick) localStorage.setItem('user_nickname', nick);
        else localStorage.removeItem('user_nickname');
        localStorage.setItem('user_nickname_color', nickColor);
        localStorage.setItem('user_description', desc);
        localStorage.setItem('user_profile_hidden', hideProfile);

        if (avatarFile) {
            const avatarData = await resizeImage(avatarFile, 128);
            localStorage.setItem('user_avatar', avatarData);
        }
        alert("Профіль успішно оновлено! (｡· v ·｡)");
        location.reload();
    } catch (err) {
        console.error(err);
        alert("Не вдалося зберегти (можливо, закінчилось місце в localStorage).");
    }
}

// Функція для видалення аватарки
function deleteAvatar() {
    if (confirm("Ти дійсно хочеш видалити свою аватарку і повернути стандартну?")) {
        localStorage.removeItem('user_avatar');
        alert("Аватарку видалено! Буде встановлено аватарку за замовчуванням.");
        location.reload();
    }
}

// Функція відображення профілю та списку моїх тредів
function updateUI() {
    const nick = localStorage.getItem('user_nickname') || "Анонім";
    const nickColor = localStorage.getItem('user_nickname_color') || "#0f0c5d";
    const desc = localStorage.getItem('user_description') || "Немає опису...";
    const avatar = localStorage.getItem('user_avatar');
    const isHidden = localStorage.getItem('user_profile_hidden') === 'true';

    document.getElementById('username-input').value = nick === "Анонім" ? "" : nick;
    document.getElementById('nick-color-input').value = nickColor;
    document.getElementById('description-input').value = desc === "Немає опису..." ? "" : desc;
    document.getElementById('hide-profile-checkbox').checked = isHidden;

    const nickDisplay = document.getElementById('profile-nick-display');
    const descDisplay = document.getElementById('profile-desc-display');
    const avatarContainer = document.getElementById('profile-avatar-container');
    const threadsCountDisplay = document.getElementById('profile-threads-count');

    nickDisplay.innerText = nick + (isHidden ? " 🔒 (прихований)" : "");
    nickDisplay.style.color = nickColor;
    descDisplay.innerText = desc;

    // Відображення аватарки
    const finalAvatarSrc = avatar ? avatar : "img/avatarca.png";
    avatarContainer.innerHTML = `<img src="${finalAvatarSrc}" style="width:65px; height:65px; border-radius:50%; object-fit: cover; border: 2px solid #b7c5d9;">`;

    // --- ВИВЕДЕННЯ МОЇХ ТРЕДІВ ТА ЇХ КІЛЬКОСТІ ---
    const myThreadsList = document.getElementById('my-threads-list');
    myThreadsList.innerHTML = "";

    const myThreads = JSON.parse(localStorage.getItem('my_created_threads')) || [];

    if (threadsCountDisplay) {
        threadsCountDisplay.innerText = `Створено тредів: ${myThreads.length}`;
    }

    if (myThreads.length === 0) {
        myThreadsList.innerHTML = "<p style='color: gray; margin: 0; text-align:center;'>Ви ще не створили жодного треду.</p>";
    } else {
        myThreads.forEach(item => {
            const link = document.createElement('a');
            link.href = `board.html?id=${item.boardId}&thread=${item.threadId}`;
            link.style.display = "block";
            link.style.margin = "3px 0";
            link.innerText = `ボード Дошка ${item.boardId} — Тред #${item.threadId}`;
            myThreadsList.appendChild(link);
        });
    }
}

// Функція для популярних тредів
function renderPopularThreads() {
    const popularList = document.getElementById('popular-threads-list');
    if (!popularList) return;

    let allThreads = [];

    for (let id = 1; id <= 10; id++) {
        const storageKey = `board_${id}_threads`;
        const boardThreads = JSON.parse(localStorage.getItem(storageKey)) || [];
        
        boardThreads.forEach(thread => {
            thread.boardId = id; 
            allThreads.push(thread);
        });
    }

    allThreads.sort((a, b) => (b.replies ? b.replies.length : 0) - (a.replies ? a.replies.length : 0));
    const topThreads = allThreads.slice(0, 4);

    popularList.innerHTML = "";

    if (topThreads.length === 0) {
        popularList.innerHTML = "<p style='text-align:center; color:gray; font-size:9pt;'>Поки що немає активних тредів... (｡· v ·｡)</p>";
        return;
    }

    topThreads.forEach(t => {
        const card = document.createElement('div');
        card.className = "thread-card";
        card.style.cursor = "pointer";
        
        card.onclick = () => {
            window.location.href = `board.html?id=${t.boardId}&thread=${t.id}`;
        };

        let imgHtml = t.image ? `<img src="${t.image}" style="max-width:50px; height:auto; float:left; margin-right:10px; border-radius:3px;">` : "";
        const replyCount = t.replies ? t.replies.length : 0;

        card.innerHTML = `
            <div style="font-size: 8pt; color: #707070; margin-bottom: 3px;">
                Дошка ${t.boardId} • Автор: <strong>${t.author}</strong> • Відповідей: <span style="color: #af0a0f; font-weight:bold;">${replyCount}</span>
            </div>
            ${imgHtml}
            <h4 style="margin: 0 0 5px 0; color: #0f0c5d;">${t.title}</h4>
            <p style="margin: 0; font-size: 9pt; color: #333; clear: none;">${t.content ? t.content.substring(0, 60) : ""}...</p>
            <div style="clear:both;"></div>
        `;
        popularList.appendChild(card);
    });
}

window.onload = function() {
    updateUI();
    renderPopularThreads();
};