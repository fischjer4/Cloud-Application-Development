const jwt = require('jsonwebtoken');

const secretKey = process.env.SECRET_KEY;




function generateAuthToken(username, userID) {
  return new Promise((resolve, reject) => {
    const payload = { sub: username, id: userID };
    jwt.sign(payload, secretKey, { expiresIn: '24h' }, function (err, token) {
      if (err) {
        reject(err);
      } else {
        resolve(token);
      }
    });
  });
}

function requireAuthentication (req, res, next) {
  const authHeader = req.get('Authorization') || '';
  const authHeaderParts = authHeader.split(' ');
  const token = authHeaderParts[0] === 'Bearer' ? authHeaderParts[1] : null;
  jwt.verify(token, secretKey, function (err, payload) {
    if (!err) {
      req.username = payload.sub;
      req.userID = payload.id;
      next();
    } else {
      res.status(401).json({
        error: "Invalid authentication token"
      });
    }
  });
}

exports.generateAuthToken = generateAuthToken;
exports.requireAuthentication = requireAuthentication;
