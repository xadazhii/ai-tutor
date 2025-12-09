"use strict";

function injectThemeStyles() {
  if (document.getElementById('ai-tutor-theme-styles')) return;

  const style = document.createElement('style');
  style.id = 'ai-tutor-theme-styles';
  style.textContent = `
    /* CORE VARIABLES */
    :root, body.dark-theme {
      --bg-app: #0a0f19;
      --text-primary: #ffffff;
      --text-secondary: rgba(255,255,255,0.5);
      --surface-bg: #131824;
      --surface-border: rgba(255,255,255,0.08);
      --surface-hover: #1a202e;
      --accent-color: #60c3ff;
      --accent-glow: rgba(96,195,255,0.3);
      --switcher-bg: rgba(10, 15, 25, 0.8);
      --switcher-btn-color: rgba(255,255,255,0.6);
      --switcher-btn-active-bg: rgba(96,195,255,0.15);
      --switcher-btn-active-text: #ffffff;
      --message-user-bg: #2b3245;
      --message-model-bg: #1e2330;
    }

    body.light-theme {
      --bg-app: #f3f5f7;
      --text-primary: #1a1f2e;
      --text-secondary: #5e6c84;
      --surface-bg: #ffffff;
      --surface-border: #e1e4e8;
      --surface-hover: #f8f9fa;
      --accent-color: #0077cc;
      --accent-glow: rgba(0,119,204,0.2);
      --switcher-bg: rgba(255, 255, 255, 0.9);
      --switcher-btn-color: #5e6c84;
      --switcher-btn-active-bg: #e6f4ff;
      --switcher-btn-active-text: #0077cc;
      --message-user-bg: #ffffff;
      --message-model-bg: #eef2f6;
    }

    body {
      background-color: var(--bg-app);
      color: var(--text-primary);
      transition: background-color 0.3s ease, color 0.3s ease;
      margin: 0;
    }

    /* CONTAINER LAYOUT */
    .message-container {
        width: 100%;
        max-width: 900px;
        margin: 0 auto;
        min-height: 70vh;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
    }

    /* WELCOME SCREEN STYLES */
    .tutor-welcome {
        width: 100%;
        text-align: center;
        animation: fadeIn 0.8s ease-out;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 20px;
    }

    /* LOGO AREA */
    .tutor-logo {
        width: 80px;
        height: 80px;
        margin: 0 auto 24px;
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .logo-circle {
        width: 64px;
        height: 64px;
        border-radius: 50%;
        background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
        box-shadow: 0 0 40px var(--accent-glow);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 32px;
        color: #ffffff;
        z-index: 2;
    }

    .logo-glow {
        position: absolute;
        width: 100%;
        height: 100%;
        background: radial-gradient(circle, var(--accent-glow) 0%, transparent 70%);
        z-index: 1;
    }

    .tutor-title {
        font-size: 48px;
        font-weight: 700;
        color: var(--text-primary);
        margin: 0 0 12px;
        letter-spacing: -1px;
    }

    .tutor-subtitle {
        font-size: 16px;
        color: var(--text-secondary);
        margin: 0 0 48px;
        font-weight: 400;
    }

    /* 2x2 CARD GRID */
    .features-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 16px;
        width: 100%;
        max-width: 700px;
        margin-bottom: 40px;
    }

    .feature-card {
        background: var(--surface-bg);
        border: 1px solid var(--surface-border);
        border-radius: 16px;
        padding: 24px;
        text-align: center;
        transition: all 0.3s ease;
        cursor: default;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        min-height: 140px;
    }

    .feature-card:hover {
        background: var(--surface-hover);
        border-color: var(--accent-color);
        transform: translateY(-4px);
        box-shadow: 0 10px 30px rgba(0,0,0,0.2);
    }

    .feature-icon {
        font-size: 28px;
        margin-bottom: 16px;
        opacity: 0.9;
    }

    .feature-title {
        font-size: 15px;
        font-weight: 600;
        color: var(--text-primary);
        margin: 0 0 8px;
    }

    .feature-desc {
        font-size: 13px;
        color: var(--text-secondary);
        margin: 0;
        line-height: 1.4;
    }

    /* BOTTOM HINT */
    .start-hint {
        color: var(--text-secondary);
        font-size: 14px;
        display: flex;
        align-items: center;
        gap: 8px;
        margin-top: 20px;
        opacity: 0.8;
    }

    .arrow-down {
        font-size: 16px;
        animation: bounce 2s infinite;
    }

    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes bounce { 0%, 20%, 50%, 80%, 100% {transform: translateY(0);} 40% {transform: translateY(-5px);} 60% {transform: translateY(-3px);} }

    @media (max-width: 640px) {
        .tutor-title { font-size: 36px; }
        .features-grid { grid-template-columns: 1fr; max-width: 340px; }
    }
  `;
  document.head.appendChild(style);
}

