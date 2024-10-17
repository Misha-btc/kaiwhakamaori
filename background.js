// background.js
chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  if (message.type === "GENERATE_TEXT") {
    try {
      // Получаем API-ключ из хранилища
      const result = await chrome.storage.sync.get(['apiKey']);
      const apiKey = result.apiKey;

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
          model: 'gpt-3.5-turbo',
          messages: [
            { role: "system", content: "Вы - переводите текст с русского на английский." },
          ],
          max_tokens: 50
        })
      });

      const data = await response.json();
      if (response.ok) {
        sendResponse({ success: true, data: data.choices[0].message.content });
      } else {
        sendResponse({ success: false, error: data.error.message });
      }
    } catch (error) {
      console.error("Ошибка при работе с API OpenAI:", error);
      sendResponse({ success: false, error: error.message });
    }

    return true; // Указывает, что ответ асинхронный
  }
});

chrome.commands.onCommand.addListener((command) => {
  if (command === "fix-punctuation") {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {command: "fix-punctuation"});
    });
  }
});
