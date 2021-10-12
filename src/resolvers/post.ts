import { Arg, Mutation, Query, Resolver } from 'type-graphql';
import { Post } from '../entities/Post';

@Resolver()
export class PostResolver {
	@Query(() => [Post])
	async posts(): Promise<Array<Post>> {
		return Post.find();
	}

	@Query(() => Post, { nullable: true })
	post(@Arg('id', () => String) id: string): Promise<Post | undefined> {
		return Post.findOne(id);
	}

	@Mutation(() => Post)
	async createPost(@Arg('title') title: string): Promise<Post> {
		return Post.create({ title }).save();
	}

	@Mutation(() => Post, { nullable: true })
	async updatePost(@Arg('id') id: string, @Arg('title', { nullable: true }) title: string): Promise<Post | null> {
		const post = await Post.findOne(id);

		if (!post) {
			return null;
		}

		if (typeof title !== 'undefined') {
			await Post.update({ uuid: id }, { title });
		}

		return post;
	}

	@Mutation(() => Boolean)
	async deletePost(@Arg('id') id: string): Promise<boolean> {
		// const deletedNumber = await em.nativeDelete(Post, { uuid: id });
		const result = await Post.delete(id);
		return Boolean(result.affected);
	}
}