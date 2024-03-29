const GoogleStrategy = require('passport-google-oauth20').Strategy;
const passportJWT = require('passport-jwt');
const jwt = require('jsonwebtoken');
const { graphqlClient } = require('./graphqlClient');
const { users } = require('../graphql/users/query');
const { insertUsers } = require('../graphql/users/mutation');

const JwtStrategy = passportJWT.Strategy;
const { ExtractJwt } = passportJWT;

const opts = {};
opts.jwtFromRequest = ExtractJwt.fromAuthHeaderAsBearerToken();
opts.secretOrKey = process.env.HASURA_GRAPHQL_JWT_SECRET_KEY;

module.exports = (passport) => {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOGGLE_CLIENT_ID,
        clientSecret: process.env.GOGGLE_CLIENT_SECRET,
        callbackURL: '/auth/google/callback',
        proxy: true,
      },
      (accessToken, refreshToken, profile, done) => {
        const user = {
          displayName: profile.displayName,
          email: profile.emails[0].value,
          photoURL: profile.photos[0].value.replace('sz=50', 'sz=128'),
        };

        const getToken = (currentUser) => {
          return jwt.sign(
            {
              'https://hasura.io/jwt/claims': {
                'x-hasura-default-role': 'user',
                'x-hasura-allowed-roles': ['user'],
                'x-hasura-user-id': currentUser.userId.toString(),
              },
            },
            process.env.HASURA_GRAPHQL_JWT_SECRET_KEY,
            {
              algorithm: process.env.HASURA_GRAPHQL_JWT_SECRET_TYPE,
              expiresIn: process.env.JWT_TOKEN_EXPIRES,
            },
          );
        };

        graphqlClient
          .request(users, {
            email: user.email,
          })
          .then((data) => {
            if (data.users[0]) {
              const currentUser = data.users[0];
              const token = getToken(currentUser);

              return done(null, { currentUser, token });
            }
            return graphqlClient
              .request(insertUsers, {
                objects: [user],
              })
              .then((dataInsert) => {
                const currentUser = dataInsert.insert_users.returning[0];
                const token = getToken(currentUser);

                return done(null, { currentUser, token });
              });
          })
          .catch((err) => console.log(err));
      },
    ),
  );
  passport.use(
    new JwtStrategy(opts, (jwtpayload, done) => {
      console.log(jwtpayload, done, 'ngon');
    }),
  );
};
