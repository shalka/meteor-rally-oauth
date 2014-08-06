Package.describe({
  summary: "OAuth 2.0 services for Rally accounts."
});

Package.on_use(function(api) {
  api.use('oauth', ['client', 'server']);
  api.use('oauth2', ['client', 'server']);
  api.use('http', ['client', 'server']);
  api.use('templating', 'client');
  api.use('service-configuration', ['client', 'server']);

  api.export('Rally');

  api.add_files(['rally_configure.html', 'rally_configure.js'], 'client');
  api.add_files('rally_common.js', ['client', 'server']);
  api.add_files('rally_server.js', 'server');
  api.add_files('rally_client.js', 'client');
});