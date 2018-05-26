export function mapValues<T, U>(
	obj: { [key: string]: T },
	transform: (value: T, key: string) => U
): { [key: string]: U } {
	return Object.keys(obj).reduce(
		(acc, key) => Object.assign(acc, { [key]: transform(obj[key], key) }),
		{});
}
