import { Field, ObjectType } from 'type-graphql';
import { BaseEntity, Column, CreateDateColumn, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { VoteStatus } from '../constants';
import { Updoot } from './Updoot';
import { User } from './User';

@ObjectType()
@Entity()
export class Post extends BaseEntity {
	@Field(() => String)
	@PrimaryGeneratedColumn('uuid')
	uuid: string;

	@Field()
	@Column()
	title!: string;

	@Field()
	@Column()
	text!: string;

	@Field()
	@Column({ type: 'int', default: 0 })
	points!: number;

	// to indicates the vote status for certain post and user
	// this perhaps should be in a DTO
	@Field(() => VoteStatus)
	voteStatus: VoteStatus; // UP, DOWN, NA(not available)

	@Field()
	@Column()
	creatorUuid: string;

	@Field(() => User)
	@ManyToOne(() => User, user => user.posts)
	creator: User;

	@OneToMany(() => Updoot, updoot => updoot.post)
	updoots: Updoot[];

	@Field(() => String)
	@CreateDateColumn({ type: 'timestamptz' })
	createdAt: Date;

	@Field(() => String)
	@UpdateDateColumn({ type: 'timestamptz' })
	updatedAt: Date;
}
