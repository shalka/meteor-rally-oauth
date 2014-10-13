meteor-rally-oauth
==================

OAuth 2.0 services for Rally accounts.

##Installation

Install accounts-ui and rally-oauth packages:
* `meteor add accounts-ui`
* `meteor add shalka:rally-oauth`

##Usage

Creates a new function `Meteor.loginWithRally(options, callback)`

This is the backbone of `accounts-rally`

##Configuration

In Meteor.settings, add Web Services API base URL:

```
{
	"public": {...},
	"integration": {
		"rally": {
			"wsapi_base_url": "https://rally1.rallydev.com/slm/webservice/v2.0"
		},
		...
	}
}
```

If the base URL is not specified in settings, the default value will be: "https://rally1.rallydev.com/slm/webservice/v2.0".