injectThemeStyles();

let currentChatID = 'new';
let currentMode = 'explanation';

{
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.has('chatid')) {
    currentChatID = urlParams.get('chatid');
  }
}

window.makeId = function() {
  return Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
}

async function createNewChat() {
  try {
    if (typeof window.createServerChat === 'function') {
      const serverId = await window.createServerChat();
      if (serverId) {
        currentChatID = serverId;
        history.pushState({}, '', `?chatid=${serverId}`);
        try {
          const allChats = JSON.parse(localStorage.getItem('allChats') || '{}');
          allChats[serverId] = allChats[serverId] || [];
          localStorage.setItem('allChats', JSON.stringify(allChats));
        } catch (e) {
          console.warn('Failed to init local snapshot for server chat', e);
        }
        if (typeof fetchAllChats === 'function') fetchAllChats();
        return serverId;
      }
    }

    const res = await fetch(window.buildApiUrl(`/api/chat`),{
      method: 'POST',
      headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' }
    });
    if (res.ok) {
      const chat = await res.json();
      if (chat && chat.id) {
        const serverId = chat.id;
        currentChatID = serverId;
        history.pushState({}, '', `?chatid=${serverId}`);
        try {
          const allChats = JSON.parse(localStorage.getItem('allChats') || '{}');
          allChats[serverId] = allChats[serverId] || [];
          localStorage.setItem('allChats', JSON.stringify(allChats));
        } catch (e) {
          console.warn('Failed to init local snapshot for server chat', e);
        }
        if (typeof fetchAllChats === 'function') fetchAllChats();
        return serverId;
      }
    } else {
      console.warn('Server create chat failed:', res.status, res.statusText);
    }
  } catch (err) {
    console.warn('Server unavailable, falling back to local chat creation:', err);
  }

  const newChatID = `chat_${Date.now()}`;
  currentChatID = newChatID;

  try {
    const allChats = JSON.parse(localStorage.getItem('allChats') || '{}');
    allChats[newChatID] = [];
    localStorage.setItem('allChats', JSON.stringify(allChats));
  } catch (e) {
    console.warn('Failed to create local chat snapshot', e);
  }

  history.pushState({}, '', `?chatid=${newChatID}`);

  if (typeof fetchAllChats === 'function') {
    fetchAllChats();
  }
  return newChatID;
}

let activeTypingAnimation = null;
let previousMode = 'explanation';


