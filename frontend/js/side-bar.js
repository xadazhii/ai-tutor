"use strict";

async function createServerChat() {
  const btn = select('button.new-chat-button');
  if (btn) btn.disabled = true;
  try {
    const res = await fetch(window.buildApiUrl(`/api/chat`), {
      method: 'POST',
      headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' }
    });
    if (!res.ok) {
      console.error('Failed to create chat', res.status, res.statusText);
      return null;
    }
    const chat = await res.json();
    if (chat && chat.id) {
      currentChatID = chat.id;
      history.pushState({}, '', `?chatid=${chat.id}`);

      const sidebar = select("side-bar");
      if (sidebar && sidebar.classList.contains("active")) {
        sidebar.classList.remove("active");
      }

      window.scrollTo(0, 0);

      if (typeof fetchChatMessages === 'function') {
        await fetchChatMessages(chat.id);
      }

      if (typeof fetchAllChats === 'function') {
        await fetchAllChats();
      }

      return chat.id;
    }
    return null;
  } catch (err) {
    console.error('Error creating chat', err);
    return null;
  } finally {
    if (btn) btn.disabled = false;
  }
}

async function fetchAllChats() {
  try {
    const response = await fetch(window.buildApiUrl(`/api/allChats`),  {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });

    if (!response.ok) {
      console.error('Failed to fetch chats', response.status, response.statusText);
      return;
    }

    const json = await response.json();
    let container = select('div.chats-container');
    container.innerHTML = '';

    const toolbar = document.createElement('div');
    toolbar.style.display = 'flex';
    toolbar.style.justifyContent = 'space-between';
    toolbar.style.alignItems = 'center';
    toolbar.style.padding = '8px 10px';
    toolbar.style.borderBottom = '1px solid var(--toolbar-border)';
    toolbar.style.marginBottom = '6px';

    const title = document.createElement('div');
    title.textContent = 'Chats';
    title.style.fontWeight = '600';
    title.style.color = 'var(--text)';
    toolbar.appendChild(title);

    const newBtn = document.createElement('button');
    newBtn.className = 'new-chat-button';
    newBtn.textContent = '+ New';
    newBtn.title = 'Create new chat';
    newBtn.style.background = 'var(--toolbar-button-bg)';
    newBtn.style.border = '1px solid var(--toolbar-button-border)';
    newBtn.style.borderRadius = '8px';
    newBtn.style.padding = '6px 8px';
    newBtn.style.cursor = 'pointer';
    newBtn.style.color = 'var(--toolbar-button-text)';
    newBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      newBtn.disabled = true;
      await createServerChat();
      newBtn.disabled = false;
    });
    toolbar.appendChild(newBtn);

    container.appendChild(toolbar);

    if (!json || json.length === 0) {
      const empty = document.createElement('div');
      empty.textContent = 'No chats yet';
      empty.style.padding = '12px';
      empty.style.color = 'var(--secondary-text)';
      container.appendChild(empty);
      return;
    }

    for (let chat of json) {
      createNode('nav-chat', container, nav => {
        nav.style.display = 'flex';
        nav.style.alignItems = 'center';
        nav.style.justifyContent = 'space-between';
        nav.style.padding = '8px 10px';
        nav.style.cursor = 'default';

        const left = document.createElement('div');
        left.style.display = 'flex';
        left.style.alignItems = 'center';
        left.style.flexGrow = '1';
        left.style.cursor = 'pointer';

        const titleSpan = document.createElement('span');
        titleSpan.textContent = chat.title || 'Untitled';
        titleSpan.style.flexGrow = '1';
        titleSpan.style.userSelect = 'none';

        left.appendChild(titleSpan);
        left.addEventListener('click', () => {
          select("side-bar").classList.toggle("active");
          fetchChatMessages(chat.id);
          history.pushState({}, '', `?chatid=${chat.id}`);
          window.scrollTo(0, 0);
        });

        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = '🗑️';
        deleteBtn.title = 'Delete chat';
        deleteBtn.style.marginLeft = '10px';
        deleteBtn.style.background = 'none';
        deleteBtn.style.border = 'none';
        deleteBtn.style.cursor = 'pointer';
        deleteBtn.style.color = 'var(--danger-text)';
        deleteBtn.addEventListener('click', async (e) => {
          e.stopPropagation();
          if (!confirm('Delete this chat?')) return;
          try {
            const delRes = await fetch(window.buildApiUrl(`/api/chat/${chat.id}`),{ method: 'DELETE' });
            if (!delRes.ok) {
              console.error('Failed to delete chat', delRes.statusText);
            } else {
              if (typeof currentChatID !== 'undefined' && currentChatID === chat.id) {
                currentChatID = 'new';
                history.pushState({}, '', '/');
                fetchChatMessages('new');
              }
              fetchAllChats();
            }
          } catch (err) {
            console.error('Error deleting chat', err);
          }
        });

        nav.appendChild(left);
        nav.appendChild(deleteBtn);
      });
    }
  } catch (err) {
    console.error('Error fetching chats', err);
  }
}

window.fetchAllChats = fetchAllChats;
window.createServerChat = createServerChat;

document.addEventListener('DOMContentLoaded', () => {
  fetchAllChats();
});
