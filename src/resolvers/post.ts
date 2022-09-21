import { isNil } from 'lodash';
import { Arg, Ctx, Field, FieldResolver, InputType, Int, Mutation, ObjectType, Query, Resolver, Root, UseMiddleware } from 'type-graphql';
import { FindManyOptions, getConnection, LessThan } from 'typeorm';

import { VoteStatus } from '../constants';
import { Post } from '../entities/Post';
import { Updoot } from '../entities/Updoot';
import { User } from '../entities/User';
import { isAuth } from '../middleware/isAuth';
import { MyContext } from '../types';

@InputType()
class PostInput {
	@Field()
	title: string;

	@Field()
	text: string;
}

@ObjectType()
class PaginatedPosts {
	@Field(() => [Post])
	posts: Post[];

	@Field()
	hasMore: boolean;
}

@Resolver(Post)
export class PostResolver {
	@FieldResolver(() => String)
	textSnippet(@Root() root: Post) {
		return root.text.slice(0, 50);
	}

	@FieldResolver(() => User)
	creator(@Root() post: Post, @Ctx() { userLoader }: MyContext) {
		return userLoader.load(post.creatorUuid);
	}

	@FieldResolver(() => VoteStatus)
	async voteStatus(@Root() post: Post, @Ctx() { updootLoader, req }: MyContext) {
		const { userId } = req.session;

		if (isNil(userId)) {
			return VoteStatus.NA;
		}

		const updoot = await updootLoader.load({ postUuid: post.uuid, userUuid: userId as string });

		return this.getVoteStatus(updoot);
	}

	@Query(() => PaginatedPosts)
	async posts(
		@Arg('limit', () => Int) limit: number,
		@Arg('cursor', () => String, { nullable: true }) cursor: string | null
		// @Ctx() { req }: MyContext
	): Promise<PaginatedPosts> {
		/**  query builder option - not good for join */
		// const qb = getConnection()
		// 	.getRepository(Post)
		// 	.createQueryBuilder('p')
		// 	.leftJoinAndSelect('p.creator', 'u')
		// 	.addOrderBy('p."createdAt"', 'DESC')
		// 	.take(realLimit);

		// if (cursor) {
		// 	qb.where('p."createdAt" < :createdAt', { createdAt: new Date(parseInt(cursor)) });
		// }

		// const posts = await qb.getMany();
		// const hasMore = posts.length === realLimit;
		// if (hasMore) {
		// 	posts.pop();
		// }

		/** native sql option */
		// const replacements: any[] = [realLimit];
		// if (cursor) {
		// 	replacements.push(new Date(parseInt(cursor)));
		// }

		// const posts = await getConnection().query(
		// 	`
		// 	select p.*,
		// 	json_build_object(
		// 		'uuid', u.uuid,
		// 		'name', u.name,
		// 		'email', u.email,
		// 		'createdAt', u."createdAt",
		// 		'updatedAt', u."updatedAt"
		// 	) creator
		// 	from post p
		// 	inner join "user" u on u.uuid = p."creatorUuid"
		// 	${cursor ? `where p."createdAt" < $2` : ''}
		// 	order by p."createdAt" DESC
		// 	limit $1
		// `,
		// 	replacements
		// );

		/** repository find option */
		// const { userId } = req.session;

		const realLimit = Math.min(50, limit) + 1;

		const options: FindManyOptions = {
			// relations: ['updoots'],
			order: { createdAt: 'DESC' },
			take: realLimit,
		};

		if (cursor) {
			options.where = { createdAt: LessThan(new Date(parseInt(cursor))) };
		}

		const posts = await Post.find(options);

		// posts.forEach(post => this.appendVoteStatus(post, userId));

		// console.log(posts);

		const hasMore = posts.length === realLimit;
		if (hasMore) {
			posts.pop();
		}

		return { posts, hasMore };
	}

	@Query(() => Post, { nullable: true })
	post(@Arg('id', () => String) id: string): Promise<Post | undefined> {
		return Post.findOne(id);
	}

