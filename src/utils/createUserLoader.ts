import DataLoader from 'dataloader';
import { In } from 'typeorm';
import { User } from '../entities/User';

export const createUserLoader = () =>
	new DataLoader<string, User | undefined>(async userIds => {
		const users = await User.find({ uuid: In(userIds as Array<string>) });

		// const userIdToUser: Record<string, User> = {};

		// users.forEach(u => {
		// 	userIdToUser[u.uuid] = u;
		// })

		return userIds.map(userId => users.find(user => user.uuid === userId));
	});
