const express = require('express');
const { JsonDB, Config } = require('node-json-db');
const uuid = require('uuid');
const speakeasy = require('speakeasy');

const app = express();
app.use(express.json());

// DB initialization
const db = new JsonDB(new Config('myDB', true, true, '/'));

// Healthcheck API
app.get('/api/healthcheck', (req, res) => {
  res.json({
    msg: 'up',
  });
});

// register user and create secret
app.post('/api/register', async (req, res) => {
  const { email, name } = req.body;
  const id = uuid.v4();
  try {
    const path = `user/${email}`;
    try {
      const user = await db.getData(path);
      res.json({ secret: user.secret.base32 });
    } catch (error) {
      const secret = speakeasy.generateSecret();
      await db.push(path, { id, secret, data: { email, name } });
      res.json({ secret: secret.base32 });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: 'Error registering user' });
  }
});

// Validate the token
app.post('/api/validate', async (req, res) => {
  const { token, email } = req.body;
  try {
    const path = `user/${email}`;
    const user = await db.getData(path);
    console.log(user);
    const { base32: secret } = user.secret;
    const validated = speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: 1,
    });
    res.json({
      validated,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: 'Error validating' });
  }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