	@Mutation(() => Post)
	@UseMiddleware(isAuth)
	async createPost(@Arg('input') input: PostInput, @Ctx() { req }: MyContext): Promise<Post> {
		return Post.create({ ...input, creatorUuid: req.session.userId }).save();
	}

	@Mutation(() => Post, { nullable: true })
	@UseMiddleware(isAuth)
	async updatePost(
		@Arg('id') id: string,
		@Arg('title') title: string,
		@Arg('text') text: string,
		@Ctx() { req }: MyContext
	): Promise<Post | null> {
		// const post = await Post.findOne(id);
		// if (!post) {
		// 	return null;
		// }
		// await Post.update({ uuid: id }, { title, text });
		// return post;

		const { userId } = req.session;

		const result = await getConnection()
			.createQueryBuilder()
			.update(Post)
			.set({ title, text })
			.where('uuid = :id and creatorUuid = :userId', { id, userId })
			.returning('*')
			.execute();

		return result.raw[0];
	}

	@Mutation(() => Boolean)
	@UseMiddleware(isAuth)
	async deletePost(@Arg('id') id: string, @Ctx() { req }: MyContext): Promise<boolean> {
		// const deletedNumber = await em.nativeDelete(Post, { uuid: id });
		const result = await Post.delete({ uuid: id, creatorUuid: req.session.userId });
		return Boolean(result.affected);
	}

	@Mutation(() => Post)
	@UseMiddleware(isAuth)
	async vote(@Arg('postUuid') postUuid: string, @Arg('value', () => Int) value: number, @Ctx() { req }: MyContext) {
		const { userId } = req.session;
		const realValue = value === -1 ? value : 1;

		/** native sql option */
		// await getConnection().query(`
		// 	START TRANSACTION;

		// 	insert into updoot ("userUuid", "postUuid", value)
		// 	values (${userId}, ${po stUuid}, ${realValue});

		// 	update post
		// 	set points = points + ${realValue}
		// 	where uuid = ${postUuid};

		// 	COMMIT;
		// `);

		await getConnection().transaction(async transactionManager => {
			const updoot = await transactionManager.findOne(Updoot, { where: { userUuid: userId, postUuid } });

			// the user has voted on the post before
			// and changes the vote value
			if (updoot && updoot.value !== realValue) {
				await transactionManager.update(Updoot, { userUuid: userId, postUuid }, { value: realValue });
				// revert the value and add current value, hence 2 times realValue
				await transactionManager.update(Post, { uuid: postUuid }, { points: () => `points + 2 * ${realValue}` });

				return;
			}

			// the user has never voted on the post before
			if (!updoot) {
				await transactionManager.insert(Updoot, { userUuid: userId, postUuid, value: realValue });
				await transactionManager.update(Post, { uuid: postUuid }, { points: () => `points + ${realValue}` });
			}
		});

		// get latest post and append vote status
		const post = await Post.findOne(postUuid); // { relations: ['updoots'] }

		// this.appendVoteStatus(post, userId);

		return post;
	}

	// private appendVoteStatus(post: Post | undefined, userId: string | undefined): void {
	// 	if (isNil(post)) {
	// 		return;
	// 	}

	// 	const currentDoot = post.updoots.find((doot: Updoot) => doot.userUuid === userId);

	// 	switch (currentDoot?.value) {
	// 		case 1:
	// 			post.voteStatus = VoteStatus.UP;
	// 			break;
	// 		case -1:
	// 			post.voteStatus = VoteStatus.DOWN;
	// 			break;
	// 		default:
	// 			post.voteStatus = VoteStatus.NA;
	// 			break;
	// 	}
	// }

	private getVoteStatus(updoot: Updoot | undefined): VoteStatus {
		let status: VoteStatus;

		switch (updoot?.value) {
			case 1:
				status = VoteStatus.UP;
				break;
			case -1:
				status = VoteStatus.DOWN;
				break;
			default:
				status = VoteStatus.NA;
				break;
		}

		return status;
	}
}
