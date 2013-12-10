#!/usr/bin/node

var http = require('http');
var EventEmitter = new require('events').EventEmitter;
var exit_event = new EventEmitter();
var jsdom = require('jsdom');
var async = require('async');
var utils = require('./utils');

exit_event.on('exit', function(code) {
    process.exit(code);
});
var done = function(code) {
    console.error('status: ' + code);
    exit_event.emit('exit', code);
};

var put = function(ip, id, flag) {
    console.error('put');

    console.error('ip: ' + ip);
    console.error('id: ' + id);
    console.error('flag: ' + flag);

    var userId = null;
    var userCookie = null;

    async.waterfall([
        function(next) {
            utils.createUser(ip, next);
        },

        function(id, cookie, next) {
            userId = id;
            userCookie = cookie;
            utils.tweetMessage(ip, cookie, flag, next);
        },

        function(next) {
            utils.checkTweet(ip, userCookie, userId, flag, function(exists) {
                if (exists) {
                    process.stdout.write(userId);
                    next(null);
                } else {
                    next('Flag not found', utils.codes['SERVICE_FAIL']);
                }
            });
        },

        function(next) {
            async.map([0, 1, 2, 3, 4, 5, 6, 7],
            function(number, callback) {
                    utils.createUser(ip, function(err, id, cookie) {
                        callback(err, {'id': id, 'cookie': cookie});
                    });
            },
            function(err, results) {
                next(err, results);
            });
        },

        function(users, next) {
            async.map(users,
            function(user, callback) {
                utils.tryFollow(ip, user.cookie, userId, function(data) {
                    callback(null, user);
                });
            },
            function(err, results) {
                next(err, results);
            });
        },

        function(users, next) {
            async.map(users,
            function(user, callback) {
                utils.acceptFollow(ip, userCookie, user.id, function(data) {
                    callback(null, user);
                });
            },
            function(err, results) {
                next(err, results);
            });
        },

        function(users, next) {
            async.map(users,
            function(user, callback) {
                utils.checkTweet(ip, user.cookie, user.id, flag, function(exists) {
                    if (exists) {
                        callback(null, user);
                    } else {
                        next('Flag not found', utils.codes['SERVICE_FAIL']);
                    }
                });
            },
            function(err, results) {
                if (err == null) {
                    next(null, utils.codes['SERVICE_OK']);
                } else {
                    next(err, resulsts);
                }
            });
        }

        ], function(err, code) {
            if (err) {
                console.error(err);
            }
            done(code);
        });
};

var get = function(ip, id, flag) {
    console.error('get');

    console.error('ip: ' + ip);
    console.error('id: ' + id);
    console.error('flag: ' + flag);

    var userId = id;
    var userCookie = null;

    async.waterfall([
        function(next) {
            utils.signin(ip, id, function(err, cookie) {
                if (err != null) {
                    next('Troubles with auth', utils.codes['SERVICE_FAIL']);
                } else {
                    userCookie = cookie;
                    next(null);
                }
            });
        },

        function(next) {
            utils.checkTweet(ip, userCookie, userId, flag, function(exists) {
                if (exists) {
                    next(null, utils.codes['SERVICE_OK']);
                } else {
                    next('Flag not found', utils.codes['SERVICE_FAIL']);
                }
            });
        }

        ], function(err, code) {
            if (err) {
                console.error(err);
            }
            done(code);
        })
};

var check = function(ip, id, flag) {
    console.log('check');
    done(codes['SERVICE_OK']);
};

var handlers = {
    'put' : put,
    'get' : get,
    'check' : check
}

process.argv.splice(0, 2);
var argv = process.argv;

if (argv.length < 2) {
    console.log('argv length missmatch');
    process.exit(codes['INTERNAL_ERROR']);
}

handlers[argv[0]](argv[1], argv[2], argv[3]);
