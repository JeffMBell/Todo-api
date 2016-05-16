var express = require('express');
var bodyParser = require('body-parser');
var _ = require('underscore');
var db = require('./db.js');
var bcrypt = require('bcrypt');
var middleware = require('./middleware.js')(db);
var jsforce = require('jsforce');
var cookieParser = require('cookie-parser');

var app = express();
var PORT = process.env.PORT || 3000;

app.use(cookieParser());

var actions = [];
var actionNextId = 1;

app.use(bodyParser.json());

app.get('/', function(req, res) {
  //res.send('Welcome to Revity!');
  res.redirect('http://www.revity.com');
});

// GET /actions?completed=true&q=string
app.get('/actions', middleware.requireAuthentication, function(req, res) {
  var queryParams = req.query;
  var where = {
    userId: req.user.get('id')
  };
  
  if (queryParams.hasOwnProperty('completed') && queryParams.completed === 'true') {
    where.completed = true;
  } else if (queryParams.hasOwnProperty('completed') && queryParams.completed === 'false') {
    where.completed = false;
  }
  
  if (queryParams.hasOwnProperty('q') && queryParams.q.length > 0) {
    where.description = {
      $like: '%' + queryParams.q + '%'
    };
  }
  
  db.action.findAll({where: where}).then(function(actions) {
    res.json(actions);
  }, function(e) {
    res.status(500).send();
  });
});

// GET /actions/:id
app.get('/actions/:id', middleware.requireAuthentication, function(req, res) {
  var actionId = parseInt(req.params.id, 10);
  
  db.action.findOne({
    where: {
      id: actionId,
      userId: req.user.get('id')
    }
  }).then(function(action) {
    if (action) {
      res.json(action.toJSON());
    } else {
      res.status(404).send();
    }
  }, function(e) {
    res.status(500).send();
  });
});

// POST /action
app.post('/actions', middleware.requireAuthentication, function(req, res) {
  //var body = _.pick(req.body, 'description', 'completed');
  var body = req.body;
  
  db.action.create(body).then(function(action) {
    req.user.addAction(action).then(function() {
      return action.reload();
    }).then(function(action) {
      res.json(_.pick(action.toJSON(), function(value, key, object) { return !_.isNull(value) }));
    });
  }, function(e) {
    res.status(400).json(e);
  });
});

// DELETE /actions/:id
app.delete('/actions/:id', middleware.requireAuthentication, function(req, res) {
  var actionId = parseInt(req.params.id, 10);
  
  db.action.destroy({
    where: {
      id: actionId,
      userId: req.user.get('id')
    }
  }).then(function(rowsDeleted) {
    if(rowsDeleted === 0) {
      res.status(404).json({
        error: 'No action with id'
      });
    } else {
      res.status(204).send();
    }
  });
});

// PUT /actions/:id
app.put('/actions/:id', middleware.requireAuthentication, function(req, res) {
  var actionId = parseInt(req.params.id, 10);
  var body = _.pick(req.body, 'description', 'completed');
  var attributes = {};
  
  if (body.hasOwnProperty('completed')) {
    attributes.completed = body.completed;
  }
  
  if (body.hasOwnProperty('description')) {
    attributes.description = body.description;
  }
  
  db.action.findOne({
    where: {
      id: actionId,
      userId: req.user.get('id')
    }
  }).then(function(action) {
    if (action) {
      action.update(attributes).then(function(action) {
        res.json(action.toJSON());
      }, function(e) {
        res.status(400).json(e);
      });
    } else {
      res.status(404).send();
    }
  }, function(e) {
    res.status(500).send();
  });
});

// POST /users
app.post('/users', function(req, res) {
  var body = _.pick(req.body, 'email', 'password');
  
  db.user.create(body).then(function(user) {
    //res.json(user.toPublicJSON());
    res.json(user.toJSON());
  }, function(e) {
    res.status(400).json(e);
  });
});

// POST /users/login
app.post('/users/login', function(req, res) {
  var body = _.pick(req.body, 'email', 'password');
  var userInstance;
  
  db.user.authenticate(body).then(function(user) {
    var token = user.generateToken('authentication');
    userInstance = user;
    return db.token.create({
      token: token
    });
  }).then(function(tokenInstance) {
    res.header('Auth', tokenInstance.get('token')).json(userInstance.toPublicJSON());
  }).catch(function(e) {
    res.status(401).send();
  });
});

// DELETE /users/login
app.delete('/users/login', middleware.requireAuthentication,function(req, res) {
  req.token.destroy().then(function() {
    res.status(204).send();
  }).catch(function() {
    res.status(500).send();
  });
});

// SALESFORCE INTEGRATION
var oauth2 = new jsforce.OAuth2({
  clientId: '3MVG91ftikjGaMd_pI9HG9lPPGUUezVrj0iaRo.aN9TNEOTSzEJb7qF62T3LVLnus4js7G3GI7L8eBUkZ0Z3J ',
  clientSecret: '1516127486110673725 ',
  redirectUri: 'http://localhost:3000/oauth/callback'
});

/* SF OAuth request, redirect to SF login */
app.get('/oauth/auth', function(req, res) {
    res.redirect(oauth2.getAuthorizationUrl({scope: 'api web'}));
});

/* OAuth callback from SF, pass received auth code and get access token */
app.get('/oauth/callback', function(req, res) {
    var conn = new jsforce.Connection({oauth2: oauth2});
    var code = req.query.code;
  console.log(req);
    conn.authorize(code, function(err, userInfo) {
        if (err) { return console.error(err); }

        console.log('Access Token: ' + conn.accessToken);
        console.log('Instance URL: ' + conn.instanceUrl);
        console.log('User ID: ' + userInfo.id);
        console.log('Org ID: ' + userInfo.organizationId);

        res.cookies.accessToken = conn.accessToken;
        res.cookies.instanceUrl = conn.instanceUrl;
        res.redirect('/accounts');
    });
});

app.get('/accounts', function(req, res) {
    // if auth has not been set, redirect to index
    if (!req.cookies.accessToken || !req.cookies.instanceUrl) { console.log('error');}//res.redirect('/oauth/auth'); }

    var query = 'SELECT id, name FROM account LIMIT 10';
    // open connection with client's stored OAuth details
    var conn = new jsforce.Connection({
        accessToken: req.cookies.accessToken,
        instanceUrl: req.cookies.instanceUrl
    });

    conn.query(query, function(err, result) {
        if (err) {
            console.error(err);
            res.redirect('/');
        }
        res.render('accounts', {title: 'Accounts List', accounts: result.records});
    });
});

db.sequelize.sync({force: true}).then( function() {
  app.listen(PORT, function() {
    console.log('Express listening on port ' + PORT + '!');
  });
});