import { FieldError } from '../resolvers/FieldError';
import { UsernamePasswordInput } from '../resolvers/UsernamePasswordInput';

export const validateRegister = ({ email, username, password }: UsernamePasswordInput): Array<FieldError> | null => {
	if (!email.includes('@')) {
		return [
			{
				field: 'email',
				message: 'invalid email',
			},
		];
	}

	if (username.includes('@')) {
		return [
			{
				field: 'username',
				message: 'cannot includes "@"',
			},
		];
	}

	if (username.length <= 2) {
		return [
			{
				field: 'username',
				message: 'length must greater than 2',
			},
		];
	}

	if (password.length <= 2) {
		return [
			{
				field: 'password',
				message: 'length must greater than 2',
			},
		];
	}

	return null;
};
