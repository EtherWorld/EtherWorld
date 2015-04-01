require('./game')({
  container: document.querySelector('#container'),
  server: window.location.origin.replace(/^http/, 'ws')
});
