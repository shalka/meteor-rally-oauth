var Oauth = Package.oauth.Oauth;
var urlUtil = Npm.require('url');

Oauth.registerService('rally', 2, null, function(query) {

  var response = getAccessToken(query);
  var accessToken = response.accessToken;
  var expiresAt = response.expiresAt;
  var identity = getIdentity(accessToken);

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

  var user = identity.User;
  // use ObjectID as 'id' field in service data
  var data = {
    id: user.ObjectID,
    accessToken: accessToken,
    expiresAt: expiresAt
  };

  _.each(identityFields, function(transformedField, identityField) { data[transformedField] = user[identityField]; });

  // format of image url will always be: https://rally1.rallydev.com/slm/profile/image/#{ObjectID}/80.sp
  data.picture = 'https://rally1.rallydev.com/slm/profile/image/' + user.ObjectID + '/80.sp';
  data.locale = 'en';
  // data.timezone = 'EDT'; (out of scope for now)
  // => timezone lookup from office location
  //  OR
  // => query https://rally1.rallydev.com/slm/webservice/v2.x/userprofile/#{ObjectID} and pluck TimeZone field

  var fields = { name: data.first_name + ' ' + data.last_name };

  return {
    serviceData: data,
    options: { profile: fields }
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

  var responseContent;
  try {
    // Request access token
    responseContent = Meteor.http.post(
      "https://rally1.rallydev.com/login/oauth2/token", {
        params: {
          grant_type: 'authorization_code',
          client_id: config.client_id,
          client_secret: config.client_secret,
          code: query.code,
          redirect_uri: Meteor.absoluteUrl("_oauth/rally?close")
        }
      }).content;
  } catch (err) {
    throw new Error("Failed to complete OAuth handshake with Rally. " + err.message);
  }

  var parsedResponse;
  try {
    parsedResponse = JSON.parse(responseContent);
  } catch (e) {
    throw _.extend(new Error("Failed to complete OAuth handshake with Rally. " + err.message),{response: err.response});
  }

  // parsed response will resemble:
  // { 
  //   token_type: 'Bearer',
  //   expires_in: <number of seconds>,
  //   access_token: '<access token value>',
  //   refresh_token: '<refresh token value>'
  // }
  var accessToken = parsedResponse.access_token;
  var expiresIn = parsedResponse.expires_in;
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
    // need to pass zsessionid header (acts as bearer token) to retrieve user information
    return Meteor.http.get("https://rally1.rallydev.com/slm/webservice/v2.x/user", 
      {headers: {zsessionid: accessToken, format: 'json'}}).data;
  } catch (err) {
    throw new Error("Failed to fetch identity from Rally. " + err.message);
  }
};

Rally.retrieveCredential = function(credentialToken) {
  return Oauth.retrieveCredential(credentialToken);
};