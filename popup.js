document.addEventListener('DOMContentLoaded', function() {
  const apiKeyInput = document.getElementById('apiKeyInput');
  const saveButton = document.getElementById('saveButton');
  const apiKeyDisplay = document.getElementById('apiKeyDisplay');
  const apiKeyValue = document.getElementById('apiKeyValue');
  const targetLangInput = document.getElementById('targetLangInput');
  const saveTargetLangButton = document.getElementById('saveTargetLangButton');
  const targetLangDisplay = document.getElementById('targetLangDisplay');
  const targetLangValue = document.getElementById('targetLangValue');
  const deleteButton = document.getElementById('deleteButton');
  const emojiToggle = document.getElementById('emojiToggle');

  console.log('DOM загружен');

  // Загрузка сохраненного API ключа и целевого языка при открытии popup
  chrome.storage.sync.get(['apiKey', 'targetLang'], function(result) {
    if (result.apiKey) {
      apiKeyInput.value = result.apiKey;
      apiKeyValue.textContent = result.apiKey;
      apiKeyDisplay.style.display = 'block';
    }
    if (result.targetLang) {
      targetLangInput.value = result.targetLang;
      targetLangValue.textContent = result.targetLang;
      targetLangDisplay.style.display = 'block';
    }
  });

  // Обработчик события для кнопки "Save API Key"
  saveButton.addEventListener('click', function() {
    const apiKey = apiKeyInput.value.trim();
    if (apiKey) {
      chrome.storage.sync.set({apiKey: apiKey}, function() {
        apiKeyValue.textContent = apiKey;
        apiKeyDisplay.style.display = 'block';
      });
    }
  });

  // Обработчик события для кнопки "Save Target Language"
  saveTargetLangButton.addEventListener('click', function() {
    const targetLang = targetLangInput.value.trim();
    if (targetLang) {
      chrome.storage.sync.set({targetLang: targetLang}, function() {
        targetLangValue.textContent = targetLang;
        targetLangDisplay.style.display = 'block';
      });
    }
  });

  // Удаление API ключа и целевого языка
  deleteButton.addEventListener('click', function() {
    chrome.storage.sync.remove(['apiKey', 'targetLang'], function() {
      apiKeyDisplay.style.display = 'none';
      targetLangDisplay.style.display = 'none';
      apiKeyInput.value = '';
      targetLangInput.value = '';
    });
  });

  chrome.storage.sync.get(['useEmoji'], function(result) {
    emojiToggle.checked = result.useEmoji !== false;
  });

  emojiToggle.addEventListener('change', function() {
    chrome.storage.sync.set({useEmoji: emojiToggle.checked});
  });
});