// count regex mathces "[A-Z])".options like A) B) C) etc. -> block input field -> insert buttons with A) B) C) -> Button pressed -> send option on server -> delete buttons -> unblock input
async function sendPrompt(chatId, promptText, inputElement, autoGenerated = false) {
  createModeSwitcher();

  const container = document.querySelector('div.message-container');
  if (container) {
    const newChatBlock = container.querySelector('.tutor-welcome');
    if (newChatBlock) {
      container.innerHTML = '';
      container.style.display = 'flex';
      container.style.flexDirection = 'column';
      container.style.alignItems = 'stretch';
      container.style.justifyContent = 'flex-start';
      container.style.minHeight = 'auto';
      container.style.padding = '20px';
      container.style.paddingTop = '88px';
    }
  }

  const allChats = JSON.parse(localStorage.getItem('allChats') || '{}');
  const messages = allChats[chatId] || [];
  if (!allChats[chatId]) allChats[chatId] = messages;

  if (!autoGenerated) {
    const userMsg = { _id: window.makeId(), type: 'text', content: promptText, isModelMessage: false };
    messages.push(userMsg);

    if (window.upsertMessageDom) {
      window.upsertMessageDom(userMsg);
    }
  }

  const aiMessage = {
    _id: window.makeId(),
    type: 'text',
    content: '⏳ Processing...',
    isModelMessage: true,
  };
  messages.push(aiMessage);

  localStorage.setItem('allChats', JSON.stringify(allChats));

  if (window.upsertMessageDom) {
    window.upsertMessageDom(aiMessage);
  } else {
    console.error('Critical error: window.upsertMessageDom not found.');
  }

  if (container) {
    container.style.paddingBottom = '120px';
    window.scrollTo(0, document.body.scrollHeight);
  }

  try {
    const mode = (typeof window.getCurrentMode === 'function')
      ? window.getCurrentMode()
      : 'explanation';

    console.log('Sending prompt with mode:', mode);

    const res = await fetch(window.buildApiUrl(`/api/chat/message`), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        chatId: chatId,
        message: promptText,
        mode: mode
      })
    });

    if (!res.ok) {
      throw new Error(`Server returned ${res.status}: ${res.statusText}`);
    }

    const data = await res.json();

    if (data.success && data.response) {
      let fullResponse = data.response;

      if (typeof fullResponse === 'object' && fullResponse !== null) {
        let formattedText = '';
        if (fullResponse.evaluation && fullResponse.evaluation !== 'START') {
          const evalStatus = fullResponse.evaluation.toLowerCase();
          let icon = '❌';
          if (evalStatus === 'correct') icon = '✅';
          else if (evalStatus === 'partial') icon = '⚠️';
          formattedText += `${icon} **${fullResponse.evaluation}**\n`;
          if (fullResponse.feedback) formattedText += `${fullResponse.feedback}\n\n`;
          formattedText += `---\n\n`;
        }
        if (fullResponse.question) formattedText += `💡 **Question:**\n${fullResponse.question}\n`;
        if (Array.isArray(fullResponse.options) && fullResponse.options.length > 0) {
          formattedText += '\n';
          fullResponse.options.forEach(opt => { formattedText += `- ${opt}\n`; });
        }
        if (!formattedText && fullResponse.question) formattedText = fullResponse.question;
        fullResponse = formattedText || JSON.stringify(fullResponse);
      }

      if (activeTypingAnimation) {
        activeTypingAnimation.cancel();
      }

      activeTypingAnimation = animateTyping(aiMessage, fullResponse, allChats, () => {
        activeTypingAnimation = null;

        // Check for options in the response and create buttons
        const options = fullResponse.match(/(?:^|\n)([a-zA-Z]\))/g);
        if (options) {
          const uniqueOptions = [...new Set(options.map(opt => opt.trim()))];
          const buttonContainer = document.createElement('div');
          buttonContainer.className = 'response-options';
          uniqueOptions.forEach(option => {
            const button = document.createElement('button');
            button.textContent = option;
            button.className = 'response-option-btn';
            button.addEventListener('click', () => {
              inputElement.disabled = false;
              inputElement.placeholder = 'Ask anything...';
              inputElement.focus();
              sendPrompt(chatId, option, inputElement, false);
              buttonContainer.remove();
            });
            buttonContainer.appendChild(button);
          });
          container.appendChild(buttonContainer);
          inputElement.disabled = true;
          inputElement.placeholder = 'Select an option...';
        } else {
          if (inputElement) {
            inputElement.disabled = false;
            inputElement.placeholder = (mode === 'testing') ? 'Type your answer...' : 'Ask anything...';
            inputElement.focus();
          }
        }
      });

    } else {
      aiMessage.content = 'Error: ' + (data.error || 'Unknown error');
      localStorage.setItem('allChats', JSON.stringify(allChats));
      if (window.updateMessageDomContent) {
        window.updateMessageDomContent(aiMessage._id, aiMessage.content);
      }
      if (inputElement) {
        inputElement.disabled = false;
        inputElement.placeholder = 'Ask anything...';
        inputElement.focus();
      }
    }

  } catch (error) {
    console.error('Error sending message:', error);
    aiMessage.content = '❌ Failed to connect to server.';
    localStorage.setItem('allChats', JSON.stringify(allChats));
    if (window.updateMessageDomContent) {
      window.updateMessageDomContent(aiMessage._id, aiMessage.content);
    }
    if (inputElement) {
      inputElement.disabled = false;
      inputElement.placeholder = 'Ask anything...';
    }
  }
}


