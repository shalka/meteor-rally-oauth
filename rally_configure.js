Template.configureLoginServiceDialogForRally.siteUrl = function () {
  return Meteor.absoluteUrl();
};

Template.configureLoginServiceDialogForRally.fields = function () {
  return [
    {property: 'client_id',     label: 'Client Id'},
    {property: 'client_secret', label: 'Client Secret'}
  ];
};
