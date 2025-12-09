"use strict";

function waitForContainer(timeout = 2000) {
  return new Promise(resolve => {
    const start = Date.now();
    const check = () => {
      const c = document.querySelector('div.message-container');
      if (c) return resolve(c);
      if (Date.now() - start > timeout) return resolve(null);
      setTimeout(check, 50);
    };
    check();
  });
}

async function ensureMessageShown(msg) {
  const container = await waitForContainer(2000);
  if (!container) {
    if (typeof fetchChatMessages === 'function') {
      fetchChatMessages(currentChatID);
    }
    return;
  }

  if (typeof window.upsertMessageDom === 'function') {
    window.upsertMessageDom(msg);
  }

  setTimeout(() => {
    const found = container.querySelector(`[data-id="${msg._id}"]`);
    if (!found && typeof fetchChatMessages === 'function') {
      console.warn(`ensureMessageShown: Message ${msg._id} not found in DOM, calling fetchChatMessages.`);
      fetchChatMessages(currentChatID);
    }
  }, 120);
}

function initializeUploader() {
  const uploadButton = document.getElementById('upload-trigger-button');
  if (!uploadButton) {
    setTimeout(initializeUploader, 100);
    return;
  }

  if (typeof window.upsertMessageDom !== 'function' ||
    typeof window.createNewChat !== 'function' ||
    typeof window.makeId !== 'function' ||
    typeof window.setChatTitleStatic !== 'function') {

    console.warn("Upload.js: waiting for dependencies (makeId, upsertMessageDom, createNewChat, setChatTitleStatic)...");
    setTimeout(initializeUploader, 100);
    return;
  }

  console.log("Upload.js: dependencies loaded. Initializing.");

  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'image/*, audio/*, video/*, .pdf, .txt, .docx';
  fileInput.style.display = 'none';
  document.body.appendChild(fileInput);

  uploadButton.addEventListener('click', () => {
    if (uploadButton.classList.contains('uploading')) return;
    fileInput.click();
  });

  fileInput.addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    let createdNew = false;

    const noChat = (!currentChatID || currentChatID === 'new');

    let wasFresh = false;
    try {
      wasFresh = (typeof isChatFresh === 'function') ? await isChatFresh(currentChatID) : noChat;
    } catch (e) {
      wasFresh = noChat;
    }

    if (noChat) {
      uploadButton.classList.add('uploading');
      uploadButton.innerHTML = '⏳';
      try {
        const created = await window.createNewChat();
        if (created) {
          currentChatID = created;
          createdNew = true;
        } else {
          throw new Error("createNewChat did not return ID");
        }

        const container = document.querySelector('div.message-container');
        if (container) {
          const newChatBlock = container.querySelector('.new-chat-container');
          if (newChatBlock) {
            container.innerHTML = '';
            container.style.display = 'flex';
            container.style.flexDirection = 'column';
            container.style.alignItems = 'stretch';
            container.style.justifyContent = 'flex-start';
            container.style.minHeight = 'auto';
            container.style.padding = '20px';
            container.style.paddingTop = '88px';
            container.style.paddingBottom = '120px';
          }
        }
      } catch (err) {
        console.error('Failed to create chat for upload:', err);
        alert('⚠️ Failed to create chat for upload. Please try again.');
        uploadButton.classList.remove('uploading');
        uploadButton.innerHTML = '+';
        event.target.value = '';
        return;
      }
    }

    let isFreshAfter = false;
    try {
      isFreshAfter = (typeof isChatFresh === 'function') ? await isChatFresh(currentChatID) : true;
    } catch (e) {
      isFreshAfter = true;
    }

    if (isFreshAfter) {
      try {
        window.setChatTitleStatic(currentChatID, `${file.name} Upload`);
      } catch (e) {
        console.warn('Failed to set chat title after upload:', e);
      }
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      uploadButton.classList.add('uploading');
      uploadButton.innerHTML = '⏳';

      const response = await fetch(window.buildApiUrl(`/api/upload/${currentChatID}`), {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        const serverMsg = await response.json();

        const fileMsg = {
          _id: window.makeId(),
          type: 'file',
          isModelMessage: false,
          content: serverMsg.content || serverMsg.data || '',
          message: serverMsg.message || '',
          filename: serverMsg.filename || file.name
        };

        const successText = `✔️ The material \`${file.name}\` was processed successfully. You can now ask questions based on this file.`;
        const successMsg = {
          _id: window.makeId(),
          type: 'text',
          isModelMessage: true,
          content: serverMsg.message || successText,
          message: serverMsg.message || successText
        };

        try {
          const allChats = JSON.parse(localStorage.getItem('allChats') || '{}');
          if (!allChats[currentChatID]) allChats[currentChatID] = [];
          allChats[currentChatID].push(fileMsg);
          allChats[currentChatID].push(successMsg);
          localStorage.setItem('allChats', JSON.stringify(allChats));
        } catch (e) {
          console.warn("Failed to persist file messages to localStorage", e);
        }

        await ensureMessageShown(fileMsg);
        await ensureMessageShown(successMsg);

        const container = document.querySelector('div.message-container');
        if (container) {
          setTimeout(() => {
            try {
              container.scrollTop = container.scrollHeight;
            } catch (e) {
              window.scrollTo(0, document.body.scrollHeight);
            }
          }, 60);
        }

        if (typeof fetchAllChats === 'function') fetchAllChats();

      } else {
        let errorMessage = `Error ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (e) {}
        alert(`❌ Error processing file: ${errorMessage}`);
      }
    } catch (err) {
      console.error("Error uploading file:", err);
      alert("⚠️ Failed to send file to server. Check your connection.");
    } finally {
      uploadButton.classList.remove('uploading');
      uploadButton.innerHTML = '+';
      event.target.value = '';
    }
  });
}

document.addEventListener('DOMContentLoaded', initializeUploader);