function animateTyping(aiMessage, fullText, allChats, onComplete) {
  let currentIndex = 0;
  let cancelled = false;
  const CHARS_PER_INTERVAL = 3;
  const INTERVAL_MS = 10;

  aiMessage.content = '';

  const interval = setInterval(() => {
    if (cancelled) {
      clearInterval(interval);
      return;
    }

    const nextIndex = Math.min(currentIndex + CHARS_PER_INTERVAL, fullText.length);
    aiMessage.content = fullText.substring(0, nextIndex);
    currentIndex = nextIndex;

    localStorage.setItem('allChats', JSON.stringify(allChats));

    if (window.updateMessageDomContent) {
      window.updateMessageDomContent(aiMessage._id, aiMessage.content);
    }

    if (currentIndex >= fullText.length) {
      clearInterval(interval);
      if (onComplete) {
        onComplete();
      }
    }
  }, INTERVAL_MS);

  return {
    cancel: () => {
      cancelled = true;
      clearInterval(interval);
      aiMessage.content = fullText;
      localStorage.setItem('allChats', JSON.stringify(allChats));
      if (window.updateMessageDomContent) {
        window.updateMessageDomContent(aiMessage._id, aiMessage.content);
      }
      if (onComplete) {
        onComplete();
      }
    }
  };
}

async function generateChatTitle(chatId, promptText) {
  try {
    const res = await fetch(window.buildApiUrl(`/api/chat/${chatId}/title`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ prompt: promptText })
    });
    if (res.ok && typeof fetchAllChats === 'function') {
      fetchAllChats();
    }
  } catch (err) {
    console.error('Error calling title generation API:', err);
  }
}

async function setChatTitleStatic(chatId, title) {
  try {
    const res = await fetch(window.buildApiUrl(`/api/chat/${chatId}/title`),  {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ title: title })
    });
    if (res.ok && typeof fetchAllChats === 'function') {
      fetchAllChats();
    }
  } catch (err) {
    console.error('Error calling set title API:', err);
  }
}

async function isChatFresh(chatId) {
  if (!chatId || chatId === 'new') return true;
  try {
    const allChats = JSON.parse(localStorage.getItem('allChats') || '{}');
    if (allChats[chatId] && allChats[chatId].length > 0) return false;
  } catch (e) {}

  try {
    const res = await fetch(window.buildApiUrl(`/api/fetchChat/${chatId}`),  {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });
    if (res.ok) {
      const chat = await res.json();
      return (chat.messages || []).length === 0;
    }
  } catch (e) {
    return true;
  }
  return true;
}

