// Слушаем команду "fix-punctuation"
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.command === "fix-punctuation") {
    console.log("Получена команда fix-punctuation");
    
    const activeElement = document.activeElement;

    if (activeElement && (activeElement.tagName === "INPUT" || activeElement.tagName === "TEXTAREA" || activeElement.isContentEditable)) {
      const inputContent = getElementContent(activeElement);
      chrome.runtime.sendMessage({type: "FIX_PUNCTUATION", text: inputContent}, (response) => {
        if (response.success) {
          updateElementContent(activeElement, response.fixedText);
        } else {
          console.error("Ошибка при исправлении пунктуации:", response.error);
        }
      });
    }
  }
});

function getElementContent(element) {
  if (element.isContentEditable) {
    return element.innerText;
  }
  return element.value;
}

function updateElementContent(element, value) {
  if (element.isContentEditable) {
    element.innerText = value;
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
  } else {
    element.value = value;
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
  }
  console.log("Содержимое активного элемента изменено на:", value);
}
