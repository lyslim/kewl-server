import argon2 from 'argon2';
import { Arg, Ctx, FieldResolver, Mutation, Query, Resolver, Root } from 'type-graphql';
import { v4 } from 'uuid';

import { COOKIE_NAME, FORGET_PASSWORD_PREFIX } from '../constants';
import { User } from '../entities/User';
import { MyContext } from '../types';
import { sendEmail } from '../utils/sendEmail';
import { validateRegister } from '../utils/validateRegister';
import { UsernamePasswordInput } from './UsernamePasswordInput';
import { UserResponse } from './UserResponse';

@Resolver(User)
export class UserResolver {
	@FieldResolver(() => String)
	email(@Root() user: User, @Ctx() { req }: MyContext): string {
		if (req.session.userId === user.uuid) {
			return user.email;
		}
		// disallow to see others' email
		return '';
	}

	@Query(() => User, { nullable: true })
	me(@Ctx() { req }: MyContext): Promise<User | void> | null {
		console.log('session: ' + JSON.stringify(req.session));

		if (!req.session.userId) {
			return null;
		}

		return User.findOne(req.session.userId);
	}

	@Mutation(() => UserResponse)
	async register(@Arg('options') options: UsernamePasswordInput, @Ctx() { req }: MyContext): Promise<UserResponse> {
		const errors = validateRegister(options);

		if (errors) {
			return { errors };
		}

		const hashedPassword = await argon2.hash(options.password);

		// const user = em.create(User, {
		// 	name: options.username,
		// 	email: options.email,
		// 	password: hashedPassword,
		// });
		const user = User.create({
			name: options.username,
			email: options.email,
			password: hashedPassword,
		});

		try {
			// if orm does not work out of box, use query builder like below instead
			// (em as EntityManager).createQueryBuilder(User).getKnexQuery().insert(...)
			await user.save();
		} catch (error) {
			if (error.code === '23505') {
				// let errors: Array<FieldError> = [];
				// switch (error.constraint) {
				// 	case 'user_name_unique':
				// 		errors = [{ field: 'username', message: 'user name already taken' }];
				// 		break;
				// 	case 'user_email_unique':
				// 		errors = [{ field: 'email', message: 'email already taken' }];
				// 		break;
				// }
				return { errors: [{ field: 'username', message: 'user name or email already taken' }] };
			}
		}

		// store user id session
		// this will set a cookie on user
		// keep them logged in
		req.session.userId = user.uuid;

		return { user };
	}

	@Mutation(() => UserResponse)
	async login(
		@Arg('usernameOrEmail') usernameOrEmail: string,
		@Arg('password') password: string,
		@Ctx() { req }: MyContext
	): Promise<UserResponse> {
		const user = await User.findOne(
			usernameOrEmail.includes('@') ? { where: { email: usernameOrEmail } } : { where: { name: usernameOrEmail } }
		);

		if (!user) {
			return {
				errors: [
					{
						field: 'usernameOrEmail',
						message: 'user does not exist',
					},
				],
			};
		}

		const valid = await argon2.verify(user.password, password);

		if (!valid) {
			return {
				errors: [
					{
						field: 'password',
						message: 'incorrect password',
					},
				],
			};
		}

		req.session.userId = user.uuid;

		return { user };
	}

	@Mutation(() => Boolean)
	logout(@Ctx() { req, res }: MyContext): Promise<boolean> {
		return new Promise(resolve =>
			req.session.destroy(err => {
				res.clearCookie(COOKIE_NAME);
				if (err) {
					console.log(err);
					resolve(false);
					return;
				}
				resolve(true);
			})
		);
	}

	@Mutation(() => Boolean)
	async forgotPassword(@Arg('email') email: string, @Ctx() { redis }: MyContext) {
		const user = await User.findOne({ where: { email } });

		if (!user) {
			// the email is not in the db
			return true;
		}

		const token = v4();

		await redis.set(FORGET_PASSWORD_PREFIX + token, user.uuid, 'ex', 1000 * 60 * 60 * 24 * 3); // 3 days

		console.log(FORGET_PASSWORD_PREFIX + token + ': ' + (await redis.get(FORGET_PASSWORD_PREFIX + token)));

		await sendEmail(email, `<a href="http://localhost:3000/change-password/${token}">reset password</a>`);

		return true;
	}

	@Mutation(() => UserResponse)
	async changePassword(
		@Arg('token') token: string,
		@Arg('newPassword') newPassword: string,
		@Ctx() { req, redis }: MyContext
	): Promise<UserResponse> {
		if (newPassword.length <= 2) {
			return {
				errors: [
					{
						field: 'newPassword',
						message: 'length must greater than 2',
					},
				],
			};
		}
		const key = FORGET_PASSWORD_PREFIX + token;
		const userId = await redis.get(key);

		if (!userId) {
			return {
				errors: [
					{
						field: 'token',
						message: 'token expired',
					},
				],
			};
		}

		const user = await User.findOne({ uuid: userId });

		if (!user) {
			return {
				errors: [
					{
						field: 'token',
						message: 'user no longer exists',
					},
				],
			};
		}

		await User.update({ uuid: userId }, { password: await argon2.hash(newPassword) });

		await redis.del(key);

		// log in user after change password
		req.session.userId = user.uuid;

		return { user };
	}
}