function setupModeChangeListener() {
  if (typeof window.getCurrentMode === 'function') {
    setInterval(() => {
      const currentMode = window.getCurrentMode();
      if (currentMode === 'testing' && previousMode !== 'testing') {
        console.log('Switched to testing mode - auto-generating first question');
        const chatId = currentChatID;
        if (chatId && chatId !== 'new') {
          const input = document.querySelector('chat-input input');
          if (input) {
            input.disabled = true;
            input.placeholder = 'AI is generating a test...';
          }
          sendPrompt(chatId, 'Start testing', input, true);
        }
      }
      previousMode = currentMode;
    }, 500);
  }
}

async function fetchChatMessages(chatId) {
  currentChatID = chatId;

  const container = document.querySelector('div.message-container');
  if (!container) {
    setTimeout(() => fetchChatMessages(chatId), 50);
    return;
  }

  if (chatId === 'new') {
    const existingSwitcher = document.querySelector('.mode-switcher-container');
    if (existingSwitcher) existingSwitcher.remove();

    renderNewChatScreen();
    return;
  }

  setTimeout(() => createModeSwitcher(), 100);

  container.style.paddingBottom = '120px';
  container.style.paddingTop = '88px';
  container.style.display = 'flex';
  container.style.flexDirection = 'column';
  container.style.justifyContent = 'flex-start';
  container.style.alignItems = 'stretch';

  try {
    const res = await fetch(window.buildApiUrl(`/api/fetchChat/${chatId}`),  {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });

    if (res.ok) {
      const chat = await res.json();
      const serverMessages = (chat.messages || []).map(cm => ({
        _id: window.makeId(),
        type: 'text',
        content: cm.message || '',
        message: cm.message || '',
        isModelMessage: !!cm.modelMessage,
        pending: !!cm.pending
      }));

      try {
        const allChats = JSON.parse(localStorage.getItem('allChats') || '{}');
        allChats[chatId] = serverMessages;
        localStorage.setItem('allChats', JSON.stringify(allChats));
      } catch (e) {}

      renderMessages(serverMessages, container);
      return;
    }
  } catch (err) {
    console.warn('Fallback to local storage', err);
  }

  const allChats = JSON.parse(localStorage.getItem('allChats') || '{}');
  const messages = allChats[chatId] || [];
  messages.forEach(m => { if (!m._id) m._id = window.makeId(); });
  renderMessages(messages, container);
}

function createMessageNode(msg) {
  const wrapper = document.createElement('div');
  wrapper.className = `message-wrapper ${msg.isModelMessage ? 'model' : 'user'}`;
  wrapper.dataset.id = msg._id;

  if (msg.type === 'file') {
    const bubble = document.createElement('div');
    bubble.className = 'message message-bubble file-preview';
    const text = document.createElement('div');
    text.className = 'message-text';
    text.textContent = msg.filename || 'File';
    bubble.appendChild(text);
    wrapper.appendChild(bubble);
    return wrapper;
  }

  const bubble = document.createElement('div');
  bubble.className = 'message message-bubble';
  const text = document.createElement('div');
  text.className = 'message-text';

  const rawText = msg.content || msg.message || '';
  if (typeof processMarkdown === 'function') {
    text.innerHTML = processMarkdown(rawText);
  } else {
    text.textContent = rawText;
  }

  bubble.appendChild(text);
  wrapper.appendChild(bubble);
  return wrapper;
}

function renderMessages(messages, container) {
  container.innerHTML = '';

  if (!messages || messages.length === 0) {
    container.style.minHeight = '200px';
    return;
  }

  messages.forEach(msg => {
    container.appendChild(createMessageNode(msg));
  });
}

