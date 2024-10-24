// Слушатель сообщений для команды "fix-punctuation"
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.command === "fix-punctuation") {
    console.log("Получена команда fix-punctuation");
    
    // Получаем активный элемент на странице
    const activeElement = document.activeElement;

    // Проверяем, является ли активный элемент текстовым полем или редактируемым содержимым
    if (activeElement && (activeElement.tagName === "INPUT" || activeElement.tagName === "TEXTAREA" || activeElement.isContentEditable)) {
      // Получаем содержимое активного элемента
      const inputContent = getElementContent(activeElement);
      // Отправляем сообщение в background script для исправления пунктуации
      chrome.runtime.sendMessage({type: "FIX_PUNCTUATION", text: inputContent}, (response) => {
        if (response.success) {
          // Если исправление успешно, обновляем содержимое элемента
          updateElementContent(activeElement, response.fixedText);
        } else {
          console.error("Ошибка при исправлении пунктуации:", response.error);
        }
      });
    }
  }
});

// Функция для получения содержимого элемента
function getElementContent(element) {
  // Если элемент редактируемый, возвращаем его innerText
  if (element.isContentEditable) {
    return element.innerText;
  }
  // Иначе возвращаем значение элемента
  return element.value;
}

// Функция для обновления содержимого элемента
function updateElementContent(element, value) {
  if (element.isContentEditable) {
    // Ищем специфический контейнер для текста
    const textContainer = element.querySelector('[data-text="true"]');
    if (textContainer) {
      textContainer.textContent = value;
    } else {
      // Если специфический контейнер не найден, обновляем innerText
      element.innerText = value;
    }
  } else {
    // Для обычных input и textarea элементов обновляем value
    element.value = value;
  }
  // Генерируем события input и change для обновления состояния элемента
  element.dispatchEvent(new Event('input', { bubbles: true }));
  element.dispatchEvent(new Event('change', { bubbles: true }));
  console.log("Содержимое активного элемента изменено на:", value);
}


//////////////////////////////////////////////////////////// crop


// Слушатель сообщений для отображения скриншота
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.command === "display-screenshot") {
    // Блокируем прокрутку страницы
    document.body.style.overflow = 'hidden';
    
    // Создаем оверлей для отображения скриншота
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

    // Создаем canvas для отображения и редактирования скриншота
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
    };
    img.src = message.screenshotUrl;

    // Стилизуем canvas
    canvas.style.cssText = `
      max-width: 100%;
      max-height: 100%;
      box-shadow: 0 0 20px rgba(0, 0, 0, 0.5);
    `;

    // Добавляем canvas в оверлей и оверлей на страницу
    overlay.appendChild(canvas);
    document.body.appendChild(overlay);

    // Закрываем оверлей при клике
    overlay.addEventListener('click', () => {
      document.body.removeChild(overlay);
    });

    // Переменные для отслеживания выделения области
    let isDrawing = false;
    let startX, startY, endX, endY;

    // Обработчик начала выделения
    canvas.addEventListener('mousedown', (e) => {
      isDrawing = true;
      [startX, startY] = getMousePos(canvas, e);
      endX = startX;
      endY = startY;
    });

    // Обработчик перемещения мыши при выделении
    canvas.addEventListener('mousemove', (e) => {
      if (!isDrawing) return;
      [endX, endY] = getMousePos(canvas, e);
      drawSelection();
    });

    // Обработчик окончания выделения
    canvas.addEventListener('mouseup', async () => {
      isDrawing = false;
      // Обрезаем выделенную область
      const croppedDataUrl = cropCanvas(canvas, startX, startY, endX, endY);
      console.log('Выделенная область сохранена:', croppedDataUrl);
      
      // Запрашиваем у пользователя текст для сохранения
      const inputText = await showTextInputModal();
      
      // Отправляем сообщение для сохранения обрезанного изображения
      chrome.runtime.sendMessage({
        command: "save-cropped-image", 
        dataUrl: croppedDataUrl,
        text: inputText
      });
      
      // Закрываем оверлей
      document.body.removeChild(overlay);
    });

    // Функция для получения позиции мыши относительно canvas
    function getMousePos(canvas, evt) {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      return [
        (evt.clientX - rect.left) * scaleX,
        (evt.clientY - rect.top) * scaleY
      ];
    }

    // Функция для отрисовки выделения на canvas
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

    // Функция для обрезки canvas
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
  // Восстанавливаем прокрутку страницы
  document.body.style.overflow = 'auto';
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
