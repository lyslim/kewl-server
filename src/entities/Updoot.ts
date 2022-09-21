import { Field, ObjectType } from 'type-graphql';
import { BaseEntity, Column, Entity, ManyToOne, PrimaryColumn } from 'typeorm';
import { Post } from './Post';
import { User } from './User';

@ObjectType()
@Entity()
export class Updoot extends BaseEntity {
	@Field()
	@Column({ type: 'int' })
	value: number;

	@Field()
	@PrimaryColumn()
	userUuid: string;

	@Field(() => User)
	@ManyToOne(() => User, user => user.updoots)
	user: User;

	@Field()
	@PrimaryColumn()
	postUuid: string;

	@Field(() => Post)
	@ManyToOne(() => Post, post => post.updoots, { onDelete: 'CASCADE' })
	post: Post;
}
