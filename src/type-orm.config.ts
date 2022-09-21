import "dotenv-safe/config";
import path from 'path';
import { ConnectionOptions } from 'typeorm';
import { Post } from './entities/Post';
import { Updoot } from './entities/Updoot';
import { User } from './entities/User';

export default {
	type: 'postgres',
	// database: 'testkewl1',
	// username: 'postgres',
	// password: 'postgres',
	url: process.env.DATABASE_URL,
	logging: true,
	// synchronize: true, // not in production
	migrations: [path.join(__dirname, './migrations/*')],
	entities: [Post, User, Updoot],
} as ConnectionOptions;
