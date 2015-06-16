/*global require, exports, applicationContext */
'use strict';

const _ = require('underscore');
const joi = require('joi');
const internal = require('internal');
const arangodb = require('org/arangodb');
const db = arangodb.db;
const Foxx = require('org/arangodb/foxx');
const errors = require('./errors');
const cfg = applicationContext.configuration;

const Session = Foxx.Model.extend({
  schema: {
    _key: joi.string().required(),
    uid: joi.string().allow(null).required().default(null),
    sessionData: joi.object().required().default('Empty object', Object),
    userData: joi.object().required().default('Empty object', Object),
    created: joi.number().integer().required().default('Current date', Date.now),
    lastAccess: joi.number().integer().required('Current date', Date.now),
    lastUpdate: joi.number().integer().required('Current date', Date.now)
  }
});

const sessions = new Foxx.Repository(
  applicationContext.collection('sessions'),
  {model: Session}
);

function generateSessionId() {
  let sid = '';
  if (cfg.sidTimestamp) {
    sid = internal.base64Encode(Date.now());
    if (cfg.sidLength === 0) {
      return sid;
    }
    sid += '-';
  }
  return sid + internal.genRandomAlphaNumbers(cfg.sidLength || 10);
}

function createSession(sessionData, userData) {
  const sid = generateSessionId();
  let session = new Session({
    _key: sid,
    uid: (userData && userData._id) || null,
    sessionData: sessionData || {},
    userData: userData || {}
  });
  sessions.save(session);
  return session;
}

function deleteSession(sid) {
  try {
    sessions.removeById(sid);
  } catch (e) {
    if (
      e instanceof arangodb.ArangoError
      && e.errorNum === arangodb.ERROR_ARANGO_DOCUMENT_NOT_FOUND
    ) {
      throw new errors.SessionNotFound(sid);
    } else {
      throw e;
    }
  }
  return null;
}

Session.fromClient = function (sid) {
  let session;
  db._executeTransaction({
    collections: {
      read: [sessions.collection.name()],
      write: [sessions.collection.name()]
    },
    action: function () {
      try {
        session = sessions.byId(sid);

        const now = Date.now();
        session.set('lastAccess', now);
        session.enforceTimeout();

        sessions.collection.update(
          session.get('_key'),
          {lastAccess: now}
        );
      } catch (e) {
        if (
          e instanceof arangodb.ArangoError
          && e.errorNum === arangodb.ERROR_ARANGO_DOCUMENT_NOT_FOUND
        ) {
          throw new errors.SessionNotFound(sid);
        } else {
          throw e;
        }
      }
    }
  });
  return session;
};

_.extend(Session.prototype, {
  forClient: function () {
    return this.get('_key');
  },
  enforceTimeout: function () {
    if (this.hasExpired()) {
      throw new errors.SessionExpired(this.get('_key'));
    }
  },
  hasExpired: function () {
    return this.getTTL() === 0;
  },
  getTTL: function () {
    if (!cfg.timeToLive) {
      return Infinity;
    }
    return Math.max(0, this.getExpiry() - Date.now());
  },
  getExpiry: function () {
    if (!cfg.timeToLive) {
      return Infinity;
    }
    let prop = cfg.ttlType;
    if (!prop || !this.get(prop)) {
      prop = 'created';
    }
    return this.get(prop) + cfg.timeToLive;
  },
  setUser: function (user) {
    if (user) {
      this.set('uid', user.get('_id'));
      this.set('userData', user.get('userData'));
    } else {
      delete this.attributes.uid;
      this.set('userData', {});
    }
    return this;
  },
  save: function () {
    const now = Date.now();
    this.set('lastAccess', now);
    this.set('lastUpdate', now);
    sessions.replace(this);
    return this;
  },
  delete: function () {
    const now = Date.now();
    const key = this.get('_key');
    this.set('lastAccess', now);
    this.set('lastUpdate', now);
    try {
      deleteSession(key);
    } catch (e) {
      if (!(e instanceof errors.SessionNotFound)) {
        throw e;
      }
      return false;
    }
    return true;
  }
});

exports.create = createSession;
exports.get = Session.fromClient;
exports.delete = deleteSession;
exports.errors = errors;
