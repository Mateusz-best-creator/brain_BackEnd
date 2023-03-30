import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import knex from 'knex';
import bcrypt from 'bcrypt-nodejs';

const db = knex({
    client: 'pg',
    connection: {
      host : '127.0.0.1',
      port : 5432,
      user : 'postgres',
      password : 'ANDRZEJ123',
      database : 'brain'
    }
});

const app = express()
// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }))
// parse application/json
app.use(bodyParser.json())
// cors security feature
app.use(cors())

app.get('/', function (req, res) {
    res.send('root page');
})

app.post('/signin', (req, res) => {
    const {email, password} = req.body;
    db.select('email', 'has').from('login')
    .where('email', '=', email)
        .then(data => {
            const isValid = bcrypt.compareSync(password, data[0].has); 
            
            if(isValid) {
                return db.select('*').from('users')
                    .where('email', '=', email)
                    .then(user => {
                        res.json(user[0]);
                    })
                .catch(error => res.status(400).json('Error logging in,'))
            } else {
                res.status(400).json('wrong credentials')
            }
        }).catch(error => res.status(400).json('wrong credentials'))
})

app.post('/register', (req, res) => {
    const { name, email, password } = req.body;

    const hash = bcrypt.hashSync(password);
        db.transaction(trx => {
            trx.insert({
                has: hash,
                email: email
            })
            .into('login')
            .returning('email')
            .then(loginEmail => {
                return trx('users')
                    .returning('*')
                    .insert({
                        email: loginEmail[0].email,
                        name: name,
                        joined: new Date()
                    })
                    .then(user => {
                        res.json(user[0]);
                    })
            })
            .then(trx.commit)
            .catch(trx.rollback)
        }).catch(error => res.status(400).json('unable to register', error))
})

app.get('/profile/:id', (req, res) => {
    const { id } = req.params;
    db.select('*').from('users').where('id', id).then(user => {
        if (!user.length) res.status(404).json('User not found.');
        res.json(user[0]);
    })

    // res.status(404).json('no such user :(');
})

app.put('/image', (req, res) => {
    const { id } = req.body;
    db('users').where('id', '=', id)
        .increment('entries', 1)
        .returning('entries')
        .then(entries => {
            res.json(entries[0].entries);
        }).catch(error => {
            res.status(400).json('unable to get user count')
        })
})



app.listen(3000)