window.upsertMessageDom = function(msg) {
  const container = document.querySelector('div.message-container');
  if (!container) return;
  if (!msg._id) msg._id = window.makeId();

  const existingNode = container.querySelector(`[data-id="${msg._id}"]`);
  if (existingNode) {
    const textEl = existingNode.querySelector('.message-text');
    if (textEl) {
      const rawText = msg.content || msg.message || '';
      textEl.innerHTML = (typeof processMarkdown === 'function') ? processMarkdown(rawText) : rawText;
    }
    existingNode.className = `message-wrapper ${msg.isModelMessage ? 'model' : 'user'}`;
  } else {
    container.appendChild(createMessageNode(msg));
    window.scrollTo(0, document.body.scrollHeight);
  }
};

window.updateMessageDomContent = function(id, newContent) {
  const node = document.querySelector(`div.message-wrapper[data-id="${id}"]`);
  if (!node) return;
  const textEl = node.querySelector('.message-text');
  if (textEl) {
    textEl.innerHTML = (typeof processMarkdown === 'function') ? processMarkdown(newContent) : newContent;
  }
  window.scrollTo(0, document.body.scrollHeight);
};

function renderNewChatScreen() {
  const container = document.querySelector('div.message-container');

  if (!container) {
    setTimeout(renderNewChatScreen, 50);
    return;
  }

  container.style.display = 'flex';
  container.style.alignItems = 'center';
  container.style.justifyContent = 'center';
  container.style.minHeight = '80vh';
  container.style.padding = '40px 20px 120px';

  container.innerHTML = `
    <div class="tutor-welcome">
        <div class="tutor-logo">
            <div class="logo-glow"></div>
            <div class="logo-circle">🎓</div>
        </div>

        <h1 class="tutor-title">AI Tutor</h1>
        <p class="tutor-subtitle">Your intelligent learning companion</p>

        <div class="features-grid">
            <div class="feature-card">
                <div class="feature-icon">📁</div>
                <h3 class="feature-title">Upload Materials</h3>
                <p class="feature-desc">Add your study files and documents</p>
            </div>
            <div class="feature-card">
                <div class="feature-icon">💬</div>
                <h3 class="feature-title">Ask Questions</h3>
                <p class="feature-desc">Get instant explanations and answers</p>
            </div>
            <div class="feature-card">
                <div class="feature-icon">✓</div>
                <h3 class="feature-title">Create Quizzes</h3>
                <p class="feature-desc">Test your knowledge with AI-generated tests</p>
            </div>
            <div class="feature-card">
                <div class="feature-icon">📊</div>
                <h3 class="feature-title">Track Progress</h3>
                <p class="feature-desc">Monitor your learning journey</p>
            </div>
        </div>

        <div class="start-hint">
            <span class="arrow-down">↓</span> Upload files or type your question below to get started
        </div>
    </div>
  `;
}

function createModeSwitcher() {
  const existingSwitcher = document.querySelector('.mode-switcher-container');
  if (existingSwitcher) return;

  const header = document.querySelector('header') || document.querySelector('.app-header') || document.body;
  const switcherHTML = `
    <div class="mode-switcher-container">
      <div class="mode-switcher">
        <button class="mode-btn ${currentMode === 'explanation' ? 'active' : ''}" data-mode="explanation">
          <span class="mode-icon">📚</span><span class="mode-label">Explanation</span>
        </button>
        <button class="mode-btn ${currentMode === 'testing' ? 'active' : ''}" data-mode="testing">
          <span class="mode-icon">✓</span><span class="mode-label">Testing</span>
        </button>
      </div>
    </div>
  `;

  if (!document.querySelector('#mode-switcher-styles')) {
    const styleEl = document.createElement('div');
    styleEl.id = 'mode-switcher-styles';
    styleEl.innerHTML = `<style>
      .mode-switcher-container { display: flex; justify-content: center; padding: 12px 0; position: sticky; top: 60px; z-index: 100; background: var(--switcher-bg); backdrop-filter: blur(10px); border-bottom: 1px solid var(--surface-border); }
      .mode-switcher { display: inline-flex; background: var(--surface-bg); border: 1px solid var(--surface-border); border-radius: 12px; padding: 4px; gap: 4px; }
      .mode-btn { display: flex; align-items: center; gap: 8px; padding: 10px 20px; background: transparent; border: none; border-radius: 8px; color: var(--switcher-btn-color); font-weight: 500; cursor: pointer; transition: all 0.3s ease; }
      .mode-btn:hover { background: var(--surfacfe-hover); color: var(--text-primary); }
      .mode-btn.active { background: var(--switcher-btn-active-bg); color: var(--switcher-btn-active-text); }
    </style>`;
    document.head.appendChild(styleEl);
  }

  if (header === document.body) document.body.insertAdjacentHTML('afterbegin', switcherHTML);
  else header.insertAdjacentHTML('afterend', switcherHTML);

  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const newMode = btn.dataset.mode;
      if (newMode !== currentMode) {
        currentMode = newMode;
        document.querySelectorAll('.mode-btn').forEach(b => b.classList.toggle('active', b.dataset.mode === newMode));
        handleModeChange(newMode);
      }
    });
  });
}

