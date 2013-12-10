var redis = require("redis"),
    client = redis.createClient();
var bignum = require("bignum");

exports.addPending = function(user_id, follower_id) {
    client.hset('pending', follower_id, user_id);
}

exports.addFollower = function(user_id, follower_id) {
    client.hget('pending', follower_id, function(err, reply) {
        if (reply != null && user_id == reply) {
            client.hset(user_id + '_followers', follower_id, follower_id);
        }
    });
}

exports.getUserFromId = function(id, callback) {
    var user = null
    client.hget('users', id, function(err, reply) {
        if (reply != null) {
            user = JSON.parse(reply);
        }
        callback(user);
    });
}

exports.getUserFromCookie = function(req, res, callback) {
    var user = null
    var session_id = req.cookies.id;
    if (session_id) {
        client.get(session_id, function(err, reply) {
            if (reply) {
                exports.getUserFromId(reply, callback);
            } else {
                callback(user);
            }
        });
    } else {
        callback(user);
    }
}

exports.createUser = function(req, res) {
    return {
        'id': bignum.rand(bignum(2).pow(64)).toString(),
        'followers': [],
        'tweets': [],
        'pending_followers': {}
    };
}

exports.saveUser = function(user) {
    client.hset('users', user.id ,JSON.stringify(user));
}

exports.createSession = function(req, res, user) {
    var session_id = bignum.rand(bignum(2).pow(64)).toString();
    client.set(session_id, user.id);
    client.expire(session_id, 5 * 60);
    res.cookie('id', session_id);
}
