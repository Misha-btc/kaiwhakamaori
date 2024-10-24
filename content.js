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
    const textContainer = element.querySelector('[data-text="true"]');
    if (textContainer) {
      textContainer.textContent = value;
    } else {
      // Если не найден специфический элемент, используем предыдущий метод
      element.innerText = value;
    }
  } else {
    element.value = value;
  }
  element.dispatchEvent(new Event('input', { bubbles: true }));
  element.dispatchEvent(new Event('change', { bubbles: true }));
  console.log("Содержимое активного элемента изменено на:", value);
}
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.command === "start-lens") {
    const lens = document.createElement('msc-lens');
    lens.addEventListener('capture', (event) => {
      const canvas = event.detail;
      canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        chrome.runtime.sendMessage({command: "download-image", url: url});
      });
    });
    document.body.appendChild(lens);
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.command === "display-screenshot") {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0, 0, 0, 0.7);
      z-index: 9999;
      display: flex;
      justify-content: center;
      align-items: center;
    `;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
    };
    img.src = message.screenshotUrl;

    canvas.style.cssText = `
      max-width: 90%;
      max-height: 90%;
      box-shadow: 0 0 20px rgba(0, 0, 0, 0.5);
    `;

    overlay.appendChild(canvas);
    document.body.appendChild(overlay);

    overlay.addEventListener('click', () => {
      document.body.removeChild(overlay);
    });

    let isDrawing = false;
    let startX, startY, endX, endY;

    canvas.addEventListener('mousedown', (e) => {
      isDrawing = true;
      [startX, startY] = getMousePos(canvas, e);
      endX = startX;
      endY = startY;
    });

    canvas.addEventListener('mousemove', (e) => {
      if (!isDrawing) return;
      [endX, endY] = getMousePos(canvas, e);
      drawSelection();
    });

    canvas.addEventListener('mouseup', async () => {
      isDrawing = false;
      const croppedDataUrl = cropCanvas(canvas, startX, startY, endX, endY);
      console.log('Выделенная область сохранена:', croppedDataUrl);
      
      const inputText = await showTextInputModal();
      
      chrome.runtime.sendMessage({
        command: "save-cropped-image", 
        dataUrl: croppedDataUrl,
        text: inputText
      });
      
      document.body.removeChild(overlay);
    });

    function getMousePos(canvas, evt) {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      return [
        (evt.clientX - rect.left) * scaleX,
        (evt.clientY - rect.top) * scaleY
      ];
    }

    function drawSelection() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      ctx.fillStyle = 'rgba(0, 0, 255, 0.3)';
      ctx.fillRect(
        Math.min(startX, endX),
        Math.min(startY, endY),
        Math.abs(endX - startX),
        Math.abs(endY - startY)
      );
    }

    function cropCanvas(canvas, startX, startY, endX, endY) {
      const croppedCanvas = document.createElement('canvas');
      const ctx = croppedCanvas.getContext('2d');
      
      const x = Math.min(startX, endX);
      const y = Math.min(startY, endY);
      const width = Math.abs(endX - startX);
      const height = Math.abs(endY - startY);
      
      croppedCanvas.width = width;
      croppedCanvas.height = height;
      
      ctx.drawImage(canvas, x, y, width, height, 0, 0, width, height);
      
      return croppedCanvas.toDataURL('image/png');
    }
  }
});

function showTextInputModal() {
  const modal = document.createElement('div');
  modal.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background-color: white;
    padding: 20px;
    border-radius: 5px;
    box-shadow: 0 0 10px rgba(0,0,0,0.3);
    z-index: 10000;
  `;

  const input = document.createElement('input');
  input.type = 'text';
  input.placeholder = 'Введите текст';
  input.style.cssText = `
    width: 100%;
    padding: 5px;
    margin-bottom: 10px;
  `;

  const button = document.createElement('button');
  button.textContent = 'Сохранить';
  button.style.cssText = `
    padding: 5px 10px;
    background-color: #4CAF50;
    color: white;
    border: none;
    border-radius: 3px;
    cursor: pointer;
  `;

  modal.appendChild(input);
  modal.appendChild(button);
  document.body.appendChild(modal);

  return new Promise((resolve) => {
    button.addEventListener('click', () => {
      const text = input.value;
      document.body.removeChild(modal);
      resolve(text);
    });

    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        button.click();
      }
    });
  });
}
