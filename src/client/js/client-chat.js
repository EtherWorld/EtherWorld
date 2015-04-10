module.exports = function(name, emitter) {
  // Handle entering a command
  window.addEventListener('keyup', function(e) {
    if (e.keyCode !== 13) return;
    var el = document.getElementById('cmd');

    if (!el) {
      console.log('Chat not setup yet.')
      return;
    }

    if (document.activeElement === el) {
      emitter.emit('message', {
        user: name,
        text: el.value,
        timestamp: new Date().toJSON()
      });
      el.value = '';
      el.blur();
    } else {
      el.focus();
    }
  });

  emitter.on('message', showMessage)

  function showMessage(message) {
    var li = document.createElement('li')
    li.innerHTML = message.user + ': ' + message.text
    messages.appendChild(li)
    messages.scrollTop = messages.scrollHeight
  }
}
