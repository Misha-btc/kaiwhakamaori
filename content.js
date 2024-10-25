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
          // Если исправле успешно, обновляем содержимое элемента
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
    // Для обычных input и textarea элементов обновле value
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
      max-width: 90%;
      max-height: 90%;
      box-shadow: 0 0 20px rgba(0, 0, 0, 0.5);
    `;

    // Добавляем canvas в оверлей и оверлей на страницу
    overlay.appendChild(canvas);
    document.body.appendChild(overlay);

    // Функция для закрытия оверлея
    const closeOverlay = () => {
      document.body.removeChild(overlay);
      document.body.style.overflow = 'auto';
      document.removeEventListener('keydown', handleEscKey);
    };

    // Обработчик нажатия клавиши Esc
    const handleEscKey = (e) => {
      if (e.key === 'Escape') {
        closeOverlay();
      }
    };

    // Добавляем слушатель события для клавиши Esc
    document.addEventListener('keydown', handleEscKey);

    // Переменные для отслеживания выделения области
    let isDrawing = false;
    let startX, startY, endX, endY;

    // Обр��ботчик начала выделения
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
      if (document.body.contains(overlay)) {
        isDrawing = false;
        // Обрезаем выделенную область
        const croppedDataUrl = cropCanvas(canvas, startX, startY, endX, endY);
        
        // Запрашиваем у пользователя текст для сохранения
        await showTextInputModal(croppedDataUrl);
        
        // Закрываем оверлей
        closeOverlay();
      }
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
      
      // Рисуем пунктирную белую рамку с закругленными углами, кроме ближайшего к курсору
      ctx.strokeStyle = 'white';
      ctx.setLineDash([5, 5]); // Устанавливаем пунктирный стиль линии
      ctx.lineWidth = 2;
      
      const x = Math.min(startX, endX);
      const y = Math.min(startY, endY);
      const width = Math.abs(endX - startX);
      const height = Math.abs(endY - startY);
      const radius = 30; // Большой радиус закругления углов
      
      // Определяем ближайший к курсору угол
      const nearestCorner = getNearestCorner(endX, endY, x, y, width, height);
      
      ctx.beginPath();
      if (nearestCorner !== 'topLeft') {
        ctx.moveTo(x + radius, y);
      } else {
        ctx.moveTo(x, y);
      }
      if (nearestCorner !== 'topRight') {
        ctx.arcTo(x + width, y, x + width, y + height, radius);
      } else {
        ctx.lineTo(x + width, y);
      }
      if (nearestCorner !== 'bottomRight') {
        ctx.arcTo(x + width, y + height, x, y + height, radius);
      } else {
        ctx.lineTo(x + width, y + height);
      }
      if (nearestCorner !== 'bottomLeft') {
        ctx.arcTo(x, y + height, x, y, radius);
      } else {
        ctx.lineTo(x, y + height);
      }
      if (nearestCorner !== 'topLeft') {
        ctx.arcTo(x, y, x + width, y, radius);
      }
      ctx.closePath();
      ctx.stroke();
      
      // Сбрасываем стиль линии
      ctx.setLineDash([]);
    }

    // Функция для определения ближайшего к курсору угла
    function getNearestCorner(cursorX, cursorY, rectX, rectY, rectWidth, rectHeight) {
      const corners = {
        topLeft: [rectX, rectY],
        topRight: [rectX + rectWidth, rectY],
        bottomRight: [rectX + rectWidth, rectY + rectHeight],
        bottomLeft: [rectX, rectY + rectHeight]
      };

      let nearestCorner = 'topLeft';
      let minDistance = Infinity;

      for (const [corner, [x, y]] of Object.entries(corners)) {
        const distance = Math.sqrt(Math.pow(cursorX - x, 2) + Math.pow(cursorY - y, 2));
        if (distance < minDistance) {
          minDistance = distance;
          nearestCorner = corner;
        }
      }

      return nearestCorner;
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
  // Восстанавливаем прокутку страницы
  document.body.style.overflow = 'auto';
});

// Глобальная переменная для хранения текущего модального окна
let currentModal = null;

// Функция для отображения модального окна с полем ввода текста
function showTextInputModal(croppedDataUrl) {
  if (currentModal) {
    document.body.removeChild(currentModal);
  }

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
    width: 300px;
    max-height: 80vh;
    overflow-y: auto;
  `;

  const inputContainer = document.createElement('div');
  inputContainer.style.cssText = `
    display: flex;
    margin-bottom: 10px;
  `;

  const input = document.createElement('input');
  input.type = 'text';
  input.placeholder = 'Введите текст';
  input.style.cssText = `
    flex-grow: 1;
    padding: 5px;
    margin-right: 5px;
  `;

  const button = document.createElement('button');
  button.innerHTML = '&#10148;';
  button.style.cssText = `
    padding: 5px 10px;
    background-color: #4CAF50;
    color: white;
    border: none;
    border-radius: 3px;
    cursor: pointer;
  `;

  const responseArea = document.createElement('div');
  responseArea.style.cssText = `
    margin-top: 10px;
    padding: 10px;
    background-color: #333333;
    color: white;
    border-radius: 3px;
    font-family: monospace;
    white-space: pre-wrap;
    display: none;
  `;

  inputContainer.appendChild(input);
  inputContainer.appendChild(button);

  modal.appendChild(inputContainer);
  modal.appendChild(responseArea);
  document.body.appendChild(modal);

  currentModal = modal;

  // Функция для закрытия модального окна
  const closeModal = () => {
    if (currentModal) {
      document.body.removeChild(currentModal);
      currentModal = null;
      document.removeEventListener('keydown', handleEscKey);
    }
  };

  // Обработчик нажатия клавиши Esc
  const handleEscKey = (e) => {
    if (e.key === 'Escape') {
      closeModal();
    }
  };

  // Добавляем слушатель события для клавиши Esc
  document.addEventListener('keydown', handleEscKey);

  return new Promise((resolve) => {
    button.addEventListener('click', async () => {
      const text = input.value;
      responseArea.style.display = 'block';
      responseArea.textContent = 'Обработка запроса...';
      
      try {
        const response = await sendMessageToBackground(croppedDataUrl, text);
        responseArea.textContent = response.fixedText || 'Ошибка: ' + response.error;
      } catch (error) {
        responseArea.textContent = 'Произошла ошибка: ' + error.message;
      }
    });

    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        button.click();
      }
    });
  });
}

async function sendMessageToBackground(croppedDataUrl, text) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({
      command: "save-cropped-image", 
      dataUrl: croppedDataUrl,
      text: text
    }, (response) => {
      resolve(response);
    });
  });
}
