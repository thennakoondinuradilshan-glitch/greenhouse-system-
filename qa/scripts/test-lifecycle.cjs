// Test-process shutdown hook: lets V8 flush real server coverage on Windows.
// Loaded only by the isolated test launcher; changes no application routes.
process.on('message', (message) => {
  if (message === 'qa-stop') process.exit(0);
});
