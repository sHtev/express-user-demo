const request = require('supertest');

// setup temporary db file
const tmp = require('tmp');
tmp.setGracefulCleanup();
var tmpName = tmp.tmpNameSync({postfix: '.json'});

const users = {
    users: [
        {
            username: 'jeremy',
            email: 'jezza@gmail.com',
            password: 'password',
            favouriteColour: 'blue',
            "password": {
                "salt": "8ec05c1ce06ee42a",
                "hash": "d95dc7686e896f06f68bee6ecc3a7b9038fc8806c572cbef7c4e4150dc2483ae28cdb74a5f4a5cb2f8a8b8c8cb31475c8660ffe5541ab11eb98c6d35d5eb17397c5ed4b9f153e6c0473177ebe09ebcea370e512aac0475c0407761a09a6df80389d178d1acf9c4af95d40ad3e23d265c38c6c847e3e2bbfd01e97218c6e3e56b3dd477dc78eeffbacbf4d184ff4976dc8d891c1b242cf41a14ae96e13ebe8bfa37bac7f116e7cbb5b29f40d02f525fdf94adc89bd6bbdbae218e95432630617d1fec801281044b0b36a43cb809c1d8384577546ca27aa8838afad9d921a4c2b2e57606e59b9fbb0ef5ed0a02ffb5b81a65d062dc19415675260b786fd7903393e4024fe08644005d2cdd83140bf3ed76b5c845880d79f6f0e33fb785918b9537d992e65b74164a6841a1a0ea4696c654b8151f26fdd4855841775870106709c3d66bce70d69de440c0d24017dd05155382b982f06a7f56980178d982107c88429e323d478a188a6e9e7e27872f4100e22b4221b0d8ccea9f7f2fb1d87b49f437dc7ec9fab9ec4e07095036d76ea5d8c4f7ebe77bc2018194b1838f586c938b84866105e29132101305841d63c894ade9e07908c48e2909f4188df3f4519c336e2468b8d87e013c5595446e831cd8360bd572e487d3522bba6063106454ce9bd557eefc1e967d12371b6b4144c9b2da6fd98c14defe3c911eaed0a2c7a73e924b"
            }
        }
    ]
}

const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const adapter = new FileSync(tmpName);
const db = low(adapter);
db.defaults(users).write();


process.env.API_KEY = 'a1dcce0c39bf60a4';
process.env.DB_FILE = tmpName;
const app = require('./app');

describe('Test the root path', () => {
    test('It should respond to GET method', (done) => {
        request(app).get('/').then((response) => {
            expect(response.statusCode).toBe(200);
            expect(response.text).toBe('Hello world');
            done();
        });
    });
});

const dupUser = {
    username: 'jeremy',
    email: 'jezza2@gmail.com',
    password: 'myPassword'
}

const newUser = {
    username: 'fred',
    email: 'fred@gmail.com',
    password: 'password'
}

const newUser2 = {
    username: 'fred2',
    email: 'fred2@gmail.com',
    password: 'myPassword'
}

describe('Test users path', () => {
    test('Should start with a single user', (done) => {
        request(app).get('/users').then((response) => {
            expect(response.statusCode).toBe(200);
            expect(response.body.length).toBe(1);
            expect(response.body[0].username).toBe('jeremy');
            expect(response.body[0].favouriteColour).toBe('blue');
            done();
        });
    });
    test('Cannot add existing user', (done) => {
        request(app).post('/users')
                    .send(dupUser)
                    .set('Accept', 'application/json')
                    .then((response) => {
            expect(response.statusCode).toBe(400);
            expect(response.body.message).toContain('already exists');
            done();
        });   
    });
    test('Add new user', (done) => {
        request(app).post('/users')
                    .send(newUser)
                    .set('Accept', 'application/json')
                    .then((response) => {
            expect(response.statusCode).toBe(200);
            expect(response.body.message).toContain('created');
            done();
        });
        request(app).get('/users').then((response) => {
            expect(response.statusCode).toBe(200);
            expect(response.body.length).toBe(2);
            done();
        });
    });
    test('Cannot delete user without correct token', (done) => {
        request(app).delete('/user/jeremy').then((response) => {
            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.text).validationErrors.query[0].message).toBe("should have required property 'token'");
        });
        request(app).delete('/user/jeremy?token=1fada496e19c20cb')
                    .then((response) => {
            expect(response.statusCode).toBe(400);
            expect(response.body.message).toBe('Invalid API token');
            done();
        });
        request(app).get('/user/jeremy').then((response) => {
            expect(response.statusCode).toBe(200);
            expect(response.body.username).toBe('jeremy');
            done();
        });
    });
    test('Delete user', (done) => {
        request(app).delete('/user/jeremy?token=a1dcce0c39bf60a4')
                    .then((response) => {
            expect(response.statusCode).toBe(200);
            expect(response.body.message).toContain('deleted');
            done();
        });
        request(app).get('/user/jeremy').then((response) => {
            expect(response.statusCode).toBe(200);
            expect(response.body).toStrictEqual({});
            done();
        });
    });
});
