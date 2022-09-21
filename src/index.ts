import { ApolloServerPluginLandingPageGraphQLPlayground } from 'apollo-server-core';
import { ApolloServer } from 'apollo-server-express';
import connectRedis from 'connect-redis';
import cors from 'cors';
import express from 'express';
import session from 'express-session';
import Redis from 'ioredis';
import { buildSchema } from 'type-graphql';
import { createConnection } from 'typeorm';

import { COOKIE_NAME, IS_PRODUCTION } from './constants';
import { HelloResolver } from './resolvers/hello';
import { PostResolver } from './resolvers/post';
import { UserResolver } from './resolvers/user';
import TYPE_ORM_CONFIG from './type-orm.config';
import { MyContext } from './types';
import { createUpdootLoader } from './utils/createUpdootLoader';
import { createUserLoader } from './utils/createUserLoader';

const main = async () => {
	//const conn =
	// const orm = await MikroORM.init(mikroOrmConfig);

	// await orm.getMigrator().up();
	
	// createConnection is deprecated, use new DataSource() instead
	const conn = await createConnection(TYPE_ORM_CONFIG);
	conn.runMigrations();

	const app = express();

	const RedisStore = connectRedis(session);
	const redis = new Redis(process.env.REDIS_URL);

	app.set('trust proxy', 1);

	app.use(
		cors({
			origin: process.env.CORS_ORIGIN,
			credentials: true,
		})
	);

	app.use(
		session({
			name: COOKIE_NAME,
			store: new RedisStore({
				client: redis,
				disableTouch: true, // keep session alive forever
			}),
			cookie: {
				maxAge: 1000 * 60 * 60 * 24 * 365 * 10, // 10 years
				httpOnly: true, // frontend cannot access cookie
				sameSite: 'lax', // csrf
				secure: IS_PRODUCTION, // cookie only works in https
				domain: IS_PRODUCTION ? '.unknown-pleasure.com' : undefined
			},
			saveUninitialized: false,
			secret: process.env.SESSION_SECRET,
			resave: false,
		})
	);

	const apolloServer = new ApolloServer({
		schema: await buildSchema({
			resolvers: [HelloResolver, PostResolver, UserResolver],
			validate: false,
		}),
		context: ({ req, res }): MyContext => ({ req, res, redis, userLoader: createUserLoader(), updootLoader: createUpdootLoader() }),
		plugins: [
			ApolloServerPluginLandingPageGraphQLPlayground(), // enable good old graphql playground
		],
	});

	await apolloServer.start();

	apolloServer.applyMiddleware({ app, cors: false });

	app.listen(parseInt(process.env.PORT), () => {
		console.log('server started on localhost:4000');
	});

	// const post = orm.em.create(Post, {title: 'my first post'});

	// await orm.em.persistAndFlush(post);

	// const posts = await orm.em.find(Post, {});

	// console.log(posts);

	// await orm.em.nativeInsert(Post, {title: 'my second post'});
};

main();
