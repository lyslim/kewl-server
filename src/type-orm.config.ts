import { ConnectionOptions } from 'typeorm';
import { Post } from './entities/Post';
import { User } from './entities/User';

export default {
	type: 'postgres',
	database: 'testkewl1',
	username: 'postgres',
	password: 'postgres',
	logging: true,
	synchronize: true,
	entities: [Post, User],
} as ConnectionOptions;
