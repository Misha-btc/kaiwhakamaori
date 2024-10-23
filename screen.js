chrome.tabs.captureVisibleTab(null, {format: 'png'}, function(dataUrl) {
  // Здесь dataUrl содержит изображение в формате base64
  console.log('Скриншот сделан:', dataUrl);
  
  // Пример: сохранение скриншота
  var link = document.createElement('a');
  link.download = 'screenshot.png';
  link.href = dataUrl;
  link.click();
});

