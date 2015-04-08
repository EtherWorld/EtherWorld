require('./game')({
  containerSelector: '#container',
  server: window.location.origin.replace(/^http/, 'ws')
});
