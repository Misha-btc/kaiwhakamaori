chrome.commands.onCommand.addListener((command) => {
  if (command === "fix-punctuation") {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {command: "fix-punctuation"});
    });
  } else if (command === "capture-screenshot") {
    chrome.tabs.captureVisibleTab(null, {format: 'png'}, function(dataUrl) {
      console.log('Скриншот сделан:', dataUrl);
      
      // Сохранение скриншота
      chrome.downloads.download({
        url: dataUrl,
        filename: 'screenshot.png',
        saveAs: true
      });
    });
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "FIX_PUNCTUATION") {
    console.log("Получено сообщение FIX_PUNCTUATION");
    console.log("Текст для исправления:", message.text);
    
    (async () => {
      try {
        const result = await chrome.storage.sync.get(['apiKey', 'targetLang', 'useEmoji']);
        const apiKey = result.apiKey;
        const targetLang = result.targetLang || 'английский'; // Используем 'английский' по умолчанию
        const useEmoji = result.useEmoji !== false;

        if (!apiKey) {
          throw new Error("API ключ не найден. Пожалуйста, сохраните ключ в настройках расширения.");
        }

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini-2024-07-18',
            messages: [
              { role: "system", content: `Вы - эксперт по переводу текста на ${targetLang}. Переведите следующий текст, исправьте ошибки пунктуации${useEmoji ? ', а также добавьте эмодзи по смыслу' : ''}:` },
              { role: "user", content: message.text }
            ],
            max_tokens: 150
          })
        });

        const data = await response.json();
        if (response.ok) {
          sendResponse({
            success: true,
            fixedText: data.choices[0].message.content,
            id: data.id,
            object: data.object,
            created: data.created,
            model: data.model,
            usage: data.usage
          });
        } else {
          sendResponse({ success: false, error: data.error.message });
        }
      } catch (error) {
        console.error("Ошибка при работе с API OpenAI:", error);
        sendResponse({ success: false, error: error.message });
      }
    })();

    return true; // Указывает, что ответ асинхронный
  }
});
