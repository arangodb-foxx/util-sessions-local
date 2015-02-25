/*global require, applicationContext */
'use strict';
var db = require('org/arangodb').db;
var sessionsName = applicationContext.collectionName('sessions');

if (db._collection(sessionsName) === null) {
  db._create(sessionsName, {isSystem: true});
}