function handleModeChange(mode) {
  console.log(`Mode changed to: ${mode}`);
  const notification = document.createElement('div');
  notification.className = 'mode-notification';
  notification.style.cssText = `position: fixed; bottom: 140px; left: 50%; transform: translateX(-50%); background: var(--switcher-btn-active-bg); border: 1px solid var(--accent-color); border-radius: 8px; padding: 12px 20px; color: var(--text-primary); font-size: 14px; z-index: 1000; animation: slideUp 0.3s ease-out; backdrop-filter: blur(10px);`;
  const modeText = mode === 'explanation' ? 'Explanation Mode' : 'Testing Mode';
  notification.innerHTML = `<span style="margin-right: 8px;">${mode === 'explanation' ? '📚' : '✓'}</span>${modeText}`;
  document.body.appendChild(notification);
  setTimeout(() => notification.remove(), 2500);
}

window.getCurrentMode = () => currentMode;

component('chat-input', (node) => {
  const logoSources = { light: 'icon/icon-light.png', dark: 'icon/icon-dark.png' };
  const resolveTheme = () => (document.body.classList.contains('dark-theme') ? 'dark' : 'light');

  createNode('img', node, img => {
    img.classList.add('chat-input-logo');
    img.alt = 'AI Tutor';
    const applyLogo = () => { img.src = logoSources[resolveTheme()] || logoSources.light; };
    applyLogo();
    document.addEventListener('themechange', applyLogo);
  });

  createNode('input', node, input => {
    input.type = 'text';
    input.placeholder = 'Ask anything...';
    input.onkeydown = async (e) => {
      if (e.key === 'Enter' && input.value.trim() && !input.disabled) {
        let chatId = currentChatID;
        const promptValue = input.value;
        input.value = '';
        input.disabled = true;
        input.placeholder = 'AI is thinking...';

        const isNewChat = await isChatFresh(chatId);
        if (isNewChat && (!chatId || chatId === "new")) {
          chatId = await createNewChat();
        }
        sendPrompt(chatId, promptValue, input, false);
        if (isNewChat && chatId) generateChatTitle(chatId, promptValue);
      }
    };
  });
  createNode('span', node, span => { span.id = 'upload-trigger-button'; span.className = 'upload-icon'; span.innerHTML = '+'; });
});

component('chat', (node) => {
  createNode('div', node, div => {
    div.classList.add('message-container');

    if (currentChatID === 'new') {
      setTimeout(renderNewChatScreen, 0);
    } else {
      setTimeout(() => fetchChatMessages(currentChatID), 0);
    }
  });
  createNode('chat-input', node, () => {});
});

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupModeChangeListener);
  document.addEventListener('DOMContentLoaded', () => fetchChatMessages(currentChatID));
} else {
  setupModeChangeListener();
  fetchChatMessages(currentChatID);
}

window.createNewChat = createNewChat;
window.setChatTitleStatic = setChatTitleStatic;
