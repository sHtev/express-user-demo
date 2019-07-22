const _ = require('lodash');

// Setup backing store
const low = require('lowdb')
const FileSync = require('lowdb/adapters/FileSync')
const adapter = new FileSync('db.json')
const db = low(adapter)
db.defaults({ users: [] })
  .write()

// Setup express
const express = require('express');
const bodyParser = require('body-parser');
const { Validator, ValidationError } = require('express-json-validator-middleware');

// Deletion API key
const deleteKey = process.env.API_KEY || 'c931d4d6abd08f5a'

// Validation and schema
const validator = new Validator({allErrors: true}); // pass in options to the Ajv instance
const validate = validator.validate;

const UserSchema = {
    type: 'object',
    required: ['username', 'email', 'password'],
    properties: {
        username: {
            type: 'string',
            minLength: 2,
            maxLength: 20
        },
        name: {
            type: 'string'
        },
        favouriteColour: {
            type: 'string',
            enum: ['red', 'green', 'blue', 'yellow', 'black']
        },
        email: {
            type: 'string',
            format: 'email'
        },
        password: {
            type: 'string',
        }
    }
}

const TokenSchema = {
    type: 'object', // req.query is of type object
    required: ['token'], // req.query.token is required
    properties: {
        token: {
            type: 'string', 
            minLength: 16,
            maxLength: 16
        }
    }
}

// Password hashing
const crypto = require('crypto');

const generateSalt = length => crypto.randomBytes(Math.ceil(length/2))
                                      .toString('hex')
                                      .slice(0,length);

const hashPassword = (password, salt) => crypto.pbkdf2Sync(password, salt, 100000, 512, 'sha512')
                                               .toString('hex');


// API
const app = express();

app.use(bodyParser.json());

app.post('/users', validate({body: UserSchema}), (req, res) => {
    let userDetails = req.body;

    // check if username exists
    if (!_.isEmpty(db.get('users').find(['username', userDetails.username]).value())) {
        res.status(400).json({message: `User ${userDetails.username} already exists`});
        return;
    }

    let salt = generateSalt(16);
    let hash = hashPassword(userDetails.password, salt);

    userDetails.password = {'salt':salt, 'hash': hash}
    db.get('users')
        .push(userDetails)
        .write()

    res.json({message: `User ${userDetails.username} created with email ${userDetails.email}`});
});

app.delete('/user/:username', validate({query: TokenSchema}), (req, res) => {
    // check token
    if (req.query.token !== deleteKey) {
        res.status(400).json({message: 'Invalid API token'});
        return;
    }
    // check if username exists
    if (_.isEmpty(db.get('users').find(['username', req.params.username]).value())) {
        res.status(400).json({message: `User ${req.params.username} not found`});
        return;
    }

    db.get('users').remove(['username', req.params.username]).write();

    res.json({message: `User ${req.params.username} deleted`});
});

const properties = ['username', 'email', 'name', 'favouriteColour']
const pickProperties = () => _.partial(_.ary(_.pick, 2), _, properties);

app.get('/users', (req, res) => {
    res.json(db.get('users').map(pickProperties()).value());
});

app.get('/users/:email', (req, res) => {
    res.json(db.get('users').filter(['email', req.params.email]).map(pickProperties()).value());
});

app.get('/user/:username', (req, res) => {
    res.json(db.get('users').find(['username', req.params.username]).pick(properties).value());
});

// handle validation errors
app.use(function(err, req, res, next) {
    if (err instanceof ValidationError) {
        res.status(400).json(err);
        next();
    }
    else next(err);
});

app.listen(3000, () => {
    console.log("Server running on port 3000");
});