let isSelecting = false;
let startX, startY, endX, endY;
let selectionBox;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.command === "select-area") {
    toggleAreaSelection();
  }
});

function toggleAreaSelection() {
  if (isSelecting) {
    stopSelection();
  } else {
    startSelection();
  }
}

function startSelection() {
  isSelecting = true;
  document.body.style.cursor = 'crosshair';
  document.addEventListener('mousedown', onMouseDown);
}

function stopSelection() {
  isSelecting = false;
  document.body.style.cursor = 'default';
  document.removeEventListener('mousedown', onMouseDown);
  if (selectionBox) {
    selectionBox.remove();
    selectionBox = null;
  }
}

function onMouseDown(e) {
  startX = e.clientX;
  startY = e.clientY;
  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onMouseUp);
}

function onMouseMove(e) {
  endX = e.clientX;
  endY = e.clientY;
  drawSelectionBox();
}

function onMouseUp() {
  document.removeEventListener('mousemove', onMouseMove);
  document.removeEventListener('mouseup', onMouseUp);
  captureSelectedArea();
}

function drawSelectionBox() {
  if (!selectionBox) {
    selectionBox = document.createElement('div');
    selectionBox.style.position = 'fixed';
    selectionBox.style.border = '2px solid red';
    selectionBox.style.backgroundColor = 'rgba(255, 0, 0, 0.1)';
    selectionBox.style.pointerEvents = 'none';
    document.body.appendChild(selectionBox);
  }

  const left = Math.min(startX, endX);
  const top = Math.min(startY, endY);
  const width = Math.abs(endX - startX);
  const height = Math.abs(endY - startY);

  selectionBox.style.left = left + 'px';
  selectionBox.style.top = top + 'px';
  selectionBox.style.width = width + 'px';
  selectionBox.style.height = height + 'px';
}

function captureSelectedArea() {
  // Здесь вы можете добавить код для захвата выбранной области
  // Например, сделать скриншот или извлечь текст
  console.log('Область выбрана:', {
    left: Math.min(startX, endX),
    top: Math.min(startY, endY),
    width: Math.abs(endX - startX),
    height: Math.abs(endY - startY)
  });

  stopSelection();
}

