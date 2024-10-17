// Слушаем команду "fix-punctuation"
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.command === "fix-punctuation") {
    console.log("Получена команда fix-punctuation");
    
    const activeElement = document.activeElement;

    if (activeElement && (activeElement.tagName === "INPUT" || activeElement.tagName === "TEXTAREA")) {
      const inputContent = activeElement.value;

      chrome.runtime.sendMessage(
        { type: "GENERATE_TEXT", prompt: inputContent },
        (response) => {
          if (chrome.runtime.lastError) {
            console.error("Ошибка при отправке сообщения:", chrome.runtime.lastError);
            updateInputValue(activeElement, "Hello " + inputContent);
          } else if (response && response.success) {
            updateInputValue(activeElement, "Hello " + response.data);
          } else {
            console.error("Неожиданный ответ:", response);
            updateInputValue(activeElement, "Hello " + inputContent);
          }
        }
      );
    } else {
      console.log("Активный элемент не является текстовым полем или текстовой областью");
    }
  }
});

function updateInputValue(element, value) {
  element.value = value;
  element.dispatchEvent(new Event('input', { bubbles: true }));
  element.dispatchEvent(new Event('change', { bubbles: true }));
  console.log("Содержимое активного элемента изменено на:", value);
}
