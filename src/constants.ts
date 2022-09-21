import { registerEnumType } from 'type-graphql';

export const IS_PRODUCTION = process.env.NODE_ENV === 'production';

export const COOKIE_NAME = 'qid';

export const FORGET_PASSWORD_PREFIX = 'forget-password:';

export enum VoteStatus {
	UP = 'UP',
	DOWN = 'DOWN',
	NA = 'NA',
}

registerEnumType(VoteStatus, {
	name: 'VoteStatus',
	description: 'Indicates the vote status for certain post and user',
});
