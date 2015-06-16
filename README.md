# The Sessions Storage

The sessions app provides a collection-based session storage JavaScript API that can be used in other Foxx apps.

## Configuration

This app has the following configuration options:

* *timeToLive* (optional): number of milliseconds until the session expires or `0` to disable session expiry. Default: `604800000` (one week).
* *ttlType* (optional): attribute against which the *timeToLive* is enforced. Valid options: `"lastAccess"`,  `"lastUpdate"`, `"created"`. Default: `"lastAccess"`.
* *sidTimestamp* (optional): whether to append a timestamp to the random part of generated session IDs. Default: `false`.
* *sidLength* (optional): number of random characters to use for new session IDs. Default `20`.

## JavaScript API: sessionStorage

This app exposes a session storage via a JavaScript API named *sessionStorage*.

**Examples**

```js
var sessionStorage = Foxx.requireApp('/_system/sessions').sessionStorage;
```

### Exceptions

#### Session Not Found

Indicates a session could not be found in the database.

`new sessionStorage.errors.SessionNotFound(sessionId)`

Thrown by the session storage's *delete* and *get* methods if passed a session ID that does not exist in the database.

**Examples**

```js
try {
    sessionStorage.get(invalidSessionId);
} catch(err) {
    assertTrue(err instanceof sessionStorage.errors.SessionNotFound);
}
```

#### Session Expired

Indicates the session exists in the database but has expired.

`new sessionStorage.errors.SessionExpired(sessionId)`

Thrown by the session storage's *get* method if passed a session ID for a session that has expired. See also this app's configuration options.

**Examples**

```js
try {
    sessionStorage.get(expiredSessionId);
} catch(err) {
    assertTrue(err instanceof sessionStorage.errors.SessionExpired);
    assertTrue(err instanceof sessionStorage.errors.SessionNotFound);
}
```

### The session object

Session objects are instances of a Foxx model with the following attributes:

* *sessionData*: volatile session data. This can be an arbitrary object that will be stored with the session in the database. If you want to store session-specific (rather than user-specific) data in the database, this is the right place for that
* *uid*: the sessions active users *_id* or `undefined` (no active user)
* *userData*: the session's active users *userData* attribute or an empty object
* *created*: timestamp the session was created at
* *lastAccess*: timestamp of the last time the session was fetched from the database
* *lastUpdate*: timestamp of the last time the session was written to the database

### Create a session

Creates and saves a new instance of the session model.

`sessionStorage.create(sessionData)`

**Parameter**

* *sessionData* (optional): an arbitrary object that will be stored as the sessions *sessionData* attribute when the model is saved to the database.

**Examples**

```js
var session = sessionStorage.create(sessionData);
var session = sessionStorage.create(sessionData);
```

### Fetch an existing session

Fetch a session from the database for a given ID.

`sessionStorage.get(sessionId)`

Attempts to load the session with the given session ID from the database. If the session does not exist, a *SessionNotFound* exception will be thrown. If the session does exist, but has already expired, a *SessionExpired* exception will be thrown instead.

**Parameter**

* *sessionId*: a session ID.

**Examples**

```js
var session = sessionStorage.get(sessionId);
```

### Delete a session

There are two ways to delete a session from the database:

* calling the session storage's *delete* method with a session ID directly
* telling a session to delete itself

#### Delete a session by its ID

Delete a session with a given ID.

`sessionStorage.delete(sessionId)`

Attempts to delete the session with the given session ID from the database. If the session does not exist, a *SessionNotFound* exception will be thrown. The method always returns `null`.

**Parameter**

* *sessionId*: a session ID.

**Examples**

```js
sessionStorage.delete(sessionId);
```

#### Tell a session to delete itself

Delete a session from the database.

`session.delete()`

Attempts to delete the session from the database.

Returns `true` if the session was deleted successfully.

Returns `false` if the session already didn't exist.

**Examples**

```js
session.delete();
```

### Save a session

Save a session to the database.

`session.save()`

If you made any changes to the session and are not using the sessions app via Foxx Sessions, you must call this method to commit the changes to the database.

**Examples**

```js
session.setUser(user);
session.save();
```

### Set a session's active user

Set the active user of a session.

`session.setUser(user)`

Expects a Foxx model with a *userData* attribute and sets the sessions *uid* attribute to the models *_id* and the sessions *userData* attribute to the models *userData* attribute.

**Parameter**

* *user*: instance of a Foxx model with a *userData* attribute

**Examples**

```js
session.setUser(user);
assertEqual(session.get('uid'), user.get('_id'));
assertEqual(session.get('userData'), user.get('userData'));
```

### Determine whether a session has expired

Get a session's expiry state.

`session.hasExpired()`

Returns `true` if the sessions expiry time lies in the past, `false` otherwise.

### Determine when a session will expire

Get a session's expiry time.

`session.getExpiry()`

Returns an integer representing the UTC timestamp in milliseconds at which the session will expire, or `Infinity` (indicating the session will never expire) if session expiry is disabled.

### Determine the TTL of a session

Get a session's time to live.

`session.getTTL()`

Returns an integer representing number of milliseconds until the session will expire, or `Infinity` (indicating the session will never expire) if session expiry is disabled.

### Retrieve a session's ID

Get the session ID of a session.

`session.forClient()`

Returns the session's session ID that is accepted by `sessions.get`.

## License

This code is distributed under the [Apache License](http://www.apache.org/licenses/LICENSE-2.0) by ArangoDB GmbH.
