// Request Rally credentials for the user
// @param options {optional}
// @param credentialRequestCompleteCallback {Function} Callback function to call on
//   completion. Takes one argument, state on success, or Error on error.
Rally.requestCredential = function (options, credentialRequestCompleteCallback) {
  // support both (options, callback) and (callback).
  if (!credentialRequestCompleteCallback && typeof options === 'function') {
    credentialRequestCompleteCallback = options;
    options = {};
  }

  var config = ServiceConfiguration.configurations.findOne({service: 'rally'});
  if (!config) {
    credentialRequestCompleteCallback && credentialRequestCompleteCallback(
      new ServiceConfiguration.ConfigError("Rally Service not configured"));
    return;
  }

  var state = Random.secret();
  var scope = [];

  if (options && options.requestPermissions) {
    scope = options.requestPermissions.join('+');
  } else {
    // unless a specific scope is passed in using options, default to 'alm'
    scope = 'alm';
  }

  var wsapiBaseUrl = getWsapiBaseUrl();
  var authBaseUrl = wsapiBaseUrl.split('/').slice(0, 3).join('/').concat('/login/oauth2/auth?');
  var authUrl =
        authBaseUrl +
        'state=' + state +
        '&response_type=code' +
        '&redirect_uri=' + encodeURIComponent(Meteor.absoluteUrl('_oauth/rally?close')) +
        '&client_id=' + config.client_id +
        '&scope=' + scope;

  Oauth.initiateLogin(state, authUrl, credentialRequestCompleteCallback);
};

var getWsapiBaseUrl = function() {
  // default to rally production WSAPI
  var wsapiBaseUrl = 'https://rally1.rallydev.com/slm/webservice/v2.x';
  var settings = Meteor.settings;
  if (settings.integration && settings.integration.rally) {
    wsapiBaseUrl = settings.integration.rally.wsapi_base_url;
  }
  return wsapiBaseUrl;
}
