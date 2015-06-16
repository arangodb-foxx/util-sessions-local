/*global require, applicationContext */
'use strict';
var db = require('org/arangodb').db;
var collectionName = applicationContext.collectionName('sessions');

if (db._collection(collectionName) === null) {
  db._create(collectionName);
}