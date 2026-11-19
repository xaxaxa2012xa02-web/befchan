// Функція для вставки каомоджі у вибране поле за його targetId
function insertKaomojiTo(targetId, kaomoji) {
    const textarea = document.getElementById(targetId);
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;

    textarea.value = text.substring(0, start) + kaomoji + text.substring(end);
    textarea.selectionStart = textarea.selectionEnd = start + kaomoji.length;
    textarea.focus();
}

// 1. Отримуємо ID дошки з URL (наприклад, з board.html?id=3 отримаємо "3")
const urlParams = new URLSearchParams(window.location.search);
const boardId = urlParams.get('id') || "1"; // якщо id немає, беремо 1

// 2. Динамічний ключ для localStorage (для кожної дошки свій)
const storageKey = `board_${boardId}_threads`;

// 3. Завантажуємо треди саме для цієї дошки
let threads = JSON.parse(localStorage.getItem(storageKey)) || [];
let currentThreadId = null;

window.onload = () => {
    // Змінюємо заголовок сторінки під поточну дошку
    document.getElementById('boardTitle').innerText = "дошка " + boardId;
    document.title = "дошка " + boardId + " — befchan";
    
    // --- Перевірка, чи не прийшли ми сюди за прямим посиланням на тред ---
    const threadParam = urlParams.get('thread');
    if (threadParam) {
        const threadIdToOpen = parseInt(threadParam);
        // Перевіряємо, чи такий тред взагалі існує на цій дошці
        const exists = threads.some(t => t.id === threadIdToOpen);
        if (exists) {
            openThread(threadIdToOpen); // відкриваємо його автоматично!
            return; // перериваємо виконання, щоб не рендерити весь список
        }
    }

    renderThreads();
};

function createThread() {
    const title = document.getElementById('threadTitle').value;
    const text = document.getElementById('threadText').value;
    const imageInput = document.getElementById('threadImage');
    
    // Отримуємо нік та колір користувача
    const user = localStorage.getItem('user_nickname') || "Анонім";
    const userColor = localStorage.getItem('user_nickname_color') || "#0f0c5d";

    if (!title || !text) return alert("Заповни назву та текст!");

    const newThread = {
        id: Date.now(),
        title: title,
        author: user,
        authorColor: userColor, // Зберігаємо колір автора
        content: text,
        image: imageInput.files[0] ? URL.createObjectURL(imageInput.files[0]) : null,
        replies: []
    };

    threads.push(newThread);
    // Записуємо створений тред в індекс нашого профілю
    let myCreatedThreads = JSON.parse(localStorage.getItem('my_created_threads')) || [];
    myCreatedThreads.push({
        boardId: boardId,
        threadId: newThread.id
    });
    localStorage.setItem('my_created_threads', JSON.stringify(myCreatedThreads));
    saveAndRender();

    document.getElementById('threadTitle').value = "";
    document.getElementById('threadText').value = "";
    imageInput.value = "";
}

function saveAndRender() {
    // Зберігаємо у localStorage під унікальним для цієї дошки ключем
try {
    localStorage.setItem(storageKey, JSON.stringify(threads));
} catch (e) {
    alert("localStorage переповнений! Видали старі треди або менші картинки.");
}
}

function renderThreads() {
    const container = document.getElementById('mainContent');
    const currentUser = localStorage.getItem('user_nickname');
    container.innerHTML = "<h2>Список тредів:</h2>";

    if(threads.length === 0) {
        container.innerHTML += "<p style='text-align:center; color:gray;'>Тут ще немає тредів. Будь першим! (｡· v ·｡)</p>";
    }

    threads.forEach(t => {
        const threadPreview = document.createElement('div');
        threadPreview.className = "thread-card";
        threadPreview.style = "position: relative;";
        
        let deleteBtn = (t.author === currentUser && currentUser !== null) 
            ? `<button onclick="deleteThread(${t.id}, event)">Видалити</button>` 
            : "";

        const authorColor = t.authorColor || "#0f0c5d";

        threadPreview.innerHTML = `
            ${deleteBtn}
            <div onclick="openThread(${t.id})">
                <strong>#${t.id} [<span style="color: ${authorColor};">${t.author}</span>]</strong>
                <h4>${t.title}</h4>
                <p>${t.content.substring(0, 50)}...</p>
                <small>Відповідей: ${t.replies.length}</small>
            </div>
        `;
        container.appendChild(threadPreview);
    });
}

function deleteThread(id, event) {
    event.stopPropagation(); 
    if(confirm("Видалити цей тред?")) {
        threads = threads.filter(t => t.id !== id);
        saveAndRender();
    }
}

