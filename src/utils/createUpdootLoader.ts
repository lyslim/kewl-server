import DataLoader from 'dataloader';
import { Updoot } from '../entities/Updoot';

export const createUpdootLoader = () =>
	new DataLoader<{ postUuid: string; userUuid: string }, Updoot | undefined>(async updootKeys => {
		const updoots = await Updoot.find({ where: updootKeys });
		return updootKeys.map(key => updoots.find(updoot => updoot.postUuid === key.postUuid && updoot.userUuid === key.userUuid));
	});
