document.addEventListener('DOMContentLoaded', function() {
  const apiKeyInput = document.getElementById('apiKeyInput');
  const saveButton = document.getElementById('saveButton');
  const apiKeyDisplay = document.getElementById('apiKeyDisplay');
  const apiKeyValue = document.getElementById('apiKeyValue');

  console.log('DOM загружен');

  // Загрузка сохраненного API ключа при открытии popup
  chrome.storage.sync.get(['apiKey'], function(result) {
    if (result.apiKey) {
      apiKeyInput.value = result.apiKey;
      apiKeyValue.textContent = result.apiKey;
      apiKeyDisplay.style.display = 'block';
    }
  });

  // Обработчик события для кнопки "Save"
  saveButton.addEventListener('click', function() {
    const apiKey = apiKeyInput.value.trim();
    if (apiKey) {
      chrome.storage.sync.set({apiKey: apiKey}, function() {
        apiKeyValue.textContent = apiKey;
        apiKeyDisplay.style.display = 'block';
      });
    }
  });
  // delete api key
  deleteButton.addEventListener('click', function() {
    chrome.storage.sync.remove('apiKey', function() {
      apiKeyDisplay.style.display = 'none';
    });
  });
});