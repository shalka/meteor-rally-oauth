var Oauth = Package.oauth.Oauth;
var urlUtil = Npm.require('url');

Oauth.registerService('rally', 2, null, function(query) {
  var response = getAccessToken(query);
  var accessToken = response.accessToken;
  var expiresAt = response.expiresAt;
  var identity = getIdentity(accessToken);
  var user = identity.User;
  var profile = getUserProfile(accessToken, user.UserProfile._ref);
  var userprofile = profile.UserProfile;

  // fields to pluck from the 'User' map of the retrieved identity
  //  each key is the field as it exists on the 'User' map
  //  each value is the new key to be persisted onto the service data
  var identityFields = {
    'Department': 'dept',
    'DisplayName': 'display_name',
    'EmailAddress': 'email',
    'FirstName': 'first_name',
    'OfficeLocation': 'location',
    'LastName': 'last_name',
    'ObjectID': 'object_id',
    'Role': 'role',
    'UserName': 'username',
    '_refObjectUUID': 'object_uuid'
  };

  // use ObjectID as 'id' field in service data
  // => consider switching to _refObjectUUID
  // userprofile will contain the following fields:
  // "DefaultProject": {
  //   "_ref": "https://rally1.rallydev.com/slm/webservice/v2.x/project/<oid>",
  //   "_refObjectUUID": "<uuid>",
  //   "_refObjectName": "<name>",
  //   "_type": "Project"
  // },
  // "DefaultWorkspace": {
  //   "_ref": "https://rally1.rallydev.com/slm/webservice/v2.x/workspace/<oid>",
  //   "_refObjectUUID": "<uuid>",
  //   "_refObjectName": "<name>",
  //   "_type": "Workspace"
  // },
  var defaultworkspace = {};
  var defaultproject = {};
  if (userprofile.DefaultWorkspace) {
    defaultworkspace = {
      name: userprofile.DefaultWorkspace._refObjectName,
      oid: userprofile.DefaultWorkspace._ref.split('/').pop(),
      uuid: userprofile.DefaultWorkspace._refObjectUUID
    };
  }
  if (userprofile.DefaultProject) {
    defaultproject = {
      name: userprofile.DefaultProject._refObjectName,
      oid: userprofile.DefaultProject._ref.split('/').pop(),
      uuid: userprofile.DefaultProject._refObjectUUID
    };
  }

  var data = {
    id: user.ObjectID,
    accessToken: accessToken,
    expiresAt: expiresAt,
    defaults: {
      workspace: defaultworkspace,
      project: defaultproject
    }
  };

  _.each(identityFields, function(transformedField, identityField) { data[transformedField] = user[identityField]; });

  // format of image url will always be: https://rally1.rallydev.com/slm/profile/image/#{User.ObjectID}/80.sp
  var wsapiBaseUrl = getWsapiBaseUrl();
  var imageBaseUrl = wsapiBaseUrl.split('/').slice(0, 4).join('/').concat('/profile/image');

  data.picture = [imageBaseUrl, user.ObjectID, '80.sp'].join('/');
  data.locale = 'en';
  data.timezone = userprofile.TimeZone;

  name = data.first_name;
  if (data.last_name != null) {
    name = name + ' ' + data.last_name
  }

  var options = {
    profile: {
      name: name
    }
  };

  return {
    serviceData: data,
    options: options
  };
});

// returns an object containing:
// - accessToken: bearer token for oauth requests
// - expiresAt: expiry of bearer token
var getAccessToken = function (query) {
  var config = ServiceConfiguration.configurations.findOne({service: 'rally'});
  if (!config) {
    throw new ServiceConfiguration.ConfigError("Rally Service not configured");
  }

  var responseData;
  try {
    var wsapiBaseUrl = getWsapiBaseUrl();
    var tokenUrl = wsapiBaseUrl.split('/').slice(0, 3).join('/').concat('/login/oauth2/token');
    var response = Meteor.http.post(tokenUrl, {
        params: {
          grant_type: 'authorization_code',
          client_id: config.client_id,
          client_secret: config.client_secret,
          code: query.code,
          redirect_uri: Meteor.absoluteUrl("_oauth/rally?close")
        }
      });
    responseData = response.data;
  } catch (err) {
    throw new Error("Failed to complete OAuth handshake with Rally. " + err.message);
  }

  // response data will be:
  // {
  //   token_type: 'Bearer',
  //   expires_in: <number of seconds>,
  //   access_token: '<access token value>',
  //   refresh_token: '<refresh token value>'
  // }
  var accessToken = responseData.access_token;
  var expiresIn = responseData.expires_in;
  // intentionally excluding refresh token

  if (!accessToken) {
    throw new Error("Failed to complete OAuth handshake with Rally " +
      "-- can't find access token in HTTP response. " + responseContent);
  }

  return {
    accessToken: accessToken,
    expiresAt: getExpiresAt(expiresIn)
  };
};

// compute when the access token will expire
var getExpiresAt = function (expiresIn) {
  return (+new Date) + (1000 * expiresIn);
};

var getIdentity = function (accessToken) {
  try {
    var wsapiBaseUrl = getWsapiBaseUrl();
    var identityUrl = [wsapiBaseUrl, 'user'].join('/');
    // need to pass zsessionid header (acts as bearer token) to retrieve user identity
    var response = Meteor.http.get(identityUrl, {headers: {zsessionid: accessToken, format: 'json'}});
    return response.data;
  } catch (err) {
    throw new Error("Failed to fetch identity from Rally. " + err.message);
  }
};

var getUserProfile = function (accessToken, rallyUserProfileUrl) {
  try {
    // need to pass zsessionid header (acts as bearer token) to retrieve user information
    return Meteor.http.get(rallyUserProfileUrl, {headers: {zsessionid: accessToken, format: 'json'}}).data;
  } catch (err) {
    throw new Error("Failed to fetch user profile from Rally. " + err.message);
  }
};

var getWsapiBaseUrl = function () {
  // default to rally production WSAPI
  var wsapiBaseUrl = 'https://rally1.rallydev.com/slm/webservice/v2.x';
  var settings = Meteor.settings;
  if (settings.integration && settings.integration.rally) {
    wsapiBaseUrl = settings.integration.rally.wsapi_base_url;
  }
  return wsapiBaseUrl;
}

Rally.retrieveCredential = function(credentialToken) {
  return Oauth.retrieveCredential(credentialToken);
};