function openThread(id) {
    currentThreadId = id;
    const thread = threads.find(t => t.id === id);
    document.getElementById('threadForm').style.display = "none";
    document.getElementById('replyForm').style.display = "block";
    document.getElementById('backToThreads').style.display = "block";
    document.getElementById('boardTitle').innerText = "Тред: " + thread.title;
    renderCurrentThread();
}

function renderCurrentThread() {
    const thread = threads.find(t => t.id === currentThreadId);
    if (!thread) return showThreadList();
    
    const container = document.getElementById('mainContent');
    const currentUser = localStorage.getItem('user_nickname');
    container.innerHTML = "";

    const opColor = thread.authorColor || "#0f0c5d";

    // ОП-пост
    const opPost = document.createElement('div');
    opPost.setAttribute("style", "border: 3px solid green; padding: 15px; background: #fff; margin-bottom: 10px;");
    let imgHtml = thread.image ? `<br><img src="${thread.image}" style="max-width:200px;">` : "";
    opPost.innerHTML = `
        <strong style="cursor:pointer; color: ${opColor};" onclick="prepareReply('${thread.author}')">ОП (${thread.author}):</strong>
        <p>${thread.content}</p>${imgHtml}
    `;
    container.appendChild(opPost);

    // Відповіді
    const repliesDiv = document.createElement('div');
    repliesDiv.setAttribute("style", "margin-left: 30px;");
    
    thread.replies.forEach((r, index) => {
        const rDiv = document.createElement('div');
        rDiv.setAttribute("style", "border: 1px solid gray; padding: 10px; margin-top: 5px; background: #f9f9f9; position: relative;");
        
        let delReplyBtn = (r.author === currentUser && currentUser !== null)
            ? `<button onclick="deleteReply(${index})">видалити</button>`
            : "";

        let rImgHtml = r.image ? `<br><img src="${r.image}" style="max-width:150px;">` : "";
        let replyToInfo = r.replyTo ? `<span style="color: gray; font-size: 0.8em;"> >> ${r.replyTo}</span>` : "";
        const avatarTag = r.avatar ? `<img src="${r.avatar}" style="width:30px; height:30px; border-radius:50%; vertical-align:middle; margin-right:5px;">` : "";
        const replyAuthorColor = r.authorColor || "#0f0c5d";

        rDiv.innerHTML = `
            ${delReplyBtn}
            <div class="reply-header">
                ${avatarTag}
                <strong style="cursor:pointer; color: ${replyAuthorColor};" onclick="prepareReply('${r.author}')">${r.author}${replyToInfo}:</strong> 
            </div>
            <p style="margin: 5px 0;">${r.content}</p>
            ${rImgHtml}
        `;
        repliesDiv.appendChild(rDiv);
    });
    container.appendChild(repliesDiv);
}

function deleteReply(index) {
    if(confirm("Видалити твій коментар?")) {
        const thread = threads.find(t => t.id === currentThreadId);
        thread.replies.splice(index, 1);
        saveAndRender();
    }
}

async function addReply() {
    const text = document.getElementById('replyText').value;
    const imageInput = document.getElementById('replyImage');

    const user = localStorage.getItem('user_nickname') || "Анонім";
    const userColor = localStorage.getItem('user_nickname_color') || "#0f0c5d";
    const avatar = localStorage.getItem('user_avatar') || null;

    if (!text) return;

    let imageData = null;
    if (imageInput.files[0]) {
        imageData = await resizeImage(imageInput.files[0], 600);
    }

    let replyTo = text.startsWith('@') ? text.split(' ')[0].replace('@', '') : null;
    const thread = threads.find(t => t.id === currentThreadId);

    thread.replies.push({
        author: user,
        authorColor: userColor,
        avatar: avatar,
        content: text,
        replyTo: replyTo,
        image: imageData
    });

    saveAndRender();
    document.getElementById('replyText').value = "";
    imageInput.value = "";
}

function prepareReply(author) {
    const input = document.getElementById('replyText');
    input.value = `@${author} ` + input.value;
    input.focus();
}

function showThreadList() {
    currentThreadId = null;
    document.getElementById('threadForm').style.display = "block";
    document.getElementById('replyForm').style.display = "none";
    document.getElementById('backToThreads').style.display = "none";
    document.getElementById('boardTitle').innerText = "дошка " + boardId;
    
    // Очищаємо параметр треду з URL без перезавантаження сторінки
    window.history.pushState({}, document.title, `board.html?id=${boardId}`);
    
    renderThreads();
}